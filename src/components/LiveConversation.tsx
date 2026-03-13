import React, { useState, useRef, useCallback } from 'react';
// FIX: The 'LiveSession' type is not exported from @google/genai. Replaced with 'any' to avoid type errors.
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { decode, decodeAudioData, encode, createBlob } from '../utils';

const displayPlacesListFunctionDeclaration: FunctionDeclaration = {
  name: 'display_places_list',
  description: 'Displays a list of places (like restaurants, parks, etc.) to the user. Use this when the user asks for a list of locations.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
          type: Type.STRING,
          description: "A title for the list, e.g., 'Sushi Restaurants in Converse, TX'."
      },
      places: {
        type: Type.ARRAY,
        description: 'An array of place names to display.',
        items: {
          type: Type.STRING,
        },
      },
    },
    required: ['title', 'places'],
  },
};

const LiveConversation: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [status, setStatus] = useState('Idle');
    const [error, setError] = useState<string | null>(null);
    const [transcriptionHistory, setTranscriptionHistory] = useState<{user: string, model: string}[]>([]);
    const [placesList, setPlacesList] = useState<{title: string, places: string[]} | null>(null);
    
    // FIX: The 'LiveSession' type is not exported from @google/genai. Replaced with 'any' to avoid type errors.
    const sessionRef = useRef<any | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        setIsSessionActive(false);
        setStatus('Idle');
        nextStartTimeRef.current = 0;
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
    }, []);

    const startSession = async () => {
        setIsSessionActive(true);
        setStatus('Initializing...');
        setError(null);
        setTranscriptionHistory([]);
        setPlacesList(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            // FIX: Always create a new GoogleGenAI instance right before connecting.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // FIX: Use gemini-2.5-flash-native-audio-preview-12-2025 as the latest stable native audio model.
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('Connected. Speak now!');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            // CRITICAL: Ensure inputs are sent only after the session promise resolves.
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                         if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current;
                            const fullOutput = currentOutputTranscriptionRef.current;
                            if (fullInput.trim() || fullOutput.trim()) {
                                setTranscriptionHistory(prev => [...prev, {user: fullInput, model: fullOutput}]);
                            }
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }

                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'display_places_list') {
                                    // FIX: Add explicit type assertions for function call arguments as they are typed as unknown.
                                    const args = fc.args as { title: string; places: string[] };
                                    setPlacesList({
                                        title: args.title,
                                        places: args.places,
                                    });
                                    
                                    sessionPromise.then((session) => {
                                        session.sendToolResponse({
                                            functionResponses: [{
                                                id : fc.id,
                                                name: fc.name,
                                                response: { result: "OK, the list is now displayed to the user." },
                                            }]
                                        })
                                    });
                                }
                            }
                        }

                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => s.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError(`Session error: ${e.message}`);
                        stopSession();
                    },
                    onclose: () => {
                        setStatus('Session closed');
                        stopSession();
                    },
                },
                config: {
                    systemInstruction: `You are a friendly and helpful assistant. You can have a voice conversation with the user. If the user asks for a list of places, like restaurants, you MUST use the 'display_places_list' function to show them a list directly in the app. Do not just say you've sent a list; use the tool to actually display it.`,
                    tools: [{ functionDeclarations: [displayPlacesListFunctionDeclaration] }],
                    // FIX: Must be exactly one modality, Modality.AUDIO.
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                }
            });
            sessionRef.current = await sessionPromise;
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to start session. ${errorMessage}`);
            stopSession();
        }
    };

    return (
        <div className="flex flex-col h-full bg-smw-pink-light rounded-lg shadow-xl p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-bold text-smw-gray-dark">Live Conversation</h2>
            
            <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg flex flex-col items-center space-y-4">
                <button
                    onClick={isSessionActive ? stopSession : startSession}
                    className={`px-6 py-3 text-lg font-bold rounded-full transition-colors ${isSessionActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-smw-pink hover:bg-white text-smw-gray-dark'}`}
                >
                    {isSessionActive ? 'Stop Conversation' : 'Start Conversation'}
                </button>
                <p className="text-smw-gray-dark opacity-80">Status: {status}</p>
                {error && <p className="text-red-500">{error}</p>}
            </div>

            <div className="flex-1 bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 overflow-y-auto space-y-4 text-smw-gray-dark">
                <div>
                    <h3 className="text-lg font-semibold text-smw-gray-dark">Transcription</h3>
                    {transcriptionHistory.length === 0 && <p className="opacity-80">Conversation transcript will appear here...</p>}
                    {transcriptionHistory.map((turn, index) => (
                        <div key={index} className="space-y-2 py-2">
                            {turn.user && <p><span className="font-bold text-smw-pink">You:</span> {turn.user}</p>}
                            {turn.model && <p><span className="font-bold text-smw-gray-dark">Gemini:</span> {turn.model}</p>}
                        </div>
                    ))}
                </div>
                
                {placesList && (
                    <div className="pt-4 mt-4 border-t border-smw-pink/20">
                        <h3 className="text-lg font-semibold text-smw-gray-dark mb-3">{placesList.title}</h3>
                        <ul className="space-y-3">
                            {placesList.places.map((placeName, index) => (
                                <li key={index} className="bg-white/50 p-3 rounded-md border-l-4 border-smw-pink">
                                    <p className="font-bold">{placeName}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveConversation;