import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface AIMusicStudioProps {
    addCreations: (images: string[]) => void;
}

const studioVibes = [
    { name: 'Refugio de Rock Grunge', prompt: 'a grungy, rock-and-roll style studio with posters, vintage amps, and a raw, creative energy' },
    { name: 'Estudio en Casa', prompt: 'a creative and comfortable home recording studio setup in a well-lit room' },
    { name: 'Loft Industrial', prompt: 'an industrial loft-style music studio with exposed brick walls, high ceilings, and large windows' },
    { name: 'Lujo de Alta Tecnología', prompt: 'a futuristic, luxury recording studio with state-of-the-art equipment and a premium finish' },
    { name: 'Moderno y Elegante', prompt: 'a modern, sleek recording studio with minimalist design, acoustic panels, and subtle LED lighting' },
    { name: 'Neón y Atmosférico', prompt: 'a moody, neon-lit music studio perfect for R&B or electronic music, with vibrant colors' },
    { name: 'Profesional y Limpio', prompt: 'a high-end, professional recording studio with a large mixing console and a clean, organized look' },
    { name: 'Iluminado y Aireado', prompt: 'a recording studio flooded with natural daylight from large windows, with plants and an airy feel' },
    { name: 'Vintage y Acogedor', prompt: 'a vintage, cozy recording studio with wood paneling, classic analog gear, and warm, soft lighting' },
];

const scenes = [
    { name: 'En la Mesa de Mezclas', prompt: 'sitting at a large mixing console, focused on adjusting faders and knobs' },
    { name: 'Escuchando la Reproducción', prompt: 'wearing headphones and listening intently to a playback, looking satisfied' },
    { name: 'Tocando el Teclado', prompt: 'playing a synthesizer or piano, looking focused and creative' },
    { name: 'Posando con Guitarra', prompt: 'casually posing with an acoustic or electric guitar' },
    { name: 'Posando con Auriculares', prompt: 'posing with high-end studio headphones around the neck or on the head' },
    { name: 'Pared de Discos', prompt: 'standing in front of a wall decorated with gold and platinum records' },
    { name: 'Cantando en la Cabina', prompt: 'singing passionately into a vintage microphone inside a vocal isolation booth' },
    { name: 'Ambiente de Sofá de Estudio', prompt: 'chilling on a stylish couch within the studio, looking relaxed and cool' },
    { name: 'Escribiendo Letras', prompt: 'sitting on a couch with a notebook and pen, thoughtfully writing lyrics' },
];

const angleOptions = {
    single: ["Una toma bien compuesta que mejor se adapte a la escena."],
    multiple: [
        "Un primer plano dramático centrado en el rostro y el micrófono.",
        "Un plano medio de la cintura para arriba, capturando la interacción con el equipo.",
        "Un plano de cuerpo completo que muestra toda la pose y el entorno del estudio.",
        "Una toma sobre el hombro, mirando hacia la mesa de mezclas o la partitura.",
        "Una toma de ángulo bajo, haciendo que el artista luzca icónico y poderoso.",
        "Una toma espontánea, ligeramente descentrada, capturando un momento natural."
    ]
};

const Step: React.FC<{ number: number; title: string; children: React.ReactNode; }> = ({ number, title, children }) => (
    <div className="bg-white shadow-sm p-6 rounded-xl border border-white/50">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Paso {number}: {title}</h3>
        {children}
    </div>
);

const PillButton: React.FC<{ label: string, isSelected: boolean, onClick: () => void }> = ({ label, isSelected, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-4 py-2.5 rounded-lg text-sm transition-all mb-2 mr-2 ${isSelected ? 'bg-rosa-principal text-black font-bold shadow-sm' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 font-medium'}`}
    >
        {label}
    </button>
);

const AIMusicStudio: React.FC<AIMusicStudioProps> = ({ addCreations }) => {
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [selectedVibe, setSelectedVibe] = useState(studioVibes[0]);
    const [selectedScene, setSelectedScene] = useState(scenes[0]);
    const [cameraAngle, setCameraAngle] = useState<'single' | 'multiple'>('multiple');
    const [customDetails, setCustomDetails] = useState('');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwMusicFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedVibe) {
                    const vibe = studioVibes.find(v => v.name === parsed.selectedVibe);
                    if (vibe) setSelectedVibe(vibe);
                }
                if (parsed.selectedScene) {
                    const scene = scenes.find(s => s.name === parsed.selectedScene);
                    if (scene) setSelectedScene(scene);
                }
                if (parsed.cameraAngle) setCameraAngle(parsed.cameraAngle);
                if (parsed.customDetails) setCustomDetails(parsed.customDetails);
            } catch (e) {
                console.error("Failed to load music form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedVibe: selectedVibe.name,
            selectedScene: selectedScene.name,
            cameraAngle,
            customDetails
        };
        localStorage.setItem('smwMusicFormState', JSON.stringify(formState));
    }, [selectedVibe, selectedScene, cameraAngle, customDetails]);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Info box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const personInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
        };
    }, [personImage]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
            setPersonImage({ file, preview: URL.createObjectURL(file) });
        }
    };

    const handleGenerate = async () => {
        if (!personImage) {
            setError('Por favor, sube una foto tuya.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const personBase64 = await fileToBase64(personImage.file);
            const sessionImages: string[] = [];
            const anglesToGenerate = cameraAngle === 'multiple' ? angleOptions.multiple : angleOptions.single;

            for (let i = 0; i < anglesToGenerate.length; i++) {
                const angle = anglesToGenerate[i];
                const prompt = `**MISIÓN CRÍTICA: SESIÓN DE FOTOS EN ESTUDIO DE MÚSICA VIRTUAL** 
Recrea a la persona de la foto de origen con un 100% de precisión facial y de identidad. 
Escenario: ${selectedVibe.prompt}. 
Pose/Acción: ${selectedScene.prompt}. 
Ángulo de cámara: ${angle}. 
Detalles adicionales: ${customDetails || "Ninguno"}.
Estilo: Fotorrealista, iluminación cinematográfica, fotografía de estudio de alta resolución.`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            { text: "Source Person:" }, { inlineData: { mimeType: personImage.file.type, data: personBase64 } },
                            { text: prompt }
                        ]
                    },
                    config: { responseModalities: [Modality.IMAGE] },
                });
                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    sessionImages.push(newImage);
                    setGeneratedImages(prev => [...prev, newImage]);
                }

                // Spacing requests to prevent 429
                if (i < anglesToGenerate.length - 1) await new Promise(r => setTimeout(r, 1500));
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            setError('El servicio de IA está ocupado. Inténtalo de nuevo en 1 minuto.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col bg-rosa-claro rounded-lg shadow-xl p-4 md:p-8 space-y-6 h-full overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">Estudio de Música IA</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    Sitúate en un estudio de música profesional. Elige tu ambiente, escena y ángulos de cámara para crear la toma perfecta.
                </p>
            </div>
            {generatedImages.length > 0 && (
                <div className="flex justify-center mb-4">
                    <button onClick={() => {setGeneratedImages([]); setPersonImage(null);}} className="text-sm py-2 px-4 rounded-lg bg-white/80 hover:bg-white text-black font-semibold shadow-sm border border-gray-100">Empezar de nuevo</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col space-y-6">
                    <Step number={1} title="Sube tu foto">
                        <div onClick={() => personInputRef.current?.click()} className="w-full min-h-[450px] bg-white rounded-xl flex items-center justify-center border-2 border-dashed border-pink-200 p-2 cursor-pointer hover:border-rosa-principal transition-colors group">
                            {personImage ? (
                                <img src={personImage.preview} className="max-h-[440px] max-w-full rounded-lg object-cover shadow-sm" alt="Vista previa" />
                            ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-pink-100 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rosa-principal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <p className="text-gray-400 font-bold text-lg">Haz clic para subir foto</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title="Elige el ambiente del estudio">
                        <div className="flex flex-wrap">
                            {studioVibes.map(vibe => (
                                <PillButton 
                                    key={vibe.name} 
                                    label={vibe.name} 
                                    isSelected={selectedVibe.name === vibe.name} 
                                    onClick={() => setSelectedVibe(vibe)} 
                                />
                            ))}
                        </div>
                    </Step>

                    <Step number={3} title="Selecciona tu escena">
                        <div className="flex flex-wrap">
                            {scenes.map(scene => (
                                <PillButton 
                                    key={scene.name} 
                                    label={scene.name} 
                                    isSelected={selectedScene.name === scene.name} 
                                    onClick={() => setSelectedScene(scene)} 
                                />
                            ))}
                        </div>
                    </Step>

                    <Step number={4} title="Elige el ángulo de cámara">
                        <div className="flex bg-gray-50 rounded-full p-1.5 w-full md:w-5/6 shadow-inner border border-gray-100">
                            <button 
                                onClick={() => setCameraAngle('single')} 
                                className={`w-1/2 text-center rounded-full py-3 text-sm font-bold transition-all ${cameraAngle === 'single' ? 'bg-rosa-principal text-black shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Foto única
                            </button>
                            <button 
                                onClick={() => setCameraAngle('multiple')} 
                                className={`w-1/2 text-center rounded-full py-3 text-sm font-bold transition-all ${cameraAngle === 'multiple' ? 'bg-rosa-principal text-black shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                6 ángulos diferentes
                            </button>
                        </div>
                    </Step>

                    <Step number={5} title="Añadir detalles personalizados (Opcional)">
                        <textarea
                            value={customDetails}
                            onChange={(e) => setCustomDetails(e.target.value)}
                            placeholder="ej. usando una chaqueta de cuero, iluminación atmosférica"
                            className="w-full h-32 bg-white border-2 border-gray-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none resize-none text-black placeholder:text-gray-400 font-medium"
                        />
                    </Step>

                    <div className="flex justify-center mt-4">
                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading || !personImage} 
                            className="w-auto px-16 bg-rosa-principal text-black font-bold py-4 rounded-xl hover:bg-white disabled:bg-pink-100 disabled:text-pink-300 disabled:cursor-not-allowed text-xl shadow-lg transition-all border border-transparent hover:border-rosa-principal"
                        >
                            {isLoading ? <Spinner className="mx-auto text-black" /> : 'Generar sesión de fotos en el estudio'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col bg-white shadow-sm p-8 rounded-xl border border-white/50 min-h-[600px]">
                    <h3 className="text-2xl font-bold text-center text-gray-800 mb-8 pb-4 border-b border-pink-50">Tu sesión de fotos</h3>
                    <div className="w-full flex-1 relative">
                         {error && <div className="p-4 bg-red-900 text-white rounded-xl text-sm mb-6 font-bold shadow-lg text-center">{error}</div>}
                         
                         {(!isLoading && generatedImages.length === 0) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mb-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-rosa-principal opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L16 8M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586 1.586a2 2 0 010 2.828L12 20M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </div>
                                <p className="text-gray-400 font-bold text-xl">Tus fotos generadas aparecerán aquí</p>
                                <p className="text-gray-300 text-sm mt-2">Completa los pasos y haz clic en generar para comenzar tu sesión de fotos</p>
                            </div>
                         ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...Array(cameraAngle === 'multiple' ? 6 : 1)].map((_, index) => (
                                    <div key={index} className="relative aspect-square bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner">
                                        {isLoading && index >= generatedImages.length ? (
                                            <div className="text-center p-4">
                                                <Spinner className="w-10 h-10 text-rosa-principal mb-4 mx-auto" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Mezclando pistas...</p>
                                            </div>
                                        ) : generatedImages[index] ? (
                                            <div className="relative group w-full h-full">
                                                <img src={generatedImages[index]} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-105" onClick={() => setZoomedImage(generatedImages[index])} alt="Resultado del estudio" />
                                                <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setZoomedImage(generatedImages[index])} className="bg-black/60 text-white p-2.5 rounded-full hover:bg-black/80 shadow-md backdrop-blur-sm transition-transform active:scale-95"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                                    <a href={generatedImages[index]} download className="bg-black/60 text-white p-2.5 rounded-full hover:bg-black/80 shadow-md backdrop-blur-sm transition-transform active:scale-95"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                                </div>
                                            </div>
                                        ) : <span className="text-gray-200 text-5xl font-bold">{index + 1}</span>}
                                    </div>
                                ))}
                            </div>
                         )}
                    </div>
                </div>
            </div>

            {/* Information Sections */}
            <div className="space-y-6 mt-12 border-t border-rosa-principal/20 pt-10">
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/20">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Introducción</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>Bienvenido al Estudio de Música IA, una experiencia de sesión de fotos virtual de vanguardia diseñada específicamente para artistas, productores y músicos. En lugar de reservar un costoso alquiler de estudio y contratar a un fotógrafo profesional, ahora puedes generar fotos promocionales de clase mundial desde la comodidad de tu hogar.</p>
                        <p>Nuestra IA avanzada comprende la estética de la industria musical, desde el equipo técnico de una sala de control de alta gama hasta la atmósfera creativa y melancólica de un espacio de ensayo privado. Al combinar tu imagen con estos entornos icónicos, puedes construir una marca visual poderosa que coincida con la calidad de tu sonido.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-rosa-principal font-semibold hover:underline">
                            {isIntroExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/20">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Cómo funciona</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p><strong>Paso 1: Sube tu foto</strong> - Proporciona una foto clara de ti mismo. Un simple primer plano o un plano medio con buena iluminación funciona mejor. La IA usa esto como el "plano" para tu rostro e identidad.</p>
                        <p><strong>Paso 2: Elige el ambiente del estudio</strong> - Selecciona el entorno que se adapte a tu género. Ya sea una suite de "Lujo de Alta Tecnología" para pop y EDM o un "Refugio de Rock Grunge" para una estética alternativa, tenemos el telón de fondo perfecto para tu marca.</p>
                        <p><strong>Paso 3: Selecciona tu escena</strong> - ¿Qué estás haciendo en la foto? Elige entre acciones como mezclar en la mesa, cantar en una cabina vocal o escribir letras en un sofá de estudio.</p>
                        <p><strong>Paso 4: Ángulo de cámara</strong> - Decide si quieres una toma perfecta o una colección de 6 perspectivas diferentes (primeros planos, tomas amplias, espontáneas) para darle variedad a tu feed de redes sociales.</p>
                        <p><strong>Paso 5: Generar</strong> - Haz clic en el botón y observa cómo nuestra IA "ingenia" tu sesión de fotos. Recibirás imágenes fotorrealistas de alta resolución que mantienen tu identidad al 100%.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-rosa-principal font-semibold hover:underline">
                            {isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/20">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Consejos de ventas e ideas de monetización</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p><strong>1. Arte profesional para álbumes y sencillos:</strong> Usa estas tomas de alta fidelidad como el arte principal para tus lanzamientos en Spotify, Apple Music y SoundCloud. Los visuales profesionales conducen a mayores tasas de clics y recuentos de reproducciones.</p>
                        <p><strong>2. Impulsa tu kit de prensa electrónico (EPK):</strong> Los promotores y sellos quieren ver que te tomas en serio tu marca. Llenar tu EPK con fotos de estudio profesionales te hace ver establecido y listo para contrataciones.</p>
                        <p><strong>3. Consistencia en Instagram y TikTok:</strong> A los fans les encanta el contenido "detrás de escena". Incluso si no estás en un estudio de $5,000 al día en este momento, estas fotos te permiten mantener una estética de alto valor que atrae a más seguidores y colaboradores potenciales.</p>
                        <p><strong>4. Alianzas con afiliados y marcas:</strong> Cuando pareces un profesional, las marcas de equipo y software tienen más probabilidades de asociarse contigo. Usa estas imágenes para mostrarte como un influencer creíble en el espacio de la tecnología musical.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-rosa-principal font-semibold hover:underline">
                            {isSalesTipsExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/20">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Consejos profesionales</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p><strong>• La iluminación es clave:</strong> Para obtener el resultado más realista, sube una foto de origen con iluminación neutral. Las sombras fuertes en tu rostro en la foto de origen a veces pueden interferir con la capacidad de la IA para integrarte perfectamente en el entorno del estudio.</p>
                        <p><strong>• Vístete para la ocasión:</strong> La IA mantendrá tu atuendo de la foto de origen pero lo estilizará para que coincida con la iluminación del estudio. Usa algo que se ajuste a tu "personaje de artista" para obtener el mejor resultado de marca.</p>
                        <p><strong>• Usa detalles personalizados:</strong> ¡No tengas miedo de usar el Paso 5! Puedes añadir nombres de equipos específicos como "micrófono de tubo vintage", "discos de oro en la pared" o "letrero de neón rojo con mi nombre" para que la sesión de fotos se sienta verdaderamente única para ti.</p>
                        <p><strong>• Combina el ambiente con el tempo:</strong> Si tu música es oscura y atmosférica, elige "Neón y Atmosférico". Si estás haciendo pop brillante y alegre, "Iluminado y Aireado" o "Moderno y Elegante" resonarán mejor con tu audiencia.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-rosa-principal font-semibold hover:underline">
                            {isProTipsExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-12 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Vista ampliada" className="max-w-full max-h-full object-contain rounded-md shadow-2xl border-4 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md" aria-label="Cerrar">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIMusicStudio;
