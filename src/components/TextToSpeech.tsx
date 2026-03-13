import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData, audioBufferToWav } from '../utils';
import { Spinner } from './common/Spinner';
import { useLanguage } from '../context/LanguageContext';

interface VoiceCharacter {
    name: string; // Internal API name (lowercase)
    displayName: string;
    description: string;
    vibe: string;
    gender: 'Male' | 'Female';
    type: 'Adult' | 'Child';
}

// Validated voice names from the Gemini API:
// achernar, achird, algenib, algieba, alnilam, aoede, autonoe, callirrhoe, charon, despina, enceladus, erinome, fenrir, gacrux, iapetus, kore, laomedeia, leda, orus, puck, pulcherrima, rasalgethi, sadachbia, sadaltager, schedar, sulafat, umbriel, vindemiatrix, zephyr, zubenelgenubi
const voices: VoiceCharacter[] = [
    { name: 'kore', displayName: 'Kore', description: 'Niña pequeña', vibe: 'Voz de niña dulce, juvenil y juguetona.', gender: 'Female', type: 'Child' },
    { name: 'autonoe', displayName: 'Autonoe', description: 'Niño pequeño (Masculino)', vibe: 'Voz de niño pequeño, claramente masculina, brillante y enérgica.', gender: 'Male', type: 'Child' },
    { name: 'erinome', displayName: 'Erinome', description: 'Niña dulce', vibe: 'Voz infantil suave e inocente.', gender: 'Female', type: 'Child' },
    { name: 'puck', displayName: 'Puck', description: 'Caballero amable', vibe: 'Tono masculino cálido, accesible y amable.', gender: 'Male', type: 'Adult' },
    { name: 'charon', displayName: 'Charon', description: 'Caballero profundo', vibe: 'Voz masculina autoritaria, profunda y audaz.', gender: 'Male', type: 'Adult' },
    { name: 'achernar', displayName: 'Achernar', description: 'Caballero profesional', vibe: 'Tono de negocios equilibrado, claro y confiable.', gender: 'Male', type: 'Adult' },
    { name: 'fenrir', displayName: 'Fenrir', description: 'Caballero dominante', vibe: 'Entrega masculina fuerte, poderosa y dominante.', gender: 'Male', type: 'Adult' },
    { name: 'iapetus', displayName: 'Iapetus', description: 'Caballero sofisticado', vibe: 'Narración masculina refinada y elegante.', gender: 'Male', type: 'Adult' },
    { name: 'zephyr', displayName: 'Zephyr', description: 'Dama sofisticada', vibe: 'Tono femenino suave, cálido y sofisticado.', gender: 'Female', type: 'Adult' },
    { name: 'aoede', displayName: 'Aoede', description: 'Dama creativa', vibe: 'Voz femenina expresiva y lírica.', gender: 'Female', type: 'Adult' },
    { name: 'leda', displayName: 'Leda', description: 'Dama gentil', vibe: 'Tono femenino suave, elegante y calmante.', gender: 'Female', type: 'Adult' },
    { name: 'despina', displayName: 'Despina', description: 'Dama moderna', vibe: 'Voz femenina juvenil, nítida y clara.', gender: 'Female', type: 'Adult' },
    { name: 'callirrhoe', displayName: 'Callirrhoe', description: 'Dama rica', vibe: 'Narración femenina profunda, elegante y rica.', gender: 'Female', type: 'Adult' },
    { name: 'pulcherrima', displayName: 'Pulcherrima', description: 'Dama elegante', vibe: 'Narración femenina pulida y de alta gama.', gender: 'Female', type: 'Adult' },
    { name: 'laomedeia', displayName: 'Laomedeia', description: 'Dama tranquila', vibe: 'Voz femenina profesional serena y constante.', gender: 'Female', type: 'Adult' },
];

const TextToSpeech: React.FC = () => {
    const { t } = useLanguage();
    const [text, setText] = useState('');
    const [selectedVoice, setSelectedVoice] = useState(voices[0].name);

    // Load form state from localStorage
    React.useEffect(() => {
        const savedForm = localStorage.getItem('smwTTSFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.text) setText(parsed.text);
                if (parsed.selectedVoice) setSelectedVoice(parsed.selectedVoice);
            } catch (e) {
                console.error("Failed to load TTS form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    React.useEffect(() => {
        const formState = {
            text,
            selectedVoice
        };
        localStorage.setItem('smwTTSFormState', JSON.stringify(formState));
    }, [text, selectedVoice]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

    const stopAudio = () => {
        if (audioSource) {
            try {
                audioSource.stop();
            } catch (e) {}
            setAudioSource(null);
        }
    };

    // Info section states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const generateSpeech = async (input: string, voiceObj: VoiceCharacter, setLoader: (val: any) => void) => {
        try {
            setLoader(true);
            setError(null);
            stopAudio();

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // Prepend persona instructions to the text prompt for better consistency
            // We use English for instructions as the model handles it very well for persona guidance
            const genderLabel = voiceObj.gender === 'Male' ? 'Little Boy' : 'Little Girl';
            const ageLabel = voiceObj.type === 'Child' ? 'Child' : 'Adult';
            
            const fullPrompt = `Voice Persona: ${voiceObj.displayName}. 
            Target Voice: ${voiceObj.type === 'Child' ? genderLabel : (voiceObj.gender === 'Male' ? 'Man' : 'Woman')}.
            Character Description: ${voiceObj.description}. 
            Vibe: ${voiceObj.vibe}. 
            ${voiceObj.name === 'autonoe' ? 'CRITICAL: You are currently voicing a YOUNG BOY (Male Child). You MUST NOT sound like a girl. Use a distinctly masculine, energetic young boy voice with clear boyish inflections.' : ''}
            Text to speak: ${input}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: fullPrompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceObj.name },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            
            if (base64Audio) {
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                if (outputAudioContext.state === 'suspended') {
                    await outputAudioContext.resume();
                }

                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    outputAudioContext,
                    24000,
                    1,
                );
                
                // Create download URL from AudioBuffer
                const wavBlob = audioBufferToWav(audioBuffer);
                const url = URL.createObjectURL(wavBlob);
                setGeneratedAudioUrl(url);

                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.onended = () => setAudioSource(null);
                setAudioSource(source);
                source.start();
            } else {
                throw new Error("No audio data was returned by the AI model.");
            }
        } catch (e) {
            const rawMessage = e instanceof Error ? e.message : String(e);
            let displayMessage = rawMessage;
            try {
                const parsed = JSON.parse(rawMessage);
                if (parsed.error?.message) displayMessage = parsed.error.message;
            } catch { }
            setError(`Speech generation failed: ${displayMessage}`);
            console.error(e);
        } finally {
            setLoader(null);
        }
    };

    const handleMainPlay = () => {
        if (!text.trim()) {
            setError(t('Please enter some text to speak.', 'Por favor, ingresa algún texto para hablar.'));
            return;
        }
        const voiceObj = voices.find(v => v.name === selectedVoice) || voices[0];
        generateSpeech(text, voiceObj, setIsLoading);
    };

    const handlePreviewVoice = (voice: VoiceCharacter) => {
        const hello = t('Hello!', '¡Hola!');
        const iAm = t('I am', 'Soy');
        const iHaveA = t('I have a', 'Tengo un');
        const vibeAnd = t('vibe and I\'m ready to bring your text to life.', 'estilo y estoy listo para dar vida a tu texto.');
        const previewText = `${hello} ${iAm} ${voice.displayName}. ${iHaveA} ${voice.description.toLowerCase()} ${vibeAnd}`;
        generateSpeech(previewText, voice, (val) => setIsPreviewing(val ? voice.name : null));
    };

    return (
        <div className="flex flex-col h-full bg-rosa-claro p-4 md:p-10 space-y-8 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">{t('TEXT-TO-SPEECH', 'TEXTO A VOZ')}</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    {t('Turn your script into natural, studio-quality audio in seconds. Choose from a variety of professional voice characters.', 'Convierte tu guion en audio natural de calidad de estudio en segundos. Elige entre una variedad de personajes de voz profesionales.')}
                </p>
            </div>
            
            <div className="flex-shrink-0 bg-white/70 backdrop-blur-xl shadow-2xl p-8 rounded-3xl space-y-8 border border-white/50">
                <div>
                    <label className="block text-xs font-black text-negro-fondo mb-3 uppercase tracking-[0.2em] opacity-40">{t('Your Script', 'Tu Guion')}</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t('Type your script here...', 'Escribe tu guion aquí...')}
                        className="w-full h-48 bg-white/40 border-2 border-rosa-principal/20 rounded-2xl p-6 focus:ring-4 focus:ring-rosa-principal/20 focus:border-rosa-principal focus:outline-none resize-none text-negro-fondo placeholder:text-negro-fondo/30 text-xl font-medium transition-all shadow-inner"
                        disabled={isLoading}
                    />
                </div>
                
                <div className="space-y-6">
                    <label className="block text-xs font-black text-negro-fondo mb-4 uppercase tracking-[0.2em] opacity-40">{t('Select Voice Character', 'Seleccionar Personaje de Voz')}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {voices.map((voice) => (
                            <div 
                                key={voice.name}
                                onClick={() => setSelectedVoice(voice.name)}
                                className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 group flex flex-col justify-between ${
                                    selectedVoice === voice.name 
                                    ? 'bg-rosa-principal border-rosa-principal shadow-lg translate-y-[-2px]' 
                                    : 'bg-white/40 border-white/10 hover:bg-white/60 hover:border-rosa-principal/30'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`text-lg font-black tracking-tighter truncate ${selectedVoice === voice.name ? 'text-negro-fondo' : 'text-negro-fondo'}`}>
                                                {voice.displayName}
                                            </h4>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                                voice.type === 'Child' 
                                                    ? (voice.gender === 'Male' ? 'bg-amber-100 text-amber-600' : 'bg-pink-100 text-pink-600')
                                                    : (voice.gender === 'Male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600')
                                            }`}>
                                                {voice.type === 'Child' 
                                                    ? (voice.gender === 'Male' ? 'NIÑO' : 'NIÑA')
                                                    : (voice.gender === 'Male' ? 'MASCULINO' : 'FEMENINO')}
                                            </span>
                                        </div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest leading-tight ${selectedVoice === voice.name ? 'text-negro-fondo/60' : 'text-rosa-principal'}`}>
                                            {voice.description}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePreviewVoice(voice); }}
                                        disabled={!!isPreviewing || isLoading}
                                        className={`p-2 rounded-full flex-shrink-0 transition-all hover:scale-110 active:scale-95 ${
                                            selectedVoice === voice.name 
                                            ? 'bg-white/40 text-negro-fondo' 
                                            : 'bg-rosa-principal/10 text-rosa-principal'
                                        } disabled:opacity-30`}
                                        title={t('Hear Sample', 'Escuchar Muestra')}
                                    >
                                        {isPreviewing === voice.name ? (
                                            <div className="w-5 h-5 flex items-center justify-center">
                                                <div className="w-1 h-3 bg-current animate-bounce mx-[1px]" />
                                                <div className="w-1 h-4 bg-current animate-bounce [animation-delay:0.1s] mx-[1px]" />
                                                <div className="w-1 h-3 bg-current animate-bounce [animation-delay:0.2s] mx-[1px]" />
                                            </div>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className={`text-[10px] leading-tight font-medium ${selectedVoice === voice.name ? 'text-negro-fondo/80' : 'text-negro-fondo/50'}`}>
                                    {voice.vibe}
                                </p>
                                {selectedVoice === voice.name && (
                                    <div className="absolute -bottom-1.5 -right-1.5 bg-negro-fondo text-white rounded-full p-1 shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleMainPlay}
                        disabled={isLoading || isPreviewing !== null || !text.trim()}
                        className="flex-1 bg-negro-fondo text-rosa-principal font-black py-2 sm:py-3 px-4 sm:px-6 rounded-2xl flex items-center justify-center hover:bg-black hover:text-white disabled:bg-negro-fondo/20 disabled:text-negro-fondo/30 disabled:cursor-not-allowed shadow-xl transition-all text-base sm:text-lg uppercase tracking-tighter"
                    >
                        {isLoading ? <Spinner className="w-5 h-5 sm:w-6 sm:h-6 text-rosa-principal" /> : t('GENERATE & PLAY', 'GENERAR Y REPRODUCIR')}
                    </button>
                    
                    {audioSource && (
                        <button
                            onClick={stopAudio}
                            className="bg-red-500 text-white font-black py-2 sm:py-3 px-4 sm:px-6 rounded-2xl flex items-center justify-center hover:bg-red-600 shadow-xl transition-all text-sm sm:text-base uppercase tracking-tighter flex-shrink-0"
                        >
                            {t('STOP', 'DETENER')}
                        </button>
                    )}

                    {generatedAudioUrl && (
                        <a
                            href={generatedAudioUrl}
                            download={`smw-audio-${Date.now()}.wav`}
                            className="bg-rosa-principal text-negro-fondo font-black py-2 sm:py-3 px-4 sm:px-6 rounded-2xl flex items-center justify-center hover:bg-white shadow-xl transition-all text-sm sm:text-base uppercase tracking-tighter flex-shrink-0 border-2 border-rosa-principal hover:border-negro-fondo"
                        >
                            {t('DOWNLOAD AUDIO', 'DESCARGAR AUDIO')}
                        </a>
                    )}
                </div>
            </div>

            {error && <div className="p-5 bg-red-900 text-white rounded-2xl shadow-xl font-bold text-center animate-pulse border-2 border-red-500/50">{error}</div>}

            {/* Information Sections */}
            <div className="space-y-6 mt-12 border-t border-rosa-principal/30 pt-16 max-w-6xl mx-auto w-full">
                {/* Introduction Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">{t('Introduction', 'Introducción')}</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p>{t('Welcome to the Crazy Addictive TEXT-TO-SPEECH Studio, a premium AI speech generation suite powered by Gemini\'s ultra-responsive technology. This studio allows you to transform any written text into natural, lifelike audio in seconds.', 'Bienvenido al Estudio de TEXTO A VOZ Locamente Adictivo, una suite de generación de voz de IA premium impulsada por la tecnología ultra-responsiva de Gemini. Este estudio te permite transformar cualquier texto escrito en audio natural y realista en segundos.')}</p>
                        <p>{t('Unlike standard text-to-speech tools that sound robotic, our studio offers fifteen distinct prebuilt voice characters—ranging from the energetic vibe of Kore to the smooth sophistication of Zephyr. We\'ve recently updated our library to include dedicated kid voices and more masculine gentleman tones to ensure all your creative needs are met.', 'A diferencia de las herramientas estándar de texto a voz que suenan robóticas, nuestro estudio ofrece quince personajes de voz predefinidos distintos, que van desde el estilo enérgico de Kore hasta la suave sofisticación de Zephyr. Recientemente hemos actualizado nuestra biblioteca para incluir voces de niños dedicadas y tonos de caballeros más masculinos para asegurar que todas tus necesidades creativas sean satisfechas.')}</p>
                        <p>{t('This is the ultimate tool for creating social media narration, podcast introductions, training materials, and more. Use these professional voices to save hours of recording time and build a consistent brand voice across all your platforms.', 'Esta es la herramienta definitiva para crear narraciones para redes sociales, introducciones de podcasts, materiales de capacitación y más. Usa estas voces profesionales para ahorrar horas de tiempo de grabación y construir una voz de marca consistente en todas tus plataformas.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isIntroExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
                        </button>
                    </div>
                </div>

                {/* How It Works Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">{t('How It Works', 'Cómo funciona')}</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-700 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p><strong>{t('Step 1: Input Your Text', 'Paso 1: Ingresa tu texto')}</strong> - {t('Paste or type your script into the high-fidelity text area. Our AI can handle everything from snappy 5-second ad hooks to long-form storytelling.', 'Pega o escribe tu guion en el área de texto de alta fidelidad. Nuestra IA puede manejar todo, desde ganchos publicitarios rápidos de 5 segundos hasta narraciones de larga duración.')}</p>
                                <p><strong>{t('Step 2: Preview the Vibe', 'Paso 2: Previsualiza el estilo')}</strong> - {t('Click the \'Play Sample\' button on any voice card to hear an instant preview of their tone and personality before generating your full script.', 'Haz clic en el botón \'Escuchar Muestra\' en cualquier tarjeta de voz para escuchar una vista previa instantánea de su tono y personalidad antes de generar tu guion completo.')}</p>
                            </div>
                            <div className="space-y-4">
                                <p><strong>{t('Step 3: Generate & Play', 'Paso 3: Generar y Reproducir')}</strong> - {t('Hit the \'Generate & Play\' button. The engine synthesizes your text at 24000Hz for crisp, studio-quality output played directly through your device.', 'Presiona el botón \'GENERAR Y REPRODUCIR\'. El motor sintetiza tu texto a 24000Hz para una salida nítida y de calidad de estudio reproducida directamente a través de tu dispositivo.')}</p>
                                <p><strong>{t('Step 4: Refine for Impact', 'Paso 4: Refina para el impacto')}</strong> - {t('Use commas for pauses and periods for breaths. Adjust your script and swap characters until you have the perfect delivery for your project.', 'Usa comas para las pausas y puntos para los respiros. Ajusta tu guion y cambia de personaje hasta que tengas la entrega perfecta para tu proyecto.')}</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isHowItWorksExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
                        </button>
                    </div>
                </div>

                {/* Sales Tips & Monetization Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">{t('Sales & Monetization Ideas', 'Ideas de Ventas y Monetización')}</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-700 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white/40 p-5 rounded-2xl">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">1. {t('Faceless Social Channels', 'Canales sociales sin rostro')}</h4>
                                <p className="text-sm">{t('Use these natural voices to narrate TikToks, Reels, and YouTube Shorts. Faceless channels are high-growth assets that rely on high-quality voiceovers.', 'Usa estas voces naturales para narrar TikToks, Reels y YouTube Shorts. Los canales sin rostro son activos de alto crecimiento que dependen de locuciones de alta calidad.')}</p>
                            </div>
                            <div className="bg-white/40 p-5 rounded-2xl">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">2. {t('Voiceover Service', 'Servicio de locución')}</h4>
                                <p className="text-sm">{t('Offer "Quick-Turnaround Voiceovers" on platforms like Fiverr or Upwork. You can provide professional audio for business ads at a fraction of the cost of traditional talent.', 'Ofrece "Locuciones de entrega rápida" en plataformas como Fiverr o Upwork. Puedes proporcionar audio profesional para anuncios de negocios a una fracción del costo del talento tradicional.')}</p>
                            </div>
                            <div className="bg-white/40 p-5 rounded-2xl">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">3. {t('Educational Content', 'Contenido educativo')}</h4>
                                <p className="text-sm">{t('Narrate online courses or corporate training videos. Clear, human-like voices like Achernar or Zephyr increase information retention for students.', 'Narra cursos en línea o videos de capacitación corporativa. Las voces claras y humanas como Achernar o Zephyr aumentan la retención de información para los estudiantes.')}</p>
                            </div>
                            <div className="bg-white/40 p-5 rounded-2xl">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">4. {t('Audio Article Add-ons', 'Complementos de artículos de audio')}</h4>
                                <p className="text-sm">{t('If you\'re a blogger, offer an "audio version" of your top articles. This improves accessibility and keeps readers engaged with your content longer.', 'Si eres bloguero, ofrece una "versión de audio" de tus mejores artículos. Esto mejora la accesibilidad y mantiene a los lectores comprometidos con tu contenido por más tiempo.')}</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isSalesTipsExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
                        </button>
                    </div>
                </div>

                {/* Pro Tips Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">{t('Pro Tips', 'Consejos Pro')}</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-700 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <ul className="space-y-4">
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black">01</span>
                                <p><strong>{t('Punctuation is Pacing:', 'La puntuación es el ritmo:')}</strong> {t('Commas create natural pauses. Ellipses (...) create dramatic ones. Use them strategically to make the AI sound even more human.', 'Las comas crean pausas naturales. Los puntos suspensivos (...) crean pausas dramáticas. Úsalos estratégicamente para que la IA suene aún más humana.')}</p>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black">02</span>
                                <p><strong>{t('Phonetic Spelling:', 'Ortografía fonética:')}</strong> {t('If the AI struggles with a brand name, spell it phonetically. For example, "Gemini" could be written as "Jem-in-eye" for a different inflection.', 'Si la IA tiene problemas con el nombre de una marca, escríbelo fonéticamente. Por ejemplo, "Gemini" podría escribirse como "Jem-in-ai" para una inflexión diferente.')}</p>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black">03</span>
                                <p><strong>{t('Voice Matching:', 'Emparejamiento de voz:')}</strong> {t('Match the voice to your demographic. Use Kore for Gen Z audiences, and Zephyr or Achernar for professional markets.', 'Empareja la voz con tu demografía. Usa Kore para audiencias de la Generación Z, y Zephyr o Achernar para mercados profesionales.')}</p>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black">04</span>
                                <p><strong>{t('Layer with Music:', 'Capa con música:')}</strong> {t('Download your voiceover and layer it over soft background music (lo-fi for Zephyr, energetic for Kore) to create a 10x more professional finish.', 'Descarga tu locución y colócala sobre música de fondo suave (lo-fi para Zephyr, enérgica para Kore) para crear un acabado 10 veces más profesional.')}</p>
                            </li>
                        </ul>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isProTipsExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="h-20 flex-shrink-0" />
        </div>
    );
};

export default TextToSpeech;