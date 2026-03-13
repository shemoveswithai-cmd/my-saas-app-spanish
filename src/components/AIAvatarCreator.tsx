import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64, dataURLtoFile } from '../utils';
import { Spinner } from './common/Spinner';
import { ResizeModal } from './common/ResizeModal';
import { Book, LayoutGrid, BookOpen, Download, Trash2 } from 'lucide-react';

interface AIAvatarCreatorProps {
    addCreations: (images: string[]) => void;
}

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg">
        <h3 className="text-md font-bold text-smw-gray-dark mb-3">Paso {number}: {title}</h3>
        {children}
    </div>
);

const formSchema = {
    avatarType: ["Femenino", "Masculino", "No Humano", "Solo Mascota"],
    companion: ["Ninguno", "Perro", "Gato", "Pájaro", "Caballo", "Conejo", "Zorro", "Lobo", "Tigre", "Búho", "Halcón", "León", "Panda", "Mascota de Fantasía"],
    style: ["3D Realista", "Pixar/Disney", "Anime (Suave)", "Anime (Fuerte)", "Dibujos Animados/Cómic", "Fantasía/Mágico", "Estudio Hiperrealista", "Estética Barbie", "Cyberpunk", "Retrato Vintage", "Kawaii Chibi", "Personaje de Juego"],
    scene: ["Estudio", "Naturaleza/Exterior", "Habitación de Lujo", "Espacio/Galaxia", "Bosque de Fantasía", "Ciudad Cyber Neón", "Castillo/Real", "Color Liso", "Subir Imagen"],
    hairLength: ["Corto", "Medio", "Largo"],
    hairTexture: ["Liso", "Ondulado", "Rizado"],
    hairColor: ["Natural", "Fantasía"],
    outfit: ["Casual", "Lujo", "Formal", "Armadura de Fantasía", "Atuendo de Anime", "Streetwear", "Vestido Real"],
    expression: ["Neutral", "Feliz", "Feroz", "Seguro", "Suave"],
    aspect: ["9:16", "16:9", "4:5", "1:1", "3:4", "4:3"],
};

const LabeledSelect: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[]; disabled?: boolean }> = ({ label, value, onChange, options, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-smw-gray-dark opacity-80 mb-1">{label}</label>
        <select value={value} onChange={onChange} disabled={disabled} className="w-full bg-white/50 border-2 border-smw-pink/50 rounded-lg p-2 focus:ring-2 focus:ring-smw-pink focus:outline-none text-smw-gray-dark">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const poses = [
    'Un retrato seguro, de frente.',
    'Una pose en ángulo de tres cuartos, mirando ligeramente hacia un lado.',
    'Una pose cándida, dinámica y natural.',
    'Un primer plano de belleza centrado en el rostro y la expresión.'
];

const AIAvatarCreator: React.FC<AIAvatarCreatorProps> = ({ addCreations }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'generator' | 'coloring'>('generator');

    // Load active tab from localStorage
    useEffect(() => {
        const savedTab = localStorage.getItem('smwAvatarCreatorActiveTab');
        if (savedTab === 'generator' || savedTab === 'coloring') {
            setActiveTab(savedTab);
        }
    }, []);

    // Save active tab to localStorage
    useEffect(() => {
        localStorage.setItem('smwAvatarCreatorActiveTab', activeTab);
    }, [activeTab]);

    // Coloring Studio State
    const [coloringCollection, setColoringCollection] = useState<{ id: string; original: string; coloring?: string }[]>([]);
    const [isConverting, setIsConverting] = useState<string | null>(null);
    const [coloringError, setColoringError] = useState<string | null>(null);

    // Form State
    const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string; isAI?: boolean } | null>(null);
    const [avatarType, setAvatarType] = useState(formSchema.avatarType[0]);
    const [companion, setCompanion] = useState(formSchema.companion[0]);
    const [style, setStyle] = useState(formSchema.style[0]);
    const [scene, setScene] = useState(formSchema.scene[0]);
    const [userSceneImage, setUserSceneImage] = useState<{ file: File; preview: string } | null>(null);
    const [customAction, setCustomAction] = useState('');
    const [hairLength, setHairLength] = useState(formSchema.hairLength[1]);
    const [hairTexture, setHairTexture] = useState(formSchema.hairTexture[0]);
    const [hairColor, setHairColor] = useState(formSchema.hairColor[0]);
    const [outfit, setOutfit] = useState(formSchema.outfit[0]);
    const [expression, setExpression] = useState(formSchema.expression[0]);

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwAvatarCreatorFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.avatarType) setAvatarType(parsed.avatarType);
                if (parsed.companion) setCompanion(parsed.companion);
                if (parsed.style) setStyle(parsed.style);
                if (parsed.scene) setScene(parsed.scene);
                if (parsed.customAction) setCustomAction(parsed.customAction);
                if (parsed.hairLength) setHairLength(parsed.hairLength);
                if (parsed.hairTexture) setHairTexture(parsed.hairTexture);
                if (parsed.hairColor) setHairColor(parsed.hairColor);
                if (parsed.outfit) setOutfit(parsed.outfit);
                if (parsed.expression) setExpression(parsed.expression);
            } catch (e) {
                console.error("Failed to parse saved form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            avatarType,
            companion,
            style,
            scene,
            customAction,
            hairLength,
            hairTexture,
            hairColor,
            outfit,
            expression
        };
        localStorage.setItem('smwAvatarCreatorFormState', JSON.stringify(formState));
    }, [avatarType, companion, style, scene, customAction, hairLength, hairTexture, hairColor, outfit, expression]);
    
    // UI State
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Resize Modal State
    const [resizeModalOpen, setResizeModalOpen] = useState(false);
    const [selectedImageForResize, setSelectedImageForResize] = useState<string | null>(null);

    // Refs
    const referenceImageInputRef = useRef<HTMLInputElement>(null);
    const customSceneInputRef = useRef<HTMLInputElement>(null);
    const stepOneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        return () => {
            if (referenceImage?.preview && !referenceImage.preview.startsWith('data:')) URL.revokeObjectURL(referenceImage.preview);
            if (userSceneImage?.preview) URL.revokeObjectURL(userSceneImage.preview);
        };
    }, [referenceImage, userSceneImage]);

    // Load coloring collection
    useEffect(() => {
        const saved = localStorage.getItem('smwColoringCollection');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    // Migration: ensure every item has a unique ID
                    const migrated = parsed.map((item, idx) => {
                        const baseId = Date.now().toString(36) + idx.toString(36);
                        if (typeof item === 'string') {
                            return { id: baseId, original: item };
                        }
                        if (!item || typeof item !== 'object') return null;
                        return { 
                            id: item.id || baseId + Math.random().toString(36).substr(2, 5), 
                            original: item.original || '',
                            coloring: item.coloring
                        };
                    }).filter(Boolean) as { id: string; original: string; coloring?: string }[];
                    
                    setColoringCollection(migrated);
                }
            } catch (e) {
                console.error("Failed to parse coloring collection", e);
            }
        }
    }, []);

    // Save coloring collection
    useEffect(() => {
        if (!Array.isArray(coloringCollection)) return;
        try {
            localStorage.setItem('smwColoringCollection', JSON.stringify(coloringCollection));
        } catch (e) {
            console.error("Failed to save coloring collection to localStorage", e);
            // If it fails (likely quota exceeded), we don't want to crash the app
        }
    }, [coloringCollection]);

    const handleAddToColoring = (imageUrl: string) => {
        const currentCollection = Array.isArray(coloringCollection) ? coloringCollection : [];
        if (!currentCollection.some(item => item && item.original === imageUrl)) {
            const newItem = { 
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                original: imageUrl 
            };
            setColoringCollection(prev => [newItem, ...(Array.isArray(prev) ? prev : [])]);
        }
    };

    const handleRemoveFromColoring = (id: string) => {
        setColoringCollection(prev => Array.isArray(prev) ? prev.filter(item => item && item.id !== id) : []);
    };

    const handleConvertToColoringPage = async (id: string) => {
        const item = coloringCollection.find(i => i && i.id === id);
        if (!item || item.coloring) return;

        setIsConverting(id);
        setColoringError(null);
        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            console.log("DEBUG: AIAvatarCreator handleConvertToColoringPage started. API Key:", apiKey ? "Found" : "Missing");
            if (!apiKey) throw new Error("API Key not found. Please check your configuration.");
            
            const ai = new GoogleGenAI({ apiKey });
            const file = dataURLtoFile(item.original, 'original.png');
            if (!file) throw new Error("Invalid image data");

            const prompt = "Transforma esta imagen en una página de libro para colorear de alta calidad, en blanco y negro. Usa contornos limpios y marcados, y elimina todo el sombreado, colores y texturas. El resultado debe ser un fondo blanco puro con dibujos de líneas negras, perfecto para un libro de colorear. Asegúrate de que los rasgos del personaje se conserven pero se simplifiquen en líneas.";

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: await fileToBase64(file) } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseModalities: [Modality.IMAGE]
                }
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const coloringPageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                
                setColoringCollection(prev => {
                    if (!Array.isArray(prev)) return prev;
                    return prev.map(i => i.id === id ? { ...i, coloring: coloringPageUrl } : i);
                });
                
                addCreations([coloringPageUrl]);
            }
        } catch (e) {
            let errorMessage = 'Error al convertir a página para colorear';
            if (e instanceof Error) {
                errorMessage = e.message;
                try {
                    const parsed = JSON.parse(e.message);
                    if (parsed.error && parsed.error.message) {
                        errorMessage = parsed.error.message;
                        if (parsed.error.code === 429) {
                            errorMessage = "Cuota excedida. Por favor, verifica tu plan de la API de Gemini y los detalles de facturación. Es posible que debas esperar unos minutos antes de intentar de nuevo.";
                        }
                    }
                } catch (jsonError) {
                    // Not JSON
                }
            }
            setColoringError(errorMessage);
        } finally {
            setIsConverting(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'reference' | 'scene') => {
        const file = e.target.files?.[0];
        if (file) {
            const newImage = { file, preview: URL.createObjectURL(file), isAI: false };
            if (type === 'reference') {
                if (referenceImage?.preview && !referenceImage.preview.startsWith('data:')) URL.revokeObjectURL(referenceImage.preview);
                setReferenceImage(newImage);
            } else {
                if (userSceneImage) URL.revokeObjectURL(userSceneImage.preview);
                setUserSceneImage(newImage);
            }
        }
    };
    
    const removeImage = (type: 'reference' | 'scene') => {
        if(type === 'reference' && referenceImage) {
            if (!referenceImage.preview.startsWith('data:')) URL.revokeObjectURL(referenceImage.preview);
            setReferenceImage(null);
            if(referenceImageInputRef.current) referenceImageInputRef.current.value = '';
        } else if (type === 'scene' && userSceneImage) {
            URL.revokeObjectURL(userSceneImage.preview);
            setUserSceneImage(null);
            if(customSceneInputRef.current) customSceneInputRef.current.value = '';
        }
    }

    const handleUseAsReference = (imageUrl: string) => {
        const file = dataURLtoFile(imageUrl, `avatar-lock-${Date.now()}.png`);
        if (file) {
            setReferenceImage({ file, preview: imageUrl, isAI: true });
            stepOneRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            console.log("DEBUG: AIAvatarCreator handleGenerate started. API Key:", apiKey ? "Found" : "Missing");
            if (!apiKey) throw new Error("API Key not found. Please check your configuration.");
            
            const ai = new GoogleGenAI({ apiKey });
            
            // Prepare common parts outside the loop
            const commonParts: Part[] = [];
            if (referenceImage) {
                const base64 = await fileToBase64(referenceImage.file);
                commonParts.push({ inlineData: { mimeType: referenceImage.file.type, data: base64 } });
            }
            if (scene === "Subir Imagen" && userSceneImage) {
                const base64 = await fileToBase64(userSceneImage.file);
                commonParts.push({ inlineData: { mimeType: userSceneImage.file.type, data: base64 } });
            }

            const iterationCount = 4;
            const sessionImages: string[] = [];
            let lastError: any = null;

            for (let i = 0; i < iterationCount; i++) {
                try {
                    const pose = poses[i];
                    const companionText = companion !== "Ninguno" ? ` accompanied by a ${companion}` : "";
                    const userSceneText = scene === "Subir Imagen" && userSceneImage ? " (using the provided background image)" : "";
                    const cleanCustomAction = customAction.replace(/^(i want the female to be|the avatar is)/i, '').trim();
                    const actionDescription = cleanCustomAction ? ` The avatar is ${cleanCustomAction}.` : '';
                    
                    const likenessRole = referenceImage?.isAI 
                        ? "MODO DE CONSISTENCIA DE PERSONAJE: La imagen de origen proporcionada es un avatar de IA existente. DEBES generar el mismo personaje (rostro idéntico, rasgos e identidad general) pero en la nueva escena y acción especificadas a continuación."
                        : "MODO DE SEMEJANZA DE IDENTIDAD: La imagen de origen es una persona real. Genera un avatar de IA estilizado que mantenga el 100% de la identidad facial y la semejanza de esta persona.";

                    const prompt = `**PROTOCOLO DE PRESERVACIÓN DE IDENTIDAD**
SUJETO: La persona en la imagen de referencia.
REQUISITO: Coincidencia de identidad facial al 100%. Mantener la forma exacta de los ojos, la estructura de la nariz, el contorno de los labios y las proporciones faciales. 
NO embellecer, suavizar ni alterar el rostro. El rostro debe ser idéntico al de origen.
ESTILO: Un avatar de alta calidad de tipo ${avatarType}${companionText} en un estilo ${style}.
ACCIÓN: ${actionDescription || 'Un retrato profesional.'}
POSE: ${pose}.
ESCENA: ${scene}${userSceneText}.
COMPAÑERO: ${companion !== "Ninguno" ? `El ${companion} es una parte central de la imagen y DEBE ser claramente visible junto al avatar.` : "Ninguno"}
APARIENCIA:
- Cabello: ${hairLength}, ${hairTexture}, ${hairColor}.
- Atuendo: ${outfit}.
- Expresión: ${expression}.

**BLOQUEO CRÍTICO DE PERSONAJE:** Cada detalle del rostro, la identidad y la semejanza del avatar de la imagen de origen DEBE preservarse perfectamente. ${companion !== "Ninguno" ? `El ${companion} DEBE estar presente en el encuadre.` : ""} La imagen DEBE tener una relación de aspecto cuadrada de 1:1.`;
                    
                    const parts: Part[] = [...commonParts, { text: prompt }];

                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts },
                        config: { 
                            systemInstruction: "Eres un experto diseñador de personajes y especialista en preservación de identidad. Tu prioridad absoluta es generar imágenes donde el rostro del sujeto sea una coincidencia del 100% con la imagen de referencia proporcionada. Debes mantener todos los rasgos faciales únicos, la estructura ósea y las características sin ninguna modificación, suavizado o 'embellecimiento'. La identidad debe ser inconfundible y consistente con la fuente.",
                            responseModalities: [Modality.IMAGE] 
                        }
                    });
                    
                    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (imagePart?.inlineData) {
                        const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        sessionImages.push(newImage);
                        setGeneratedImages(prev => [...prev, newImage]);
                    } else {
                        // Check for safety block or other reasons
                        const candidate = response.candidates?.[0];
                        if (candidate?.finishReason === 'SAFETY') {
                            throw new Error("La generación fue bloqueada por filtros de seguridad. Por favor, intenta con un prompt o estilo diferente.");
                        }
                        throw new Error("No se generó ninguna imagen. El modelo podría haber devuelto una respuesta de texto en su lugar.");
                    }
                } catch (innerError) {
                    console.error(`La generación ${i + 1} falló:`, innerError);
                    lastError = innerError;
                }

                if (i < iterationCount - 1) {
                    for (let countdown = 10; countdown > 0; countdown--) {
                        // We don't have a loading message state for each step here, but we can wait
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            if (sessionImages.length > 0) {
                addCreations(sessionImages);
            } else if (lastError) {
                throw lastError;
            }

        } catch (e) {
            let errorMessage: React.ReactNode = 'Ocurrió un error desconocido.';
            if (e instanceof Error) {
                errorMessage = e.message;
                const rawError = String(e);
                if (rawError.includes("429") || rawError.includes("quota") || rawError.includes("RESOURCE_EXHAUSTED")) {
                    errorMessage = (
                        <div className="flex flex-col gap-3">
                            <p className="font-bold">Cuota de IA Agotada</p>
                            <p className="text-xs opacity-90">Se ha alcanzado el límite de generación compartido. Puedes esperar un minuto para que se restablezca, o conectar tu propia clave de API para obtener resultados ilimitados y más rápidos.</p>
                            <button 
                                onClick={() => (window as any).aistudio?.openSelectKey?.()}
                                className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm self-start"
                            >
                                Conecta tu propia Clave de API
                            </button>
                        </div>
                    );
                }
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenResizeModal = (imageUrl: string) => {
        setSelectedImageForResize(imageUrl);
        setResizeModalOpen(true);
    };

    const handleSaveResizedImage = (url: string, blob: Blob, meta: any) => {
        const reader = new FileReader();
        reader.onload = function() {
            const dataUrl = reader.result as string;
            addCreations([dataUrl]);
        };
        reader.readAsDataURL(blob);
        setResizeModalOpen(false);
        setSelectedImageForResize(null);
    };
    
    return (
        <div className="flex flex-col h-full bg-smw-pink-light rounded-lg p-4 md:p-6 space-y-6 border border-smw-pink/30">
            {/* Page Title at the very top */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200 text-center shrink-0 shadow-sm">
                <h1 className="text-md font-bold text-smw-gray-dark uppercase tracking-tight mb-1">
                    {activeTab === 'generator' ? 'Creador de Avatar IA' : 'Estudio de Libros para Colorear'}
                </h1>
                <p className="text-[11px] text-gray-500 max-w-2xl mx-auto font-medium leading-tight">
                    {activeTab === 'generator' 
                        ? 'Crea tu propio personaje digital en segundos. Sube una foto para obtener semejanza o construye un avatar único desde cero con estilos y compañeros personalizados.'
                        : 'Convierte tus avatares generados en páginas de arte lineal únicas en blanco y negro. ¡Crea una colección de dibujos personalizados para descargar y colorear!'}
                </p>
            </div>

            {/* Tab Buttons below the title */}
            <header className="flex justify-center pb-2">
                <div className="bg-white/50 p-1 rounded-xl flex gap-1 border border-smw-pink/20">
                    <button 
                        onClick={() => setActiveTab('generator')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'generator' ? 'bg-smw-pink text-smw-gray-dark' : 'text-smw-gray-dark/60 hover:bg-white/50'}`}
                    >
                        Generador de Avatar
                    </button>
                    <button 
                        onClick={() => setActiveTab('coloring')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all relative ${activeTab === 'coloring' ? 'bg-smw-pink text-smw-gray-dark' : 'text-smw-gray-dark/60 hover:bg-white/50'}`}
                    >
                        Estudio de Colorear
                        {Array.isArray(coloringCollection) && coloringCollection.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
                                {coloringCollection.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>
            
            {activeTab === 'generator' ? (
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div ref={stepOneRef}>
                                <Step number={1} title="Identidad">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-sm font-medium text-smw-gray-dark opacity-80">Foto de Referencia</label>
                                                {referenceImage?.isAI && (
                                                    <span className="text-[10px] bg-smw-pink text-smw-gray-dark px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">Personaje Bloqueado</span>
                                                )}
                                            </div>
                                            {referenceImage ? (
                                                <div className="relative">
                                                    <img src={referenceImage.preview} alt="Reference" className="w-full h-auto object-cover rounded-lg border-2 border-smw-pink" />
                                                    <button onClick={() => removeImage('reference')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-md transition-all">&times;</button>
                                                    {referenceImage.isAI && (
                                                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-widest">
                                                            Personaje Activo
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div onClick={() => referenceImageInputRef.current?.click()} className="w-full aspect-square bg-white/50 rounded-lg flex items-center justify-center border-2 border-dashed border-smw-pink/50 p-4 cursor-pointer hover:border-smw-pink transition-colors">
                                                    <div className="text-center text-smw-gray-dark opacity-80">
                                                        <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                        <p className="text-xs font-bold uppercase tracking-widest">Haz clic para subir foto</p>
                                                    </div>
                                                </div>
                                            )}
                                            <input type="file" ref={referenceImageInputRef} onChange={(e) => handleFileChange(e, 'reference')} className="hidden" accept="image/*" />
                                        </div>
                                        <div className="space-y-4">
                                            <LabeledSelect label="Tipo de Avatar" value={avatarType} onChange={e => setAvatarType(e.target.value)} options={formSchema.avatarType} />
                                            <LabeledSelect label="Añadir Compañero" value={companion} onChange={e => setCompanion(e.target.value)} options={formSchema.companion} />
                                        </div>
                                    </div>
                                </Step>
                            </div>

                            <Step number={2} title="Estilo y Escena">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <LabeledSelect label="Estilo Artístico" value={style} onChange={e => setStyle(e.target.value)} options={formSchema.style} />
                                   <LabeledSelect label="Fondo / Escena" value={scene} onChange={e => setScene(e.target.value)} options={formSchema.scene} />
                                </div>
                                 {scene === 'Subir Imagen' && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-smw-gray-dark opacity-80 mb-1">Imagen de Escena Personalizada</label>
                                        {userSceneImage ? (
                                            <div className="relative">
                                                <img src={userSceneImage.preview} alt="Custom Scene" className="w-full h-auto object-cover rounded-lg" />
                                                <button onClick={() => removeImage('scene')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600">&times;</button>
                                            </div>
                                        ) : (
                                            <div onClick={() => customSceneInputRef.current?.click()} className="w-full aspect-video bg-white/50 rounded-lg flex items-center justify-center border-2 border-dashed border-smw-pink/50 p-4 cursor-pointer hover:border-smw-pink transition-colors">
                                                <p className="text-center text-smw-gray-dark opacity-80">Haz clic para subir fondo</p>
                                            </div>
                                        )}
                                         <input type="file" ref={customSceneInputRef} onChange={(e) => handleFileChange(e, 'scene')} className="hidden" accept="image/*" />
                                    </div>
                                )}
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-smw-gray-dark opacity-80 mb-1">Acción/Pose Personalizada (Opcional)</label>
                                    <textarea 
                                        value={customAction} 
                                        onChange={e => setCustomAction(e.target.value)} 
                                        placeholder="ej., sosteniendo un orbe brillante, montando un dragón, jugando con el perro en el parque" 
                                        rows={2} 
                                        className="w-full bg-white/50 border-2 border-smw-pink/50 rounded-lg p-2 focus:ring-2 focus:ring-smw-pink focus:outline-none resize-none text-smw-gray-dark placeholder:text-smw-gray-dark/70 font-medium" 
                                    />
                                </div>
                            </Step>

                            <Step number={3} title="Apariencia">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <LabeledSelect label="Largo del Cabello" value={hairLength} onChange={e => setHairLength(e.target.value)} options={formSchema.hairLength} />
                                    <LabeledSelect label="Textura del Cabello" value={hairTexture} onChange={e => setHairTexture(e.target.value)} options={formSchema.hairTexture} />
                                    <LabeledSelect label="Color del Cabello" value={hairColor} onChange={e => setHairColor(e.target.value)} options={formSchema.hairColor} />
                                    <LabeledSelect label="Atuendo" value={outfit} onChange={e => setOutfit(e.target.value)} options={formSchema.outfit} />
                                    <LabeledSelect label="Expresión" value={expression} onChange={e => setExpression(e.target.value)} options={formSchema.expression} />
                                </div>
                            </Step>

                            <Step number={4} title="Generar">
                                <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-smw-pink text-smw-gray-dark font-black py-4 px-4 rounded-xl flex items-center justify-center hover:bg-white disabled:bg-smw-pink/50 disabled:cursor-not-allowed shadow-lg transition-all text-lg uppercase tracking-tight">
                                    {isLoading ? <Spinner className="w-6 h-6 text-smw-gray-dark" /> : 'Generar 4 Avatares'}
                                </button>
                            </Step>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg flex flex-col min-h-[400px]">
                            <h3 className="text-md font-bold text-smw-gray-dark mb-3">Tus Avatares</h3>
                             {error && <div className="p-3 bg-red-900 text-white rounded-md mb-4 text-sm font-bold shadow-lg animate-pulse">{error}</div>}
                            <div className="grid grid-cols-2 gap-4 flex-1">
                                 {[...Array(4)].map((_, index) => (
                                    <div key={index} className="relative aspect-square bg-white/40 rounded-xl flex items-center justify-center border border-white shadow-inner overflow-hidden">
                                        {isLoading && index >= generatedImages.length ? (
                                            <div className="text-center p-2">
                                                <Spinner className="w-10 h-10 text-smw-pink mb-2 mx-auto" />
                                                <p className="text-[10px] text-smw-gray-dark opacity-60 font-black uppercase tracking-widest">Renderizando...</p>
                                            </div>
                                        ) : generatedImages[index] ? (
                                            <div className="relative group w-full h-full">
                                                <img 
                                                    src={generatedImages[index]} 
                                                    alt={`Avatar generado ${index + 1}`} 
                                                    className="w-full h-full object-cover cursor-zoom-in" 
                                                    onClick={() => setZoomedImage(generatedImages[index])} 
                                                />
                                                 <div className="absolute bottom-2 left-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex flex-wrap justify-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUseAsReference(generatedImages[index]); }}
                                                        className="bg-smw-pink text-smw-gray-dark p-1.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                                                        title="Mantener este Personaje"
                                                    >
                                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAddToColoring(generatedImages[index]); }}
                                                        className={`${coloringCollection.some(item => item.original === generatedImages[index]) ? 'bg-green-500' : 'bg-[#7c5dfa]'} text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform`}
                                                        title={coloringCollection.some(item => item.original === generatedImages[index]) ? "Añadido al Estudio de Colorear" : "Añadir al Estudio de Colorear"}
                                                    >
                                                        {coloringCollection.some(item => item.original === generatedImages[index]) ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        ) : (
                                                            <BookOpen className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenResizeModal(generatedImages[index]); }}
                                                        className="bg-white text-smw-gray-dark p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                                        title="Redimensionar y Descargar"
                                                    >
                                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                                    </button>
                                                    <a
                                                        href={generatedImages[index]}
                                                        download={`smw-ai-avatar-${index + 1}.png`}
                                                        title="Descargar Original"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-white text-smw-gray-dark p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-200 text-6xl font-black select-none">{index + 1}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pb-10">
                        <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Introducción</h2>
                            <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                                <p>El Creador de Avatar IA te permite construir tu propio personaje digital en segundos. Puedes subir una foto si quieres que el avatar se parezca a ti, o puedes saltarte la foto y elegir entre ajustes preestablecidos femeninos, masculinos o compañeros de fantasía como perros, gatos, tigres, zorros, conejos y más. Tienes el control total del estilo, desde Pixar/Disney hasta 3D Realista, anime, cuentos de hadas, cinemático o aspectos de videojuegos.</p>
                                <p>Una vez que tu avatar esté generado, puedes darle vida usando nuestra función de **Bloqueo de Personaje**. Haz clic en el botón 'Mantener Personaje' en cualquier avatar que te guste, y el sistema lo usará como base para todas las generaciones futuras. Esto asegura que el rostro, el cabello y la identidad general permanezcan idénticos, permitiéndote construir historias completas, series y personalidades de marca con el mismo avatar en nuevas poses, nuevas acciones y nuevas escenas.</p>
                                <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                            </div>
                            <div className="text-center">
                                <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                                    {isIntroExpanded ? 'Leer Menos' : 'Leer Más'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Cómo Funciona</h2>
                            <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1500px] overflow-y-auto' : 'max-h-[150px]'}`}>
                                <div>
                                    <h3 className="font-bold text-lg text-smw-gray-dark">Paso 1 – Identidad</h3>
                                    <ul className="list-disc list-inside space-y-1 my-2 pl-2">
                                        <li>Sube una foto de referencia clara (opcional, pero recomendada para obtener semejanza)</li>
                                        <li>Selecciona tu Tipo de Avatar</li>
                                        <li>Añade un compañero si lo deseas (perro, gato, caballo, mascota de fantasía, etc.)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-smw-gray-dark">Paso 2 – Estilo y Escena</h3>
                                    <ul className="list-disc list-inside space-y-1 my-2 pl-2">
                                        <li>Elige tu Estilo Artístico (Pixar Disney, 3D Realista, Anime, Fantasía, Realeza, Cyberpunk, Princesa, Dibujos Animados y muchos más)</li>
                                        <li>Elige un Fondo/Escena como estudio, bosque, castillo, galaxia, ciudad, jardín encantado, etc.</li>
                                        <li>Añade una acción o pose personalizada (opcional)
                                            <p className="pl-4">Ejemplos:</p>
                                            <ul className="list-disc list-inside pl-8">
                                                <li>“sosteniendo un orbe brillante”</li>
                                                <li>“caminando con mi perro”</li>
                                                <li>“montando a caballo”</li>
                                                <li>“sentado en un trono”</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-smw-gray-dark">Paso 3 – Apariencia</h3>
                                    <ul className="list-disc list-inside space-y-1 my-2 pl-2">
                                        <li>Elige el largo del cabello</li>
                                        <li>Selecciona la textura del cabello</li>
                                        <li>Elige el color del cabello</li>
                                        <li>Elige el atuendo</li>
                                        <li>Establece la expresión</li>
                                    </ul>
                                    <p>Estos ajustes ayudan a que tu avatar coincida con tu personalidad y estilo.</p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-smw-gray-dark">Paso 4 – Generar</h3>
                                    <ul className="list-disc list-inside space-y-1 my-2 pl-2">
                                        <li>Haz clic en Generar 4 Avatares</li>
                                        <li>Espera unos momentos</li>
                                        <li>Tus cuatro avatares aparecerán en el área de resultados</li>
                                        <li>¡Haz clic en 'Mantener Personaje' para bloquear esa semejanza para futuras historias consistentes!</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-smw-gray-dark">✨ Función Avanzada – Consistencia de Personaje</h3>
                                    <p>Esta es una de las funciones más potentes.</p>
                                    <p>Una vez que generes un avatar que te guste, simplemente haz clic en el botón 'Mantener Personaje'. El sistema:</p>
                                    <ul className="list-disc list-inside space-y-1 my-2 pl-2">
                                        <li>Bloqueará el rostro y la identidad de ese avatar.</li>
                                        <li>Lo establecerá como la fuente activa para la próxima generación.</li>
                                        <li>Priorizará la continuidad del personaje sobre todo lo demás.</li>
                                    </ul>
                                    <p>Luego puedes cambiar la escena, añadir un perro diferente o especificar una nueva acción como “bebiendo café en un café de París”, y la IA mantendrá el mismo personaje que acabas de crear.</p>
                                </div>
                                <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                            </div>
                            <div className="text-center">
                                <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                                    {isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                            <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Consejos de Venta e Ideas de Monetización</h2>
                            <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1500px] overflow-y-auto' : 'max-h-[150px]'}`}>
                                <p>Cuando creas avatares con esta herramienta, no solo estás haciendo imágenes bonitas, estás creando contenido digital que puedes usar para crecer, monetizar y promocionarte a ti mismo o a tu negocio. Aquí te explicamos cómo usar estos avatares de forma inteligente.</p>
                                <p><strong>Primero,</strong> después de generar tu avatar, puedes convertir esas imágenes en videos cortos o animaciones para TikTok, Instagram Reels y YouTube Shorts. Estas plataformas pagan por el contenido, por lo que incluso una historia sencilla hecha con tu avatar puede empezar a generar visitas e ingresos.</p>
                                <p><strong>A continuación,</strong> puedes crear series completas de narración de historias. Usa la función de **Bloqueo de Personaje** para continuar la historia solicitando una nueva acción: caminar con un perro, leer un libro, luchar contra un dragón, explorar el bosque, lo que imagines. Debido a que el sistema mantiene el mismo rostro y estilo, puedes crear episodios, capítulos o mini historias diarias que a la gente le encanta ver y que pueden monetizarse en todas las plataformas.</p>
                                <p><strong>Otra forma</strong> de usar estos avatares es diseñando tu propio personaje de marca. Puedes crear un avatar femenino o masculino que represente a tu negocio y usarlo para publicaciones sociales, banners, gráficos de sitios web o promociones de productos. Esto genera confianza y reconocimiento porque tu personaje se mantiene consistente en todo tu contenido.</p>
                                <p><strong>También puedes</strong> ofrecer esto como un servicio. Muchas personas quieren avatares personalizados para sus fotos de perfil, portadas de libros, páginas de negocios o videos de narración de historias. Puedes crear avatares para ellos, cobrar por set y entregar imágenes bellamente estilizadas o una historia animada completa.</p>
                                <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                            </div>
                            <div className="text-center">
                                <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                                    {isSalesTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col space-y-10">
                    {Array.isArray(coloringCollection) && coloringCollection.length > 0 ? (
                        <div className="flex-1 space-y-8 p-1">
                            {coloringError && (
                                <div className="p-4 bg-red-100 text-red-700 rounded-xl font-bold">
                                    {coloringError}
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {coloringCollection.filter(item => item && item.original).map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-[2.5rem] p-6 md:p-8 border-2 border-gray-200 flex flex-col shadow-none">
                                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                                            {/* Original Look */}
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Aspecto Original</h4>
                                                <div className="aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group relative">
                                                    <img 
                                                        src={item.original} 
                                                        alt={`Original ${idx}`} 
                                                        className="w-full h-full object-cover cursor-zoom-in"
                                                        onClick={() => setZoomedImage(item.original)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Coloring Page */}
                                            <div className="space-y-3 flex flex-col">
                                                <h4 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Página para Colorear</h4>
                                                <div className="aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner flex items-center justify-center relative group">
                                                    {item.coloring ? (
                                                        <img 
                                                            src={item.coloring} 
                                                            alt={`Coloring Page ${idx}`} 
                                                            className="w-full h-full object-cover cursor-zoom-in"
                                                            onClick={() => setZoomedImage(item.coloring!)}
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                                            <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center">
                                                                <div className="w-4 h-4 md:w-6 md:h-6 bg-gray-400 rounded-sm rotate-45" />
                                                            </div>
                                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Listo para el Arte</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 mt-auto pt-4 w-full">
                                                    {item.coloring ? (
                                                        <>
                                                            <a 
                                                                href={item.coloring}
                                                                download={`coloring-page-${idx + 1}.png`}
                                                                className="flex-1 py-2 bg-black text-[#f3a8d6] rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-sm flex items-center justify-center gap-1 px-1 min-w-0"
                                                                title="Guardar Dibujo"
                                                            >
                                                                <Download className="h-3 w-3 flex-shrink-0" /> <span className="whitespace-nowrap">Descargar</span>
                                                            </a>
                                                            <button 
                                                                onClick={() => handleRemoveFromColoring(item.id)}
                                                                className="p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-colors shadow-sm flex-shrink-0 border border-red-100"
                                                                title="Eliminar del Estudio"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                onClick={() => handleConvertToColoringPage(item.id)}
                                                                disabled={isConverting !== null}
                                                                className="flex-1 py-2 bg-[#f3a8d6] text-black rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] transition-transform shadow-sm disabled:opacity-50 px-1 min-w-0 leading-tight flex items-center justify-center text-center"
                                                            >
                                                                {isConverting === item.id ? 'Convirtiendo...' : 'Convertir a Dibujo'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRemoveFromColoring(item.id)}
                                                                className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 transition-colors shadow-sm flex-shrink-0 border border-gray-200"
                                                                title="Eliminar del Estudio"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 bg-white rounded-2xl flex flex-col items-center justify-center p-6 text-center mx-auto max-w-sm w-full shadow-none border-none">
                            <div className="w-12 h-12 bg-smw-pink/20 rounded-full flex items-center justify-center mb-4">
                                <Book className="w-6 h-6 text-smw-pink" />
                            </div>
                            <h3 className="text-base font-black text-smw-gray-dark mb-1 uppercase tracking-widest">Tu Colección está Vacía</h3>
                            <p className="text-xs text-smw-gray-dark/70 mb-6 font-bold max-w-[200px] leading-relaxed">¡Ve al Generador y haz clic en el icono del libro en cualquier imagen que te guste!</p>
                            <button 
                                onClick={() => setActiveTab('generator')}
                                className="bg-black text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                            >
                                Volver al Generador
                            </button>
                        </div>
                    )}
                </div>
            )}

            {resizeModalOpen && selectedImageForResize && (
                <ResizeModal
                    open={resizeModalOpen}
                    onClose={() => setResizeModalOpen(false)}
                    src={selectedImageForResize}
                    onSave={handleSaveResizedImage}
                />
            )}

            {zoomedImage && (
                <div
                    className="fixed inset-0 bg-black/90 flex justify-center items-start pt-10 md:items-center md:pt-0 z-50 p-4 animate-fade-in"
                    onClick={() => setZoomedImage(null)}
                >
                    <div 
                        className="relative max-w-full max-h-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={zoomedImage}
                            alt="Vista ampliada"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            onClick={() => setZoomedImage(null)}
                            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold transition-all border border-white/20 shadow-lg backdrop-blur-sm"
                            aria-label="Cerrar"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAvatarCreator;