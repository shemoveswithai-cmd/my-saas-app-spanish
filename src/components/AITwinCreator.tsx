import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64, dataURLtoFile } from '../utils';
import { Spinner } from './common/Spinner';
import { UserProfile } from '../App';

type PromptMode = 'Category Prompts' | 'Custom Prompt';

interface Prompt {
    category: string;
    prompts: string[];
}

interface AITwinCreatorProps {
    addCreations: (images: string[]) => void;
    user: UserProfile;
}

const aiTwinPrompts: Prompt[] = [
    { category: 'Experiencia de unboxing', prompts: ["Una persona emocionada mientras desempaca el producto en un entorno de estilo de vida.", "Manos abriendo una caja bellamente empaquetada para revelar el producto en su interior.", "Una vista cenital del producto anidado en su empaque con papel de seda y elementos de marca."] },
    { category: 'Estudio minimalista', prompts: ["Producto en un fondo de estudio limpio y sin costuras en un color suave y neutro.", "Composición geométrica con el producto y formas simples.", "Efecto de producto flotante contra un fondo degradado."] },
    { category: 'Estilo de vida y uso', prompts: ["Producto siendo utilizado en un entorno doméstico natural.", "Un flatlay del producto con accesorios relacionados en una mesa de madera.", "Primer plano de una mano interactuando con el producto."] },
    { category: 'Natural y exteriores', prompts: ["Producto descansando sobre una roca musgosa en un bosque.", "Producto en una playa de arena con olas de fondo.", "Producto contra un fondo de flores vibrantes."] },
    { category: 'Comida y bebida', prompts: ["Producto siendo vertido en un vaso con un efecto de salpicadura dinámico.", "Una toma de ángulo alto del producto como pieza central de una comida deliciosa.", "Producto presentado en una tabla de madera rústica con guarniciones frescas."] },
    { category: 'Tomas heroicas', prompts: ["Toma dramática de ángulo bajo del producto contra un fondo oscuro y marcado.", "Producto iluminado por un solo foco potente que crea un alto contraste.", "Producto rodeado de una niebla etérea o efecto de humo para una sensación premium y misteriosa."] },
    { category: 'Estética de Instagram', prompts: ["Una foto de tendencia con filtros estéticos, grano suave y una pose elegante.", "Iluminación de hora dorada con destello de lente para un look popular en redes sociales.", "Una toma de estética 'clean girl' minimalista en un espacio brillante y moderno."] },
    { category: 'Branding y profesional', prompts: ["Una foto de branding nítida y profesional adecuada para un sitio web corporativo.", "Retrato ejecutivo seguro con un fondo de oficina desenfocado.", "Luciendo profesional y accesible en un entorno de negocios de alta gama."] },
    { category: 'Momentos de viaje', prompts: ["Explorando un destino hermoso con una expresión curiosa y feliz.", "Posando en un lugar famoso con una vista panorámica impresionante.", "Una toma espontánea de un aventurero descubriendo una joya oculta en una nueva ciudad."] },
    { category: 'Cuidado de la piel y belleza', prompts: ["Primer plano de belleza centrado en una piel radiante y maquillaje natural.", "Aplicando un producto de cuidado de la piel con una expresión serena y renovada.", "Iluminación suave y difusa que resalta los rasgos faciales naturales."] },
    { category: 'Fitness y bienestar', prompts: ["Una toma de estilo de vida activo en un estudio de yoga de alta gama.", "Tomando un descanso de un entrenamiento, luciendo en forma y motivado.", "Meditando en un entorno natural y tranquilo."] },
    { category: 'Acogedor en casa', prompts: ["Foto relajada en casa, vistiendo ropa cómoda y bebiendo té.", "Acurrucado en un sofá con un libro en una habitación cálida e iluminada por el sol.", "Disfrutando de una mañana tranquila en una cocina elegante y minimalista."] },
    { category: 'Vibras estacionales', prompts: ["Vistiendo un suéter acogedor rodeado de coloridas hojas de otoño.", "Un atuendo de verano brillante en una playa bañada por el sol.", "Envuelto en un abrigo de invierno elegante en un paisaje nevado."] },
    { category: 'Estilo callejero', prompts: ["Toma de ropa urbana genial con ropa de tendencia en un entorno de ciudad.", "Caminando por un vibrante distrito de moda con un paso seguro.", "Apoyado contra una pared de graffiti con una vibra melancólica y vanguardista."] },
    { category: 'Eventos en vivo', prompts: ["Capturado en el momento en una gala de la industria de alto perfil.", "Dando una charla atractiva en un escenario con iluminación profesional.", "Haciendo networking en un evento profesional concurrido, luciendo seguro."] },
    { category: 'Estilo Francés', prompts: ["Una foto chic de inspiración parisina en un café al aire libre.", "Caminando a lo largo del Sena con una boina elegante y una gabardina.", "Disfrutando de un café au lait en una pequeña mesa redonda en Montmartre."] },
    { category: 'Creativo y conceptual', prompts: ["Una foto artística de alto concepto con iluminación de neón experimental.", "Composición surrealista con elementos oníricos y un estilo único.", "Una toma de moda dramática y vanguardista con colores y formas audaces."] },
];

const Step: React.FC<{ number: number | string; title: string; subtext: string; children: React.ReactNode }> = ({ number, title, subtext, children }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <h3 className="text-lg font-bold text-negro-fondo mb-1">Paso {number}: {title}</h3>
        {children}
        {subtext && <p className="text-sm text-negro-fondo opacity-70 mt-2">{subtext}</p>}
    </div>
);


const AITwinCreator: React.FC<AITwinCreatorProps> = ({ addCreations, user }) => {
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [promptMode, setPromptMode] = useState<PromptMode>('Category Prompts');
    const [prompt, setPrompt] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(aiTwinPrompts[0].category);

    // Load form state from localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem('smwTwinCreatorMode');
        const savedPrompt = localStorage.getItem('smwTwinCreatorPrompt');
        const savedCategory = localStorage.getItem('smwTwinCreatorCategory');
        
        if (savedMode) setPromptMode(savedMode as PromptMode);
        if (savedPrompt) setPrompt(savedPrompt);
        if (savedCategory) setSelectedCategory(savedCategory);
        else if (aiTwinPrompts.length > 0) {
            const firstCat = aiTwinPrompts[0];
            setSelectedCategory(firstCat.category);
            if (!savedPrompt) setPrompt(firstCat.prompts[0]);
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        localStorage.setItem('smwTwinCreatorMode', promptMode);
        localStorage.setItem('smwTwinCreatorPrompt', prompt);
        localStorage.setItem('smwTwinCreatorCategory', selectedCategory);
    }, [promptMode, prompt, selectedCategory]);
    
    const [photoCount, setPhotoCount] = useState<number>(6);
    const [bodyType, setBodyType] = useState('Match Photo');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Info box states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const selfieInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (!selfieFile) {
            setSelfiePreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(selfieFile as Blob);
        setSelfiePreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [selfieFile]);

    const initialSelfieRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.aiTwinSelfie && user.aiTwinSelfie !== initialSelfieRef.current) {
            setSelfiePreview(user.aiTwinSelfie);
            const selfieAsFile = dataURLtoFile(user.aiTwinSelfie, 'ai-twin-selfie.png');
            if (selfieAsFile) {
                setSelfieFile(selfieAsFile);
            }
            initialSelfieRef.current = user.aiTwinSelfie;
        } else if (!user?.aiTwinSelfie && initialSelfieRef.current) {
            // Clear local selfie if it was removed from account
            setSelfieFile(null);
            setSelfiePreview(null);
            initialSelfieRef.current = null;
        }
    }, [user?.aiTwinSelfie]);

    const shufflePrompt = (category: string) => {
        const categoryPrompts = aiTwinPrompts.find(p => p.category === category)?.prompts;
        if (categoryPrompts) {
            const currentIndex = categoryPrompts.indexOf(prompt);
            const nextIndex = (currentIndex + 1) % categoryPrompts.length;
            setPrompt(categoryPrompts[nextIndex]);
        }
    };

    const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setSelfieFile(file);
        if (e.target) e.target.value = '';
    };

    const handleGenerate = async () => {
        console.log("DEBUG: AITwinCreator handleGenerate click handler firing");
        if (!selfieFile) {
            console.log("DEBUG: Validation failed - missing selfie");
            setError('Por favor, sube tu selfie en el Paso 1.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setLoadingMessage('Initializing...');

        try {
            // Re-initialize to pick up any newly selected API key
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            if (!apiKey) throw new Error("Clave API no encontrada. Por favor, asegúrate de que tu clave API de Gemini esté configurada en el entorno.");
            const ai = new GoogleGenAI({ apiKey });
            const allAngles = [
                "Una perspectiva frontal a la altura de los ojos.",
                "Un primer plano detallado.",
                "Un ángulo de tres cuartos.",
                "Una vista de perfil lateral.",
                "Una perspectiva ligeramente picada.",
                "Un ángulo dinámico de estilo espontáneo."
            ];
            
            const angleModifiers = allAngles.slice(0, photoCount);
            
            const sessionImages: string[] = [];
            const selfieBase64 = await fileToBase64(selfieFile);

            for (let i = 0; i < angleModifiers.length; i++) {
                console.log(`DEBUG: Sending API request for pose ${i + 1} of ${angleModifiers.length}`);
                setLoadingMessage(`Generando pose ${i + 1} de ${angleModifiers.length}...`);
                const angleModifier = angleModifiers[i];
                const parts: Part[] = [];
                parts.push({ text: "**Imagen de la Persona Fuente:**" });
                parts.push({ inlineData: { mimeType: selfieFile.type, data: selfieBase64 } });
                const finalPrompt = `**MISIÓN CRÍTICA: Recrea a la persona con un 100% de precisión.** El rostro y el cabello DEBEN coincidir exactamente con la fuente. Escena: ${prompt}. Pose: ${angleModifier}. Estilo: Fotorrealista, alta calidad. Tipo de cuerpo: ${bodyType === 'Match Photo' ? 'exactamente como se muestra en la fuente' : bodyType}.`;
                parts.push({ text: finalPrompt });

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { role: 'user', parts },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                console.log(`DEBUG: API response received for pose ${i + 1}`, response);

                const newImagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (newImagePart?.inlineData) {
                    console.log(`DEBUG: Image data found for pose ${i + 1}, updating state`);
                    const newImageSrc = `data:${newImagePart.inlineData.mimeType};base64,${newImagePart.inlineData.data}`;
                    sessionImages.push(newImageSrc);
                    setGeneratedImages(prev => [...prev, newImageSrc]);
                } else {
                    console.log(`DEBUG: No image data found in response for pose ${i + 1}`);
                }

                if (i < angleModifiers.length - 1) {
                    console.log("DEBUG: Starting safety pause");
                    for (let countdown = 20; countdown > 0; countdown--) {
                        setLoadingMessage(`AI Safety Pause: Siguiente pose en ${countdown}s...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    console.log("DEBUG: Safety pause finished");
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            console.error("DEBUG: Catch block caught error:", e);
            const rawError = String(e);
            if (rawError.includes("429") || rawError.includes("quota") || rawError.includes("RESOURCE_EXHAUSTED")) {
                setError(
                    <div className="flex flex-col gap-3">
                        <p className="font-bold text-red-700">Cuota de IA Alcanzada</p>
                        <p className="text-xs text-red-600 opacity-90">Se ha alcanzado el límite de generación compartido. Puedes esperar un minuto para que se restablezca, o conectar tu propia clave API para obtener resultados ilimitados y más rápidos.</p>
                        <button 
                            onClick={() => (window as any).aistudio?.openSelectKey?.()}
                            className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm self-start border border-red-100"
                        >
                            Conecta tu propia Clave API
                        </button>
                    </div>
                );
            } else {
                setError(e instanceof Error ? e.message : 'Ocurrió un error desconocido.');
            }
        } finally {
            console.log("DEBUG: Finally block executing, resetting loading state");
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-rosa-claro p-4 md:p-10 space-y-6 overflow-y-auto">
            <div className="max-w-6xl space-y-6">
                <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                    <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">CREADOR DE GEMELO IA</h1>
                    <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                        Crea tu propio gemelo digital en segundos. Sube una foto para el parecido y genera fotos de alta calidad de ti mismo en cualquier entorno, estilo o pose con preservación absoluta de la identidad.
                    </p>
                </div>

                <Step number={1} title="Sube tu Selfie" subtext="Tu selfie guardada está precargada. Haz clic para subir una diferente para esta sesión.">
                    <div className="flex justify-center">
                        {selfiePreview ? (
                            <div className="relative group cursor-pointer w-64 h-64" onClick={() => selfieInputRef.current?.click()}>
                                <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover rounded-lg border border-rosa-principal/20" />
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">Haz clic para cambiar</div>
                            </div>
                        ) : (
                            <div onClick={() => selfieInputRef.current?.click()} className="w-64 h-64 bg-white rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-rosa-principal/30 hover:border-rosa-principal transition-colors p-4 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-negro-fondo opacity-40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v-1a3 3 0 013-3h10a3 3 0 013 3v1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                                <p className="text-sm font-bold text-negro-fondo">Haz clic para subir</p>
                                <p className="text-xs text-negro-fondo opacity-60 mt-1 uppercase tracking-wider">PNG, JPG, WEBP hasta 10MB</p>
                            </div>
                        )}
                    </div>
                </Step>

                <Step number={2} title="Personaliza el Tipo de Cuerpo" subtext="Opcionalmente especifica un tipo de cuerpo para tu Gemelo IA.">
                    <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-lg p-3 focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo appearance-none" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem'}}>
                        <option value="Match Photo">Igual a la Foto</option>
                        <option value="Slim">Delgado</option>
                        <option value="Athletic">Atlético</option>
                        <option value="Curvy">Con Curvas</option>
                        <option value="Plus-size">Talla Grande</option>
                    </select>
                </Step>

                <Step number={3} title="Crea tu Prompt" subtext="">
                    <div className="flex gap-6 border-b border-gray-100 mb-6">
                        <button onClick={() => setPromptMode('Category Prompts')} className={`pb-2 px-1 text-sm font-bold transition-all relative ${promptMode === 'Category Prompts' ? 'text-negro-fondo' : 'text-negro-fondo opacity-60'}`}>Prompts por Categoría{promptMode === 'Category Prompts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rosa-principal" />}</button>
                        <button onClick={() => setPromptMode('Custom Prompt')} className={`pb-2 px-1 text-sm font-bold transition-all relative ${promptMode === 'Custom Prompt' ? 'text-negro-fondo' : 'text-negro-fondo opacity-60'}`}>Prompt Personalizado{promptMode === 'Custom Prompt' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rosa-principal" />}</button>
                    </div>
                    {promptMode === 'Category Prompts' ? (
                        <div className="space-y-4">
                            <select value={selectedCategory} onChange={e => {
                                const cat = e.target.value;
                                setSelectedCategory(cat);
                                const firstPrompt = aiTwinPrompts.find(p => p.category === cat)?.prompts[0] || "";
                                setPrompt(firstPrompt);
                            }} className="w-full bg-white border-2 border-gray-100 rounded-lg p-3 focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo appearance-none" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem'}}>
                                {aiTwinPrompts.map(p => <option key={p.category} value={p.category}>{p.category}</option>)}
                            </select>
                            <div className="relative">
                                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo min-h-[60px] resize-none" />
                                <button onClick={() => shufflePrompt(selectedCategory)} className="absolute top-1/2 -translate-y-1/2 right-3 p-2 bg-rosa-principal rounded-lg hover:opacity-90 transition-all text-negro-fondo" title="Cambiar prompt"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>
                            </div>
                        </div>
                    ) : (
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="ej., Un retrato cinematográfico en una ciudad futurista, vistiendo una chaqueta de neón." className="w-full h-24 bg-white border-2 border-gray-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo placeholder:text-gray-300 resize-none" />
                    )}
                </Step>

                <Step number={4} title="Selecciona el Número de Fotos" subtext="Elige cuántas fotos diferentes generar.">
                    <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 gap-1">
                        {[2, 3, 4, 5, 6].map((num) => (
                            <button 
                                key={num}
                                onClick={() => setPhotoCount(num)} 
                                className={`flex-1 text-center rounded-lg py-2.5 text-sm font-bold transition-all ${photoCount === num ? 'bg-rosa-principal text-negro-fondo shadow-sm' : 'text-negro-fondo opacity-60 hover:text-negro-fondo hover:bg-gray-100'}`}
                            >
                                {num} Fotos
                            </button>
                        ))}
                    </div>
                </Step>

                <Step number={5} title="¡Generar!" subtext={`Obtén ${photoCount} fotos diferentes con un solo clic.`}>
                    <button onClick={handleGenerate} disabled={isLoading || !selfieFile} className="w-full bg-rosa-principal text-negro-fondo font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-lg shadow-sm">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Spinner className="w-4 h-4 text-negro-fondo" />
                                <span className="text-sm uppercase tracking-widest font-black">Generando...</span>
                            </div>
                        ) : 'Generar Ahora'}
                    </button>
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 shadow-sm">
                            <p className="mb-2">⚠️ {error}</p>
                            {(String(error).includes('Cuota') || String(error).includes('Límite')) && (
                                <button 
                                    //@ts-ignore
                                    onClick={() => window.aistudio.openSelectKey()} 
                                    className="w-full mt-2 bg-red-600 text-white font-bold py-2 rounded uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all"
                                >
                                    Usar Mi Propia Clave API
                                </button>
                            )}
                        </div>
                    )}
                </Step>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-negro-fondo mb-6">Tu Sesión de Fotos IA</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[...Array(photoCount)].map((_, index) => (
                            <div key={index} className="relative aspect-square bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden group shadow-inner">
                                {generatedImages[index] ? (
                                    <div className="relative group w-full h-full">
                                        <img src={generatedImages[index]} alt={`Result ${index + 1}`} className="w-full h-full object-cover rounded-lg shadow-lg cursor-zoom-in transition-transform group-hover:scale-105" onClick={() => setZoomedImage(generatedImages[index])} />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button onClick={() => setZoomedImage(generatedImages[index])} className="bg-white/90 text-negro-fondo p-1.5 sm:p-2 rounded-full hover:bg-white shadow-md transition-transform active:scale-95"><svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={generatedImages[index]} download={`ai-twin-${index + 1}.png`} className="bg-white/90 text-negro-fondo p-1.5 sm:p-2 rounded-full hover:bg-white shadow-md transition-transform active:scale-95" onClick={e => e.stopPropagation()}><svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ) : isLoading && index >= generatedImages.length ? (
                                    <div className="flex flex-col items-center p-4 text-center">
                                        <Spinner className="w-3 h-3 text-rosa-principal mb-2" />
                                        <p className="text-[7px] font-black text-negro-fondo opacity-40 uppercase tracking-widest leading-tight">Tus visuales se están generando</p>
                                    </div>
                                ) : (
                                    <span className="text-gray-200 text-6xl font-bold">{index + 1}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-rosa-principal/20 pb-20">
                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center uppercase tracking-widest">Introducción</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <p>El Creador de Gemelo IA es una herramienta revolucionaria de marca personal que te permite generar fotos de estilo de vida de calidad profesional de ti mismo en cualquier escenario imaginable. Al mantener un 100% de precisión en la identidad y el rostro, puedes construir una presencia digital consistente que parezca una sesión de fotos editorial de alta gama, todo sin salir de casa.</p>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">{isIntroExpanded ? 'Leer Menos' : 'Leer Más'}</button>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center uppercase tracking-widest">cómo funciona</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                <p><span className="font-bold">paso 1: sube tu selfie</span> - proporciona una selfie clara y de alta calidad. esta sirve como la "fuente de identidad" para todas tus fotos generadas.</p>
                                <p><span className="font-bold">paso 2: selecciona el tipo de cuerpo</span> - elige un tipo de cuerpo que coincida con tu preferencia para asegurar que la ai renderice tu figura correctamente.</p>
                                <p><span className="font-bold">paso 3: elige una escena</span> - elige entre nuestras categorías curadas como "estilo callejero" o "momentos de viaje", o escribe tu propio prompt personalizado.</p>
                                <p><span className="font-bold">paso 4: genera la sesión de fotos</span> - haz clic en generar para recibir fotos de diferentes poses y ángulos de tu gemelo ai en el entorno elegido.</p>
                            </div>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">{isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}</button>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center uppercase tracking-widest">Ventas, consejos e ideas de monetización</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                <div className="bg-pink-50/30 p-4 rounded-lg border border-pink-100/50">
                                    <p className="font-bold text-gray-800 mb-1">1. lookbooks de marca personal</p>
                                    <p className="text-base">crea una identidad visual consistente para tu marca personal. las fotos profesionales de alta calidad aumentan tu valor percibido y atraen a clientes que pagan mejor.</p>
                                </div>
                                <div className="bg-pink-50/30 p-4 rounded-lg border border-pink-100/50">
                                    <p className="font-bold text-gray-800 mb-1">2. servicios de "influencer virtual"</p>
                                    <p className="text-base">ofrece servicios de creación de contenido para marcas generando fotos de estilo de vida con sus productos (vía prompts personalizados) sin necesidad de una sesión de fotos física.</p>
                                </div>
                                <div className="bg-pink-50/30 p-4 rounded-lg border border-pink-100/50">
                                    <p className="font-bold text-gray-800 mb-1">3. gestión de redes sociales</p>
                                    <p className="text-base">usa tu gemelo ai para mantener un calendario de publicaciones diarias en plataformas como instagram o pinterest, manteniendo a tu audiencia comprometida con contenido fresco y de alta gama.</p>
                                </div>
                                <div className="bg-pink-50/30 p-4 rounded-lg border border-pink-100/50">
                                    <p className="font-bold text-gray-800 mb-1">4. construcción de portafolio digital</p>
                                    <p className="text-base">construye un portafolio diverso mostrándote en varios entornos profesionales o creativos para mostrar tu versatilidad a socios potenciales.</p>
                                </div>
                            </div>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">{isSalesTipsExpanded ? 'Leer Menos' : 'Leer Más'}</button>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center uppercase tracking-widest">Consejos Pro</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <div className="space-y-4 text-left">
                                <p><span className="font-bold text-rosa-principal">consejo 1:</span> usa una selfie con luz natural y frontal. las sombras en el rostro en tu foto de origen pueden llevar a resultados inconsistentes en las imágenes generadas.</p>
                                <p><span className="font-bold text-rosa-principal">consejo 2:</span> cuando uses prompts personalizados, incluye palabras clave como "8k", "altamente detallado" e "iluminación cinematográfica" para empujar a la ai hacia el resultado más realista.</p>
                                <p><span className="font-bold text-rosa-principal">consejo 3:</span> para un look más natural, prueba la opción de "misma pose" si encuentras un ángulo específico que te encante, luego solo cambia la escena o el atuendo en el prompt.</p>
                            </div>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">{isProTipsExpanded ? 'Leer Menos' : 'Leer Más'}</button>
                        </div>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex flex-col z-[1000] animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="w-full flex justify-end p-4">
                        <button onClick={() => setZoomedImage(null)} className="text-white bg-white/20 hover:bg-white/40 rounded-full w-12 h-12 flex items-center justify-center text-3xl font-light transition-all backdrop-blur-md border border-white/10" aria-label="Close">&times;</button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Expanded" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10" />
                    </div>
                </div>
            )}
            <input type="file" ref={selfieInputRef} onChange={handleSelfieUpload} className="hidden" accept="image/*" />
        </div>
    );
};

export default AITwinCreator;