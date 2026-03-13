import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64, dataURLtoFile } from '../utils';
import { Spinner } from './common/Spinner';
import { UserProfile } from '../App';

interface AIVlogsProps {
    addCreations: (images: string[]) => void;
    user: UserProfile;
}

const vlogRoutineCategories = [
    {
        name: 'Rutina de Mañana',
        prompts: [
            "Despertando en un dormitorio de lujo iluminado por el sol, estirándose.",
            "Rutina de cuidado de la piel matutina en un espejo de baño minimalista de alta gama.",
            "Cocinando un desayuno saludable en una cocina moderna y luminosa.",
            "Comiendo un hermoso plato de tostadas de aguacate en una barra de desayuno bañada por el sol.",
            "Bebiendo un jugo verde mientras mira por un ventanal de piso a techo.",
            "Escribiendo en un diario en un rincón acogedor con una taza de café humeante.",
            "Haciendo un flujo rápido de yoga matutino en una sala de estar amplia y luminosa.",
            "Preparándose para el día, mirándose en el espejo de un vestidor."
        ]
    },
    {
        name: 'Producto y Estilo de Vida',
        prompts: [
            "Desempaquetando un paquete de lujo en una mesa de mármol blanco.",
            "Aplicando un suero facial premium, luciendo renovada y radiante.",
            "Sirviendo una bebida energética gaseosa en un vaso con hielo y limón.",
            "Comprando productos de belleza de alta gama en una boutique de moda.",
            "Sentada en un café parisino con un café con leche y una computadora portátil.",
            "Buscando flores frescas en un vibrante mercado al aire libre de fin de semana.",
            "Vistiéndose para un gran evento de gala.",
            "Trabajando desde un balcón en un piso alto con una vista panorámica de la ciudad."
        ]
    },
    {
        name: 'Fitness y Salud',
        prompts: [
            "Atándose los cordones de unas zapatillas de correr de alta gama en un gimnasio moderno en casa.",
            "Sesión de entrenamiento enfocada, levantando pesas en un entorno de gimnasio de alto contraste.",
            "Tomándose una selfie sudorosa después de un entrenamiento intenso, luciendo motivada.",
            "Bebiendo un batido de proteínas mientras se apoya en una máquina de gimnasio.",
            "Estirándose en un estudio de yoga luminoso con suelos de madera y plantas.",
            "Trotando por un sendero panorámico junto al río durante la hora dorada.",
            "Preparando una colorida ensalada post-entrenamiento en una cocina elegante.",
            "Meditando en un tranquilo jardín Zen con suave luz solar filtrada."
        ]
    },
    {
        name: 'Trabajo y Profesional',
        prompts: [
            "Sesión de trabajo enfocada en una MacBook en una oficina minimalista.",
            "Dando una presentación atractiva en una moderna sala de juntas de cristal.",
            "Grabando un podcast en un estudio profesional iluminado con neón.",
            "Tomándose una foto profesional de negocios frente a una pared con textura.",
            "Haciendo networking en un evento de la industria de alta gama con una sonrisa confiada.",
            "Leyendo un libro profesional en una biblioteca acogedora con sillas de cuero.",
            "Organizando una agenda digital en una tableta en un espacio de coworking luminoso.",
            "Caminando rápidamente por un moderno distrito de negocios en el centro."
        ]
    },
    {
        name: 'Viajes y Ambiente',
        prompts: [
            "Conduciendo un coche deportivo negro de lujo en una carretera costera panorámica.",
            "Bajando de un jet privado a una pista soleada.",
            "Relajándose en una piscina infinita con vistas a una playa tropical.",
            "Comiendo ramen en un restaurante moderno y auténtico en Tokio.",
            "Posando con la Torre Eiffel a lo lejos en París.",
            "Caminando por las calles coloridas de un pueblo italiano.",
            "Haciendo el check-in en el vestíbulo de un gran hotel de 5 estrellas con suelos de mámrol.",
            "Viendo el atardecer desde un bar en la azotea con un cóctel."
        ]
    }
];

const aspectRatios = [
    { label: 'Cuadrado (1:1)', value: '1:1' },
    { label: 'Retrato (4:5)', value: '4:5' },
    { label: 'Alto (9:16)', value: '9:16' },
    { label: 'Estándar (4:3)', value: '4:3' },
    { label: 'Panorámico (16:9)', value: '16:9' }
];

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 mb-4">
        <h3 className="text-lg font-bold text-negro-fondo mb-4 uppercase tracking-tight">Paso {number}: {title}</h3>
        {children}
    </div>
);

const AIVlogs: React.FC<AIVlogsProps> = ({ addCreations, user }) => {
    const [personImage, setPersonImage] = useState<{ file: File; preview: string } | null>(null);
    const [selectedRoutine, setSelectedRoutine] = useState(vlogRoutineCategories[0].prompts[0]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState('9:16');

    // Load form state from localStorage
    useEffect(() => {
        const savedRoutine = localStorage.getItem('smwVlogsRoutine');
        const savedCustom = localStorage.getItem('smwVlogsCustom');
        const savedRatio = localStorage.getItem('smwVlogsRatio');
        
        if (savedRoutine) setSelectedRoutine(savedRoutine);
        if (savedCustom) setCustomPrompt(savedCustom);
        if (savedRatio) setSelectedAspectRatio(savedRatio);
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        localStorage.setItem('smwVlogsRoutine', selectedRoutine);
        localStorage.setItem('smwVlogsCustom', customPrompt);
        localStorage.setItem('smwVlogsRatio', selectedAspectRatio);
    }, [selectedRoutine, customPrompt, selectedAspectRatio]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Saved Looks persistence
    const [savedLooks, setSavedLooks] = useState<string[]>([]);
    const [selectedLook, setSelectedLook] = useState<string | null>(null);

    // Expansion states for info sections
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const personInputRef = useRef<HTMLInputElement>(null);

    // Load saved looks
    useEffect(() => {
        const saved = localStorage.getItem(`smwSavedVlogLooks_${user.uid}`);
        if (saved) {
            try {
                setSavedLooks(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved looks", e);
            }
        }
    }, [user.uid]);

    const handleSaveLook = (imageUrl: string) => {
        const newLooks = [imageUrl, ...savedLooks].slice(0, 10); // Keep last 10
        setSavedLooks(newLooks);
        localStorage.setItem(`smwSavedVlogLooks_${user.uid}`, JSON.stringify(newLooks));
    };

    const handleDeleteLook = (index: number) => {
        const newLooks = savedLooks.filter((_, i) => i !== index);
        setSavedLooks(newLooks);
        localStorage.setItem(`smwSavedVlogLooks_${user.uid}`, JSON.stringify(newLooks));
        if (selectedLook === savedLooks[index]) {
            setSelectedLook(null);
        }
    };

    const initialSelfieRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.aiTwinSelfie && user.aiTwinSelfie !== initialSelfieRef.current) {
            const file = dataURLtoFile(user.aiTwinSelfie, 'vlog-selfie.png');
            if (file) {
                setPersonImage({ file, preview: user.aiTwinSelfie });
                initialSelfieRef.current = user.aiTwinSelfie;
            }
        } else if (!user?.aiTwinSelfie && initialSelfieRef.current) {
            // Clear local person image if it was removed from account
            setPersonImage(null);
            initialSelfieRef.current = null;
        }
    }, [user?.aiTwinSelfie]);

    useEffect(() => {
        return () => {
            if (personImage?.preview && personImage.preview !== user?.aiTwinSelfie) {
                URL.revokeObjectURL(personImage.preview);
            }
        };
    }, [personImage, user?.aiTwinSelfie]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPersonImage({ file, preview: URL.createObjectURL(file) });
        }
    };

    const handleGenerate = async () => {
        if (!personImage) {
            setError('Por favor, sube tu foto primero.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setLoadingMessage('Preparando sesión...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const personBase64 = await fileToBase64(personImage.file);
            const sessionImages: string[] = [];

            for (let i = 0; i < 4; i++) {
                setLoadingMessage(`Generando foto ${i + 1} de 4...`);
                
                // Determine the base scene prompt
                let sceneDescription = customPrompt || selectedRoutine;

                const styleInstruction = selectedLook 
                    ? `**BLOQUEO DE ATUENDO:** La persona DEBE llevar EXACTAMENTE el mismo atuendo que se ve en la imagen de 'REFERENCIA DE LOOK'. Ignora la ropa predeterminada de la escena.
                       **CONTINUIDAD DE ESTILO:** El estilo de cabello y la estética deben coincidir con la 'REFERENCIA DE LOOK'.`
                    : "Estilo: Fotografía de estilo de vida natural y profesional, iluminación cinematográfica.";

                const promptText = `**TAREA: CREACIÓN DE CONTENIDO DE VLOG CON IA (MODO REGULAR)**
**OBJETIVO:** Crear una foto de vlog de estilo de vida profesional y de alta calidad.

${styleInstruction}

**DIRECCIÓN DE LA ESCENA:** 
Coloca a la persona en esta escena: ${sceneDescription}. 
La persona debe lucir natural y comprometida con la actividad.

**IDENTIDAD:** El rostro DEBE coincidir perfectamente con la 'FUENTE DE IDENTIDAD'.

Semilla de Unicidad: ${Math.random()}`;

                const parts: Part[] = [
                    { text: "FUENTE DE IDENTIDAD (Rostro Objetivo):" },
                    { inlineData: { mimeType: personImage.file.type, data: personBase64 } }
                ];

                if (selectedLook) {
                    const mime = selectedLook.match(/data:(.*?);/)?.[1] || "image/png";
                    const data = selectedLook.split(',')[1];
                    parts.push({ text: "REFERENCIA DE LOOK (Atuendo Objetivo):" });
                    parts.push({ inlineData: { mimeType: mime, data: data } });
                }

                parts.push({ text: promptText });

                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts },
                        config: { 
                            responseModalities: [Modality.IMAGE],
                            imageConfig: {
                                aspectRatio: selectedAspectRatio as any
                            }
                        },
                    });

                    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (imagePart?.inlineData) {
                        const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        sessionImages.push(src);
                        setGeneratedImages(prev => [...prev, src]);
                    } else if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                        console.warn("Generación bloqueada por filtros de seguridad.");
                        // We don't throw so other images can still generate
                    }
                } catch (innerError: any) {
                    console.error("Error al generar foto individual:", innerError);
                    if (innerError.message?.includes("429") || innerError.message?.includes("quota")) {
                        setError('Límite de IA alcanzado. Es posible que algunas fotos no se hayan generado. Por favor, espera 2 minutos.');
                        break; // Stop loop if quota is reached
                    }
                }

                // Delay between iterations to stay within safe rate limits
                if (i < 3) {
                    for (let countdown = 8; countdown > 0; countdown--) {
                        setLoadingMessage(`Siguiente foto en ${countdown}s...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }
            
            if (sessionImages.length > 0) {
                addCreations(sessionImages);
            } else if (!error) {
                setError('La generación falló. El modelo no pudo producir imágenes para este prompt.');
            }
        } catch (e: any) {
            console.error("Error crítico de generación de Vlog:", e);
            const rawError = String(e);
            if (rawError.includes("429") || rawError.includes("quota")) {
                setError('Límite de IA alcanzado. Por favor, espera 1-2 minutos antes de intentar de nuevo.');
            } else {
                setError(`La generación falló: ${e.message || 'Por favor, revisa tu prompt e intenta de nuevo.'}`);
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCustomPrompt(text);
    };

    return (
        <div className="flex flex-col bg-rosa-claro h-full p-4 md:p-10 space-y-8 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">Vlogs con IA</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    Construye tu marca de rutina diaria con escenas profesionales de estilo vlog. Transforma tu identidad en cualquier entorno de estilo de vida con precisión cinematográfica.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Panel: Configuration */}
                <div className="flex flex-col space-y-4">
                    
                    {/* Saved Looks Library */}
                    {savedLooks.length > 0 && (
                        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg border-2 border-rosa-principal/30">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-negro-fondo uppercase tracking-widest">Mis Looks Guardados</h3>
                                    {selectedLook && <span className="bg-rosa-principal text-negro-fondo text-[9px] px-2 py-0.5 rounded-full font-black uppercase animate-pulse">Atuendo Activo</span>}
                                </div>
                                {selectedLook && (
                                    <button 
                                        onClick={() => setSelectedLook(null)}
                                        className="text-[10px] font-black text-rosa-principal uppercase border-b-2 border-rosa-principal"
                                    >
                                        Limpiar Bloqueo
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {savedLooks.map((look, idx) => (
                                    <div key={idx} className="relative flex-shrink-0 group">
                                        <div 
                                            onClick={() => setSelectedLook(look)}
                                            className={`w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${selectedLook === look ? 'border-rosa-principal scale-110 shadow-xl' : 'border-white hover:border-rosa-principal/50'}`}
                                            title="Usa este atuendo en cada escena"
                                        >
                                            <img src={look} className="w-full h-full object-cover" alt="Look Guardado" />
                                            {selectedLook === look && (
                                                <div className="absolute inset-0 bg-rosa-principal/10 flex items-center justify-center">
                                                    <div className="bg-rosa-principal text-negro-fondo p-1 rounded-full shadow-sm">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteLook(idx); }}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Step number={1} title="Sube Tu Identidad">
                        <div 
                            onClick={() => personInputRef.current?.click()}
                            className="aspect-video bg-white/60 rounded-2xl flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-rosa-principal/50 hover:border-rosa-principal transition-colors p-4 group relative overflow-hidden"
                        >
                            {personImage ? (
                                <img src={personImage.preview} className="h-full object-contain rounded-lg shadow-sm" alt="Vista previa de identidad" />
                            ) : (
                                <>
                                    <svg className="w-12 h-12 text-rosa-principal opacity-40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    <p className="text-sm font-black text-gray-400 group-hover:text-negro-fondo text-center uppercase tracking-widest">Haz clic para subir tu retrato</p>
                                </>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title="Biblioteca de Prompts de Vlog">
                        <div className="bg-negro-fondo rounded-xl p-4 h-[350px] overflow-y-auto border-2 border-rosa-principal/20 scrollbar-hide">
                            <p className="text-[10px] font-black text-rosa-principal uppercase tracking-[0.2em] mb-4 text-center">Selecciona una rutina a continuación</p>
                            {vlogRoutineCategories.map((cat) => (
                                <div key={cat.name} className="mb-6">
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3 border-b border-white/10 pb-1">{cat.name}</h4>
                                    <div className="space-y-2">
                                        {cat.prompts.map((p, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => copyToClipboard(p)}
                                                className={`w-full text-left p-3 rounded-lg text-xs font-medium transition-all border ${selectedRoutine === p || customPrompt === p ? 'bg-rosa-principal text-negro-fondo border-rosa-principal' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Step>

                    <Step number={3} title="Dirección y Estilo Personalizado">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Relación de Aspecto</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                    {aspectRatios.map((ar) => (
                                        <button
                                            key={ar.value}
                                            onClick={() => setSelectedAspectRatio(ar.value)}
                                            className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${selectedAspectRatio === ar.value ? 'bg-negro-fondo text-white border-negro-fondo' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                                        >
                                            {ar.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Descripción Detallada del Momento</label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="Describe tu momento único de vlog..."
                                    className="w-full h-32 bg-white/50 border-2 border-gray-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none resize-none text-negro-fondo font-medium"
                                />
                            </div>
                        </div>
                    </Step>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !personImage}
                        className="w-full bg-negro-fondo text-rosa-principal font-black py-4 rounded-2xl hover:bg-black hover:text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-xl transition-all text-xl uppercase tracking-tight"
                    >
                        {isLoading ? <Spinner className="w-6 h-6 text-rosa-principal" /> : 'Generar Clip de Vlog'}
                    </button>
                    {error && <div className="p-3 bg-red-900 text-white rounded-xl text-center font-bold shadow-lg animate-pulse">{error}</div>}
                </div>

                {/* Right Panel: Results */}
                <div className="bg-white/80 backdrop-blur-xl shadow-2xl p-8 rounded-[2rem] border border-white/50 flex flex-col min-h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h3 className="text-xl font-black text-negro-fondo uppercase tracking-tighter">Tus Resultados</h3>
                            <div className="flex gap-2 items-center mt-1">
                                {selectedLook && <span className="text-[10px] text-rosa-principal font-black uppercase tracking-widest">Atuendo Activo</span>}
                            </div>
                        </div>
                        {generatedImages.length > 0 && (
                            <button onClick={() => setGeneratedImages([])} className="text-xs font-black text-rosa-principal uppercase tracking-widest hover:text-negro-fondo transition-colors">Limpiar</button>
                        )}
                    </div>
                    
                    <div className="flex-1">
                        {isLoading && generatedImages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-4">
                                <Spinner className="w-12 h-12 text-rosa-principal" />
                                <p className="text-negro-fondo font-black animate-pulse uppercase tracking-widest text-center">{loadingMessage}</p>
                                {selectedLook && <p className="text-[10px] text-rosa-principal font-bold uppercase tracking-widest">Aplicando Look Guardado...</p>}
                            </div>
                        ) : generatedImages.length === 0 ? (
                            <div className="grid grid-cols-2 gap-4 h-full">
                                {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="bg-gray-100/50 rounded-2xl aspect-square flex items-center justify-center border border-gray-200/50">
                                        <span className="text-5xl font-black text-gray-200">{n}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {generatedImages.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                                        <img src={img} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-110" alt="Resultado de Vlog" onClick={() => setZoomedImage(img)} />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleSaveLook(img)}
                                                className="bg-rosa-principal text-negro-fondo p-1.5 sm:p-2 rounded-full hover:scale-110 transition-transform active:scale-95 shadow-md"
                                                title="Guardar Atuendo"
                                            >
                                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                                            </button>
                                            <button onClick={() => setZoomedImage(img)} className="bg-white text-negro-fondo p-1.5 sm:p-2 rounded-full hover:scale-110 shadow-md">
                                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                            </button>
                                            <a href={img} download={`ai-vlog-${idx + 1}.png`} className="bg-white text-negro-fondo p-1.5 sm:p-2 rounded-full hover:scale-110 shadow-md">
                                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Informational Sections */}
            <div className="space-y-6 mt-12 border-t border-rosa-principal/30 pt-16 max-w-6xl mx-auto w-full">
                {/* Introduction Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2.5rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">Introducción</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p>El estudio de **Vlogs con IA** es tu suite personal de producción de estilo de vida. En un mundo donde la marca personal lo es todo, pero filmar tu vida diaria es agotador y consume mucho tiempo, esta herramienta ofrece una solución revolucionaria. Ahora puedes situarte en escenas estéticas de "rutina diaria" de alta gama, desde desempacar artículos de lujo hasta trabajar desde un ático en la ciudad, sin necesidad de una cámara.</p>
                        <p>Nuestro mapeo de identidad avanzado asegura que cada imagen mantenga tu parecido al 100%, mientras que nuestra tecnología de "Bloqueo de Atuendo" te permite mantener el mismo vestuario en diferentes escenas para una continuidad de marca perfecta. Esta es la herramienta definitiva para influencers, especialistas en marketing y profesionales ocupados que desean mantener una presencia digital de alto valor sin esfuerzo.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isIntroExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* How It Works Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2.5rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">Cómo Funciona</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-700 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p><strong>Paso 1: Sube Tu Identidad</strong> - Proporciona un retrato o selfie claro. Esto actúa como el "ancla" para tu rostro, asegurando que cada escena de vlog generada se vea exactamente como tú.</p>
                                <p><strong>Paso 2: Explora la Biblioteca</strong> - Elige entre más de 40 prompts de rutina curados que cubren flujos matutinos, fitness, viajes y sesiones de trabajo de alta gama. Haz clic en una rutina para aplicarla al instante.</p>
                            </div>
                            <div className="space-y-4">
                                <p><strong>Paso 3: Dirección y Tamaño Personalizados</strong> - Elige tu **Relación de Aspecto** deseada (como 9:16 para Reels) y proporciona detalles adicionales para refinar la escena, el atuendo o el estado de ánimo.</p>
                                <p><strong>Paso 4: Genera y Construye</strong> - Haz clic en "Generar Clip de Vlog" para recibir 4 fotos fotorrealistas de alta resolución. Nuestro sistema utiliza un retraso de seguridad de 8 segundos entre fotos para asegurar la mayor calidad de renderizado.</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItExpanded(!isHowItWorksExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* Sales Tips & Monetization Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2.5rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">Ventas e Ideas de Monetización</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white/40 p-5 rounded-2xl border border-white/20">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">1. Servicio "Un Día en la Vida"</h4>
                                <p className="text-sm text-negro-fondo">Ofrece un servicio de alta gama para emprendedores donde les construyes una "Semana Virtual" de contenido. Genera más de 30 fotos de estilo de vida para su calendario de contenido mensual.</p>
                            </div>
                            <div className="bg-white/40 p-5 rounded-2xl border border-white/20">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">2. Packs de Influencer Sin Rostro</h4>
                                <p className="text-sm text-negro-fondo">Crea packs de fotos de "Estética de Estilo de Vida" para personas que desean manejar páginas temáticas o cuentas sin rostro, pero que necesitan un elemento humano.</p>
                            </div>
                            <div className="bg-white/40 p-5 rounded-2xl border border-white/20">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">3. Marketing de Afiliados de Lujo</h4>
                                <p className="text-sm text-negro-fondo">Promociona productos de lujo, jets privados o hoteles de alta gama usando estos visuales como fondos para tus enlaces de afiliados. El contenido aspiracional impulsa las mayores conversiones.</p>
                            </div>
                            <div className="bg-white/40 p-5 rounded-2xl border border-white/20">
                                <h4 className="font-black text-sm uppercase mb-2 text-rosa-principal">4. Imágenes para Cursos y Productos Digitales</h4>
                                <p className="text-sm text-negro-fondo">Usa estas imágenes como fotos de stock de alta gama para tus propios cursos, eBooks o sitios web. Añaden un nivel de "Prueba de Éxito" a tus materiales de marca.</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isSalesTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* Pro Tips Box */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl p-10 rounded-[2.5rem] border border-white/50 group transition-all hover:shadow-2xl">
                    <h2 className="text-2xl font-black text-negro-fondo mb-6 text-center uppercase tracking-widest">Consejos Pro</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-700 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <ul className="space-y-4">
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black text-lg">01</span>
                                <p><strong>Domina el "Bloqueo de Atuendo":</strong> Para una serie de vlogs más creíble, genera una imagen que te encante, guarda el look y bloquéalo. Luego genera 10 escenas más. La consistencia de tu ropa hace que la historia se sienta real.</p>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black text-lg">02</span>
                                <p><strong>Truco de Fotorrealismo:</strong> Sube una foto de origen que tenga luz natural golpeando tu rostro. Esto ayuda a la IA a coincidir con la iluminación de escenas al aire libre o iluminadas por el sol de "Rutina Matutina" de manera mucho más efectiva.</p>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black text-lg">03</span>
                                <p><strong>Especificidad en Prompts Personalizados:</strong> En lugar de "bebiendo café", intenta "sentado en un sofá de terciopelo verde esmeralda bebiendo un latte con arte de corazón". Cuantos más detalles, más "personalizado" se verá el vlog.</p>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-rosa-principal font-black text-lg">04</span>
                                <p><strong>Mezcla tu Rutina:</strong> No solo publiques 5 fotos de unboxing. Mezcla una "Rutina Matutina" con una "Sesión de Trabajo" y una "Vibra de Viaje" para mostrar un estilo de vida completo y aspiracional a tu audiencia.</p>
                            </li>
                        </ul>
                        <div className={`absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/80 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-6 text-xs text-rosa-principal font-black uppercase tracking-[0.3em] hover:text-negro-fondo transition-colors border-b-2 border-rosa-principal">
                            {isProTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-12 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Expanded" className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl border-4 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl font-light transition-all border border-white/20 shadow-xl backdrop-blur-md">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIVlogs;