import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: The 'LiveSession' type is not exported from @google/genai. Replaced with 'any' to avoid type errors.
import { GoogleGenAI, Chat, LiveServerMessage, Modality } from "@google/genai";
import { ChatMessage } from '../types';
import { Spinner } from './common/Spinner';
import { createBlob } from '../utils';

// Component to render markdown-like responses cleanly and professionally
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    // Pre-process to handle non-standard lists from the model (e.g., * item1. * item2.)
    const processedText = text
        .replace(/(\w|[.?!])\s+\*\s+/g, '$1\n* ') // Add newline before '*' if it follows a word or punctuation.
        .replace(/:\s+\*\s+/g, ':\n* '); // Add newline after a colon.

    const lines = processedText.split('\n');
    // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
    const elements: React.ReactElement[] = [];
    let listBuffer: { type: 'ul' | 'ol', items: string[] } | null = null;

    const flushListBuffer = () => {
        if (listBuffer) {
            const ListTag = listBuffer.type;
            elements.push(
                <ListTag key={`list-${elements.length}`} className={`${ListTag === 'ol' ? 'list-decimal' : 'list-disc'} list-inside space-y-1.5 my-3 pl-5`}>
                    {listBuffer.items.map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                </ListTag>
            );
            listBuffer = null;
        }
    };

    lines.forEach((line, index) => {
        let formattedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        const olMatch = formattedLine.match(/^\s*\d+\.\s+(.*)/);
        const ulMatch = formattedLine.match(/^\s*\*\s+(.*)/);

        if (olMatch) {
            if (listBuffer?.type !== 'ol') flushListBuffer();
            if (!listBuffer) listBuffer = { type: 'ol', items: [] };
            listBuffer.items.push(olMatch[1]);
        } else if (ulMatch) {
            if (listBuffer?.type !== 'ul') flushListBuffer();
            if (!listBuffer) listBuffer = { type: 'ul', items: [] };
            listBuffer.items.push(ulMatch[1]);
        } else {
            flushListBuffer();
            if (formattedLine.trim()) {
                elements.push(<p key={`p-${index}`} className="my-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />);
            }
        }
    });

    flushListBuffer(); // Flush any remaining list at the end

    return <div className="text-negro-fondo leading-relaxed">{elements}</div>;
};


const Chatbot: React.FC = () => {
    const [history, setHistory] = useState<ChatMessage[]>([
        { role: 'model', parts: [{ text: "¡Hola! Soy tu asistente personal de IA para marketing y creación de contenido. Pídeme ideas de contenido, estrategias de campaña o cualquier otra cosa que necesites para comenzar. ¿Cómo puedo ayudarte hoy?" }] }
    ]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [isRecording, setIsRecording] = useState(false);
    // FIX: The 'LiveSession' type is not exported from @google/genai. Replaced with 'any' to avoid type errors.
    const sessionRef = useRef<any | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const transcribedTextRef = useRef('');
    const isUiUpdateScheduled = useRef(false);

    useEffect(() => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        // FIX: Use gemini-3-flash-preview for standard text chat tasks as per guidelines.
        const chatSession = ai.chats.create({
            model: 'gemini-3-flash-preview',
            history: [],
        });
        setChat(chatSession);
      } catch (e) {
        setError("Failed to initialize Gemini AI. Make sure the API key is set correctly.");
        console.error(e);
      }
    }, []);

    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [history]);

    const stopRecording = useCallback(async () => {
        if (sessionRef.current) {
            await sessionRef.current.close();
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
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
           await audioContextRef.current.close();
           audioContextRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const startRecording = async () => {
        setIsRecording(true);
        setError(null);
        setUserInput('');
        transcribedTextRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

            const scheduleUiUpdate = () => {
                if (isUiUpdateScheduled.current) return;
                isUiUpdateScheduled.current = true;
                requestAnimationFrame(() => {
                    setUserInput(transcribedTextRef.current);
                    isUiUpdateScheduled.current = false;
                });
            };
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            // FIX: Use gemini-2.5-flash-native-audio-preview-12-2025 for real-time audio tasks.
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                callbacks: {
                    onopen: () => {
                        const source = audioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            // CRITICAL: Solely rely on sessionPromise resolves and then call session.sendRealtimeInput.
                            sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription?.text) {
                            transcribedTextRef.current += message.serverContent.inputTranscription.text;
                            scheduleUiUpdate();
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError(`Voice recognition error: ${e.message}`);
                        stopRecording();
                    },
                    onclose: () => {},
                },
                config: {
                    inputAudioTranscription: {},
                    // FIX: Must contain exactly one modality which is AUDIO.
                    responseModalities: [Modality.AUDIO],
                }
            });
            sessionRef.current = await sessionPromise;
        } catch(e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to start recording. Please grant microphone permissions. ${errorMessage}`);
            stopRecording();
        }
    };

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isRecording) {
          await stopRecording();
      }
      if (!userInput.trim() || !chat || isLoading) return;

      const userMessage: ChatMessage = { role: 'user', parts: [{ text: userInput }] };
      setHistory(prev => [...prev, userMessage]);
      setUserInput('');
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await chat.sendMessageStream({ message: userInput });

        let modelResponse = '';
        setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);
        
        for await (const chunk of result) {
            // FIX: Use .text property directly, not .text().
            modelResponse += chunk.text;
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: modelResponse }] };
                return newHistory;
            });
        }
      } catch (e) {
        const rawMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        let finalMessage = rawMessage;
        try {
            // Try to parse it as JSON for better display
            const parsed = JSON.parse(rawMessage);
            if (parsed.error) {
                finalMessage = `Error ${parsed.error.code || ''} (${parsed.error.status || 'Unknown Status'}): ${parsed.error.message || 'No details provided.'}`.trim();
            } else {
                 finalMessage = JSON.stringify(parsed, null, 2);
            }
        } catch (jsonError) {
            // It's not JSON, use the raw message
        }

        setError(`Failed to get response from Gemini. ${finalMessage}`);
        // Remove the empty model message placeholder
        setHistory(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'model' && lastMessage.parts[0].text === '') {
                return prev.slice(0, -1);
            }
            return prev;
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
        <div className="flex flex-col h-full bg-white/60 backdrop-blur-sm shadow-xl rounded-lg">
            <h2 className="text-2xl font-bold p-4 border-b border-rosa-principal/20 text-negro-fondo">Chatea con tu Gemelo IA</h2>
            {error && <div className="p-4 bg-red-900 text-blanco-texto rounded-md m-4">{error}</div>}
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {history.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-rosa-principal text-negro-fondo font-semibold' : 'bg-white/80'}`}>
                           {msg.role === 'model' 
                             ? <MarkdownRenderer text={msg.parts[0].text} />
                             : msg.parts[0].text
                           }
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-xl px-4 py-2 rounded-lg bg-white/80">
                            <Spinner className="w-5 h-5 text-negro-fondo" />
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t-2 border-rosa-principal/20 flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleMicClick}
                    className={`p-2 rounded-full hover:bg-white/50 disabled:bg-transparent disabled:cursor-not-allowed transition-colors ${isRecording ? 'text-red-500' : 'text-negro-fondo'}`}
                    disabled={isLoading}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={isRecording ? "Escuchando..." : "Pregúntale cualquier cosa a tu Gemelo IA..."}
                    className="flex-1 bg-white/50 border-2 border-rosa-principal/50 rounded-lg p-2 focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo placeholder:text-negro-fondo/70"
                    disabled={isLoading}
                />
                <button type="submit" className="bg-rosa-principal text-negro-fondo p-2 rounded-lg hover:bg-white disabled:bg-rosa-principal/50 disabled:cursor-not-allowed" disabled={isLoading || !userInput.trim()}>
                    {isLoading ? <Spinner /> : 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    }
                </button>
            </form>
        </div>
    );
};

export default Chatbot;