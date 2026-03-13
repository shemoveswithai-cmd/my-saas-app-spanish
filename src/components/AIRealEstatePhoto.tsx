import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';
import { useLanguage } from '../context/LanguageContext';

interface AIRealEstatePhotoProps {
    addCreations: (images: string[]) => void;
}

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white/70 shadow-sm p-6 rounded-xl border border-white/50 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">{t('Step', 'Paso')} {number}: {title}</h3>
            {children}
        </div>
    );
};

const sceneOptions = [
    { name: 'Cocina Moderna', prompt: 'a high-end modern kitchen with marble countertops, sleek cabinetry, and professional lighting' },
    { name: 'Sala de Estar de Lujo', prompt: 'a grand luxury living room with floor-to-ceiling windows, designer furniture, and a panoramic city view' },
    { name: 'Entrada Elegante', prompt: 'a grand entryway with a crystal chandelier, polished hardwood floors, and a sweeping staircase' },
    { name: 'Oficina en Casa Elegante', prompt: 'a sophisticated modern home office with custom cabinetry, a leather chair, and soft ambient lighting' },
    { name: 'Suite Principal', prompt: 'a serene master bedroom with plush linens, a cozy fireplace, and soft morning sunlight' },
    { name: 'Terraza en la Azotea', prompt: 'a stylish rooftop terrace with comfortable outdoor seating and a sunset skyline view' },
    { name: 'Comedor Grandioso', prompt: 'a formal dining room with a large oak table, velvet chairs, and elegant table settings' },
    { name: 'Oasis en el Patio Trasero', prompt: 'a luxury backyard with a turquoise pool, modern lounge chairs, and lush landscaping' },
    { name: 'Cine en Casa', prompt: 'a private high-end home theater with plush recliner seats and atmospheric lighting' },
    { name: 'Bodega de Vinos', prompt: 'a temperature-controlled wine cellar with custom wood racks and a tasting table' },
    { name: 'Baño Principal', prompt: 'a spa-like master bathroom with a freestanding tub, glass-walled shower, and marble floors' },
    { name: 'Loft Moderno', prompt: 'an industrial-chic loft with exposed brick walls, high ceilings, and large factory windows' },
    { name: 'Balcón Frente al Mar', prompt: 'a private glass balcony overlooking the ocean with comfortable outdoor seating' },
    { name: 'Biblioteca Acogedora', prompt: 'a warm library with floor-to-ceiling bookshelves and a comfortable reading nook' },
    { name: 'Vestidor', prompt: 'a huge luxury walk-in closet with custom lighting and organized designer items' },
];

const AIRealEstatePhoto: React.FC<AIRealEstatePhotoProps> = ({ addCreations }) => {
    const { t } = useLanguage();
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [homeImage, setHomeImage] = useState<{ file: File, preview: string } | null>(null);
    const [sceneMode, setSceneMode] = useState<'preset' | 'upload'>('preset');
    const [selectedScene, setSelectedScene] = useState(sceneOptions[0]);
    const [customDetails, setCustomDetails] = useState('');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwRealEstateFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.sceneMode) setSceneMode(parsed.sceneMode);
                if (parsed.selectedScene) {
                    const scene = sceneOptions.find(s => s.name === parsed.selectedScene);
                    if (scene) setSelectedScene(scene);
                }
                if (parsed.customDetails) setCustomDetails(parsed.customDetails);
            } catch (e) {
                console.error("Failed to load real estate form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            sceneMode,
            selectedScene: selectedScene.name,
            customDetails
        };
        localStorage.setItem('smwRealEstateFormState', JSON.stringify(formState));
    }, [sceneMode, selectedScene, customDetails]);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const personInputRef = useRef<HTMLInputElement>(null);
    const homeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
            if (homeImage?.preview) URL.revokeObjectURL(homeImage.preview);
        };
    }, [personImage, homeImage]);

    const handleGenerate = async () => {
        if (!personImage) {
            setError(t('Please upload a photo of yourself.', 'Por favor, sube una foto tuya.'));
            return;
        }
        if (sceneMode === 'upload' && !homeImage) {
            setError(t('Please upload a photo of the property.', 'Por favor, sube una foto de la propiedad.'));
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const personB64 = await fileToBase64(personImage.file);
            const sessionImages: string[] = [];

            for (let i = 0; i < 4; i++) {
                const parts: Part[] = [
                    { text: "Agent Photo (Target Identity):" },
                    { inlineData: { mimeType: personImage.file.type, data: personB64 } }
                ];

                let settingDescription = selectedScene.prompt;

                if (sceneMode === 'upload' && homeImage) {
                    const homeB64 = await fileToBase64(homeImage.file);
                    parts.push({ text: "Background Property Photo (The Home being sold):" });
                    parts.push({ inlineData: { mimeType: homeImage.file.type, data: homeB64 } });
                    settingDescription = "the provided background property photo";
                }

                const prompt = `**CRITICAL MISSION: REAL ESTATE AGENT BRANDING**
Re-create the person from the source agent photo with 100% identity accuracy. 
Place them into the professional setting: ${settingDescription}. 
${customDetails ? `Additional User Request: ${customDetails}.` : ''}
They should be dressed in professional business attire, looking confident, friendly, and approachable. 
The lighting and perspective must seamlessly integrate the agent into the property environment.
Style: Photorealistic high-end architectural photography, professional lighting, high resolution. 
Seed: ${Math.random()}`;

                parts.push({ text: prompt });

                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const imgPart = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imgPart) {
                    const src = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
                    sessionImages.push(src);
                    setGeneratedImages(prev => [...prev, src]);
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            setError(t('Generation failed. Please try again.', 'La generación falló. Por favor, inténtalo de nuevo.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col bg-rosa-claro min-h-full p-4 md:p-8 space-y-6 overflow-y-auto text-negro-fondo">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">{t('AI Real Estate Photoshoot', 'Sesión de Fotos de Bienes Raíces con IA')}</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    {t('Create professional real estate photos of yourself in various property settings or your own listings with absolute identity preservation.', 'Crea fotos profesionales de bienes raíces de ti mismo en diversos entornos de propiedad o en tus propios listados con preservación absoluta de la identidad.')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-6">
                    <Step number={1} title={t('Upload Your Photo', 'Sube Tu Foto')}>
                        <p className="text-base text-gray-600 font-medium">{t('Upload a professional headshot. We will maintain your identity and place you in a luxury property.', 'Sube un retrato profesional. Mantendremos tu identidad y te ubicaremos en una propiedad de lujo.')}</p>
                        <div onClick={() => personInputRef.current?.click()} className="aspect-square max-w-[400px] mx-auto bg-white/60 rounded-lg flex items-center justify-center border-2 border-dashed border-rosa-principal/50 cursor-pointer hover:bg-white transition-colors p-4">
                            {personImage ? (
                                <img src={personImage.preview} className="max-h-full max-w-full rounded-md shadow-sm" alt={t('Preview', 'Vista Previa')} />
                            ) : (
                                <div className="text-center space-y-2 opacity-60">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    <p className="font-semibold">{t('Click to upload photo', 'Haz clic para subir foto')}</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={e => e.target.files?.[0] && setPersonImage({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title={t('Property Context', 'Contexto de la Propiedad')}>
                        <p className="text-base text-gray-600 font-medium mb-4">{t('Choose where you want to be photographed.', 'Elige dónde quieres ser fotografiado.')}</p>
                        
                        <div className="flex bg-white/50 rounded-full p-1 mb-6 shadow-sm border border-white/20">
                            <button 
                                onClick={() => setSceneMode('preset')} 
                                className={`flex-1 text-center rounded-full py-2.5 text-sm font-bold transition-all ${sceneMode === 'preset' ? 'bg-rosa-principal text-black' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('Preset Scenes', 'Escenas Preestablecidas')}
                            </button>
                            <button 
                                onClick={() => setSceneMode('upload')} 
                                className={`flex-1 text-center rounded-full py-2.5 text-sm font-bold transition-all ${sceneMode === 'upload' ? 'bg-rosa-principal text-black' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {t('Upload My Listing', 'Subir Mi Listado')}
                            </button>
                        </div>

                        {sceneMode === 'preset' ? (
                            <select
                                value={selectedScene.name}
                                onChange={(e) => {
                                    const scene = sceneOptions.find(s => s.name === e.target.value);
                                    if (scene) setSelectedScene(scene);
                                }}
                                className="w-full bg-white border-2 border-gray-100 rounded-xl p-4 text-base focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none text-gray-900 font-medium"
                            >
                                {sceneOptions.map(scene => (
                                    <option key={scene.name} value={scene.name}>{scene.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-1">{t('Upload Your Home Photo', 'Sube la Foto de Tu Casa')}</label>
                                <div onClick={() => homeInputRef.current?.click()} className="aspect-video bg-white/60 rounded-lg flex items-center justify-center border-2 border-dashed border-rosa-principal/50 cursor-pointer hover:bg-white transition-colors p-4">
                                    {homeImage ? (
                                        <img src={homeImage.preview} className="max-h-full max-w-full rounded-md shadow-sm" alt={t('Home Preview', 'Vista Previa de la Casa')} />
                                    ) : (
                                        <div className="text-center space-y-2 opacity-60">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            <p className="font-semibold">{t('Click to upload home', 'Haz clic para subir casa')}</p>
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={homeInputRef} onChange={e => e.target.files?.[0] && setHomeImage({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                            </div>
                        )}

                        <div className="mt-6 space-y-2">
                            <label className="text-sm font-bold text-gray-600 uppercase tracking-wider ml-1">{t('Or, Add Custom Details', 'O, Añade Detalles Personalizados')}</label>
                            <textarea
                                value={customDetails}
                                onChange={(e) => setCustomDetails(e.target.value)}
                                placeholder={t('e.g., wearing a blue suit, holding keys, leaning on a marble island', 'ej. vistiendo un traje azul, sosteniendo llaves, apoyado en una isla de mármol')}
                                className="w-full h-32 bg-white border-2 border-gray-100 rounded-xl p-4 text-base focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none resize-none text-black font-medium"
                            />
                        </div>
                    </Step>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !personImage || (sceneMode === 'upload' && !homeImage)}
                        className="w-full bg-rosa-principal text-black font-bold py-3 rounded-xl hover:bg-white disabled:bg-rosa-principal/50 disabled:cursor-not-allowed shadow-md text-lg transition-all"
                    >
                        {isLoading ? <Spinner className="mx-auto text-black" /> : t('Generate 4 photos', 'Generar 4 fotos')}
                    </button>
                    {error && <div className="p-4 bg-red-900 text-white rounded-xl text-sm text-center font-bold shadow-lg">{error}</div>}
                </div>

                <div className="bg-white/70 backdrop-blur-sm shadow-sm p-6 rounded-xl border border-white/50 flex flex-col h-fit min-h-0">
                    <h3 className="text-xl font-bold text-center text-gray-900 mb-6 uppercase tracking-wider">{t('Your Real Estate Results', 'Tus Resultados de Bienes Raíces')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="relative aspect-square bg-white rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner group">
                                {isLoading && i >= generatedImages.length ? (
                                    <div className="text-center p-4">
                                        <Spinner className="w-10 h-10 text-rosa-principal mb-4 mx-auto" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">{t('Rendering...', 'Renderizando...')}</p>
                                    </div>
                                ) : generatedImages[i] ? (
                                    <div className="relative group w-full h-full">
                                        <img src={generatedImages[i]} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105" onClick={() => setZoomedImage(generatedImages[i])} alt={t('Real Estate Result', 'Resultado de Bienes Raíces')} />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button onClick={() => setZoomedImage(generatedImages[i])} className="bg-white/90 text-black p-2.5 rounded-full hover:bg-white shadow-md transition-transform active:scale-95"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={generatedImages[i]} download className="bg-white/90 text-black p-2.5 rounded-full hover:bg-white shadow-md transition-transform active:scale-95"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ) : <span className="text-gray-100 text-5xl font-bold">{i + 1}</span>}
                            </div>
                        ))}
                    </div>
                    {generatedImages.length > 0 && !isLoading && (
                        <button onClick={() => {setGeneratedImages([]); setPersonImage(null); setHomeImage(null); setCustomDetails('');}} className="mt-6 w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-widest">{t('Start New Session', 'Iniciar Nueva Sesión')}</button>
                    )}
                </div>
            </div>

            {/* Information Boxes */}
            <div className="space-y-6 pt-10 border-t border-rosa-principal/20">
                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Introduction', 'Introducción')}</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>{t('The AI Real Estate Photoshoot tool is a specialized platform for real estate agents, brokers, and property professionals who need high-end personal branding images without the high-end cost. Instead of booking expensive property tours or hiring professional photographers for every branding update, you can now generate world-class visuals in seconds.', 'La herramienta de Sesión de Fotos de Bienes Raíces con IA es una plataforma especializada para agentes inmobiliarios, corredores y profesionales de la propiedad que necesitan imágenes de marca personal de alta gama sin el alto costo. En lugar de reservar costosos recorridos por propiedades o contratar fotógrafos profesionales para cada actualización de marca, ahora puedes generar visuales de clase mundial en segundos.')}</p>
                        <p>{t('Our AI accurately maps your identity and integrates you into a variety of high-end home settings—including your own property listings. By combining your likeness with these aspirational environments, you can build a powerful visual brand that attracts premium listings and high-value clients.', 'Nuestra IA mapea con precisión tu identidad y te integra en una variedad de entornos de casas de alta gama, incluidos tus propios listados de propiedades. Al combinar tu imagen con estos entornos aspiracionales, puedes construir una marca visual poderosa que atraiga listados premium y clientes de alto valor.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isIntroExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('How It Works', 'Cómo Funciona')}</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>{t('Step 1: Upload Your Photo', 'Paso 1: Sube Tu Foto')}</strong> - {t('Provide a clear professional headshot or half-body photo. The AI uses this as the "master" for your identity and facial features.', 'Proporciona un retrato profesional claro o una foto de medio cuerpo. La IA utiliza esto como el "maestro" para tu identidad y rasgos faciales.')}</p>
                        <p><strong>{t('Step 2: Choose Your Scene or Upload a Listing', 'Paso 2: Elige Tu Escena o Sube un Listado')}</strong> - {t('Select from our curated list of 15+ luxury property scenes, or select "Upload My Listing" to provide your own specific listing photo. The AI will place you directly into the property you are selling!', 'Selecciona de nuestra lista curada de más de 15 escenas de propiedades de lujo, o selecciona "Subir Mi Listado" para proporcionar tu propia foto de listado específica. ¡La IA te ubicará directamente en la propiedad que estás vendiendo!')}</p>
                        <p><strong>{t('Step 3: Add Details (Optional)', 'Paso 3: Añade Detalles (Opcional)')}</strong> - {t('Use the custom details box to specify what you\'re wearing or doing. For example, "wearing a navy blue suit, holding a silver laptop."', 'Usa el cuadro de detalles personalizados para especificar qué llevas puesto o qué estás haciendo. Por ejemplo, "vistiendo un traje azul marino, sosteniendo una computadora portátil plateada".')}</p>
                        <p><strong>{t('Step 4: Generate', 'Paso 4: Generar')}</strong> - {t('Click the button and receive 4 high-resolution, photorealistic branding images. Our engine ensures you look natural and professional in every shot.', 'Haz clic en el botón y recibe 4 imágenes de marca fotorrealistas de alta resolución. Nuestro motor asegura que te veas natural y profesional en cada toma.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isHowItWorksExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Sales Tips & Monetization Ideas', 'Consejos de Ventas e Ideas de Monetización')}</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>{t('1. Showcase Yourself in Your Listings:', '1. Muéstrate en Tus Listados:')}</strong> {t('Stand out from other agents by showing yourself "inside" the home you\'re promoting. This adds a personal touch to your listing materials and helps clients visualize you as their expert guide.', 'Destácate de otros agentes mostrándote "dentro" de la casa que estás promocionando. Esto añade un toque personal a tus materiales de listado y ayuda a los clientes a visualizarte como su guía experto.')}</p>
                        <p><strong>{t('2. Professional Personal Branding:', '2. Marca Personal Profesional:')}</strong> {t('High-end property settings convey success and professionalism. Use these photos on your business cards, website, and LinkedIn to build immediate trust with luxury clients.', 'Los entornos de propiedades de alta gama transmiten éxito y profesionalismo. Usa estas fotos en tus tarjetas de presentación, sitio web y LinkedIn para generar confianza inmediata con clientes de lujo.')}</p>
                        <p><strong>{t('3. Eye-Catching Social Media Content:', '3. Contenido Llamativo para Redes Sociales:')}</strong> {t('Stop the scroll on Instagram and Facebook by using these images for your property market updates. Seeing a real person in a luxury home makes your content feel more personal and high-value.', 'Detén el desplazamiento en Instagram y Facebook usando estas imágenes para tus actualizaciones del mercado inmobiliario. Ver a una persona real en una casa de lujo hace que tu contenido se sienta más personal y de alto valor.')}</p>
                        <p><strong>{t('4. Premium Real Estate Ads:', '4. Anuncios de Bienes Raíces Premium:')}</strong> {t('Use these images as the hero visuals for your paid advertising campaigns. They are clean, high-resolution, and designed to position you as a leader in the luxury real estate space.', 'Usa estas imágenes como los visuales principales para tus campañas de publicidad pagada. Son limpias, de alta resolución y están diseñadas para posicionarte como un líder en el espacio inmobiliario de lujo.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isSalesTipsExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Pro Tips', 'Consejos Profesionales')}</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>{t('• Lighting Alignment:', '• Alineación de Iluminación:')}</strong> {t('For the most realistic results, try to upload a source photo with clear, natural lighting. Harsh shadows on your face in the source photo can sometimes be harder for the AI to blend perfectly into studio-lit scenes.', 'Para obtener los resultados más realistas, intenta subir una foto de origen con iluminación clara y natural. Las sombras marcadas en tu rostro en la foto de origen a veces pueden ser más difíciles de mezclar perfectamente en escenas iluminadas en estudio.')}</p>
                        <p><strong>{t('• Match the Setting to the Outfit:', '• Combina el Entorno con el Atuendo:')}</strong> {t('If you\'re uploading a "Backyard Oasis" listing, consider a slightly more casual (but still professional) look. For a "Modern Kitchen" or "Penthouse," high-end business attire works best.', 'Si estás subiendo un listado de "Oasis en el Patio Trasero", considera un look un poco más casual (pero aún profesional). Para una "Cocina Moderna" o un "Penthouse", el atuendo de negocios de alta gama funciona mejor.')}</p>
                        <p><strong>{t('• Custom Details:', '• Detalles Personalizados:')}</strong> {t('Don\'t be afraid to use Step 2\'s detail box! Specificity like "holding a set of house keys" or "leaning on a marble countertop" helps the AI create a more dynamic and believable composition.', '¡No tengas miedo de usar el cuadro de detalles del Paso 2! La especificidad como "sosteniendo un juego de llaves de la casa" o "apoyado en una encimera de mármol" ayuda a la IA a crear una composición más dinámica y creíble.')}</p>
                        <p><strong>{t('• Iterate for Perfection:', '• Itera para la Perfección:')}</strong> {t('If the first set isn\'t exactly what you need, try a slightly different scene or adjust your custom details. Small changes in your prompt can lead to big differences in the final pose and lighting.', 'Si el primer conjunto no es exactamente lo que necesitas, prueba con una escena ligeramente diferente o ajusta tus detalles personalizados. Pequeños cambios en tu indicación pueden llevar a grandes diferencias en la pose final y la iluminación.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isProTipsExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-12 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Expanded" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl border-4 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIRealEstatePhoto;