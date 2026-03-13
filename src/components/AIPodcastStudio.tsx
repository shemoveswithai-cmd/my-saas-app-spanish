import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64, dataURLtoFile } from '../utils';
import { Spinner } from './common/Spinner';
import { UserProfile } from '../App';
import { useLanguage } from '../context/LanguageContext';

interface AIPodcastStudioProps {
    addCreations: (images: string[]) => void;
    user: UserProfile;
}

const studioVibes = [
    { name: 'Cinematic blackout', prompt: 'un estudio de podcast profesional de alta gama con un fondo sólido completamente negro, con una iluminación de borde dramática e intensa y reflejos nítidos en el sujeto, creando una atmósfera melancólica, profunda y enfocada.' },
    { name: 'Neon high-tech', prompt: 'un estudio de podcast de video de alta gama con iluminación LED de neón púrpura y azul vibrante, paneles de insonorización modernos y múltiples cámaras profesionales visibles.' },
    { name: 'Cozy library', prompt: 'una sofisticada sala de podcast ubicada en una biblioteca con estanterías de piso a techo, iluminación ámbar cálida y sillones de cuero de felpa.' },
    { name: 'Minimalist clean', prompt: 'un estudio de podcast brillante y minimalista con una estética blanca limpia, acentos de roble claro y luz solar suave de la mañana.' },
    { name: 'Industrial loft', prompt: 'un estudio loft industrial urbano con paredes de ladrillo visto, techos altos y grandes ventanales de fábrica.' },
    { name: 'Vibrant pop', prompt: 'un set de podcast colorido y enérgico con arte de pared en colores pastel audaces, muebles de tendencia y un ambiente creativo y juguetón.' },
    { name: 'Luxury penthouse', prompt: 'un estudio de podcast de lujo ubicado en un penthouse de gran altura con una vista brillante del horizonte de la ciudad por la noche a través de vidrios de piso a techo.' },
    { name: 'Boho oasis', prompt: 'un entorno de podcast relajado con decoración de macramé, plantas tropicales de interior, sillas de ratán y texturas naturales suaves.' },
    { name: 'Classic radio', prompt: 'un ambiente de estación de radio clásico con paneles de madera, mesas de mezclas de estilo vintage e icónicos micrófonos Shure.' },
    { name: 'Dark academia', prompt: 'una sala de podcast melancólica y erudita con muebles de caoba oscura, cortinas de terciopelo verde, globos terráqueos vintage e iluminación cálida y suave.' },
];

const studioScenes = [
    { name: 'Extreme macro close-up', prompt: 'una toma de primer plano macro extremo que se enfoca intensamente en la cara, los ojos y la boca del presentador, capturando cada detalle de la expresión, con un micrófono de podcast de alta gama muy cerca y un bokeh suave que desenfoca los bordes.' },
    { name: 'Solo mic close-up', prompt: 'sentado de cerca frente a un micrófono de podcast profesional, usando auriculares de estudio de alta gama, mirando directamente a la cámara involucrado en una conversación.' },
    { name: 'Guest interview set', prompt: 'sentado frente a una silla de invitado vacía en una configuración de entrevista profesional para varias personas, con dos micrófonos visibles.' },
    { name: 'Wide action shot', prompt: 'una toma de gran angular que muestra todo el set de podcast profesional, con el presentador gesticulando naturalmente mientras habla por el micrófono.' },
    { name: 'Thinking / satisfied', prompt: 'inclinándose ligeramente hacia atrás en una cómoda silla de podcast con una sonrisa de satisfacción, auriculares alrededor del cuello, mirando fuera de cámara como si estuviera reflexionando sobre un gran punto.' },
    { name: 'The setup intro', prompt: 'de pie junto al escritorio y el micrófono del podcast, luciendo acogedor y listo para comenzar el programa.' },
];

const angleLabVariations = [
    { id: 'right', label: 'Ángulo derecho de 60°', prompt: 'Coloca la cámara a 60 grados a la derecha del sujeto. Muestra el perfil lateral del presentador y el lateral del micrófono del podcast.' },
    { id: 'left', label: 'Ángulo izquierdo de 60°', prompt: 'Coloca la cámara a 60 grados a la izquierda del sujeto. Captura la profundidad del fondo del estudio en el lado izquierdo.' },
    { id: 'profile', label: 'Vista lateral de 90°', prompt: 'Una toma de perfil lateral nítida de 90 grados. El presentador está mirando a través del encuadre hacia el micrófono.' },
    { id: 'wide', label: 'Toma maestra amplia', prompt: 'Una toma maestra cinematográfica de gran angular desde 3 metros de distancia. Muestra todo el escritorio, el atuendo completo del presentador y los muebles del estudio circundante.' },
];

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4">
            <h3 className="text-base font-semibold text-gray-400 mb-4 tracking-tight lowercase">{t('step', 'paso')} {number}: {title}</h3>
            {children}
        </div>
    );
};

const AIPodcastStudio: React.FC<AIPodcastStudioProps> = ({ addCreations, user }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'Studio Creator' | 'Angle Lab'>('Studio Creator');
    
    // --- Estados del Creador de Estudio ---
    const [personImage, setPersonImage] = useState<{ file: File; preview: string } | null>(null);
    const [selectedVibe, setSelectedVibe] = useState(studioVibes[0]);
    const [selectedScene, setSelectedScene] = useState(studioScenes[0]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [signText, setSignText] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');

    // Cargar estado del formulario desde localStorage
    useEffect(() => {
        const savedVibe = localStorage.getItem('smwPodcastVibe');
        const savedScene = localStorage.getItem('smwPodcastScene');
        const savedCustom = localStorage.getItem('smwPodcastCustom');
        const savedSign = localStorage.getItem('smwPodcastSign');
        const savedRatio = localStorage.getItem('smwPodcastRatio');
        
        if (savedVibe) {
            const vibe = studioVibes.find(v => v.name === savedVibe);
            if (vibe) setSelectedVibe(vibe);
        }
        if (savedScene) {
            const scene = studioScenes.find(s => s.name === savedScene);
            if (scene) setSelectedScene(scene);
        }
        if (savedCustom) setCustomPrompt(savedCustom);
        if (savedSign) setSignText(savedSign);
        if (savedRatio) setAspectRatio(savedRatio);
    }, []);

    // Guardar estado del formulario en localStorage
    useEffect(() => {
        localStorage.setItem('smwPodcastVibe', selectedVibe.name);
        localStorage.setItem('smwPodcastScene', selectedScene.name);
        localStorage.setItem('smwPodcastCustom', customPrompt);
        localStorage.setItem('smwPodcastSign', signText);
        localStorage.setItem('smwPodcastRatio', aspectRatio);
    }, [selectedVibe, selectedScene, customPrompt, signText, aspectRatio]);
    
    const [cameraAngleMode, setCameraAngleMode] = useState<'4 Different Angles' | 'Consistent Angle'>('4 Different Angles');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);

    // --- Estados del Laboratorio de Ángulos ---
    const [labAsset, setLabAsset] = useState<{ file: File | null; preview: string; ratio: string } | null>(null);
    const [labAspectRatio, setLabAspectRatio] = useState('16:9');
    const [labCustomPrompt, setLabCustomPrompt] = useState('');
    const [labGeneratedImages, setLabGeneratedImages] = useState<string[]>([]);

    // Estados Globales
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);
    
    const [savedStudios, setSavedStudios] = useState<string[]>([]);
    
    const personInputRef = useRef<HTMLInputElement>(null);
    const labInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem(`smwSavedStudios_${user.uid}`);
        if (saved) {
            try { setSavedStudios(JSON.parse(saved)); } catch (e) { console.error(e); }
        }
    }, [user.uid]);

    const handleSaveStudio = (imageUrl: string) => {
        if (savedStudios.includes(imageUrl)) return;
        const newSaved = [imageUrl, ...savedStudios].slice(0, 15);
        setSavedStudios(newSaved);
        localStorage.setItem(`smwSavedStudios_${user.uid}`, JSON.stringify(newSaved));
    };

    const handleDeleteSavedStudio = (index: number) => {
        const newSaved = savedStudios.filter((_, i) => i !== index);
        setSavedStudios(newSaved);
        localStorage.setItem(`smwSavedStudios_${user.uid}`, JSON.stringify(newSaved));
    };

    const handleSendToLab = (imageUrl: string) => {
        setLabAsset({ file: null, preview: imageUrl, ratio: aspectRatio });
        setActiveTab('Angle Lab');
    };

    const initialSelfieRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.aiTwinSelfie && user.aiTwinSelfie !== initialSelfieRef.current) {
            const file = dataURLtoFile(user.aiTwinSelfie, 'podcast-selfie.png');
            if (file) {
                setPersonImage({ file, preview: user.aiTwinSelfie });
                initialSelfieRef.current = user.aiTwinSelfie;
            }
        } else if (!user?.aiTwinSelfie && initialSelfieRef.current) {
            // Limpiar imagen local si se eliminó de la cuenta
            setPersonImage(null);
            initialSelfieRef.current = null;
        }
    }, [user?.aiTwinSelfie]);

    const handleGenerateStudio = async () => {
        if (!personImage) return setError(t('Please upload your photo.', 'Por favor, sube tu foto.'));

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setLoadingMessage(t('Initializing...', 'Inicializando...'));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const personBase64 = await fileToBase64(personImage.file);
            const sessionImages: string[] = [];
            const count = cameraAngleMode === '4 Different Angles' ? 4 : 1;

            for (let i = 0; i < count; i++) {
                setLoadingMessage(t(`Generating photo ${i + 1} of ${count}...`, `Generando foto ${i + 1} de ${count}...`));
                const signInstruction = signText.trim() ? `En el fondo, un letrero de neón dice: "${signText}".` : "";
                const angleVariation = cameraAngleMode === '4 Different Angles' ? angleLabVariations[i % angleLabVariations.length].prompt : "Una perspectiva frontal directa.";

                const promptText = `**MISIÓN CRÍTICA: SESIÓN DE FOTOS DE PODCAST PROFESIONAL**
RE-CREAR A LA PERSONA DE LA FOTO DE ORIGEN CON UN 100% DE PRECISIÓN DE IDENTIDAD.
ENTORNO: ${selectedVibe.prompt}. ${signInstruction}
ESCENA: ${selectedScene.prompt}.
ÁNGULO DE CÁMARA: ${angleVariation}
DETALLES ADICIONALES: ${customPrompt || "Ninguno"}
ESTILO: Fotorrealista, iluminación cinematográfica. Semilla: ${Math.random()}`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ inlineData: { mimeType: personImage.file.type, data: personBase64 } }, { text: promptText }] },
                    config: { 
                        responseModalities: [Modality.IMAGE],
                        imageConfig: { aspectRatio: aspectRatio as any }
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
        } catch (e: any) { setError(`${t('Error', 'Error')}: ${e.message || String(e)}`); }
        finally { setIsLoading(false); }
    };

    const handleGenerateAngles = async () => {
        if (!labAsset) return setError(t('Please upload or select an anchor photo.', 'Por favor, sube o selecciona una foto de referencia.'));

        setIsLoading(true);
        setError(null);
        setLabGeneratedImages([]);
        setLoadingMessage(t('Activating angle lab...', 'Activando el laboratorio de ángulos...'));

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const assetBase64 = labAsset.preview.startsWith('data:') ? labAsset.preview.split(',')[1] : await fileToBase64(labAsset.file!);
            const assetMime = labAsset.file?.type || "image/png";

            const sessionImages: string[] = [];
            for (let i = 0; i < 4; i++) {
                setLoadingMessage(t(`Calculating angle ${i + 1} of 4...`, `Calculando ángulo ${i + 1} de 4...`));
                const currentVar = angleLabVariations[i % angleLabVariations.length];
                const prompt = `**MISIÓN CRÍTICA: VARIACIÓN DE ÁNGULO DE CÁMARA**
CLONAR LA HABITACIÓN Y LA PERSONA DE LA IMAGEN DE 'REFERENCIA DE ORIGEN'.
CONSERVAR EL LETRERO DE NEÓN Y LA ILUMINACIÓN.
CAMBIO OBLIGATORIO: Ver la escena desde esta NUEVA perspectiva: ${currentVar.prompt}.
${labCustomPrompt ? `MODIFICACIÓN ADICIONAL: ${labCustomPrompt}.` : ''}
ESTILO: Fotografía de alta gama. Semilla: ${Math.random()}`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [
                        { inlineData: { mimeType: assetMime, data: assetBase64 } },
                        { text: prompt }
                    ]},
                    config: { 
                        responseModalities: [Modality.IMAGE], 
                        imageConfig: { aspectRatio: labAspectRatio as any } 
                    },
                });

                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    sessionImages.push(src);
                    setLabGeneratedImages(prev => [...prev, src]);
                }
                if (i < 3) await new Promise(r => setTimeout(r, 1000));
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e: any) { setError(`${t('Error', 'Error')}: ${e.message || String(e)}`); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="flex flex-col bg-rosa-claro h-full p-4 md:p-8 space-y-6 overflow-y-auto text-negro-fondo">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">{t('AI Podcast', 'Podcast con IA')}</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    {t('Create professional, high-fidelity podcast visuals in seconds. Transform your identity into any studio environment with cinematic precision.', 'Crea visuales de podcast profesionales y de alta fidelidad en segundos. Transforma tu identidad en cualquier entorno de estudio con precisión cinematográfica.')}
                </p>
            </div>

            <div className="flex bg-white/40 p-1 rounded-lg w-fit self-center md:self-start mb-2 shadow-sm border border-white/50">
                {['Studio Creator', 'Angle Lab'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab as any); setError(null); }}
                        className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all lowercase ${activeTab === tab ? 'bg-slate-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        {t(tab, {
                            'Studio Creator': 'Creador de estudio',
                            'Angle Lab': 'Laboratorio de ángulos'
                        }[tab] || tab)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col space-y-4">
                    {activeTab === 'Studio Creator' ? (
                        <>
                            <Step number={1} title={t('upload your photo', 'sube tu foto')}>
                                <div onClick={() => personInputRef.current?.click()} className="aspect-video bg-white rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-rosa-principal transition-all p-4 group overflow-hidden">
                                    {personImage ? <img src={personImage.preview} className="h-full object-contain rounded-lg" alt={t('Preview', 'Vista previa')} /> : <div className="text-center opacity-30 group-hover:opacity-60 transition-opacity"><svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><p className="text-sm font-black uppercase tracking-widest">{t('click to upload portrait', 'haz clic para subir retrato')}</p></div>}
                                    <input type="file" ref={personInputRef} onChange={e => e.target.files?.[0] && setPersonImage({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                                </div>
                            </Step>
                            
                            <Step number={2} title={t('choose your studio vibe', 'elige el estilo de tu estudio')}>
                                <div className="flex flex-wrap gap-2">
                                    {studioVibes.map(v => (
                                        <button key={v.name} onClick={() => setSelectedVibe(v)} className={`px-5 py-2.5 rounded-lg text-sm font-black border transition-all lowercase ${selectedVibe.name === v.name ? 'bg-rosa-principal text-gray-900 border-rosa-principal shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                                            {t(v.name, {
                                                'Cinematic blackout': 'Oscuridad cinematográfica',
                                                'Neon high-tech': 'Neón de alta tecnología',
                                                'Cozy library': 'Biblioteca acogedora',
                                                'Minimalist clean': 'Limpio minimalista',
                                                'Industrial loft': 'Loft industrial',
                                                'Vibrant pop': 'Pop vibrante',
                                                'Luxury penthouse': 'Penthouse de lujo',
                                                'Boho oasis': 'Oasis bohemio',
                                                'Classic radio': 'Radio clásica',
                                                'Dark academia': 'Academia oscura'
                                            }[v.name] || v.name)}
                                        </button>
                                    ))}
                                </div>
                            </Step>

                            <Step number={3} title={t('select your scene', 'selecciona tu escena')}>
                                <div className="flex flex-wrap gap-2">
                                    {studioScenes.map(s => (
                                        <button key={s.name} onClick={() => setSelectedScene(s)} className={`px-5 py-2.5 rounded-lg text-sm font-black border transition-all lowercase ${selectedScene.name === s.name ? 'bg-rosa-principal text-gray-900 border-rosa-principal shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                                            {t(s.name, {
                                                'Extreme macro close-up': 'Primer plano macro extremo',
                                                'Solo mic close-up': 'Primer plano con micrófono solo',
                                                'Guest interview set': 'Set de entrevista con invitado',
                                                'Wide action shot': 'Toma de acción amplia',
                                                'Thinking / satisfied': 'Pensando / satisfecho',
                                                'The setup intro': 'Introducción del set'
                                            }[s.name] || s.name)}
                                        </button>
                                    ))}
                                </div>
                            </Step>

                            <Step number={4} title={t('branding & prompt', 'marca y prompt')}>
                                <div className="space-y-4">
                                    <input type="text" value={signText} onChange={e => setSignText(e.target.value)} placeholder={t('custom studio sign text...', 'texto personalizado del letrero del estudio...')} className="w-full bg-white border border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-rosa-principal outline-none lowercase font-medium" />
                                    <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder={t('additional instructions / prompt override...', 'instrucciones adicionales / anulación de prompt...')} className="w-full h-24 bg-white border border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-rosa-principal outline-none resize-none lowercase font-medium" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('aspect ratio', 'relación de aspecto')}</label>
                                            <div className="flex flex-wrap gap-1">
                                                {['1:1', '4:5', '9:16', '4:3', '16:9'].map(r => (
                                                    <button key={r} onClick={() => setAspectRatio(r)} className={`px-3 py-2 rounded-lg text-xs font-black border transition-all lowercase ${aspectRatio === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-400 border-gray-100'}`}>
                                                        {r === '16:9' ? t('wide (16:9)', 'ancho (16:9)') : r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-gray-400 uppercase mb-2 block tracking-widest">{t('camera mode', 'modo de cámara')}</label>
                                            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100">
                                                {(['4 Different Angles', 'Consistent Angle'] as const).map(mode => (
                                                    <button key={mode} onClick={() => setCameraAngleMode(mode)} className={`flex-1 py-2 rounded-md text-[10px] font-black transition-all lowercase ${cameraAngleMode === mode ? 'bg-rosa-principal text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                                                        {t(mode, {
                                                            '4 Different Angles': '4 ángulos diferentes',
                                                            'Consistent Angle': 'Ángulo consistente'
                                                        }[mode] || mode)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Step>

                            <button onClick={handleGenerateStudio} disabled={isLoading || !personImage} className="w-full bg-slate-800 text-white font-black py-5 rounded-xl shadow-lg hover:bg-slate-900 transition-all disabled:opacity-50 text-xl lowercase">
                                {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner className="w-6 h-6 text-rosa-principal" /><span>{t('generating studio...', 'generando estudio...')}</span></div> : t('generate podcast set', 'generar set de podcast')}
                            </button>
                        </>
                    ) : (
                        <>
                            <Step number={1} title={t('select your anchor shot', 'selecciona tu toma de referencia')}>
                                <div onClick={() => labInputRef.current?.click()} className="aspect-video bg-white rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-rosa-principal transition-all p-4 mb-4 overflow-hidden">
                                    {labAsset ? <img src={labAsset.preview} className="h-full object-contain rounded-lg" alt={t('Anchor', 'Referencia')} /> : <div className="text-center opacity-30"><svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L16 8M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-2-2m0 0l-2 2m2-2v12" /></svg><p className="text-sm font-black uppercase tracking-widest">{t('click to upload anchor shot', 'haz clic para subir toma de referencia')}</p></div>}
                                    <input type="file" ref={labInputRef} onChange={e => e.target.files?.[0] && setLabAsset({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0]), ratio: '1:1'})} className="hidden" accept="image/*" />
                                </div>
                                {savedStudios.length > 0 && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">{t('your saved studio assets', 'tus activos de estudio guardados')}</p>
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                            {savedStudios.map((img, idx) => (
                                                <div key={idx} className="relative flex-shrink-0 group">
                                                    <img onClick={() => handleSendToLab(img)} src={img} className={`w-20 h-20 rounded-xl object-cover cursor-pointer border-4 transition-all ${labAsset?.preview === img ? 'border-rosa-principal scale-105' : 'border-white shadow-sm'}`} />
                                                    <button onClick={() => handleDeleteSavedStudio(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm text-xs font-bold">&times;</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Step>
                            
                            <Step number={2} title={t('custom direction & size', 'dirección personalizada y tamaño')}>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">{t('select output size', 'selecciona el tamaño de salida')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['1:1', '4:5', '9:16', '4:3', '16:9'].map(r => (
                                                <button key={r} onClick={() => setLabAspectRatio(r)} className={`px-5 py-2.5 rounded-lg text-sm font-black border transition-all lowercase ${labAspectRatio === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>
                                                    {r === '16:9' ? t('wide (16:9)', 'ancho (16:9)') : r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">{t("custom instructions (e.g., 'no headphones')", "instrucciones personalizadas (ej., 'sin auriculares')")}</p>
                                        <textarea 
                                            value={labCustomPrompt}
                                            onChange={e => setLabCustomPrompt(e.target.value)}
                                            placeholder={t("e.g., 'remove headphones', 'no coffee cup', 'add glasses'...", "ej., 'quitar auriculares', 'sin taza de café', 'añadir gafas'...")} 
                                            className="w-full h-24 bg-white border border-gray-200 rounded-xl p-4 text-base focus:ring-2 focus:ring-rosa-principal outline-none resize-none lowercase placeholder:text-gray-300 font-medium" 
                                        />
                                    </div>

                                    <button onClick={handleGenerateAngles} disabled={isLoading || !labAsset} className="w-full bg-slate-800 text-white font-black py-5 rounded-xl shadow-lg hover:bg-slate-900 transition-all disabled:opacity-50 lowercase text-xl">
                                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner className="w-6 h-6 text-rosa-principal" /><span>{t('running lab...', 'ejecutando laboratorio...')}</span></div> : t('activate angle lab', 'activar laboratorio de ángulos')}
                                    </button>
                                </div>
                            </Step>
                        </>
                    )}
                    {error && <div className="p-5 bg-red-50 text-red-700 rounded-xl text-sm font-black text-center animate-pulse lowercase">{error}</div>}
                </div>

                <div className="bg-white shadow-xl p-8 rounded-[2.5rem] border border-white min-h-[500px] flex flex-col">
                    <h3 className="text-lg font-black text-center text-gray-300 uppercase tracking-widest mb-8 opacity-40">{t('your live-action results', 'tus resultados en acción')}</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {isLoading && (activeTab === 'Studio Creator' ? generatedImages : labGeneratedImages).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-6">
                                <Spinner className="w-12 h-12 text-rosa-principal" />
                                <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">{loadingMessage}</p>
                            </div>
                        ) : (activeTab === 'Studio Creator' ? generatedImages : labGeneratedImages).length === 0 ? (
                            <div className="grid grid-cols-2 gap-4 h-full">
                                {[1, 2, 3, 4].map(n => <div key={n} className="bg-gray-50 rounded-[2rem] aspect-square flex items-center justify-center border-2 border-dashed border-gray-100"><span className="text-7xl font-black text-gray-100">{n}</span></div>)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                {(activeTab === 'Studio Creator' ? generatedImages : labGeneratedImages).map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-3xl overflow-hidden shadow-md border-4 border-white transition-all hover:shadow-xl">
                                        <img src={img} className="w-full h-full object-cover cursor-zoom-in" alt={t('Result', 'Resultado')} onClick={() => setZoomedImage(img)} />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => setZoomedImage(img)} className="bg-white/90 text-slate-800 p-1.5 sm:p-2.5 rounded-full shadow-md hover:scale-110 transition-transform">
                                                <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                            </button>
                                            {activeTab === 'Studio Creator' && (
                                                <button onClick={() => { handleSaveStudio(img); handleSendToLab(img); }} className="bg-rosa-principal text-slate-800 p-1.5 sm:p-2.5 rounded-full shadow-md hover:scale-110 transition-transform" title={t("Send to Lab", "Enviar al laboratorio")}>
                                                    <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                                                </button>
                                            )}
                                            <a href={img} download className="bg-white/90 text-slate-800 p-1.5 sm:p-2.5 rounded-full shadow-md hover:scale-110 transition-transform">
                                                <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Content Blocks - Refined sizing to "Medium" with lighter typography */}
            <div className="max-w-7xl mx-auto w-full pt-8 space-y-4 pb-20">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 lowercase tracking-widest">{t('introduction', 'introducción')}</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-sm transition-all duration-700 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <p className="lowercase">{t('welcome to the **ai podcast studio**, a specialized visual identity studio designed for modern creators. in the world of podcasting, consistency is the ultimate currency. building a brand based on your personality usually requires hours of setup, perfect lighting, and constant filming. ai podcast studio changes the game.', 'bienvenido al **estudio de podcast con ia**, un estudio de identidad visual especializado diseñado para creadores modernos. en el mundo del podcasting, la consistencia es la moneda definitiva. construir una marca basada en tu personalidad generalmente requiere horas de configuración, iluminación perfecta y filmación constante. el estudio de podcast con ia cambia el juego.')}</p>
                        <p className="lowercase">{t('our engine allows you to generate photorealistic, high-fidelity shots of yourself in any studio environment imaginable. from moody industrial dens to high-tech neon sets, we help you tell a professional visual story that looks like a high-budget production.', 'nuestro motor te permite generar tomas fotorrealistas y de alta fidelidad de ti mismo en cualquier entorno de estudio imaginable. desde guaridas industriales melancólicas hasta sets de neón de alta tecnología, te ayudamos a contar una historia visual profesional que parece una producción de alto presupuesto.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-[10px] font-bold text-rosa-principal uppercase tracking-[0.2em] border-b border-rosa-principal pb-1 hover:text-black hover:border-black transition-all lowercase">{isIntroExpanded ? t('read less', 'leer menos') : t('read more', 'leer más')}</button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 lowercase tracking-widest">{t('how it works', 'cómo funciona')}</h2>
                    <div className={`text-gray-700 space-y-8 leading-relaxed text-sm transition-all duration-700 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-left">
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black lowercase">{t('step 1: upload identity', 'paso 1: subir identidad')}</span> - {t('provide a clear photo of your face. this is the source of truth for the ai to ensure 100% identity match in every vlog shot.', 'proporciona una foto clara de tu rostro. esta es la fuente de verdad para que la ia garantice una coincidencia de identidad del 100% en cada toma de vlog.')}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black lowercase">{t('step 2: select scene', 'paso 2: seleccionar escena')}</span> - {t('choose from our curated library of podcast environments or describe your own unique vision in the custom box.', 'elige de nuestra biblioteca curada de entornos de podcast o describe tu propia visión única en el cuadro personalizado.')}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black lowercase">{t('step 3: angle lab', 'paso 3: laboratorio de ángulos')}</span> - {t('if you have a generated photo you love, save it and use the angle lab to create consistent perspectives for that same studio.', 'si tienes una foto generada que te encanta, guárdala y usa el laboratorio de ángulos para crear perspectivas consistentes para ese mismo estudio.')}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black lowercase">{t('step 4: generate set', 'paso 4: generar set')}</span> - {t('pick the size for your platform (9:16 for reels/tiktok, 1:1 for posts) and click generate to receive 4 studio-quality results.', 'elige el tamaño para tu plataforma (9:16 para reels/tiktok, 1:1 para publicaciones) y haz clic en generar para recibir 4 resultados de calidad de estudio.')}</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/100 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-[10px] font-bold text-rosa-principal uppercase tracking-[0.2em] border-b border-rosa-principal pb-1 hover:text-black hover:border-black transition-all lowercase">{isHowItWorksExpanded ? t('read less', 'leer menos') : t('read more', 'leer más')}</button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 lowercase tracking-widest">{t('sales tips & monetization', 'consejos de ventas y monetización')}</h2>
                    <div className={`text-gray-700 space-y-8 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isMarketingExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="bg-gray-50/50 p-6 rounded-xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-rosa-principal uppercase tracking-[0.1em] lowercase">{t('1. "podcast host" branding', '1. marca de "presentador de podcast"')}</p>
                                <p className="lowercase">{t('create high-engagement promo materials for your show. professional visuals build authority before you even hit record.', 'crea materiales promocionales de alto compromiso para tu programa. los visuales profesionales construyen autoridad incluso antes de que presiones grabar.')}</p>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-rosa-principal uppercase tracking-[0.1em] lowercase">{t('2. guest promo kits', '2. kits promocionales para invitados')}</p>
                                <p className="lowercase">{t('generate professional "studio session" shots for your guests to share on their platforms, increasing your reach and prestige.', 'genera tomas profesionales de "sesión de estudio" para que tus invitados las compartan en sus plataformas, aumentando tu alcance y prestigio.')}</p>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-rosa-principal uppercase tracking-[0.1em] lowercase">{t('3. sponsorship pitch decks', '3. presentaciones para patrocinadores')}</p>
                                <p className="lowercase">{t('place yourself in a high-end environment to show potential sponsors the quality and aesthetic of your visual brand.', 'colócate en un entorno de alta gama para mostrar a los patrocinadores potenciales la calidad y estética de tu marca visual.')}</p>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-rosa-principal uppercase tracking-[0.1em] lowercase">{t('4. consistent show identity', '4. identidad de programa consistente')}</p>
                                <p className="lowercase">{t('use different angles of the same studio to create a cohesive visual theme across all social channels and youtube thumbnails.', 'usa diferentes ángulos del mismo estudio para crear un tema visual cohesivo en todos los canales sociales y miniaturas de youtube.')}</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent ${isMarketingExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsMarketingExpanded(!isMarketingExpanded)} className="mt-4 text-[10px] font-bold text-rosa-principal uppercase tracking-[0.2em] border-b border-rosa-principal pb-1 hover:text-black hover:border-black transition-all lowercase">{isMarketingExpanded ? t('read less', 'leer menos') : t('read more', 'leer más')}</button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 lowercase tracking-widest">{t('pro tips', 'consejos profesionales')}</h2>
                    <div className={`text-gray-700 space-y-8 leading-relaxed text-sm transition-all duration-700 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <div className="space-y-6 text-left max-w-4xl mx-auto">
                            <div className="flex gap-6 items-start">
                                <span className="text-2xl font-semibold text-rosa-principal leading-none">01</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">{t('lighting matters:', 'la iluminación importa:') }</span> {t('for the most believable results, upload a source photo with soft, natural lighting. avoid harsh shadows or strong camera flashes.', 'para obtener los resultados más creíbles, sube una foto de origen con iluminación suave y natural. evita sombras marcadas o flashes de cámara fuertes.')}</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <span className="text-2xl font-semibold text-rosa-principal leading-none">02</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">{t('use the angle lab:', 'usa el laboratorio de ángulos:')}</span> {t('consistency is king. generate a "master" studio shot, then use the angle lab to get 4 different perspectives of that same room for your carousel posts.', 'la consistencia es la clave. genera una toma de estudio "maestra", luego usa el laboratorio de ángulos para obtener 4 perspectivas diferentes de esa misma sala para tus publicaciones de carrusel.')}</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <span className="text-2xl font-semibold text-rosa-principal leading-none">03</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">{t('custom details:', 'detalles personalizados:')}</span> {t('when using custom prompts, include action verbs like "laughing," "speaking," or "adjusting mic" to make the photo feel like a candid moment.', 'al usar prompts personalizados, incluye verbos de acción como "riendo", "hablando" o "ajustando el micrófono" para que la foto se sienta como un momento espontáneo.')}</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <span className="text-2xl font-semibold text-rosa-principal leading-none">04</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">{t('mix your ratios:', 'mezcla tus proporciones:')}</span> {t('generate the same scene in 9:16 for your stories and 1:1 for your main instagram feed to keep a cohesive multi-channel presence.', 'genera la misma escena en 9:16 para tus historias y 1:1 para tu feed principal de instagram para mantener una presencia multicanal cohesiva.')}</p>
                                </div>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-[10px] font-bold text-rosa-principal uppercase tracking-[0.2em] border-b border-rosa-principal pb-1 hover:text-black hover:border-black transition-all lowercase">{isProTipsExpanded ? t('read less', 'leer menos') : t('read more', 'leer más')}</button>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex flex-col z-[3000] animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="w-full flex justify-end p-6"><button onClick={() => setZoomedImage(null)} className="text-white bg-white/10 hover:bg-white/20 rounded-full w-14 h-14 flex items-center justify-center text-4xl font-light border border-white/10 backdrop-blur-md transition-all">&times;</button></div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={e => e.stopPropagation()}><img src={zoomedImage} alt={t('Expanded', 'Ampliada')} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl border-4 border-white/10" /></div>
                </div>
            )}
        </div>
    );
};

export default AIPodcastStudio;