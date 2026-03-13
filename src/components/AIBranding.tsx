import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface AIBrandingProps {
    addCreations: (images: string[]) => void;
}

const scenes = [
    { name: 'Reportaje en Periódico', description: 'sosteniendo un periódico grande impreso a medida. La portada presenta el activo de marca proporcionado.' },
    { name: 'Escaparate de Smartphone', description: 'sentado junto a un smartphone grande y de gran tamaño que muestra el activo de marca proporcionado en la pantalla.' },
    { name: 'Sosteniendo Activo', description: 'sosteniendo el activo de marca, sonriendo profesionalmente a la cámara en un entorno brillante y moderno.' },
    { name: 'En Pantalla de Laptop', description: 'trabajando en una laptop que muestra el activo de marca en su pantalla.' },
    { name: 'Escritorio de Oficina', description: 'sentado en un escritorio de oficina limpio y moderno con el activo de marca colocado ordenadamente junto a una laptop.' },
    { name: 'Modo Presentación', description: 'de pie junto a una pantalla grande que muestra el activo de marca como si estuviera dando una presentación.' },
    { name: 'Sesión de Trabajo en Café', description: 'sentado en un café de moda con luz cálida con el activo de marca colocado naturalmente sobre la mesa junto a una taza de café.' },
    { name: 'Valla Publicitaria en la Ciudad', description: 'mostrando el activo de marca en una gran valla publicitaria digital en una concurrida plaza de la ciudad.' },
    { name: 'Pared de Galería de Arte', description: 'el activo de marca enmarcado profesionalmente y colgado en una pared blanca limpia en una galería de arte de alta gama.' },
    { name: 'Estantería Acogedora', description: 'el activo de marca mostrado elegantemente en una estantería de madera entre libros estéticos y plantas de interior.' },
    { name: 'Exhibición en Tienda Minorista', description: 'el activo de marca destacado de manera prominente en el escaparate de una boutique minorista de lujo.' },
    { name: 'Estudio de Podcast', description: 'el activo de marca mostrado en una pantalla digital dentro de un estudio de podcast profesional y con ambiente.' },
    { name: 'En una Tableta', description: 'sosteniendo una tableta moderna de alta resolución que muestra el activo de marca claramente.' },
    { name: 'Flatlay con Accesorios', description: 'una composición profesional de flatlay desde arriba que presenta el activo de marca rodeado de accesorios estéticos de espacio de trabajo.' },
];

const poses = [
    'Una pose profesional y segura mirando directamente a la cámara.',
    'Una pose cándida y feliz, mirando ligeramente fuera de cámara.',
    'Una pose reflexiva, mirando el activo de marca con interés.',
    'Una pose sonriente, señalando ligeramente el activo de marca.'
];

const Step: React.FC<{ number: number; title: string; children: React.ReactNode; info: string }> = ({ number, title, children, info }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-white/50 mb-4">
        <h3 className="text-xl font-bold text-black mb-1 tracking-tight">Paso {number}: {title}</h3>
        <p className="text-sm text-gray-600 mb-4 font-normal">{info}</p>
        {children}
    </div>
);

const AIBranding: React.FC<AIBrandingProps> = ({ addCreations }) => {
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [assetImage, setAssetImage] = useState<{ file: File, preview: string } | null>(null);
    const [selectedScene, setSelectedScene] = useState(scenes[0]);
    const [poseVariation, setPoseVariation] = useState<'4 Poses' | 'Misma Pose'>('4 Poses');
    const [customPrompt, setCustomPrompt] = useState('');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwBrandingFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedScene) {
                    const scene = scenes.find(s => s.name === parsed.selectedScene);
                    if (scene) setSelectedScene(scene);
                }
                if (parsed.poseVariation) setPoseVariation(parsed.poseVariation === 'Same Pose' ? 'Misma Pose' : '4 Poses');
                if (parsed.customPrompt) setCustomPrompt(parsed.customPrompt);
            } catch (e) {
                console.error("Failed to load branding form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedScene: selectedScene.name,
            poseVariation: poseVariation === 'Misma Pose' ? 'Same Pose' : '4 Poses',
            customPrompt
        };
        localStorage.setItem('smwBrandingFormState', JSON.stringify(formState));
    }, [selectedScene, poseVariation, customPrompt]);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);
    
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const personInputRef = useRef<HTMLInputElement>(null);
    const assetInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
            if (assetImage?.preview) URL.revokeObjectURL(assetImage.preview);
        };
    }, [personImage, assetImage]);

    const handlePersonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPersonImage({ file, preview: URL.createObjectURL(file) });
    };

    const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setAssetImage({ file, preview: URL.createObjectURL(file) });
    };

    const handleGenerate = async () => {
        if (!personImage || !assetImage) {
            setError('Por favor, sube tanto tu foto como el activo de marca.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const personBase64 = await fileToBase64(personImage.file);
            const assetBase64 = await fileToBase64(assetImage.file);
            
            const sessionImages: string[] = [];
            const count = 4; // Always generate 4 for consistency in the gallery

            for (let i = 0; i < count; i++) {
                const currentPose = poseVariation === '4 Poses' ? poses[i % poses.length] : poses[0];
                const promptText = `**PROTOCOLO DE PRESERVACIÓN DE IDENTIDAD**
SUJETO: La persona en la primera imagen de referencia.
REQUISITO: Coincidencia de identidad facial al 100%. Mantener la forma exacta de los ojos, la estructura de la nariz, el contorno de los labios y las proporciones faciales. 
NO embellecer, suavizar ni alterar el rostro. El rostro debe ser idéntico al de origen.
ENTORNO: ${selectedScene.description}
BRANDING: El activo de marca (folleto, logotipo o contenido de pantalla) de la segunda imagen de referencia debe aparecer de manera prominente en la escena.
POSE: ${currentPose}
ESTILO: Fotografía comercial de alta gama fotorrealista, iluminación de estudio, resolución 8k.
${customPrompt ? `CONTEXTO ADICIONAL: ${customPrompt}.` : ''}`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            { text: "REFERENCIA DE IDENTIDAD ESTRICTA:" },
                            { inlineData: { mimeType: personImage.file.type, data: personBase64 } },
                            { text: "REFERENCIA DE ACTIVO DE MARCA:" },
                            { inlineData: { mimeType: assetImage.file.type, data: assetBase64 } },
                            { text: promptText }
                        ]
                    },
                    config: { 
                        systemInstruction: "Eres un experto fotógrafo comercial y especialista en preservación de identidad. Tu prioridad absoluta es generar imágenes donde el rostro del sujeto sea una coincidencia del 100% con la imagen de referencia proporcionada. Debes mantener todos los rasgos faciales únicos, la estructura ósea y las características sin ninguna modificación, suavizado o 'embellecimiento'. La identidad debe ser inconfundible y consistente con la fuente.",
                        responseModalities: [Modality.IMAGE] 
                    },
                });

                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    sessionImages.push(src);
                    setGeneratedImages(prev => [...prev, src]);
                }
                
                if (i < count - 1) await new Promise(r => setTimeout(r, 1000));
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            setError('La generación falló. Por favor, inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col bg-rosa-claro min-h-full p-4 md:p-8 space-y-6 overflow-y-auto text-negro-fondo">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">Branding con IA</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    Crea fotos profesionales que muestren tus activos de marca en escenas realistas con preservación absoluta de la identidad.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column */}
                <div className="lg:col-span-5 flex flex-col">
                    <Step number={1} title="Sube Tu Foto" info="Sube un retrato claro para la referencia de identidad.">
                        <div 
                            onClick={() => personInputRef.current?.click()} 
                            className="aspect-video bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-100 cursor-pointer hover:border-rosa-principal transition-all p-4 group relative overflow-hidden"
                        >
                            {personImage ? (
                                <img src={personImage.preview} className="h-full object-contain rounded-xl" alt="Identidad" />
                            ) : (
                                <div className="text-center opacity-40 group-hover:opacity-60 transition-opacity">
                                    <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    <p className="text-xs font-bold uppercase tracking-widest">Haz clic para subir foto</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={handlePersonUpload} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title="Sube Tu Activo de Marca" info="Sube tu folleto, tarjeta de presentación o cuaderno de trabajo.">
                        <div 
                            onClick={() => assetInputRef.current?.click()} 
                            className="aspect-video bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-100 cursor-pointer hover:border-rosa-principal transition-all p-4 group relative overflow-hidden"
                        >
                            {assetImage ? (
                                <img src={assetImage.preview} className="h-full object-contain rounded-xl" alt="Activo" />
                            ) : (
                                <div className="text-center opacity-40 group-hover:opacity-60 transition-opacity">
                                    <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-2-2m0 0l-2 2m2-2v12" /></svg>
                                    <p className="text-xs font-bold uppercase tracking-widest">Haz clic para subir activo</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={assetInputRef} onChange={handleAssetUpload} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={3} title="Elige Tu Escena" info="Selecciona un entorno profesional para tu exhibición.">
                        <div className="space-y-4">
                            <select 
                                value={selectedScene.name} 
                                onChange={e => setSelectedScene(scenes.find(s => s.name === e.target.value) || scenes[0])}
                                className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm font-bold text-black focus:ring-2 focus:ring-rosa-principal outline-none shadow-sm"
                            >
                                {scenes.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                            <textarea
                                value={customPrompt}
                                onChange={e => setCustomPrompt(e.target.value)}
                                placeholder="Añade detalles personalizados (ej., usando un blazer azul)..."
                                className="w-full h-24 bg-white border-2 border-gray-100 rounded-xl p-3 text-sm font-medium text-black focus:ring-2 focus:ring-rosa-principal outline-none resize-none placeholder:text-gray-400"
                            />
                        </div>
                    </Step>

                    <Step number={4} title="Elige Poses" info="Obtén 4 poses variadas o 4 tomas similares.">
                        <div className="flex bg-gray-50 rounded-full p-1 border border-gray-200">
                            {(['4 Poses', 'Misma Pose'] as const).map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => setPoseVariation(p)} 
                                    className={`flex-1 text-center rounded-full py-2.5 text-sm font-bold transition-all ${poseVariation === p ? 'bg-rosa-principal text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </Step>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !personImage || !assetImage} 
                        className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg transition-all"
                    >
                        {isLoading ? <Spinner className="mx-auto" /> : 'Generar Fotos de Branding'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold text-center border border-red-100">{error}</div>}
                </div>

                {/* Right Column (Gallery) */}
                <div className="lg:col-span-7 bg-white shadow-sm p-8 rounded-3xl border border-white/50 flex flex-col min-h-[600px]">
                    <h3 className="text-sm font-bold text-center text-black uppercase tracking-widest mb-8">Galería de Resultados</h3>
                    <div className="grid grid-cols-2 gap-6 flex-1">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="relative aspect-square bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden group shadow-inner">
                                {isLoading && i >= generatedImages.length ? (
                                    <div className="text-center">
                                        <Spinner className="w-10 h-10 text-rosa-principal mb-2 mx-auto" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase animate-pulse">Diseñando...</p>
                                    </div>
                                ) : generatedImages[i] ? (
                                    <div className="relative group w-full h-full">
                                        <img src={generatedImages[i]} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setZoomedImage(generatedImages[i])} alt="Resultado" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button onClick={() => setZoomedImage(generatedImages[i])} className="bg-white text-black p-2 rounded-full shadow-md"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={generatedImages[i]} download className="bg-white text-black p-2 rounded-full shadow-md"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-gray-200 text-7xl font-bold select-none">{i + 1}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Content Blocks */}
            <div className="space-y-6 pt-16 border-t border-rosa-principal/20 max-w-7xl mx-auto w-full pb-20">
                <div className="bg-white p-10 rounded-3xl shadow-sm border border-white/50 text-center">
                    <h2 className="text-2xl font-bold text-black mb-6 uppercase tracking-widest">Introducción</h2>
                    <div className={`text-gray-600 space-y-4 text-sm leading-relaxed transition-all duration-500 overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px]' : 'max-h-[80px]'}`}>
                        <p>La herramienta de **Branding con IA** es tu fotógrafo profesional personal y diseñador gráfico en uno. Esta herramienta te permite mostrar tus activos de marca físicos o digitales, como folletos, tarjetas de presentación, cuadernos de trabajo y productos, en entornos de estilo de vida realistas y de alta gama.</p>
                        <p>Nuestra preservación de identidad avanzada asegura que tu rostro se vea perfecto, mientras que nuestra tecnología de mapeo de activos asegura que tus materiales de marca sean claramente visibles y estén correctamente colocados en la escena. Ya sea que estés lanzando un nuevo servicio, promocionando un evento o simplemente quieras elevar tu marca personal, Branding con IA proporciona imágenes de grado comercial en segundos.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-[10px] font-black text-rosa-principal uppercase tracking-widest border-b-2 border-rosa-principal pb-0.5 hover:text-black transition-colors">
                        {isIntroExpanded ? 'Leer Menos' : 'Leer Más'}
                    </button>
                </div>

                <div className="bg-white p-10 rounded-3xl shadow-sm border border-white/50 text-center">
                    <h2 className="text-2xl font-bold text-black mb-6 uppercase tracking-widest">Cómo Funciona</h2>
                    <div className={`text-gray-600 space-y-4 text-sm leading-relaxed transition-all duration-500 overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[80px]'}`}>
                        <p><strong>Paso 1: Fuente de Identidad</strong> - Sube una foto clara de ti mismo. Este es el "plano" que la IA utiliza para asegurar que te veas consistente en cada toma de branding.</p>
                        <p><strong>Paso 2: Fuente de Activo</strong> - Sube tu material de marca. Esto puede ser una maqueta digital de la portada de un cuaderno de trabajo, un diseño de tarjeta de presentación o un folleto. Para obtener el mejor resultado, usa un gráfico de alta resolución.</p>
                        <p><strong>Paso 3: Elige Tu Escena</strong> - Elige entre nuestros entornos profesionales curados, desde una acogedora sesión de trabajo en un café hasta mostrar tu marca en una valla publicitaria de la ciudad.</p>
                        <p><strong>Paso 4: Genera</strong> - Haz clic en el botón para recibir 4 imágenes de branding de alta fidelidad. Puedes elegir "4 Poses" para variedad o "Misma Pose" para un aspecto consistente.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-[10px] font-black text-rosa-principal uppercase tracking-widest border-b-2 border-rosa-principal pb-0.5 hover:text-black transition-colors">
                        {isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}
                    </button>
                </div>

                <div className="bg-white p-10 rounded-3xl shadow-sm border border-white/50 text-center">
                    <h2 className="text-2xl font-bold text-black mb-6 uppercase tracking-widest">Estrategia de Ventas y Marketing</h2>
                    <div className={`text-gray-600 space-y-4 text-sm leading-relaxed transition-all duration-500 overflow-hidden relative ${isMarketingExpanded ? 'max-h-[1000px]' : 'max-h-[80px]'}`}>
                        <p><strong>1. Vistas Previas de Productos Digitales:</strong> Si vendes cuadernos de trabajo o cursos, usa las escenas de "En Laptop" o "Escritorio de Oficina" para mostrar a los compradores potenciales exactamente lo que están obteniendo. Las vistas previas físicas aumentan la confianza y las tasas de conversión.</p>
                        <p><strong>2. Promoción de Eventos:</strong> Crea una sensación de escala mostrando el folleto de tu evento en una "Valla Publicitaria en la Ciudad". Estos visuales de alto impacto hacen que tu evento se sienta prestigioso y de alto perfil.</p>
                        <p><strong>3. Contenido Social de Alta Conversión:</strong> Deja de usar fotos de stock aburridas. Muéstrate en una "Sesión de Trabajo en Café" con tus materiales de marca reales. Este tipo de contenido de estilo de vida auténtico construye una conexión más profunda con tu audiencia.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isMarketingExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsMarketingExpanded(!isMarketingExpanded)} className="mt-4 text-[10px] font-black text-rosa-principal uppercase tracking-widest border-b-2 border-rosa-principal pb-0.5 hover:text-black transition-colors">
                        {isMarketingExpanded ? 'Leer Menos' : 'Leer Más'}
                    </button>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" alt="Zoomed" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 bg-white/10 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-light border border-white/10 backdrop-blur-md transition-all">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIBranding;