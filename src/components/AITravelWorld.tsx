import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';
import { useLanguage } from '../context/LanguageContext';

interface AITravelWorldProps {
    addCreations: (images: string[]) => void;
}

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode; description?: string }> = ({ number, title, children, description }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white/70 shadow-sm p-6 rounded-xl border border-white/50 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">{t('Step', 'Paso')} {number}: {title}</h3>
            {children}
            {description && <p className="text-sm text-gray-600 font-medium">{description}</p>}
        </div>
    );
};

const destinationOptions = [
    { name: 'París, Francia', prompt: 'Paris, France with the Eiffel Tower' },
    { name: 'Tokio, Japón', prompt: 'Tokyo, Japan at Shibuya Crossing' },
    { name: 'Santorini, Grecia', prompt: 'Santorini, Greece overlooking blue domes' },
    { name: 'Bali, Indonesia', prompt: 'Bali, Indonesia in the rice terraces' },
    { name: 'Nueva York, EE. UU.', prompt: 'New York City with the Empire State Building' },
    { name: 'Costa de Amalfi, Italia', prompt: 'the Amalfi Coast in Positano, Italy' },
    { name: 'Londres, Reino Unido', prompt: 'London near Big Ben' },
    { name: 'Roma, Italia', prompt: 'Rome in front of the Colosseum' },
    { name: 'Dubái, Emiratos Árabes Unidos', prompt: 'Dubai with the Burj Khalifa' },
    { name: 'Giza, Egipto', prompt: 'Giza, Egypt with the Pyramids' },
    { name: 'Río de Janeiro, Brasil', prompt: 'Rio de Janeiro with Christ the Redeemer' },
    { name: 'Sídney, Australia', prompt: 'Sydney Harbour with the Opera House' },
    { name: 'Kioto, Japón', prompt: 'Kyoto, Japan in the Bamboo Grove' },
    { name: 'Alpes Suizos', prompt: 'the Swiss Alps with snowy peaks' },
    { name: 'Maldivas', prompt: 'the Maldives in an overwater bungalow' },
    { name: 'Barcelona, España', prompt: 'Barcelona in front of Sagrada Familia' },
    { name: 'Venecia, Italia', prompt: 'Venice, Italy on a gondola' },
    { name: 'Marrakech, Marruecos', prompt: 'Marrakech, Morocco in a riad courtyard' },
    { name: 'Ámsterdam, Países Bajos', prompt: 'Amsterdam by the canals' },
    { name: 'Tulum, México', prompt: 'Tulum, Mexico on the beach' },
];

const activityOptions = [
    "Exploración de la ciudad", "Cultura de café", "Posando en monumentos", "Senderismo escénico", "Día de compras", 
    "Relajación en la playa", "Comiendo Ramen", "Tour de comida callejera", "Visita a museos", "Paseo en bicicleta", 
    "Asistir a un concierto", "Balcón de hotel de lujo", "Lectura en el parque", "Sesión de fotos artística", 
    "Escena de vida nocturna", "Viendo el atardecer", "Posando en un puente"
];

const AITravelWorld: React.FC<AITravelWorldProps> = ({ addCreations }) => {
    const { t } = useLanguage();
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [selectedDestination, setSelectedDestination] = useState(destinationOptions[0]);
    const [selectedActivity, setSelectedActivity] = useState(activityOptions[0]);
    const [customDetails, setCustomDetails] = useState('');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwTravelWorldFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedDestination) {
                    const dest = destinationOptions.find(d => d.name === parsed.selectedDestination);
                    if (dest) setSelectedDestination(dest);
                }
                if (parsed.selectedActivity) setSelectedActivity(parsed.selectedActivity);
                if (parsed.customDetails) setCustomDetails(parsed.customDetails);
            } catch (e) {
                console.error("Failed to load travel world form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedDestination: selectedDestination.name,
            selectedActivity,
            customDetails
        };
        localStorage.setItem('smwTravelWorldFormState', JSON.stringify(formState));
    }, [selectedDestination, selectedActivity, customDetails]);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const personInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
        };
    }, [personImage]);

    const handleGenerate = async () => {
        if (!personImage) {
            setError(t('Please upload a photo of yourself.', 'Por favor, sube una foto tuya.'));
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const b64 = await fileToBase64(personImage.file);
            const sessionImages: string[] = [];

            for (let i = 0; i < 4; i++) {
                const prompt = `**CRITICAL MISSION: GLOBAL TRAVEL BRANDING**
Re-create the person from the source photo with 100% identity accuracy. 
Place them in ${selectedDestination.prompt}. 
They are engaged in this activity: ${selectedActivity}.
${customDetails ? `Additional User Request: ${customDetails}.` : ''}
They should look like a professional traveler, happy, and well-dressed. 
Style: Ultra-realistic, high-resolution lifestyle travel photography, professional lighting. 
Seed: ${Math.random()}`;

                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: "Traveler Photo:" }, { inlineData: { mimeType: personImage.file.type, data: b64 } }, { text: prompt }] },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const img = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (img) {
                    const src = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
                    sessionImages.push(src);
                    setGeneratedImages(prev => [...prev, src]);
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            setError(t('Travel generation failed. Please try again.', 'La generación del viaje falló. Por favor, inténtalo de nuevo.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-smw-pink-light p-4 md:p-8 space-y-6 overflow-y-auto text-smw-gray-dark">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">{t('AI Travel World', 'Mundo de Viajes IA')}</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    {t('Travel the world without leaving your home! Create stunning travel photos in iconic locations with photorealistic results.', '¡Viaja por el mundo sin salir de casa! Crea impresionantes fotos de viajes en lugares icónicos con resultados fotorrealistas.')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Step number={1} title={t('Upload Your Photo', 'Sube Tu Foto')} description={t('Provide a clear professional headshot or half-body photo.', 'Proporciona un primer plano profesional claro o una foto de medio cuerpo.')}>
                        <div onClick={() => personInputRef.current?.click()} className="aspect-video max-w-sm mx-auto bg-white/60 rounded-lg flex items-center justify-center border-2 border-dashed border-smw-pink/50 cursor-pointer hover:bg-white transition-colors p-4">
                            {personImage ? (
                                <img src={personImage.preview} className="max-h-full max-w-full rounded-md shadow-sm" alt={t('Preview', 'Vista previa')} />
                            ) : (
                                <div className="text-center space-y-2 opacity-60">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                    <p className="font-semibold">{t('Click to upload photo', 'Haz clic para subir foto')}</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={e => e.target.files?.[0] && setPersonImage({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title={t('Choose Your Destination', 'Elige Tu Destino')} description={t('Select an iconic location for your virtual trip.', 'Selecciona un lugar icónico para tu viaje virtual.')}>
                        <select
                            value={selectedDestination.name}
                            onChange={(e) => {
                                const dest = destinationOptions.find(d => d.name === e.target.value);
                                if (dest) setSelectedDestination(dest);
                            }}
                            className="w-full bg-white border-2 border-gray-100 rounded-xl p-4 text-base focus:ring-2 focus:ring-smw-pink focus:border-transparent outline-none text-gray-900 font-medium"
                        >
                            {destinationOptions.map(dest => (
                                <option key={dest.name} value={dest.name}>{dest.name}</option>
                            ))}
                        </select>
                    </Step>

                    <Step number={3} title={t('Select Your Activity', 'Selecciona Tu Actividad')} description={t('What will you be doing? Choose an activity that fits your travel vibe.', '¿Qué estarás haciendo? Elige una actividad que se adapte a tu estilo de viaje.')}>
                        <div className="flex flex-wrap gap-2">
                            {activityOptions.map(activity => (
                                <button
                                    key={activity}
                                    onClick={() => setSelectedActivity(activity)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${selectedActivity === activity ? 'bg-smw-pink text-black' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}`}
                                >
                                    {activity}
                                </button>
                            ))}
                        </div>
                    </Step>

                    <Step number={4} title={t('Add Custom Details (Optional)', 'Añadir Detalles Personalizados (Opcional)')} description={t('Describe the outfit, mood, or time of day.', 'Describe el atuendo, el estado de ánimo o la hora del día.')}>
                        <textarea
                            value={customDetails}
                            onChange={(e) => setCustomDetails(e.target.value)}
                            placeholder={t('e.g., wearing a red dress at night, moody and cinematic', 'ej. usando un vestido rojo de noche, melancólico y cinematográfico')}
                            className="w-full h-32 bg-white border-2 border-gray-100 rounded-xl p-4 text-base focus:ring-2 focus:ring-smw-pink focus:border-transparent outline-none resize-none text-black font-medium"
                        />
                    </Step>

                    <Step number={5} title={t('Generate Your Travel Photos', 'Genera Tus Fotos de Viaje')} description={t('Ready for your adventure? Get four amazing options with one click!', '¿Listo para tu aventura? ¡Obtén cuatro opciones increíbles con un solo clic!')}>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !personImage}
                            className="w-full bg-smw-pink text-black font-bold py-4 rounded-xl hover:bg-white disabled:bg-smw-pink/50 disabled:cursor-not-allowed shadow-md text-lg transition-all"
                        >
                            {isLoading ? <Spinner className="mx-auto text-black" /> : t('generate 4 photos', 'generar 4 fotos')}
                        </button>
                    </Step>
                    {error && <div className="p-4 bg-red-900 text-white rounded-xl text-sm text-center font-bold shadow-lg">{error}</div>}
                </div>

                <div className="bg-white/70 backdrop-blur-sm shadow-sm p-6 rounded-xl border border-white/50 flex flex-col h-fit min-h-0">
                    <h3 className="text-xl font-bold text-center text-gray-900 mb-6 uppercase tracking-wider">{t('Your Global Gallery', 'Tu Galería Global')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="relative aspect-square bg-white rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner group">
                                {isLoading && i >= generatedImages.length ? (
                                    <div className="text-center p-4">
                                        <Spinner className="w-10 h-10 text-smw-pink mb-4 mx-auto" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">{t('Traveling...', 'Viajando...')}</p>
                                    </div>
                                ) : generatedImages[i] ? (
                                    <div className="relative group w-full h-full">
                                        <img src={generatedImages[i]} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105" onClick={() => setZoomedImage(generatedImages[i])} alt={t('Travel Result', 'Resultado del viaje')} />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button onClick={() => setZoomedImage(generatedImages[i])} className="bg-white/90 text-black p-1.5 sm:p-2.5 rounded-full hover:bg-white shadow-md transition-transform active:scale-95"><svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={generatedImages[i]} download className="bg-white/90 text-black p-1.5 sm:p-2.5 rounded-full hover:bg-white shadow-md transition-transform active:scale-95"><svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ) : <span className="text-gray-100 text-5xl font-bold">{i + 1}</span>}
                            </div>
                        ))}
                    </div>
                    {generatedImages.length > 0 && !isLoading && (
                        <button onClick={() => {setGeneratedImages([]); setPersonImage(null); setCustomDetails('');}} className="mt-6 w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors uppercase tracking-widest">{t('Start New Session', 'Iniciar Nueva Sesión')}</button>
                    )}
                </div>
            </div>

            {/* Information Boxes */}
            <div className="space-y-6 pt-10 border-t border-smw-pink/20">
                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Introduction', 'Introducción')}</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>{t('The AI Travel World tool allows you to instantly generate realistic lifestyle photos of yourself in the world\'s most iconic travel destinations. Whether you need content for a travel blog, want to update your social media with international vibes, or simply see yourself in Paris, Tokyo, or Bali, this tool makes it happen in seconds.', '¡La herramienta Mundo de Viajes IA te permite generar instantáneamente fotos realistas de tu estilo de vida en los destinos de viaje más icónicos del mundo. Ya sea que necesites contenido para un blog de viajes, quieras actualizar tus redes sociales con vibras internacionales o simplemente verte en París, Tokio o Bali, esta herramienta lo hace posible en segundos.')}</p>
                        <p>{t('Our AI maintains your exact facial identity and integrates you into high-resolution, professionally shot travel scenes with perfect lighting and perspective.', 'Nuestra IA mantiene tu identidad facial exacta y te integra en escenas de viaje de alta resolución tomadas profesionalmente con iluminación y perspectiva perfectas.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">
                            {isIntroExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('How It Works', 'Cómo funciona')}</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p><strong>{t('Step 1: Upload Your Photo', 'Paso 1: Sube tu foto')}</strong> - {t('Provide a clear professional headshot or half-body photo. The AI uses this as the "master" for your identity.', 'Proporciona un primer plano profesional claro o una foto de medio cuerpo. La IA usa esto como el "maestro" para tu identidad.')}</p>
                        <p><strong>{t('Step 2: Choose Your Destination', 'Paso 2: Elige tu destino')}</strong> - {t('Select from our expanded list of 20 world-famous cities or landmarks.', 'Selecciona de nuestra lista ampliada de 20 ciudades o monumentos famosos en todo el mundo.')}</p>
                        <p><strong>{t('Step 3: Select Your Activity', 'Paso 3: Selecciona tu actividad')}</strong> - {t('What are you doing in the photo? Choose from activities like "City Exploring," "Cafe Culture," or "Watching a Sunset."', '¿Qué estás haciendo en la foto? Elige entre actividades como "Exploración de la ciudad", "Cultura de café" o "Viendo el atardecer".')}</p>
                        <p><strong>{t('Step 4: Custom Details (Optional)', 'Paso 4: Detalles personalizados (opcional)')}</strong> - {t('Use the detail box to specify your outfit, lighting, or specific mood.', 'Usa el cuadro de detalles para especificar tu atuendo, iluminación o estado de ánimo específico.')}</p>
                        <p><strong>{t('Step 5: Generate', 'Paso 5: Generar')}</strong> - {t('Click the button and receive 4 high-resolution, photorealistic branding images.', 'Haz clic en el botón y recibe 4 imágenes de marca fotorrealistas de alta resolución.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">
                            {isHowItWorksExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Sales & Marketing Strategy', 'Estrategia de Ventas y Marketing')}</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isMarketingExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p><strong>1. {t('Build a Globetrotter Brand:', 'Construye una marca de trotamundos:')}</strong> {t('Even if you aren\'t traveling yet, you can build an aesthetic travel influencer profile. This attracts travel-related sponsorships and brands faster by showing you already have the "vibe."', 'Incluso si aún no estás viajando, puedes construir un perfil estético de influencer de viajes. Esto atrae patrocinios y marcas relacionadas con los viajes más rápido al mostrar que ya tienes la "vibra".')}</p>
                        <p><strong>2. {t('Boost Engagement:', 'Aumenta el compromiso:')}</strong> {t('"Bucket List" and travel content are among the most shared and saved types of content on Instagram and Pinterest. Use these images to increase your reach.', 'La "Lista de deseos" y el contenido de viajes se encuentran entre los tipos de contenido más compartidos y guardados en Instagram y Pinterest. Usa estas imágenes para aumentar tu alcance.')}</p>
                        <p><strong>3. {t('Affordable Ad Creative:', 'Creatividad publicitaria asequible:')}</strong> {t('If you are promoting travel gear, suitcases, or travel guides, use these photos as your ad creatives to show the product being used globally without leaving home.', 'Si estás promocionando artículos de viaje, maletas o guías de viaje, usa estas fotos como tus creatividades publicitarias para mostrar el producto siendo usado globalmente sin salir de casa.')}</p>
                        <p><strong>4. {t('Thematic Social Feeds:', 'Feeds sociales temáticos:')}</strong> {t('Use the 20 destinations to create a themed week on your social media (e.g., "European Summer Week") even if you are just working from home.', 'Usa los 20 destinos para crear una semana temática en tus redes sociales (ej. "Semana de verano europea") incluso si solo estás trabajando desde casa.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isMarketingExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsMarketingExpanded(!isMarketingExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">
                            {isMarketingExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Pro Tips', 'Consejos Pro')}</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p><strong>• {t('Lighting Coordination:', 'Coordinación de iluminación:')}</strong> {t('For the most realistic results, upload a photo taken in natural light. This helps the AI match the lighting of outdoor destinations like Santorini or Bali perfectly.', 'Para obtener los resultados más realistas, sube una foto tomada con luz natural. Esto ayuda a la IA a coincidir perfectamente con la iluminación de destinos al aire libre como Santorini o Bali.')}</p>
                        <p><strong>• {t('Dressing the Part:', 'Vistiéndose para la ocasión:')}</strong> {t('Think about your destination when choosing your source photo. Wearing a stylish winter coat for the "Swiss Alps" or a breezy linen shirt for "Amalfi Coast" makes the final composite look incredibly believable.', 'Piensa en tu destino al elegir tu foto de origen. Usar un abrigo de invierno elegante para los "Alpes suizos" o una camisa de lino fresca para la "Costa de Amalfi" hace que la composición final se vea increíblemente creíble.')}</p>
                        <p><strong>• {t('Specific Poses:', 'Poses específicas:')}</strong> {t('If you want to look like you\'re actually interacting with a landmark, use the "Landmark Posing" activity and add details like "leaning against a wall" or "looking up at the tower" in the custom details box.', 'Si quieres parecer que realmente estás interactuando con un monumento, usa la actividad "Posando en monumentos" y añade detalles como "apoyado contra una pared" o "mirando hacia la torre" en el cuadro de detalles personalizados.')}</p>
                        <p><strong>• {t('Consistency is Key:', 'La consistencia es clave:')}</strong> {t('Use the same high-quality headshot for several different destinations to create a "World Tour" series for your social media. This builds a consistent digital narrative for your personal brand.', 'Usa el mismo primer plano de alta calidad para varios destinos diferentes para crear una serie de "Tour mundial" para tus redes sociales. Esto construye una narrativa digital consistente para tu marca personal.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-2 font-bold text-smw-pink uppercase tracking-widest hover:underline">
                            {isProTipsExpanded ? t('Read Less', 'Leer menos') : t('Read More', 'Leer más')}
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

export default AITravelWorld;