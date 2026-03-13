import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64, dataURLtoFile } from '../utils';
import { Spinner } from './common/Spinner';
import { AlertCircle } from 'lucide-react';

import { UserProfile } from '../App';

interface AIWigStudioProps {
    addCreations: (images: string[]) => void;
    user: UserProfile;
}

const scenes = [
    { name: 'Pared Verde', prompt: 'a lush, dense artificial vertical garden foliage wall with diverse textures of green leaves, ferns, and ivy, professional high-end studio backdrop' },
    { name: 'Salón', prompt: 'a high-end hair salon with mirrors and professional equipment' },
    { name: 'Estudio', prompt: 'a minimalist professional photography studio with soft lighting' },
    { name: 'Mármol', prompt: 'a luxury setting with a polished white marble background' }
];

const mannequins = [
    { id: 'light', name: 'Claro', color: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #333333 100%)' },
    { id: 'dark', name: 'Oscuro', color: 'radial-gradient(circle at 35% 35%, #5c4033 0%, #1a1410 100%)' },
    { id: 'gray', name: 'Gris', color: 'radial-gradient(circle at 35% 35%, #333333 0%, #000000 100%)' },
    { id: 'pink', name: 'Rosa', color: 'radial-gradient(circle at 35% 35%, #ffc0cb 0%, #4a148c 100%)' },
];

const wigLengths = ["10 pulgadas", "12 pulgadas", "14 pulgadas", "16 pulgadas", "18 pulgadas", "20 pulgadas", "22 pulgadas", "24 pulgadas", "26 pulgadas", "28 pulgadas", "30 pulgadas", "32 pulgadas", "34 pulgadas", "36 pulgadas", "38 pulgadas", "40 pulgadas"];
const hairlineStyles = ["Ninguno", "Suave", "Swoop"];

const tryOnSettings = [
    { id: 'studio', name: 'Estudio Pro', prompt: 'a professional photography studio with soft, even lighting and a clean neutral background.' },
    { id: 'salon', name: 'Salón de Lujo', prompt: 'a high-end hair salon with mirrors, styling chairs, and professional hair care products visible.' },
    { id: 'mirror', name: 'Mirada al Espejo', prompt: 'the person looking at their own reflection in a stylish vanity mirror, smiling and admiring the new look.' },
    { id: 'lifestyle', name: 'Estilo de Vida Urbano', prompt: 'a trendy city street during golden hour, looking natural and happy.' },
    { id: 'evening', name: 'Evento Nocturno', prompt: 'a glamorous red-carpet event at night with camera flashes and luxury decor.' },
    { id: 'beach', name: 'Atardecer en la Playa', prompt: 'a beautiful tropical beach at sunset with soft orange light and gentle waves in the background.' },
    { id: 'office', name: 'Oficina Profesional', prompt: 'a modern, bright corporate office setting with glass walls and professional decor.' },
    { id: 'nature', name: 'Parque Natural', prompt: 'a lush green park with sunlight filtering through trees and a peaceful natural atmosphere.' },
    { id: 'home', name: 'Hogar Acogedor', prompt: 'a warm and inviting modern living room with soft indoor lighting and comfortable decor.' },
    { id: 'gym', name: 'Gimnasio Fitness', prompt: 'a high-end modern fitness center with professional gym equipment and bright lighting.' },
    { id: 'cafe', name: 'Café Elegante', prompt: 'a trendy urban coffee shop with aesthetic interior design, wooden tables, and soft ambient light.' }
];

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <h3 className="text-lg font-bold text-negro-fondo mb-4">Paso {number}: {title}</h3>
        {children}
    </div>
);

const GentleLoader: React.FC<{ message?: string; submessage?: string }> = ({ message, submessage }) => (
    <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
        <div className="flex space-x-2">
            <div className="w-2 h-2 bg-rosa-principal rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-rosa-principal rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-rosa-principal rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        <div>
            <p className="text-sm font-bold text-negro-fondo opacity-80 animate-pulse">{message || 'Creando tu vista previa...'}</p>
            {submessage && <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{submessage}</p>}
        </div>
    </div>
);

const AIWigStudio: React.FC<AIWigStudioProps> = ({ addCreations, user }) => {
    const [activeTab, setActiveTab] = useState<'Estudio de Maniquí' | 'Prueba Virtual'>('Estudio de Maniquí');
    
    // --- Mannequin Studio Specific States ---
    const [mannequinWigPhoto, setMannequinWigPhoto] = useState<{ file: File, preview: string } | null>(null);
    const [mannequinCustomDetails, setMannequinCustomDetails] = useState('');
    const [selectedScene, setSelectedScene] = useState(scenes[0]);
    const [selectedMannequin, setSelectedMannequin] = useState(mannequins[0].id);
    const [userMannequin, setUserMannequin] = useState<{ file: File, preview: string } | null>(null);
    const [extractedWig, setExtractedWig] = useState<string | null>(null);
    const [mannequinGeneratedImages, setMannequinGeneratedImages] = useState<string[]>([]);
    
    // --- Virtual Try-On Specific States ---
    const [tryOnWigPhoto, setTryOnWigPhoto] = useState<{ file: File | null, preview: string } | null>(null);
    const [tryOnUserPhoto, setTryOnUserPhoto] = useState<{ file: File, preview: string } | null>(null);
    const [tryOnCustomDetails, setTryOnCustomDetails] = useState('');
    const [wigLength, setWigLength] = useState(wigLengths[7]); // 24 inches default
    const [hairlineStyle, setHairlineStyle] = useState(hairlineStyles[0]);
    const [selectedTryOnSetting, setSelectedTryOnSetting] = useState(tryOnSettings[0].id);
    const [tryOnVariationMode, setTryOnVariationMode] = useState<'Poses Únicas' | 'Poses Consistentes'>('Poses Únicas');
    const [loadingMessage, setLoadingMessage] = useState('');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwWigStudioFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.activeTab) setActiveTab(parsed.activeTab);
                if (parsed.mannequinCustomDetails) setMannequinCustomDetails(parsed.mannequinCustomDetails);
                if (parsed.selectedScene) {
                    const scene = scenes.find(s => s.name === parsed.selectedScene);
                    if (scene) setSelectedScene(scene);
                }
                if (parsed.selectedMannequin) setSelectedMannequin(parsed.selectedMannequin);
                if (parsed.tryOnCustomDetails) setTryOnCustomDetails(parsed.tryOnCustomDetails);
                if (parsed.wigLength) setWigLength(parsed.wigLength);
                if (parsed.hairlineStyle) setHairlineStyle(parsed.hairlineStyle);
                if (parsed.selectedTryOnSetting) setSelectedTryOnSetting(parsed.selectedTryOnSetting);
                if (parsed.tryOnVariationMode) setTryOnVariationMode(parsed.tryOnVariationMode);
            } catch (e) {
                console.error("Failed to load wig studio form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            activeTab,
            mannequinCustomDetails,
            selectedScene: selectedScene.name,
            selectedMannequin,
            tryOnCustomDetails,
            wigLength,
            hairlineStyle,
            selectedTryOnSetting,
            tryOnVariationMode
        };
        localStorage.setItem('smwWigStudioFormState', JSON.stringify(formState));
    }, [activeTab, mannequinCustomDetails, selectedScene, selectedMannequin, tryOnCustomDetails, wigLength, hairlineStyle, selectedTryOnSetting, tryOnVariationMode]);
    
    const [tryOnGeneratedImages, setTryOnGeneratedImages] = useState<string[]>([]);

    const initialSelfieRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.aiTwinSelfie && user.aiTwinSelfie !== initialSelfieRef.current) {
            const file = dataURLtoFile(user.aiTwinSelfie, 'wig-try-on-selfie.png');
            if (file) {
                setTryOnUserPhoto({ file, preview: user.aiTwinSelfie });
                initialSelfieRef.current = user.aiTwinSelfie;
            }
        } else if (!user?.aiTwinSelfie && initialSelfieRef.current) {
            // Clear local try-on user photo if it was removed from account
            setTryOnUserPhoto(null);
            initialSelfieRef.current = null;
        }
    }, [user?.aiTwinSelfie]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Expandable Info Sections State
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const mannequinWigInputRef = useRef<HTMLInputElement>(null);
    const tryOnWigInputRef = useRef<HTMLInputElement>(null);
    const mannequinInputRef = useRef<HTMLInputElement>(null);
    const userPhotoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (mannequinWigPhoto?.preview) URL.revokeObjectURL(mannequinWigPhoto.preview);
            if (tryOnWigPhoto?.preview && !tryOnWigPhoto.preview.startsWith('data:')) URL.revokeObjectURL(tryOnWigPhoto.preview);
            if (userMannequin?.preview) URL.revokeObjectURL(userMannequin.preview);
            if (tryOnUserPhoto?.preview) URL.revokeObjectURL(tryOnUserPhoto.preview);
        };
    }, [mannequinWigPhoto, tryOnWigPhoto, userMannequin, tryOnUserPhoto]);

    const handleSendToTryOn = () => {
        if (!extractedWig) return;
        // Move extracted wig to Try-On Step 1
        setTryOnWigPhoto({ file: null, preview: extractedWig });
        setActiveTab('Prueba Virtual');
    };

    const handleGenerate = async () => {
        if (activeTab === 'Estudio de Maniquí' && !mannequinWigPhoto) {
            setError('Por favor, sube una foto de la peluca en el Paso 1.');
            return;
        }

        if (activeTab === 'Prueba Virtual' && (!tryOnWigPhoto || !tryOnUserPhoto)) {
            setError('Por favor, sube tanto la foto de la peluca como tu foto personal.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            console.log("DEBUG: AIWigStudio handleGenerate started. API Key:", apiKey ? "Found" : "Missing");
            if (!apiKey) {
                setError('Falta la clave API. Por favor, configúrala en tu entorno.');
                setIsLoading(false);
                return;
            }
            const ai = new GoogleGenAI({ apiKey: apiKey as string });
            const sessionImages: string[] = [];

            if (activeTab === 'Estudio de Maniquí') {
                setMannequinGeneratedImages([]);
                setExtractedWig(null);
                const wigB64 = await fileToBase64(mannequinWigPhoto!.file);

                const extractPrompt = `**CRITICAL MISSION: PURE HAIR EXTRACTION**
EXTRACT ONLY THE WIG/HAIR FROM THE PHOTO. 
ABSOLUTELY REMOVE ALL TRACES OF THE PERSON, FACE, SKIN, AND MANNEQUIN HEAD. 
The output MUST contain ONLY the hair/wig structure, isolated on a clean white background. 
Do not show any eyes, nose, mouth, neck, or shoulders. 
This is for a professional product PNG asset. Seed: ${Math.random()}`;

                // Wait for extraction first to show it
                const extractRes = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: "Original Photo:" }, { inlineData: { mimeType: mannequinWigPhoto!.file.type, data: wigB64 } }, { text: extractPrompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                const extractedPart = extractRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (extractedPart) {
                    setExtractedWig(`data:${extractedPart.inlineData.mimeType};base64,${extractedPart.inlineData.data}`);
                }

                // Sequential generations with delays
                for (let i = 0; i < 4; i++) {
                    setLoadingMessage(`Generando toma de maniquí ${i + 1} de 4...`);
                    const mannequinLabel = mannequins.find(m => m.id === selectedMannequin)?.name || 'professional';
                    const prompt = `**CRITICAL MISSION: WIG MANNEQUIN SHOT**
Showcase the EXACT WIG from the asset photo on a professional, realistic ${mannequinLabel}-toned mannequin head. 
Setting: ${selectedScene.prompt}. 
Style: High-end salon product photography, studio lighting. 
${mannequinCustomDetails ? `Additional Details: ${mannequinCustomDetails}.` : ''}
Seed: ${Math.random() + i}`;

                    const parts: Part[] = [
                        { text: "Wig Asset:" }, 
                        { inlineData: { mimeType: mannequinWigPhoto!.file.type, data: wigB64 } }
                    ];
                    
                    if (userMannequin) {
                        const mannequinB64 = await fileToBase64(userMannequin.file);
                        parts.push({ text: "Target Mannequin Head:" }, { inlineData: { mimeType: userMannequin.file.type, data: mannequinB64 } });
                    }

                    parts.push({ text: prompt });
                    const res = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts },
                        config: { responseModalities: [Modality.IMAGE] },
                    });

                    const img = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (img) {
                        const src = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
                        sessionImages.push(src);
                        setMannequinGeneratedImages(prev => [...prev, src]);
                    }

                    if (i < 3) {
                        for (let countdown = 10; countdown > 0; countdown--) {
                            setLoadingMessage(`Siguiente toma en ${countdown}s...`);
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                }
            } else {
                setTryOnGeneratedImages([]);
                const userB64 = await fileToBase64(tryOnUserPhoto!.file);
                
                let wigB64 = "";
                let wigMime = "image/png";

                if (tryOnWigPhoto!.file) {
                    wigB64 = await fileToBase64(tryOnWigPhoto!.file);
                    wigMime = tryOnWigPhoto!.file.type;
                } else if (tryOnWigPhoto!.preview.startsWith('data:')) {
                    wigB64 = tryOnWigPhoto!.preview.split(',')[1];
                    const mimeMatch = tryOnWigPhoto!.preview.match(/data:(.*?);/);
                    if (mimeMatch) wigMime = mimeMatch[1];
                }

                const uniquePoses = [
                    "A direct forward-facing smile, looking at the camera.",
                    "A three-quarters profile view, showing the side flow of the hair.",
                    "A natural pose looking slightly away from the camera, admiring the new style.",
                    "A dynamic, candid pose showing the hair in motion."
                ];

                for (let i = 0; i < 4; i++) {
                    setLoadingMessage(`Diseñando pose de prueba ${i + 1} de 4...`);
                    const settingObj = tryOnSettings.find(s => s.id === selectedTryOnSetting) || tryOnSettings[0];
                    const poseOverride = tryOnVariationMode === 'Poses Únicas' ? uniquePoses[i] : "A professional and natural pose.";
                    
                    // FIX: Always use the selected setting, but add slight lighting/angle variations if "Unique Poses" is selected
                    const settingPrompt = settingObj.prompt;
                    const variationDetail = tryOnVariationMode === 'Poses Únicas' 
                        ? (i === 0 ? "Bright morning light." : i === 1 ? "Soft side lighting." : i === 2 ? "Warm golden hour glow." : "Dramatic studio lighting.")
                        : "";

                    const lengthInInches = parseInt(wigLength);
                    let composition = "Upper body shot (head and shoulders)";
                    let lengthInstruction = `The wig length MUST be EXACTLY **${wigLength}**.`;

                    if (lengthInInches >= 34) {
                        composition = "Waist-up shot to fully showcase the extreme length of the hair";
                        lengthInstruction = `The wig length MUST be EXTREMELY LONG, exactly **${wigLength}**. The hair should extend all the way down to the waist or hips. This is the most important part of the request.`;
                    } else if (lengthInInches >= 26) {
                        composition = "Mid-torso shot to show the hair length properly";
                        lengthInstruction = `The wig length MUST be exactly **${wigLength}**, reaching the lower back or waist area.`;
                    } else if (lengthInInches >= 18) {
                        composition = "Upper body shot showing the hair reaching the chest/shoulders";
                        lengthInstruction = `The wig length MUST be exactly **${wigLength}**, reaching the chest or mid-back.`;
                    }

                    const prompt = `**CRITICAL MISSION: PROFESSIONAL HAIR/WIG SWAP**
IMAGE 1 ("HAIR/WIG SOURCE"): Contains the wig style to be used.
IMAGE 2 ("TARGET PERSON"): The person whose face and identity MUST be preserved 100% unchanged.

TASK:
1.  **IDENTITY ANCHOR:** Look at IMAGE 2. The person's face, features, skin tone, and expression MUST be preserved 100% with absolute precision. Do not change the facial structure, eyes, nose, or lips. The output must look exactly like the person in IMAGE 2.
2.  **HAIR EXTRACTION:** Look at IMAGE 1. Extract the hair style, color, and texture exactly.
3.  **EXECUTION:** Replace the person's hair in IMAGE 2 with the hair from IMAGE 1.
4.  **ACCURATE PROPORTIONS & LENGTH:** 
    - ${lengthInstruction}
    - Adjust the scaling so the hair looks natural and proportionate to the head size.
    - Ensure the hair length is clearly visible and accurate to the ${wigLength} specification.
5.  **SETTING & POSE:** 
    - Setting: ${settingPrompt} ${variationDetail}
    - Pose: ${poseOverride}

SPECIFICATIONS:
- Hairline Style: ${hairlineStyle}
${tryOnCustomDetails ? `- Stylist Instructions: ${tryOnCustomDetails}` : ''}

Style: High-end professional salon portrait, photorealistic, cinematic lighting.
Composition: ${composition}.
Seed: ${Math.random() + i}`;

                    const res = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: [
                            { text: "HAIR/WIG SOURCE:" }, { inlineData: { mimeType: wigMime, data: wigB64 } },
                            { text: "TARGET PERSON:" }, { inlineData: { mimeType: tryOnUserPhoto!.file.type, data: userB64 } },
                            { text: prompt }
                        ]},
                        config: { responseModalities: [Modality.IMAGE] },
                    });

                    const img = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (img) {
                        const src = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
                        sessionImages.push(src);
                        setTryOnGeneratedImages(prev => [...prev, src]);
                    }

                    if (i < 3) {
                        for (let countdown = 10; countdown > 0; countdown--) {
                            setLoadingMessage(`Siguiente pose en ${countdown}s...`);
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    }
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            console.error("Generation error:", e);
            const rawError = String(e);
            if (rawError.includes("429") || rawError.includes("quota") || rawError.includes("RESOURCE_EXHAUSTED")) {
                setError(
                    <div className="flex flex-col gap-3">
                        <p className="font-bold">Cuota de IA Alcanzada</p>
                        <p className="text-xs opacity-90">Se ha alcanzado el límite de generación compartido. Puedes esperar un minuto para que se restablezca, o conectar tu propia clave API para obtener resultados ilimitados y más rápidos.</p>
                        <button 
                            onClick={() => (window as any).aistudio?.openSelectKey?.()}
                            className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm self-start"
                        >
                            Conectar Tu Propia Clave API
                        </button>
                    </div>
                );
            } else {
                setError('La generación falló. Por favor, inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleStartOver = () => {
        if (activeTab === 'Estudio de Maniquí') {
            setMannequinWigPhoto(null);
            setMannequinCustomDetails('');
            setMannequinGeneratedImages([]);
            setExtractedWig(null);
            if (mannequinWigInputRef.current) mannequinWigInputRef.current.value = '';
        } else {
            setTryOnWigPhoto(null);
            setTryOnUserPhoto(null);
            setTryOnCustomDetails('');
            setTryOnGeneratedImages([]);
            if (tryOnWigInputRef.current) tryOnWigInputRef.current.value = '';
            if (userPhotoInputRef.current) userPhotoInputRef.current.value = '';
        }
        setError(null);
    };

    const activeWigPhoto = activeTab === 'Estudio de Maniquí' ? mannequinWigPhoto : tryOnWigPhoto;
    const activeGeneratedImages = activeTab === 'Estudio de Maniquí' ? mannequinGeneratedImages : tryOnGeneratedImages;

    return (
        <div className="flex flex-col h-full bg-rosa-claro p-4 md:p-10 space-y-6 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">Estudio de Pelucas IA</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    Extrae una peluca de una foto y colócala en un maniquí o pruébatela virtualmente con preservación absoluta de la identidad y calidad profesional.
                </p>
            </div>

            <div className="flex border-b border-rosa-principal/20 mb-6 gap-8 justify-center md:justify-start">
                {['Estudio de Maniquí', 'Prueba Virtual'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-2 text-lg font-bold transition-all relative ${activeTab === tab ? 'text-negro-fondo' : 'text-negro-fondo opacity-60'}`}
                    >
                        {tab}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rosa-principal" />}
                    </button>
                ))}
            </div>
            
            <div className="max-w-4xl mx-auto md:mx-0 space-y-6">
                {/* Step 1: Upload Wig Photo */}
                <Step number={1} title="Subir Foto de la Peluca">
                    {activeTab === 'Prueba Virtual' && (
                        <div className="mb-6 bg-[#fff5f5] border border-[#ffe3e3] rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-fade-in">
                            <div className="bg-[#cc3333] rounded-full p-1.5 flex-shrink-0 mt-0.5">
                                <AlertCircle className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                            <div>
                                <h4 className="text-[#991b1b] font-black text-[13px] uppercase tracking-tight">ADVERTENCIA: SE REQUIERE RENDERIZADO DE PELUCA CON FONDO TRANSPARENTE</h4>
                                <div className="text-[#991b1b] text-[12px] font-bold leading-relaxed mt-0.5 opacity-90">
                                    <p>Sube solo un recorte de peluca en PNG.</p>
                                    <p>La imagen debe tener un fondo completamente transparente.</p>
                                    <p>Sin modelos, sin cabezas, sin maniquíes, sin fotos de plano medio.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div 
                        onClick={() => activeTab === 'Estudio de Maniquí' ? mannequinWigInputRef.current?.click() : tryOnWigInputRef.current?.click()} 
                        className="w-full h-48 bg-white rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-rosa-principal/30 hover:border-rosa-principal transition-colors p-4 text-center mb-4"
                    >
                        {activeWigPhoto ? (
                            <img src={activeWigPhoto.preview} className="h-full object-contain rounded-lg" alt="Wig preview" />
                        ) : (
                            <p className="text-sm font-semibold text-negro-fondo opacity-70">
                                {activeTab === 'Estudio de Maniquí' 
                                    ? 'Haz clic para subir una foto de la peluca en un modelo o maniquí.' 
                                    : 'Haz clic para subir una foto de la peluca.'}
                            </p>
                        )}
                        <input type="file" ref={activeTab === 'Estudio de Maniquí' ? mannequinWigInputRef : tryOnWigInputRef} onChange={e => {
                            if (e.target.files?.[0]) {
                                const photo = { file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0]) };
                                if (activeTab === 'Estudio de Maniquí') setMannequinWigPhoto(photo);
                                else setTryOnWigPhoto(photo);
                            }
                        }} className="hidden" accept="image/*" />
                    </div>
                    {activeTab === 'Estudio de Maniquí' && (
                        <div>
                            <label className="text-xs font-bold text-negro-fondo opacity-60 uppercase mb-2 block">Opcional: Añadir Detalles</label>
                            <textarea
                                value={mannequinCustomDetails}
                                onChange={(e) => setMannequinCustomDetails(e.target.value)}
                                placeholder="ej. haz la peluca de 30 pulgadas de largo"
                                className="w-full h-24 bg-white border border-rosa-principal/10 rounded-lg p-3 text-sm focus:ring-1 focus:ring-rosa-principal outline-none resize-none text-black font-medium"
                            />
                        </div>
                    )}
                </Step>

                {activeTab === 'Estudio de Maniquí' ? (
                    <>
                        <Step number={2} title="Elegir Escena y Maniquí">
                            <p className="text-sm text-negro-fondo opacity-80 mb-4">Primero, selecciona una escena fotorrealista para tu toma de producto.</p>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {scenes.map(s => (
                                    <button
                                        key={s.name}
                                        onClick={() => setSelectedScene(s)}
                                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${selectedScene.name === s.name ? 'bg-rosa-principal text-negro-fondo' : 'bg-white text-negro-fondo border border-gray-100 hover:bg-gray-50'}`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>

                            <p className="text-sm text-negro-fondo opacity-80 mb-4">A continuación, sube tu propia foto de cabeza de maniquí (Opcional). Si no proporcionas una, generaremos una para ti.</p>
                            <div className="flex flex-wrap gap-4 items-start">
                                {mannequins.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => {setSelectedMannequin(m.id); setUserMannequin(null);}}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all w-[100px] h-[150px] ${selectedMannequin === m.id && !userMannequin ? 'bg-rosa-principal' : 'bg-white'}`}
                                    >
                                        <div className="relative mb-2">
                                            <div 
                                                className="w-12 h-20 rounded-t-full rounded-b-[40%] border border-black/10 shadow-sm"
                                                style={{ background: m.color }}
                                            />
                                            <div className="w-1 h-4 bg-gray-400 mx-auto -mt-0.5 opacity-60 rounded-b-full" />
                                        </div>
                                        <span className={`text-xs font-bold tracking-tight ${selectedMannequin === m.id && !userMannequin ? 'text-negro-fondo' : 'text-negro-fondo opacity-80'}`}>{m.name}</span>
                                    </button>
                                ))}
                                
                                <div 
                                    onClick={() => mannequinInputRef.current?.click()}
                                    className={`w-[100px] h-[150px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${userMannequin ? 'border-rosa-principal bg-rosa-principal' : 'border-gray-200 bg-white/50 hover:border-rosa-principal'}`}
                                >
                                    {userMannequin ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <img src={userMannequin.preview} className="w-12 h-12 object-cover rounded-full border-2 border-white shadow-md" alt="User mannequin" />
                                            <p className="text-[10px] font-bold text-negro-fondo uppercase text-center px-1">Seleccionado</p>
                                        </div>
                                    ) : (
                                        <div className="text-center p-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase leading-relaxed">Subir la Tuya</p>
                                        </div>
                                    )}
                                    <input type="file" ref={mannequinInputRef} onChange={e => e.target.files?.[0] && setUserMannequin({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                                </div>
                            </div>
                        </Step>

                        <Step number={3} title="Generar">
                            <button 
                                onClick={handleGenerate} 
                                disabled={isLoading || !mannequinWigPhoto} 
                                className="w-full bg-rosa-principal text-negro-fondo font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-lg shadow-sm flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 bg-negro-fondo rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="w-4 h-4 bg-negro-fondo rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-4 h-4 bg-negro-fondo rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        <span className="ml-2 uppercase tracking-widest text-sm">Procesando...</span>
                                    </>
                                ) : 'Crear Vista Previa del Maniquí'}
                            </button>
                            {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">{error}</div>}
                        </Step>
                    </>
                ) : (
                    <>
                        <Step number={2} title="Subir Tu Foto">
                            <div 
                                onClick={() => userPhotoInputRef.current?.click()} 
                                className="w-full h-48 bg-white rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-rosa-principal/30 hover:border-rosa-principal transition-colors p-4 text-center"
                            >
                                {tryOnUserPhoto ? (
                                    <img src={tryOnUserPhoto.preview} className="h-full object-contain rounded-lg" alt="User preview" />
                                ) : (
                                    <p className="text-sm font-semibold text-negro-fondo opacity-70">Haz clic para subir una foto clara de la persona.</p>
                                )}
                                <input type="file" ref={userPhotoInputRef} onChange={e => e.target.files?.[0] && setTryOnUserPhoto({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                            </div>
                        </Step>

                        <Step number={3} title="Personalizar Estilo y Resultados">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-bold text-negro-fondo block mb-2 opacity-70 uppercase tracking-widest text-[10px]">Largo de la Peluca</label>
                                        <select 
                                            value={wigLength} 
                                            onChange={e => setWigLength(e.target.value)}
                                            className="w-full bg-white border-2 border-gray-100 rounded-lg p-3 focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo appearance-none font-medium"
                                            style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem'}}
                                        >
                                            {wigLengths.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-negro-fondo block mb-2 opacity-70 uppercase tracking-widest text-[10px]">Bordes / Línea del Cabello</label>
                                        <div className="flex bg-gray-50 rounded-full p-1 border border-gray-100">
                                            {hairlineStyles.map(s => (
                                                <button 
                                                    key={s}
                                                    onClick={() => setHairlineStyle(s)}
                                                    className={`flex-1 text-center rounded-full py-2 text-sm font-bold transition-all ${hairlineStyle === s ? 'bg-rosa-principal text-negro-fondo shadow-sm' : 'text-negro-fondo opacity-60 hover:text-negro-fondo'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="text-sm font-bold text-negro-fondo block mb-2 opacity-70 uppercase tracking-widest text-[10px]">Elegir Entorno</label>
                                    <div className="flex flex-wrap gap-2">
                                        {tryOnSettings.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setSelectedTryOnSetting(s.id)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border shadow-sm ${selectedTryOnSetting === s.id ? 'bg-rosa-principal text-negro-fondo border-rosa-principal' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="text-sm font-bold text-negro-fondo block mb-2 opacity-70 uppercase tracking-widest text-[10px]">Estilo de Variación de Resultados</label>
                                    <div className="flex bg-gray-50 rounded-full p-1 border border-gray-100 max-w-sm">
                                        <button 
                                            onClick={() => setTryOnVariationMode('Poses Únicas')}
                                            className={`flex-1 text-center rounded-full py-2 text-sm font-bold transition-all ${tryOnVariationMode === 'Poses Únicas' ? 'bg-rosa-principal text-negro-fondo shadow-sm' : 'text-negro-fondo opacity-60 hover:text-negro-fondo'}`}
                                        >
                                            4 Poses Únicas
                                        </button>
                                        <button 
                                            onClick={() => setTryOnVariationMode('Poses Consistentes')}
                                            className={`flex-1 text-center rounded-full py-2 text-sm font-bold transition-all ${tryOnVariationMode === 'Poses Consistentes' ? 'bg-rosa-principal text-negro-fondo shadow-sm' : 'text-negro-fondo opacity-60 hover:text-negro-fondo'}`}
                                        >
                                            Opción Única
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2 italic">
                                        {tryOnVariationMode === 'Poses Únicas' 
                                            ? 'La IA generará 4 poses diferentes y variaciones de iluminación dentro del entorno seleccionado.' 
                                            : 'La IA generará 4 tomas similares enfocadas en el entorno específico seleccionado.'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-negro-fondo block mb-2 opacity-70 uppercase tracking-widest text-[10px]">Prompt Personalizado (Opcional)</label>
                                    <textarea
                                        value={tryOnCustomDetails}
                                        onChange={(e) => setTryOnCustomDetails(e.target.value)}
                                        placeholder="ej. añade rizos suaves, haz el color del cabello un poco más cálido, luciendo feliz"
                                        className="w-full h-24 bg-white border border-rosa-principal/10 rounded-lg p-3 text-sm focus:ring-1 focus:ring-rosa-principal outline-none resize-none text-black font-medium"
                                    />
                                </div>
                            </div>
                        </Step>

                        <Step number={4} title="Generar">
                            <div className="space-y-3">
                                <button 
                                    onClick={handleGenerate} 
                                    disabled={isLoading || !tryOnWigPhoto || !tryOnUserPhoto} 
                                    className="w-full bg-rosa-principal text-negro-fondo font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-lg shadow-sm flex items-center justify-center gap-3"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 bg-negro-fondo rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                            <div className="w-4 h-4 bg-negro-fondo rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <div className="w-4 h-4 bg-negro-fondo rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            <span className="ml-2 uppercase tracking-widest text-sm">Procesando...</span>
                                        </>
                                    ) : 'Crear Prueba Virtual'}
                                </button>
                                <button 
                                    onClick={handleStartOver}
                                    className="w-full bg-white text-negro-fondo font-bold py-3 rounded-xl hover:bg-gray-50 transition-all text-md shadow-sm border border-gray-100"
                                >
                                    Empezar de Nuevo
                                </button>
                            </div>
                            {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">{error}</div>}
                        </Step>
                    </>
                )}

                {/* Extracted Wig Box (Only for Mannequin Studio) */}
                {activeTab === 'Estudio de Maniquí' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-bold text-negro-fondo">Peluca Extraída (PNG)</h3>
                            {extractedWig && (
                                <div className="flex gap-2">
                                    <a href={extractedWig} download="extracted-wig.png" className="bg-white/90 text-xs font-bold text-negro-fondo px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm">
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Descargar PNG
                                    </a>
                                    <button onClick={handleSendToTryOn} className="bg-rosa-principal text-xs font-bold text-negro-fondo px-3 py-1.5 rounded-full hover:opacity-90 flex items-center gap-2 transition-all shadow-sm">
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        Usar en Prueba
                                    </button>
                                </div>
                            )}
                        </div>
                        <div 
                            className="w-full aspect-[16/6] rounded-lg border border-gray-200 flex items-center justify-center relative overflow-hidden"
                            style={{
                                backgroundColor: '#ffffff',
                                backgroundImage: `
                                    linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
                                    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
                                    linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
                                    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                                `,
                                backgroundSize: '20px 20px',
                                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }}
                        >
                            {isLoading && !extractedWig ? (
                                <GentleLoader message={loadingMessage || "Extrayendo Peluca..."} submessage="Perfeccionando el recurso de cabello" />
                            ) : extractedWig ? (
                                <img src={extractedWig} className="max-h-full object-contain animate-fade-in" alt="Extracted wig" />
                            ) : (
                                <p className="text-base text-gray-700 font-bold opacity-100 drop-shadow-sm">El resultado aparecerá aquí</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((num, idx) => (
                        <div key={num} className="bg-white rounded-xl aspect-square flex items-center justify-center border border-white relative overflow-hidden group shadow-inner">
                            {isLoading && idx >= activeGeneratedImages.length ? (
                                <GentleLoader message={loadingMessage || "Generando..."} submessage={`Renderizando Foto ${idx + 1}`} />
                            ) : activeGeneratedImages[idx] ? (
                                <div className="relative group w-full h-full animate-fade-in">
                                    <img src={activeGeneratedImages[idx]} alt={`Result ${num}`} className="w-full h-full object-cover cursor-zoom-in transition-transform group-hover:scale-105" onClick={() => setZoomedImage(activeGeneratedImages[idx])} />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button onClick={() => setZoomedImage(activeGeneratedImages[idx])} className="bg-white/90 text-negro-fondo p-2 rounded-full hover:bg-white shadow-md transition-transform active:scale-95">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                        </button>
                                        <a href={activeGeneratedImages[idx]} download={`wig-result-${num}.png`} className="bg-white/90 text-negro-fondo p-2 rounded-full hover:bg-white shadow-md transition-transform active:scale-95" onClick={e => e.stopPropagation()}>
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-gray-200 text-6xl font-bold">{num}</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Information Sections */}
                <div className="space-y-6 pt-10 border-t border-rosa-principal/20">
                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Introducción</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <p>Bienvenido al Estudio de Pelucas IA, una herramienta de visualización de vanguardia para la industria del cabello y la belleza. Esta plataforma permite a los creadores de pelucas, dueños de boutiques y entusiastas extraer instantáneamente una peluca de una foto y presentarla en un entorno profesional de grado comercial.</p>
                            <p>Ya sea que busques generar fotos de productos de alta gama en maniquíes profesionales o quieras probarte virtualmente un nuevo look antes de realizar una compra, nuestra IA mantiene una precisión del 100% en la textura y el color del cabello. Es la forma perfecta de construir una marca profesional o experimentar con tu estilo sin salir de casa.</p>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                                {isIntroExpanded ? 'Leer Menos' : 'Leer Más'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Cómo Funciona</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <p><strong>Paso 1: Sube Tu Peluca de Origen</strong> - Sube una foto de la peluca. Puede estar en una persona, en un maniquí o incluso ser una foto de stock. Este es el "plano" que nuestra IA utiliza para la textura y el color del cabello.</p>
                            <p><strong>Paso 2: Elige Tu Camino</strong> - Selecciona <strong>'Estudio de Maniquí'</strong> para generar recursos profesionales para tu tienda, o <strong>'Prueba Virtual'</strong> para ver la peluca en una persona específica (tú mismo o un modelo).</p>
                            <div className="space-y-2">
                                <p><strong>Paso 3: Configura la Escena</strong> - </p>
                                <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                                    <li><strong>En Modo Maniquí:</strong> Elige un tono de piel y un fondo de estudio de lujo como "Pared Verde" o "Mármol".</li>
                                    <li><strong>En Modo de Prueba:</strong> Sube la foto de la persona objetivo y selecciona el <strong>Largo de la Peluca</strong> deseado (de 10" a 40") y el <strong>Estilo de Línea del Cabello</strong>.</li>
                                </ul>
                            </div>
                            <p><strong>Paso 4: Generar</strong> - Haz clic en Crear. En el modo de Prueba, la IA intercambiará con precisión el cabello del Paso 1 en la persona del Paso 2, manteniendo su identidad facial exacta. En el modo Maniquí, extrae el cabello como un PNG limpio y lo coloca en la escena seleccionada.</p>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                                {isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Consejos de Venta e Ideas de Monetización</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <p><strong>1. Galería de Productos Profesional:</strong> Deja de depender de fotos de aficionados tomadas con el celular. Usa el Estudio de Maniquí para generar una colección uniforme y de alta gama para tu sitio web. La iluminación y los fondos consistentes aumentan la confianza del cliente y las conversiones.</p>
                            <p><strong>2. Contenido de Afiliados y Promoción:</strong> Promociona extensiones de cabello y pelucas como afiliado. Genera contenido editorial impresionante usando fotos de stock de productos y muéstralos "en uso" para impulsar más clics en los enlaces.</p>
                            <p><strong>3. Consultas Virtuales:</strong> Ofrece un servicio premium donde los clientes te envíen su foto y tú "instales digitalmente" diferentes pelucas de tu catálogo para que puedan elegir el ajuste perfecto antes de comprar.</p>
                            <p><strong>4. Impulsa el Compromiso en Redes Sociales:</strong> Publica carruseles de "¿Qué look debería elegir después?" presentándote con 4 estilos de pelucas diferentes generados por IA. Este tipo de contenido interactivo obtiene muchas guardadas y compartidas.</p>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                                {isSalesTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                        <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Consejos Pro</h2>
                        <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                            <p><strong>• Dirección de la Iluminación:</strong> Para la extracción más realista, sube una foto de origen con iluminación clara y frontal. Evita las sombras pesadas que pueden difuminar la textura del cabello.</p>
                            <p><strong>• El Contraste es el Rey:</strong> Si la peluca es muy oscura, intenta usar una foto de origen con un fondo más claro. Esto ayuda a la IA a definir los bordes del cabello con mayor precisión.</p>
                            <p><strong>• Preparación de la Línea del Cabello:</strong> En la Prueba Virtual, usa una foto de origen donde tu frente sea visible. La IA mezclará naturalmente el encaje o la línea del cabello de la peluca en tu piel para un look impecable.</p>
                            <p><strong>• Maniquíes Personalizados:</strong> Si tienes una cabeza de maniquí distintiva que representa tu marca, súbela en el Paso 2. La IA priorizará tu recurso personalizado para mantener la identidad única de tu marca.</p>
                            <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                        </div>
                        <div className="text-center">
                            <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                                {isProTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-10 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Expanded" className="max-w-full max-h-full object-contain rounded-md shadow-2xl border-4 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-5 md:right-5 bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md" aria-label="Cerrar">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIWigStudio;