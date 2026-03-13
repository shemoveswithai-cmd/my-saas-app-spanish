import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface MoodBoardStylistProps {
    addCreations: (images: string[]) => void;
}

const ONE_PERSON_PROMPT = `You are an AI stylist. Your mission is to generate a NEW, UNIQUE, SINGLE-FRAME professional portrait.
1. IDENTITY: The face MUST be 100% identical to the PERSON image provided.
2. STYLE: The clothing, lighting, background, and color palette MUST be strictly inspired by the MOODBOARD.
3. VARIETY: Generate a completely different composition from the PERSON image. Use a NEW background, NEW clothing, and a NEW camera angle for every shot.
4. NO COLLAGES OR GRIDS: Generate only ONE single high-quality photo. DO NOT generate a grid of images, multiple panels, or a collage. The output MUST be a single, full-frame image of the person.
5. NO MOODBOARD IN OUTPUT: DO NOT include the moodboard itself or any reference images in the final generated photo.
Style: Professional high-end editorial photography.`;

const TWO_PEOPLE_PROMPT = `You are an AI stylist. Your mission is to generate a NEW, UNIQUE, SINGLE-FRAME professional portrait of BOTH people together.
1. IDENTITY: Both faces MUST be 100% identical to the PERSON A and PERSON B images provided.
2. STYLE: The clothing, lighting, background, and color palette for both people MUST be strictly inspired by the MOODBOARD.
3. VARIETY: Generate a completely new composition. Use a NEW background, NEW clothing for both, and a NEW camera angle.
4. NO COLLAGES OR GRIDS: Generate only ONE single high-quality photo of the two people together. DO NOT generate a grid of images, multiple panels, or a collage. The output MUST be a single, full-frame image.
5. NO MOODBOARD IN OUTPUT: DO NOT include the moodboard itself or any reference images in the final generated photo.
Style: Professional high-end editorial photography.`;

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg">
        <h3 className="text-md font-bold text-smw-gray-dark mb-3">Paso {number}: {title}</h3>
        {children}
    </div>
);

type ImageState = { file: File; preview: string } | null;

const ImageUploader: React.FC<{
    title: string;
    image: ImageState;
    onFileChange: (file: File) => void;
    onRemove: () => void;
}> = ({ title, image, onFileChange, onRemove }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileChange(file);
    };
    return (
        <div className="flex flex-col items-center flex-1">
            <h4 className="text-sm font-bold mb-2 text-smw-gray-dark opacity-80 uppercase">{title}</h4>
            <div onClick={() => inputRef.current?.click()} className="w-full aspect-[4/5] bg-white/50 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-smw-pink/50 hover:border-smw-pink transition-colors p-1 relative overflow-hidden">
                {image ? (
                    <img src={image.preview} className="w-full h-full object-cover rounded-md" />
                ) : (
                    <div className="text-center text-smw-gray-dark opacity-40">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <p className="text-xs font-bold">Subir</p>
                    </div>
                )}
            </div>
            {image && <button onClick={onRemove} className="text-[10px] text-red-600 mt-2 font-bold uppercase hover:underline">Eliminar</button>}
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>
    );
};

const MoodBoardStylist: React.FC<MoodBoardStylistProps> = ({ addCreations }) => {
    const [mode, setMode] = useState<'one' | 'two'>('one');
    const [customPrompt, setCustomPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('4:5');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwMoodBoardFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.mode) setMode(parsed.mode);
                if (parsed.customPrompt) setCustomPrompt(parsed.customPrompt);
                if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
            } catch (e) {
                console.error("Failed to load moodboard form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            mode,
            customPrompt,
            aspectRatio
        };
        localStorage.setItem('smwMoodBoardFormState', JSON.stringify(formState));
    }, [mode, customPrompt, aspectRatio]);
    
    const [moodboard, setMoodboard] = useState<ImageState>(null);
    const [personA, setPersonA] = useState<ImageState>(null);
    const [personB, setPersonB] = useState<ImageState>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [showKeyCTA, setShowKeyCTA] = useState(false);

    // Info box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);

    const handleGenerate = async (isAutoRetry = false) => {
        if (!isAutoRetry && (isLoading || cooldown > 0)) {
            console.log("DEBUG: click received - BLOCKED (active process)");
            return;
        }
        
        console.log(`DEBUG: click received - ${isAutoRetry ? 'Auto-retry' : 'Manual'}`);
        
        if (!moodboard || !personA || (mode === 'two' && !personB)) {
            console.log("DEBUG: Validation failed - missing images");
            setError('Por favor, sube todas las imágenes requeridas.');
            return;
        }

        setIsLoading(true);
        setError(null);
        if (!isAutoRetry) {
            setGeneratedImages([]);
            setRetryCount(0);
        }

        try {
            console.log("DEBUG: Initializing Gemini API with key:", process.env.API_KEY ? "PRESENT" : "MISSING");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const promptText = mode === 'one' ? ONE_PERSON_PROMPT : TWO_PEOPLE_PROMPT;
            const sessionImages: string[] = [];
            const mbB64 = await fileToBase64(moodboard.file);
            const aB64 = await fileToBase64(personA.file);
            const bB64 = mode === 'two' ? await fileToBase64(personB!.file) : null;

            const variations = [
                "POSE: Standing, full body shot. CLOTHING: High-fashion outfit from moodboard. BACKGROUND: Wide landscape from moodboard.",
                "POSE: Sitting, relaxed candid. CLOTHING: Casual-chic style from moodboard. BACKGROUND: Interior setting from moodboard.",
                "POSE: Dynamic movement, walking. CLOTHING: Avant-garde interpretation. BACKGROUND: Urban street style.",
                "POSE: Close-up portrait, intense gaze. CLOTHING: Focus on textures and accessories. BACKGROUND: Soft bokeh studio feel."
            ];

            const startIdx = generatedImages.length;
            for (let i = startIdx; i < 4; i++) {
                console.log(`DEBUG: Sending API request for variation ${i + 1} of 4`);
                setLoadingMessage(`Generando variación ${i + 1} de 4...`);
                const parts: Part[] = [
                    { text: "MOODBOARD (Vibe/Colors/Clothes/Background):" }, { inlineData: { mimeType: moodboard.file.type, data: mbB64 } },
                    { text: "FACE TO REPLICATE (Ignore background/pose):" }, { inlineData: { mimeType: personA.file.type, data: aB64 } }
                ];
                if (bB64) parts.push({ text: "SECOND FACE TO REPLICATE:" }, { inlineData: { mimeType: personB!.file.type, data: bB64 } });
                
                let finalPrompt = `${promptText}\n\nSPECIFIC VARIATION FOR THIS IMAGE: ${variations[i]}`;
                if (customPrompt) {
                    finalPrompt += `\n\nUSER CUSTOM INSTRUCTION: ${customPrompt}`;
                }
                finalPrompt += `\nRANDOM SEED: ${Math.random()}`;
                
                parts.push({ text: finalPrompt });

                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts },
                    config: { 
                        responseModalities: [Modality.IMAGE],
                        imageConfig: {
                            aspectRatio: aspectRatio as any
                        }
                    },
                });
                
                console.log(`DEBUG: response status: SUCCESS (variation ${i + 1})`);
                
                const img = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (img) {
                    const src = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
                    sessionImages.push(src);
                    setGeneratedImages(prev => {
                        console.log("DEBUG: images saved to state");
                        console.log("DEBUG: UI re-render triggered");
                        return [...prev, src];
                    });
                }

                if (i < 3) {
                    console.log("DEBUG: Starting safety pause");
                    for (let countdown = 20; countdown > 0; countdown--) {
                        setLoadingMessage(`Pausa de seguridad de IA: Siguiente imagen en ${countdown}s...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    console.log("DEBUG: Safety pause finished");
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
            setRetryCount(0);
            setShowKeyCTA(false);
        } catch (e) {
            console.log("DEBUG: response status: ERROR");
            console.error("DEBUG: Catch block caught error:", e);
            const rawError = String(e);
            
            // Detect Quota Exceeded (RESOURCE_EXHAUSTED)
            const isQuota = rawError.includes("RESOURCE_EXHAUSTED") || rawError.includes("quota") || rawError.includes("exceeded your current quota");
            const isBusy = rawError.includes("429") || rawError.includes("busy");
            
            console.log(`DEBUG: Error details - isQuota: ${isQuota}, isBusy: ${isBusy}, retryCount: ${retryCount}`);

            if (isQuota) {
                console.log("DEBUG: Quota exceeded - stopping retries immediately");
                setError('Cuota alcanzada. Usa tu propia clave API o inténtalo más tarde.');
                setShowKeyCTA(true);
                setRetryCount(0);
                setCooldown(0);
            } else if (isBusy && retryCount < 3) {
                const nextRetry = Math.pow(2, retryCount) * 30; // Exponential backoff: 30s, 60s, 120s
                console.log(`DEBUG: Model busy - retry scheduled in ${nextRetry}s (Attempt ${retryCount + 1})`);
                setRetryCount(prev => prev + 1);
                setCooldown(nextRetry);
            } else {
                setError('La generación falló. Por favor, inténtalo de nuevo.');
            }
        } finally {
            console.log("DEBUG: Finally block executing");
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => {
                setCooldown(c => {
                    if (c <= 1) {
                        clearInterval(timer);
                        handleGenerate(true);
                        return 0;
                    }
                    return c - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    return (
        <div className="flex flex-col h-full bg-smw-pink-light rounded-lg shadow-xl p-4 md:p-6 space-y-4 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">Mood Board IA</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    Crea moodboards profesionales y fusiones de estilo. Sube tu inspiración y mira cómo se aplica a tus propias fotos.
                </p>
            </div>
            {generatedImages.length > 0 && <div className="flex justify-center mb-4"><button onClick={() => {setGeneratedImages([]); setMoodboard(null); setPersonA(null); setPersonB(null);}} className="text-sm py-2 px-4 rounded-lg bg-white/80 hover:bg-white text-smw-gray-dark font-semibold shadow-sm">Empezar de nuevo</button></div>}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Step number={1} title="Elegir Modo">
                        <div className="flex bg-white/50 rounded-full p-1">
                            <button onClick={() => setMode('one')} className={`w-1/2 text-center rounded-full py-2 text-sm font-bold transition-all ${mode === 'one' ? 'bg-smw-pink text-smw-gray-dark' : 'text-smw-gray-dark opacity-60'}`}>1 Persona</button>
                            <button onClick={() => setMode('two')} className={`w-1/2 text-center rounded-full py-2 text-sm font-bold transition-all ${mode === 'two' ? 'bg-smw-pink text-smw-gray-dark' : 'text-smw-gray-dark opacity-60'}`}>2 Personas (Fusión)</button>
                        </div>
                    </Step>

                    <Step number={2} title="Subir Inspiración">
                        <p className="text-xs text-smw-gray-dark opacity-80 mb-3 italic">Sube tu moodboard (el estilo) y la persona que quieres estilizar.</p>
                        <div className="flex gap-4">
                            <ImageUploader title="Moodboard" image={moodboard} onFileChange={f => setMoodboard({file: f, preview: URL.createObjectURL(f)})} onRemove={() => setMoodboard(null)} />
                            <ImageUploader title="Persona A" image={personA} onFileChange={f => setPersonA({file: f, preview: URL.createObjectURL(f)})} onRemove={() => setPersonA(null)} />
                            {mode === 'two' && <ImageUploader title="Persona B" image={personB} onFileChange={f => setPersonB({file: f, preview: URL.createObjectURL(f)})} onRemove={() => setPersonB(null)} />}
                        </div>
                    </Step>

                    <Step number={3} title="Personalizar (Opcional)">
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-smw-gray-dark opacity-60 uppercase block mb-1">Modificador de Prompt Personalizado</label>
                                <textarea 
                                    value={customPrompt} 
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="ej: usando gafas de sol, en una ciudad futurista, sosteniendo un café..."
                                    className="w-full bg-white/50 border border-smw-pink/20 rounded-lg p-2 text-sm focus:outline-none focus:border-smw-pink min-h-[60px] resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-smw-gray-dark opacity-60 uppercase block mb-1">Relación de Aspecto</label>
                                <div className="grid grid-cols-5 gap-1">
                                    {['1:1', '3:4', '4:3', '9:16', '16:9'].map((ratio) => (
                                        <button
                                            key={ratio}
                                            onClick={() => setAspectRatio(ratio)}
                                            className={`py-1 text-[10px] font-bold rounded-md border transition-all ${aspectRatio === ratio ? 'bg-smw-pink border-smw-pink text-smw-gray-dark' : 'bg-white/30 border-smw-pink/20 text-smw-gray-dark opacity-60'}`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Step>

                    <button onClick={() => handleGenerate()} disabled={isLoading || cooldown > 0 || !moodboard || !personA} className="w-full bg-smw-pink text-smw-gray-dark font-bold py-4 rounded-lg hover:bg-white disabled:bg-smw-pink/50 disabled:cursor-not-allowed shadow-md text-lg transition-all">
                        {cooldown > 0 ? (
                            <span className="text-sm uppercase tracking-widest">Modelo ocupado — reintentando en {cooldown}s</span>
                        ) : isLoading ? (
                            <div className="flex flex-col items-center">
                                <Spinner className="mx-auto text-smw-gray-dark" />
                                <span className="text-[10px] mt-1 uppercase tracking-widest">{loadingMessage}</span>
                            </div>
                        ) : 'Estilízame así'}
                    </button>
                    {error && (
                        <div className="space-y-2">
                            <div className="p-3 bg-red-900 text-white rounded-md text-sm">{error}</div>
                            {showKeyCTA && (
                                <button 
                                    onClick={async () => {
                                        await (window as any).aistudio.openSelectKey();
                                        setShowKeyCTA(false);
                                        setError(null);
                                    }}
                                    className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-all text-sm shadow-lg animate-pulse"
                                >
                                    Usar mi propia clave API
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-center text-smw-gray-dark mb-4 border-b border-smw-pink/20 pb-2">Tus Avatares Estilizados</h3>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="relative aspect-[4/5] bg-white/40 rounded-lg flex items-center justify-center overflow-hidden">
                                {isLoading && i >= generatedImages.length ? (
                                    <div className="text-center px-2">
                                        <Spinner className="w-8 h-8 text-smw-pink mb-2 mx-auto" />
                                        <p className="text-[9px] font-black text-smw-gray-dark opacity-40 uppercase tracking-widest leading-tight">{loadingMessage}</p>
                                    </div>
                                ) : generatedImages[i] ? (
                                    <div className="relative group w-full h-full">
                                        <img src={generatedImages[i]} className="w-full h-full object-cover rounded-lg shadow-lg cursor-zoom-in" onClick={() => setZoomedImage(generatedImages[i])} />
                                        <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setZoomedImage(generatedImages[i])} className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={generatedImages[i]} download className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ) : <span className="opacity-20 text-4xl font-bold text-smw-gray-dark">{i + 1}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Restored Info Blocks */}
            <div className="space-y-6 mt-8">
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-4 text-center">Introducción</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[100px]'}`}>
                        <p>La herramienta Mood Board IA es una revolución en el branding personal. En lugar de describir un estilo con palabras, puedes mostrarle a la IA exactamente la vibra, la iluminación y la estética que deseas subiendo una imagen de moodboard. Nuestra IA luego toma tu rostro y lo integra perfectamente en ese nuevo estilo, manteniendo un 100% de parecido mientras adopta el toque profesional de tu inspiración.</p>
                        <p>Ya sea que desees un look editorial de alta moda, una vibra de estilo de vida acogedora o un retrato de fantasía cinematográfica, la herramienta Mood Board te permite lograr consistencia visual con facilidad.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-2 text-smw-pink-dark font-bold hover:underline text-smw-gray-dark">
                            {isIntroExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-4 text-center">Cómo funciona</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[100px]'}`}>
                        <p><strong>Paso 1: Selección de modo</strong> - Elige si deseas estilizar a una sola persona o crear una fusión estilizada de dos personas.</p>
                        <p><strong>Paso 2: Subida de Moodboard</strong> - Sube una imagen que represente el estilo, los colores y el entorno que deseas (ej: un pin de Pinterest, un recorte de revista o una escena generada por IA).</p>
                        <p><strong>Paso 3: Subida de Persona</strong> - Sube una foto clara de tu rostro. La IA utiliza esto como una "fuente de verdad" para asegurar que te veas como tú mismo en el resultado final.</p>
                        <p><strong>Paso 4: Personalización</strong> - Opcionalmente añade un modificador de prompt personalizado para influir en la escena (ej: "usando un sombrero") y elige tu relación de aspecto preferida.</p>
                        <p><strong>Paso 5: Generar</strong> - La IA analiza las texturas e iluminación del moodboard y las aplica a tu imagen, creando 4 variaciones únicas.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-2 text-smw-pink-dark font-bold hover:underline text-smw-gray-dark">
                            {isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-4 text-center">Estrategia de Ventas y Marketing</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isMarketingExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[100px]'}`}>
                        <p><strong>1. Consistencia Estética de Marca:</strong> Utiliza la herramienta Mood Board para asegurar que cada pieza de contenido que publiques coincida con la paleta de colores y la "vibra" específica de tu marca. Esto crea un feed de aspecto profesional que atrae a clientes premium.</p>
                        <p><strong>2. Pre-visualización de Campaña:</strong> Si estás planeando una sesión de fotos real, utiliza esta herramienta para mostrarle a tu fotógrafo exactamente las poses y el estilo que buscas, ¡contigo ya en el encuadre!</p>
                        <p><strong>3. Creación Dinámica de Contenido:</strong> Crea "atuendos del día" o "momentos de estilo de vida" que se ajusten a las tendencias actuales utilizando moodboards de Pinterest que sean tendencia como fuente de inspiración.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isMarketingExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsMarketingExpanded(!isMarketingExpanded)} className="mt-2 text-smw-pink-dark font-bold hover:underline text-smw-gray-dark">
                            {isMarketingExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-2 md:p-6 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Vista ampliada" className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md" aria-label="Cerrar">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoodBoardStylist;