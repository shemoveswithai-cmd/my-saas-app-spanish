
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Spinner } from './common/Spinner';
import { fileToBase64 } from '../utils';

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type SkinTone = "Brown" | "Dark" | "Light";
type RitualElement = 
    | "Mud" | "Dripping Water" | "Oil" | "None" | "Flower Petals" 
    | "Sand" | "Leaves" | "Rain Mist" | "Candle Wax" | "Steam" 
    | "Rose Water Spray" | "Herbs" | "Milk Bath" | "Honey" | "Lotion" 
    | "Natural Oils + Herbs";

interface FootRitualsProps {
    addCreations: (images: string[]) => void;
}

const nailPresets = [
    { name: 'Punta Francesa', description: 'puntas francesas blancas clásicas y elegantes con una base natural', color: 'linear-gradient(to bottom, #ffffff 30%, #fcddec 30%)' },
    { name: 'Rosa Neón', description: 'color sólido rosa neón vibrante', color: 'linear-gradient(135deg, #ff007f 0%, #ff66b2 100%)' },
    { name: 'Azul Eléctrico', description: 'cromo azul eléctrico de alto brillo', color: 'linear-gradient(135deg, #0000ff 0%, #3399ff 100%)' },
    { name: 'Verde Ácido', description: 'verde ácido neón con acabado brillante', color: 'linear-gradient(135deg, #39ff14 0%, #7fff00 100%)' },
    { name: 'Naranja Brillante', description: 'degradado naranja atardecer brillante', color: 'linear-gradient(135deg, #ff4500 0%, #ff8c00 100%)' },
    { name: 'Púrpura Vívido', description: 'púrpura vívido profundo con purpurina holográfica', color: 'linear-gradient(135deg, #8a2be2 0%, #da70d6 100%)' },
    { name: 'Francés Arcoíris', description: 'puntas francesas clásicas con colores del arcoíris', color: 'conic-gradient(red, orange, yellow, green, blue, indigo, violet)' },
    { name: 'Amarillo Luz Solar', description: 'brillo amarillo sol radiante', color: '#ffff00' },
    { name: 'Gema Turquesa', description: 'efecto mármol turquesa brillante', color: 'linear-gradient(135deg, #40e0d0 0%, #00ced1 100%)' },
    { name: 'Corazones Rosa Fuerte', description: 'rosa chicle con pequeños corazones rojos', color: '#ff69b4' },
    { name: 'Blanco Perla', description: 'cromo blanco perla luminoso', color: 'radial-gradient(circle, #ffffff, #f0f0f0)' },
    { name: 'Coral Neón', description: 'coral neón brillante mate', color: '#ff7f50' },
    { name: 'Resplandor Cian', description: 'azul cian brillante con suave destello', color: '#00ffff' },
    { name: 'Rojo y Oro', description: 'rojo brillante con detalles de pan de oro', color: 'linear-gradient(135deg, #ff0000 0%, #ffd700 100%)' },
    { name: 'Puntos de Menta', description: 'verde menta brillante con lunares blancos', color: '#98ff98' },
    { name: 'Flujo de Lava', description: 'vibrantes remolinos abstractos rojos y naranjas', color: 'radial-gradient(circle, #ff0000, #ff8c00)' }
];

const ritualElements: RitualElement[] = [
    "Oil", "Dripping Water", "Mud", "Flower Petals", "Sand", 
    "Leaves", "Rain Mist", "Candle Wax", "Steam", "Rose Water Spray", 
    "Herbs", "Milk Bath", "Honey", "Lotion", "Natural Oils + Herbs", "None"
];

const ritualElementLabels: Record<RitualElement, string> = {
    "Mud": "Lodo",
    "Dripping Water": "Agua Goteando",
    "Oil": "Aceite",
    "Flower Petals": "Pétalos de Flores",
    "Sand": "Arena",
    "Leaves": "Hojas",
    "Rain Mist": "Niebla de Lluvia",
    "Candle Wax": "Cera de Vela",
    "Steam": "Vapor",
    "Rose Water Spray": "Spray de Agua de Rosas",
    "Herbs": "Hierbas",
    "Milk Bath": "Baño de Leche",
    "Honey": "Miel",
    "Lotion": "Loción",
    "Natural Oils + Herbs": "Aceites Naturales + Hierbas",
    "None": "Ninguno"
};

const ritualElementDescriptions: Record<RitualElement, string> = {
    "Mud": "lodo orgánico de spa",
    "Dripping Water": "hermosas gotas de agua clara",
    "Oil": "aceite de spa lujoso y brillante",
    "Flower Petals": "delicados pétalos de flores esparcidos",
    "Sand": "arena dorada natural fina",
    "Leaves": "hojas verdes frescas esparcidas",
    "Rain Mist": "una niebla fina y etérea de gotas de lluvia",
    "Candle Wax": "cera de vela enfriada, goteada estéticamente cerca",
    "Steam": "vapor suave ascendente y atmósfera húmeda",
    "Rose Water Spray": "delicadas y relucientes gotas de agua de rosas",
    "Herbs": "hierbas frescas esparcidas de lavanda, salvia y romero",
    "Milk Bath": "suaves gotas de leche y espuma cremosa de baño de leche",
    "Honey": "un fino y elegante chorrito dorado de miel",
    "Lotion": "loción sedosa y suave para la piel",
    "Natural Oils + Herbs": "una combinación de aceites naturales brillantes y hierbas frescas esparcidas",
    "None": "sin elementos adicionales"
};

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-white shadow-sm p-6 rounded-2xl border border-gray-100 mb-5">
        <h3 className="text-lg font-bold text-negro-fondo mb-4 tracking-tight">
            Paso {number}: {title}
        </h3>
        {children}
    </div>
);

const FootRituals: React.FC<FootRitualsProps> = ({ addCreations }) => {
    const [skinTone, setSkinTone] = useState<SkinTone>("Brown");
    const [nailDesign, setNailDesign] = useState("classic glossy nude");
    const [ritualElement, setRitualElement] = useState<RitualElement>("Oil");
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
    const [additionalPrompt, setAdditionalPrompt] = useState("");

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwFootRitualsFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.skinTone) setSkinTone(parsed.skinTone);
                if (parsed.nailDesign) setNailDesign(parsed.nailDesign);
                if (parsed.ritualElement) setRitualElement(parsed.ritualElement);
                if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
                if (parsed.additionalPrompt) setAdditionalPrompt(parsed.additionalPrompt);
            } catch (e) {
                console.error("Failed to load foot rituals form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            skinTone,
            nailDesign,
            ritualElement,
            aspectRatio,
            additionalPrompt
        };
        localStorage.setItem('smwFootRitualsFormState', JSON.stringify(formState));
    }, [skinTone, nailDesign, ritualElement, aspectRatio, additionalPrompt]);
    
    const [userPhoto, setUserPhoto] = useState<{ file: File; preview: string } | null>(null);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Info section states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    useEffect(() => {
        return () => {
            if (userPhoto?.preview) URL.revokeObjectURL(userPhoto.preview);
        };
    }, [userPhoto]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (userPhoto?.preview) URL.revokeObjectURL(userPhoto.preview);
            setUserPhoto({ file, preview: URL.createObjectURL(file) });
        }
    };

    const removeUserPhoto = () => {
        if (userPhoto?.preview) URL.revokeObjectURL(userPhoto.preview);
        setUserPhoto(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleGenerate = async () => {
        if (!nailDesign.trim()) {
            setError('Por favor, ingresa un diseño de uñas.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const sessionImages: string[] = [];
            const iterationCount = 4;

            let sourceBase64 = "";
            if (userPhoto) {
                sourceBase64 = await fileToBase64(userPhoto.file);
            }

            for (let i = 0; i < iterationCount; i++) {
                const prompt = userPhoto 
                    ? `**CRITICAL MISSION: PHOTO-BASED FOOT RITUAL EDIT**
Using the provided image as the absolute base, apply the following aesthetic updates:
- **NAIL DESIGN:** Update the toenails to feature: ${nailDesign}.
- **RITUAL ELEMENT:** Add ${ritualElementDescriptions[ritualElement]} interacting with the feet in a natural, luxurious way.
- **LIKENESS:** Maintain the exact shape, texture, and identity of the feet from the provided photo.
- **SETTING:** Enhance the environment into a high-end professional spa or studio setting while keeping the subject's pose.
- **LIGHTING:** Cinematic, soft lighting that highlights skin glow and nail finish.
- **TECHNICAL:** Photorealistic, 8k resolution, macro-fidelity. Aspect ratio: ${aspectRatio}.
- **UNIQUENESS SEED:** ${Math.random()}`
                    : `**CRITICAL MISSION: AESTHETIC FOOT RITUAL PHOTOGRAPHY**
Create a photorealistic, high-end commercial image of a person's feet.
**SUBJECT DETAILS:**
- **SKIN TONE:** ${skinTone.toLowerCase()} skin tone.
- **NAIL DESIGN:** Toenails featuring: ${nailDesign}.
- **RITUAL ELEMENT:** The feet are interacting with ${ritualElementDescriptions[ritualElement]}.
- **SETTING:** A professional spa or high-end studio setting. 
- **LIGHTING:** Soft, cinematic lighting that highlights textures and skin glow.
**ADDITIONAL USER DETAILS:** ${additionalPrompt || "Focus on elegance and high-fashion aesthetic."}
**TECHNICAL SPECS:**
- **STYLE:** Ultra-realistic, 8k resolution, macro photography.
- **QUALITY:** Professional advertising standard. No distortions.
- **ASPECT RATIO:** The image must be composed for a ${aspectRatio} format.
- **UNIQUENESS SEED:** ${Math.random()}`;

                const contents = userPhoto 
                    ? { parts: [{ inlineData: { mimeType: userPhoto.file.type, data: sourceBase64 } }, { text: prompt }] }
                    : prompt;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: contents,
                    config: { 
                        responseModalities: [Modality.IMAGE],
                        imageConfig: { aspectRatio: aspectRatio as any }
                    },
                });

                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    sessionImages.push(newImage);
                    setGeneratedImages(prev => [...prev, newImage]);
                }
            }

            if (sessionImages.length > 0) {
                addCreations(sessionImages);
            } else {
                throw new Error("No se devolvieron imágenes. Por favor, revisa tu configuración e inténtalo de nuevo.");
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : "Ocurrió un error desconocido.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectDesign = (preset: typeof nailPresets[0]) => {
        setNailDesign(preset.name + " (" + preset.description + ")");
        setIsDesignModalOpen(false);
    };

    return (
        <div className="flex flex-col bg-rosa-claro min-h-full p-4 md:p-8 space-y-8 overflow-y-auto text-negro-fondo">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">Rituales de Pies IA</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    Diseña visuales de pies estéticos y de alta fidelidad para branding y portafolios profesionales en entornos de spa de lujo.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-7xl mx-auto w-full px-4">
                {/* Left Panel: Configuration */}
                <div className="flex flex-col">
                    <Step number={1} title="Foto de Origen y Tono de Piel">
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-gray-400 mb-2 block tracking-tight uppercase">Opción A: Sube Tu Propia Foto (Recomendado)</p>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-video bg-white rounded-2xl flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-rosa-principal transition-all p-4 group relative overflow-hidden"
                            >
                                {userPhoto ? (
                                    <>
                                        <img src={userPhoto.preview} className="absolute inset-0 w-full h-full object-cover" alt="Usuario subió" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white font-bold text-sm">Cambiar Foto</p>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeUserPhoto(); }}
                                            className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg z-10"
                                        >
                                            &times;
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-8 h-8 text-gray-300 group-hover:text-rosa-principal mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                                        <p className="text-sm font-bold text-gray-400 group-hover:text-negro-fondo transition-colors">Haz clic para subir tu propia imagen</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            </div>

                            <p className="text-sm font-bold text-gray-400 mb-2 block tracking-tight uppercase pt-2">Opción B: Elige un Tono de Piel Preestablecido</p>
                            <div className="flex gap-3">
                                {[["Brown", "Bronceado"], ["Dark", "Oscuro"], ["Light", "Claro"]].map(([tone, label]) => (
                                    <button
                                        key={tone}
                                        onClick={() => { setSkinTone(tone as SkinTone); if(userPhoto) removeUserPhoto(); }}
                                        className={`flex-1 py-3 rounded-full font-bold transition-all shadow-sm text-sm border-2 ${!userPhoto && skinTone === tone ? 'bg-rosa-principal text-negro-fondo border-rosa-principal' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Step>

                    <Step number={2} title="Diseño de Uñas de los Pies">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {nailPresets.slice(0, 6).map((preset) => (
                                    <button 
                                        key={preset.name}
                                        onClick={() => handleSelectDesign(preset)}
                                        className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110 active:scale-95"
                                        style={{ background: preset.color }}
                                        title={preset.name}
                                    />
                                ))}
                                <button 
                                    onClick={() => setIsDesignModalOpen(true)}
                                    className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-rosa-principal flex items-center justify-center bg-white text-rosa-principal font-bold hover:bg-rosa-principal/5 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>
                            </div>
                            
                            <div className="relative">
                                <input
                                    type="text"
                                    value={nailDesign}
                                    onChange={(e) => setNailDesign(e.target.value)}
                                    placeholder="ej: punta francesa brillante, rojo intenso..."
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 text-sm text-negro-fondo font-medium focus:ring-2 focus:ring-rosa-principal outline-none shadow-sm pr-12"
                                />
                                <button 
                                    onClick={() => setIsDesignModalOpen(true)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-rosa-principal hover:bg-rosa-principal/10 rounded-full transition-colors"
                                    title="Abrir Ventana de Diseño"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                            </div>
                        </div>
                    </Step>

                    <Step number={3} title="Elemento de Ritual">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ritualElements.map((element) => (
                                <button
                                    key={element}
                                    onClick={() => setRitualElement(element)}
                                    className={`py-2 px-1 rounded-xl font-bold transition-all shadow-sm text-[11px] border-2 leading-tight ${ritualElement === element ? 'bg-rosa-principal text-negro-fondo border-rosa-principal' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                                >
                                    {ritualElementLabels[element]}
                                </button>
                            ))}
                        </div>
                    </Step>

                    <Step number={4} title="Estilo de Fotografía">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-gray-400 mb-2 block tracking-tight">Relación de Aspecto</label>
                                <select 
                                    value={aspectRatio} 
                                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-rosa-principal outline-none font-bold appearance-none text-negro-fondo"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                                >
                                    <option value="1:1">Cuadrado (1:1)</option>
                                    <option value="9:16">Retrato (9:16)</option>
                                    <option value="3:4">Retrato (3:4)</option>
                                    <option value="16:9">Panorámico (16:9)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-400 mb-2 block tracking-tight">Detalles Adicionales</label>
                                <input
                                    type="text"
                                    value={additionalPrompt}
                                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                                    placeholder="ej: sombras suaves..."
                                    className="w-full bg-white border-2 border-gray-100 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-rosa-principal outline-none font-bold text-negro-fondo placeholder:text-gray-300"
                                />
                            </div>
                        </div>
                    </Step>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full bg-rosa-principal text-negro-fondo font-bold py-4 rounded-2xl shadow-lg hover:opacity-95 disabled:opacity-50 transition-all text-lg flex items-center justify-center gap-3"
                    >
                        {isLoading ? <Spinner className="w-6 h-6 text-negro-fondo" /> : 'Crear Fotos de Ritual'}
                    </button>
                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold text-center mt-3">{error}</div>}
                </div>

                {/* Right Panel: Results */}
                <div className="bg-white shadow-md p-6 rounded-3xl border border-white min-h-[450px] flex flex-col">
                    <h3 className="text-base font-bold text-center text-negro-fondo mb-6 opacity-20 uppercase tracking-widest">Galería Generada</h3>
                    <div className="flex-1">
                        {isLoading && generatedImages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-3">
                                <Spinner className="w-10 h-10 text-rosa-principal" />
                                <p className="text-gray-400 font-bold animate-pulse text-sm text-center">Diseñando tu visual...</p>
                            </div>
                        ) : generatedImages.length === 0 ? (
                            <div className="grid grid-cols-2 gap-4 h-full">
                                {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="bg-white rounded-2xl aspect-square flex items-center justify-center shadow-sm border border-gray-50 transition-all">
                                        <span className="text-6xl font-bold text-gray-100 select-none">{n}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {generatedImages.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden shadow-md bg-gray-50 border-2 border-white">
                                        <img src={img} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-110" alt="Resultado de Ritual" onClick={() => setZoomedImage(img)} />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => setZoomedImage(img)} className="bg-white text-negro-fondo p-2 rounded-full hover:scale-110 shadow-lg transition-transform active:scale-95"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={img} download={`ritual-pies-${idx + 1}.png`} className="bg-white text-negro-fondo p-2 rounded-full hover:scale-110 shadow-lg transition-transform active:scale-95"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Information Sections */}
            <div className="space-y-4 pt-8 border-t border-rosa-principal/30 max-w-6xl mx-auto w-full px-4">
                {/* Introduction Box */}
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/60">
                    <h2 className="text-xl font-bold text-negro-fondo mb-6 text-center">Introducción</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1500px]' : 'max-h-[120px]'}`}>
                        <p>Bienvenido al **Estudio de Rituales de Pies IA**, un espacio creativo exclusivo impulsado por IA para branding de bienestar, portafolios profesionales y visualización artística. Esta herramienta está diseñada para ayudar a creadores, dueños de spas y especialistas en estética a generar imágenes de clase mundial y grado comercial sin la necesidad de costosas sesiones de fotos.</p>
                        <p>Nuestra IA avanzada comprende los finos detalles de la anatomía, la textura de la piel y los elementos sensoriales. Desde acabados de aceite de alto brillo hasta tratamientos de lodo orgánico y gotas de agua cristalinas, puedes construir una marca visual consistente que se sienta lujosa e intencional.</p>
                        <p>Cada generación es única, lo que te permite mostrar diversos tonos de piel y arte de uñas preciso en un entorno de estudio profesional.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/80 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-sm text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isIntroExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* How It Works Box */}
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/60">
                    <h2 className="text-xl font-bold text-negro-fondo mb-6 text-center">Cómo Funciona</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1500px]' : 'max-h-[120px]'}`}>
                        <p><strong>Paso Uno: Foto de Origen o Tono de Piel</strong> - Selecciona el tono de piel objetivo para tu visual O sube tu propia foto para usarla como base directa. Si subes una foto, nuestra IA la usará como referencia para la máxima precisión.</p>
                        <p><strong>Paso Dos: Diseña las Uñas</strong> - Especifica el diseño de las uñas de los pies. Puedes describir colores, acabados (como mate o brillante) y patrones (como puntas francesas o cromo) para que coincidan con el estilo de tu salón o producto.</p>
                        <p><strong>Paso Tres: Aplica Elementos de Ritual</strong> - Elige una textura para elevar la toma. Usa **aceite** para un brillo saludable, **agua** para un aspecto fresco/refrescante, o **lodo** para una sensación orgánica y terrenal.</p>
                        <p><strong>Paso Cuatro: Especificaciones de Fotografía</strong> - Elige tu relación de aspecto y añade cualquier detalle personalizado, como iluminación específica o accesorios, luego haz clic en generar para recibir 4 opciones de alta resolución.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/80 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-sm text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* Sales & Monetization Box */}
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/60">
                    <h2 className="text-xl font-bold text-negro-fondo mb-6 text-center">Consejos de Ventas y Monetización</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1500px]' : 'max-h-[120px]'}`}>
                        <p><strong>1. Branding para Spas y Bienestar:</strong> Construye una presencia completa en redes sociales para tu negocio de spa o pedicura. Las imágenes profesionales y consistentes generan confianza y justifican precios más altos para tus servicios.</p>
                        <p><strong>2. Fotografía de Stock:</strong> Genera fotos de rituales únicas y de alta fidelidad y véndelas en mercados digitales como activos de stock para especialistas en marketing y diseñadores en la industria del bienestar.</p>
                        <p><strong>3. Expansión de Portafolio:</strong> Si eres técnico de uñas o esteticista, usa estos visuales para mostrar "servicios futuros" o "posibilidades de diseño" en tu sitio web y páginas de reserva.</p>
                        <p><strong>4. Promoción de Productos de Afiliados:</strong> Usa estas tomas de alta gama para promover cremas para pies, aceites o esmaltes de uñas como afiliado. Las fotos de estilo de vida de alta calidad conducen a tasas de clics 3 veces más altas.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/80 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-sm text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isSalesTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* Pro Tips Box */}
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-white/60">
                    <h2 className="text-xl font-bold text-negro-fondo mb-6 text-center">Consejos Profesionales</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1500px]' : 'max-h-[120px]'}`}>
                        <p><strong>• El Contraste es el Rey:</strong> Si usas un tono de piel oscuro, prueba diseños de uñas más claros como "cromo blanco" o "coral brillante" para un contraste impresionante y profesional que resalte en las redes sociales.</p>
                        <p><strong>• Precisión de la Fuente:</strong> Al subir tu propia foto, asegúrate de que los pies sean claramente visibles y estén bien iluminados. Esto ayuda a la IA a mapear perfectamente el nuevo diseño de uñas y los elementos del ritual.</p>
                        <p><strong>• Sinergia de Texturas:</strong> Haz que el acabado de la uña coincida con el elemento. Las uñas "mate" lucen increíbles con tratamientos de "lodo", mientras que las uñas de "alto brillo" brillan mejor bajo "aceite" o "agua goteando".</p>
                        <p><strong>• Enfoque Macro:</strong> La IA sobresale en los detalles macro. No tengas miedo de especificar "toma macro de primer plano" para capturar el realismo de las gotas de agua o la textura de la piel.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/80 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-sm text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isProTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Design Presets Modal (Window) */}
            {isDesignModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in" onClick={() => setIsDesignModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-negro-fondo lowercase tracking-tighter">opciones de diseño de uñas</h3>
                            <button onClick={() => setIsDesignModalOpen(false)} className="text-gray-400 hover:text-rosa-principal transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </header>
                        <div className="p-8 overflow-y-auto grid grid-cols-3 sm:grid-cols-5 gap-y-8 gap-x-4">
                            {nailPresets.map((preset) => (
                                <button 
                                    key={preset.name}
                                    onClick={() => handleSelectDesign(preset)}
                                    className="flex flex-col items-center group transition-transform active:scale-95"
                                >
                                    <div 
                                        className="w-16 h-16 rounded-full border-4 border-white shadow-md mb-2 group-hover:ring-4 group-hover:ring-rosa-principal/30 transition-all"
                                        style={{ background: preset.color }}
                                    />
                                    <span className="text-[10px] font-black text-center text-negro-fondo uppercase tracking-tight leading-tight px-1">
                                        {preset.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <footer className="p-6 border-t border-gray-100 text-center bg-gray-50">
                            <p className="text-[11px] font-bold text-gray-400 lowercase">selecciona un diseño para aplicarlo a tu estudio.</p>
                        </footer>
                    </div>
                </div>
            )}

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-12 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Ampliado" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-2 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-light transition-all border border-white/20 shadow-xl backdrop-blur-md">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FootRituals;
