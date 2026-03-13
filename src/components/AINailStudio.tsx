import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface AINailStudioProps {
    addCreations: (images: string[]) => void;
}

const nailShapes = ['Cuadrada', 'Redonda', 'Almendra', 'Stiletto', 'Coffin'];
const nailLengths = ['Corta', 'Media', 'Larga', 'Súper Larga'];
const nailDesigns = [
    { name: 'Color Sólido', description: 'una manicura clásica de color sólido' },
    { name: 'Punta Francesa', description: 'una manicura francesa clásica' },
    { name: 'Ombré con Purpurina', description: 'un efecto ombré con purpurina' },
    { name: 'Acabado Cromado', description: 'un acabado cromado de alto brillo' },
    { name: 'Efecto Mármol', description: 'un elegante efecto mármol' },
    { name: 'Estampado de Leopardo', description: 'un atrevido estampado de leopardo' },
    { name: 'Acabado Mate', description: 'un acabado mate suave y no reflectante' },
    { name: 'Arte Floral', description: 'delicado arte de uñas floral pintado a mano' },
    { name: 'Líneas Geométricas', description: 'arte de líneas geométricas minimalistas modernas' },
    { name: 'Efecto Ojo de Gato', description: 'un efecto magnético brillante de ojo de gato' },
    { name: 'Acabado Terciopelo', description: 'un acabado de textura de terciopelo suave al tacto' },
    { name: 'Arte de Remolinos', description: 'remolinos coloridos abstractos de tendencia' },
    { name: 'Uñas Aura', description: 'un efecto de aura degradado de enfoque suave' },
    { name: 'Amuletos 3D', description: 'uñas decoradas con pequeños amuletos 3D de oro y perlas' },
    { name: 'Carey', description: 'un patrón clásico de carey ámbar' },
    { name: 'Acentos de Corazón', description: 'uñas con lindos acentos en forma de corazón' },
    { name: 'Tablero de Ajedrez', description: 'un patrón de tablero de ajedrez retro de tendencia' },
    { name: 'Arte Galáctico', description: 'un impresionante diseño de uñas de nebulosa cósmica' },
    { name: 'Puntos Minimalistas', description: 'arte de micropuntos minimalista y limpio' },
    { name: 'Acentos de Papel de Oro', description: 'uñas con escamas de papel metálico de oro o plata' },
    { name: "Elección de la IA", description: "un diseño de uñas artístico y único" },
];
const nailColors = [
    { name: 'Rojo Clásico', hex: '#C62828', promptValue: 'classic red' },
    { name: 'Beige Nude', hex: '#D2B48C', promptValue: 'nude beige' },
    { name: 'Negro Azabache', hex: '#000000', promptValue: 'jet black' },
    { name: 'Purpurina Dorada', hex: '#FFD700', promptValue: 'gold glitter' },
    { name: 'Rosa Suave', hex: '#F48FB1', promptValue: 'soft pink' },
    { name: 'Esmeralda', hex: '#00897B', promptValue: 'emerald green' },
    { name: 'Azul Marino Profundo', hex: '#1A237E', promptValue: 'deep navy blue' },
    { name: 'Lavanda', hex: '#E1BEE7', promptValue: 'soft lavender' },
    { name: 'Verde Menta', hex: '#B2DFDB', promptValue: 'fresh mint green' },
    { name: 'Melocotón', hex: '#FFCCBC', promptValue: 'warm peach' },
    { name: 'Girasol', hex: '#FBC02D', promptValue: 'bright sunflower yellow' },
    { name: 'Moca', hex: '#5D4037', promptValue: 'rich mocha brown' },
    { name: 'Gris Pizarra', hex: '#607D8B', promptValue: 'slate grey' },
    { name: 'Naranja Atardecer', hex: '#F57C00', promptValue: 'vibrant sunset orange' },
    { name: 'Blanco Perla', hex: '#F5F5F5', promptValue: 'shimmering pearl white' },
    { name: 'Lima Eléctrico', hex: '#C0CA33', promptValue: 'bright electric lime' },
    { name: 'Plata Metálica', hex: '#BDBDBD', promptValue: 'high-shine metallic silver' },
    { name: 'Oro Rosa', hex: '#E57373', promptValue: 'shimmering rose gold' },
    { name: 'Púrpura Real', hex: '#6A1B9A', promptValue: 'deep royal purple' },
    { name: 'Borgoña', hex: '#880E4F', promptValue: 'deep burgundy' },
    { name: 'Turquesa', hex: '#00ACC1', promptValue: 'vibrant turquoise' },
    { name: 'Coral', hex: '#FF7043', promptValue: 'bright coral' },
    { name: 'Azul Teal', hex: '#008080', promptValue: 'deep teal blue' },
    { name: 'Verde Salvia', hex: '#9CAF88', promptValue: 'earthy sage green' },
    { name: 'Malva Polvoriento', hex: '#915F6D', promptValue: 'dusty mauve' },
    { name: 'Rojo Rubí', hex: '#701C1C', promptValue: 'rich ruby wine red' },
    { name: 'Zafiro', hex: '#0F52BA', promptValue: 'vibrant sapphire blue' },
    { name: 'Bronce Brillante', hex: '#CD7F32', promptValue: 'shimmering metallic bronze' },
];

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-white shadow-sm p-6 rounded-xl border border-white/50 mb-4">
        <h3 className="text-xl font-bold text-smw-gray-dark mb-4">Paso {number}: {title}</h3>
        {children}
    </div>
);

const AINailStudio: React.FC<AINailStudioProps> = ({ addCreations }) => {
    const [personImage, setPersonImage] = useState<{ file: File; preview: string } | null>(null);
    const [selectedShape, setSelectedShape] = useState(nailShapes[2]);
    const [selectedLength, setSelectedLength] = useState(nailLengths[1]);
    const [selectedDesign, setSelectedDesign] = useState(nailDesigns[0]);
    const [selectedColor, setSelectedColor] = useState(nailColors[0]);
    const [customNailPrompt, setCustomNailPrompt] = useState('');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwNailFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedShape) setSelectedShape(parsed.selectedShape);
                if (parsed.selectedLength) setSelectedLength(parsed.selectedLength);
                if (parsed.selectedDesign) {
                    const design = nailDesigns.find(d => d.name === parsed.selectedDesign);
                    if (design) setSelectedDesign(design);
                }
                if (parsed.selectedColor) {
                    const color = nailColors.find(c => c.name === parsed.selectedColor);
                    if (color) setSelectedColor(color);
                }
                if (parsed.customNailPrompt) setCustomNailPrompt(parsed.customNailPrompt);
            } catch (e) {
                console.error("Failed to load nail form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedShape,
            selectedLength,
            selectedDesign: selectedDesign.name,
            selectedColor: selectedColor.name,
            customNailPrompt
        };
        localStorage.setItem('smwNailFormState', JSON.stringify(formState));
    }, [selectedShape, selectedLength, selectedDesign, selectedColor, customNailPrompt]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    
    // Info sections states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const personInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { return () => { if (personImage?.preview) URL.revokeObjectURL(personImage.preview); }; }, [personImage]);

    const handleGenerate = async () => {
        if (!personImage) { setError('Sube una foto primero.'); return; }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setLoadingMessage('Inicializando...');

        try {
            // FIX: Initialize the GoogleGenAI client using the pre-configured API key from process.env.API_KEY.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const personBase64 = await fileToBase64(personImage.file);
            const sessionImages: string[] = [];

            for (let i = 0; i < 4; i++) {
                setLoadingMessage(`Creando diseño ${i + 1} de 4...`);
                
                // If custom prompt is provided, prioritize it
                const designInstruction = customNailPrompt.trim() 
                    ? `a custom requested nail set: ${customNailPrompt}`
                    : `${selectedShape} shape, ${selectedLength} length, ${selectedDesign.description} in ${selectedColor.promptValue}`;

                const prompt = `**CRITICAL MISSION: VIRTUAL MANICURE PHOTOSHOOT**
Re-create the person from the reference photo with 100% identity and face accuracy. 
Apply this nail set: ${designInstruction}.
The nails should look perfectly applied and professionally done.
Style: High-end luxury salon product photography with soft cinematic lighting.
Seed: ${Math.random()}`;

                // FIX: Use the 'gemini-2.5-flash-image' model for high-quality image generation as specified in guidelines.
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: "Source Person:" }, { inlineData: { mimeType: personImage.file.type, data: personBase64 } }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                
                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    sessionImages.push(newImage);
                    setGeneratedImages(prev => [...prev, newImage]);
                }

                if (i < 3) {
                    for (let countdown = 8; countdown > 0; countdown--) {
                        setLoadingMessage(`Pausa de seguridad de IA: Siguiente foto en ${countdown}s...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            const errStr = String(e);
            if (errStr.includes("429")) {
                setError('Límite de IA alcanzado. Por favor, espera 2 minutos para generar más.');
            } else {
                setError('La generación falló. Por favor, inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="flex flex-col bg-smw-pink-light min-h-full p-4 md:p-8 space-y-8 overflow-y-auto text-smw-gray-dark">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">Estudio de Uñas IA</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    Diseña las uñas de tus sueños y mira cómo cobran vida en tus propias manos con resultados profesionales de alta fidelidad.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col space-y-6">
                    <Step number={1} title="Sube tu Foto">
                        <div 
                            onClick={() => personInputRef.current?.click()} 
                            className="w-full h-56 bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-pink-200 cursor-pointer hover:border-smw-pink transition-all p-4 relative group overflow-hidden"
                        >
                            {personImage ? (
                                <img src={personImage.preview} className="max-h-full rounded-xl shadow-md object-contain" alt="Vista previa" />
                            ) : (
                                <div className="text-center space-y-2 opacity-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                    <p className="font-bold text-smw-black">Haz clic para subir foto de mano/retrato</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={e => e.target.files?.[0] && setPersonImage({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title="Diseño de Uñas">
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-black uppercase text-smw-gray-dark tracking-widest mb-3">Forma</p>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {nailShapes.map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => { setSelectedShape(s); setCustomNailPrompt(''); }} 
                                            className={`px-2 py-2 rounded-lg text-xs font-black transition-all ${selectedShape === s && !customNailPrompt ? 'bg-smw-pink text-black shadow-md' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-black uppercase text-smw-gray-dark tracking-widest mb-3">Longitud</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {nailLengths.map(l => (
                                        <button 
                                            key={l} 
                                            onClick={() => { setSelectedLength(l); setCustomNailPrompt(''); }} 
                                            className={`px-2 py-2 rounded-lg text-xs font-black transition-all ${selectedLength === l && !customNailPrompt ? 'bg-smw-pink text-black shadow-md' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-black uppercase text-smw-gray-dark tracking-widest mb-3">Diseño</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {nailDesigns.map(d => (
                                        <button 
                                            key={d.name} 
                                            onClick={() => { setSelectedDesign(d); setCustomNailPrompt(''); }} 
                                            className={`px-2 py-2 rounded-lg text-[10px] font-black transition-all ${selectedDesign.name === d.name && !customNailPrompt ? 'bg-smw-pink text-black shadow-md' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                                        >
                                            {d.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-black uppercase text-smw-gray-dark tracking-widest mb-3">Color</p>
                                <div className="flex flex-wrap gap-2">
                                    {nailColors.map(c => (
                                        <button 
                                            key={c.name} 
                                            onClick={() => { setSelectedColor(c); setCustomNailPrompt(''); }} 
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor.name === c.name && !customNailPrompt ? 'border-smw-pink ring-2 ring-smw-pink ring-offset-1' : 'border-white shadow-sm'}`}
                                            style={{ background: c.hex }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-black uppercase text-smw-gray-dark tracking-widest mb-3">Prompt Personalizado (Opcional)</p>
                                <textarea
                                    value={customNailPrompt}
                                    onChange={(e) => setCustomNailPrompt(e.target.value)}
                                    placeholder="ej: uñas stiletto largas de color rosa con pequeñas flores blancas"
                                    className="w-full h-24 bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-smw-pink outline-none resize-none text-black font-medium"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading || !personImage} 
                            className="w-full mt-4 bg-smw-pink text-black font-bold py-4 rounded-xl hover:opacity-95 disabled:opacity-50 transition-all text-lg shadow-sm"
                        >
                            {isLoading ? <Spinner className="mx-auto" /> : 'Generar Sesión de Uñas'}
                        </button>
                    </Step>
                </div>

                <div className="bg-white shadow-md p-6 rounded-3xl border border-white min-h-[450px] flex flex-col">
                    <h3 className="text-base font-bold text-center text-smw-gray-dark mb-6 opacity-20 uppercase tracking-widest">Galería de Uñas</h3>
                    <div className="flex-1">
                        {isLoading && generatedImages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-3">
                                <Spinner className="w-10 h-10 text-smw-pink" />
                                <p className="text-gray-400 font-bold animate-pulse text-sm text-center">{loadingMessage}</p>
                            </div>
                        ) : generatedImages.length === 0 ? (
                            <div className="grid grid-cols-2 gap-4 h-full">
                                {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="bg-gray-50 rounded-2xl aspect-square flex items-center justify-center shadow-inner border border-gray-100">
                                        <span className="text-6xl font-bold text-gray-100 select-none">{n}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {generatedImages.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden shadow-md bg-gray-50 border-2 border-white">
                                        <img src={img} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-110" alt="Resultado de Uñas" onClick={() => setZoomedImage(img)} />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => setZoomedImage(img)} className="bg-white text-smw-black p-2 rounded-full hover:scale-110 shadow-lg active:scale-95"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={img} download={`resultado-uñas-${idx + 1}.png`} className="bg-white text-smw-black p-2 rounded-full hover:scale-110 shadow-lg active:scale-95"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6 pt-10 border-t border-smw-pink/20 pb-20">
                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center uppercase tracking-widest">Introducción</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>El Estudio de Uñas IA es una herramienta de visualización especializada para técnicos de uñas, propietarios de salones y entusiastas de la belleza. Esta plataforma te permite diseñar conjuntos de uñas personalizados y verlos aplicados de manera realista a tus propias manos o a referencias de modelos de alta calidad.</p>
                        <p>Nuestra IA avanzada comprende los finos detalles de las formas, longitudes y diseños intrincados de las uñas. Ya sea que estés planeando tu próxima manicura o creando contenido para la marca de tu salón, el estudio ofrece resultados de grado comercial que mantienen un 100% de precisión de identidad.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">{isIntroExpanded ? 'Leer menos' : 'Leer más'}</button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center uppercase tracking-widest">Cómo funciona</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            <p><span className="font-bold">paso 1: sube foto de mano</span> - sube una foto clara de tu mano o un retrato. para mejores resultados, asegúrate de que tus uñas sean visibles o que la mano esté en una posición natural.</p>
                            <p><span className="font-bold">paso 2: elige tu estilo</span> - selecciona tu forma, longitud y diseño de uñas preferidos de nuestra biblioteca curada de estilos de tendencia.</p>
                            <p><span className="font-bold">paso 3: elige un color</span> - elige de nuestra extensa paleta de colores de uñas profesionales o describe un tono personalizado.</p>
                            <p><span className="font-bold">paso 4: generar y guardar</span> - haz clic en generar para ver 4 variaciones únicas de tu diseño. ¡descarga tus favoritas para mostrárselas a tu técnico de uñas!</p>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">{isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}</button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center uppercase tracking-widest">Ventas, consejos e ideas de monetización</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="bg-white/50 p-5 rounded-2xl border border-pink-100/30 shadow-sm flex flex-col">
                                <p className="font-bold text-gray-800 mb-1">1. visualización del menú del salón</p>
                                <p className="text-base leading-relaxed">utiliza el estudio para crear un lookbook digital para tu salón. muestra a los clientes exactamente cómo se ve un "ombré con purpurina" o una "uña aura" antes de que reserven.</p>
                            </div>
                            <div className="bg-white/50 p-5 rounded-2xl border border-pink-100/30 shadow-sm flex flex-col">
                                <p className="font-bold text-gray-800 mb-1">2. negocio de uñas press-on</p>
                                <p className="text-base leading-relaxed">si vendes uñas press-on, utiliza la ia para crear fotografía de producto de alta gama sin el costo de una modelo de manos profesional.</p>
                            </div>
                            <div className="bg-white/50 p-5 rounded-2xl border border-pink-100/30 shadow-sm flex flex-col">
                                <p className="font-bold text-gray-800 mb-1">3. contenido para redes sociales</p>
                                <p className="text-base leading-relaxed">genera diseños de uñas de tendencia para mantener activo e inspirador tu feed de instagram o tiktok, incluso entre tus propias citas.</p>
                            </div>
                            <div className="bg-white/50 p-5 rounded-2xl border border-pink-100/30 shadow-sm flex flex-col">
                                <p className="font-bold text-gray-800 mb-1">4. consultas de diseño personalizadas</p>
                                <p className="text-base leading-relaxed">cobra una pequeña tarifa por una "consulta de uñas digital" donde ayudes a las clientas a visualizar las uñas de sus sueños para su boda o evento usando la ia.</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">{isSalesTipsExpanded ? 'Leer menos' : 'Leer más'}</button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center uppercase tracking-widest">Consejos Profesionales</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <div className="space-y-4 text-left">
                            <p><span className="font-bold text-smw-pink">consejo 1:</span> para obtener los resultados más realistas, utiliza una foto con iluminación clara y uniforme. las sombras en los dedos a veces pueden confundir la colocación de las uñas por parte de la ia.</p>
                            <p><span className="font-bold text-smw-pink">consejo 2:</span> utiliza el cuadro de "prompt personalizado" para añadir detalles específicos como "acabado mate con papel de oro" o "pequeñas perlas blancas en el dedo anular".</p>
                            <p><span className="font-bold text-smw-pink">consejo 3:</span> si la ia no coincide perfectamente con tu mano, intenta con una foto más alejada que muestre toda tu mano y muñeca para un mejor contexto.</p>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">{isProTipsExpanded ? 'Leer menos' : 'Leer más'}</button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-12 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Ampliada" className="max-w-full max-h-full object-contain rounded-md shadow-2xl border-4 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md" aria-label="Cerrar">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// FIX: Added missing default export to satisfy the import requirement in App.tsx.
export default AINailStudio;