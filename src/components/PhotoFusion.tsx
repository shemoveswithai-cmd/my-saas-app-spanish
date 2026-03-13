import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface PhotoFusionProps {
    addCreations: (images: string[]) => void;
}

const sceneCategories = [
    {
        title: 'Exterior y Naturaleza',
        options: [
            { name: 'Lago de Montaña', prompt: 'standing together in a beautiful natural landscape with mountains and a serene lake at golden hour' },
            { name: 'Parque Verde', prompt: 'posing together in a lush green public park with sunbeams filtering through the trees' },
            { name: 'Playa Tropical', prompt: 'standing together on a white sand tropical beach with turquoise water and palm trees' },
            { name: 'Bosque Encantado', prompt: 'standing together in a magical, ethereal forest with glowing flora and soft mist' },
        ]
    },
    {
        title: 'Vida Urbana y Ciudad',
        options: [
            { name: 'Noche en la Ciudad', prompt: 'posing together on a busy city street at night with vibrant neon signs and bokeh city lights' },
            { name: 'Vista desde la Azotea', prompt: 'standing together on a modern skyscraper rooftop with a panoramic city skyline at dusk' },
            { name: 'Cafetería Acogedora', prompt: 'sitting together in a charming, warm-lit cafe with a rustic interior' },
            { name: 'Galería de Arte', prompt: 'posing together in a minimalist, high-end art gallery with white walls and modern art' },
        ]
    },
    {
        title: 'Profesional y Estudio',
        options: [
            { name: 'Estudio Minimalista', prompt: 'posing together in a clean, professional photo studio with a seamless white background' },
            { name: 'Oficina Moderna', prompt: 'standing together in a sleek, high-tech corporate office with glass walls' },
            { name: 'Gran Biblioteca', prompt: 'posing together in a classic, grand library with floor-to-ceiling bookshelves' },
        ]
    },
    {
        title: 'Festivo y Divertido',
        options: [
            { name: 'Sala de Estar Navideña', prompt: 'posing together in a cozy living room decorated for the holidays with a lit fireplace and tree' },
            { name: 'Fiesta de Cumpleaños', prompt: 'celebrating together at a festive birthday party with balloons and colorful decorations' },
            { name: 'Festival de Música', prompt: 'enjoying a music festival together with a stage and vibrant lights in the background' },
        ]
    }
];

const PhotoFusion: React.FC<PhotoFusionProps> = ({ addCreations }) => {
    const [person1, setPerson1] = useState<{ file: File; preview: string } | null>(null);
    const [person2, setPerson2] = useState<{ file: File; preview: string } | null>(null);
    const [selectedScene, setSelectedScene] = useState(sceneCategories[0].options[0]);
    const [customPrompt, setCustomPrompt] = useState('a beautiful natural landscape with mountains and a lake at golden hour');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwPhotoFusionFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedScene) {
                    const scene = sceneCategories.flatMap(c => c.options).find(o => o.name === parsed.selectedScene);
                    if (scene) setSelectedScene(scene);
                }
                if (parsed.customPrompt) setCustomPrompt(parsed.customPrompt);
            } catch (e) {
                console.error("Failed to load photo fusion form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedScene: selectedScene.name,
            customPrompt
        };
        localStorage.setItem('smwPhotoFusionFormState', JSON.stringify(formState));
    }, [selectedScene, customPrompt]);
    
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Info box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesMonetizationExpanded, setIsSalesMonetizationExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const input1Ref = useRef<HTMLInputElement>(null);
    const input2Ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (person1?.preview) URL.revokeObjectURL(person1.preview);
            if (person2?.preview) URL.revokeObjectURL(person2.preview);
        };
    }, [person1, person2]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, person: 1 | 2) => {
        const file = e.target.files?.[0];
        if (file) {
            const preview = URL.createObjectURL(file);
            if (person === 1) {
                if (person1?.preview) URL.revokeObjectURL(person1.preview);
                setPerson1({ file, preview });
            } else {
                if (person2?.preview) URL.revokeObjectURL(person2.preview);
                setPerson2({ file, preview });
            }
        }
    };

    const handleGenerate = async () => {
        if (!person1 || !person2) {
            setError('Por favor, sube ambas fotos.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const b64_1 = await fileToBase64(person1.file);
            const b64_2 = await fileToBase64(person2.file);

            const prompt = `**CRITICAL MISSION: PHOTO FUSION**
Combine the two people from the source photos into one new scene exactly as described.
Source Person 1: Provided as the first image.
Source Person 2: Provided as the second image.
100% Identity Match: Both faces and identities must be perfectly preserved and identical to the source photos.

NEW SCENE: ${customPrompt || selectedScene.prompt}.
STYLE: Professional, high-end, photorealistic photography. The two people should be interacting naturally or posing together in the same lighting and environment. No artifacts, seamless integration.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: person1.file.type, data: b64_1 } },
                        { inlineData: { mimeType: person2.file.type, data: b64_2 } },
                        { text: prompt }
                    ]
                },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setGeneratedImage(newImage);
                addCreations([newImage]);
            } else {
                throw new Error('No se devolvió ninguna imagen de la IA.');
            }
        } catch (e) {
            setError('La fusión falló. Por favor, inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col bg-smw-pink-light min-h-full p-4 md:p-8 space-y-6 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">IA PhotoFusion</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    Combina personas de dos fotos en una nueva escena — de manera hermosa y natural con calidad de estudio profesional.
                </p>
            </div>

            {/* Step 1: Upload */}
            <div className="bg-white/70 shadow-sm p-6 rounded-xl border border-white/50 space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Paso 1: Sube tus Fotos</h3>
                <p className="text-base text-gray-600 font-medium">Sube dos fotos. Los fondos se eliminarán automáticamente.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <p className="text-center font-bold text-gray-800 text-lg">Persona 1</p>
                        <div onClick={() => input1Ref.current?.click()} className="aspect-[16/6] md:aspect-video bg-white rounded-lg border-2 border-dashed border-pink-200 flex items-center justify-center cursor-pointer hover:border-smw-pink transition-colors">
                            {person1 ? (
                                <img src={person1.preview} className="h-full w-full object-cover rounded-lg" alt="Persona 1" />
                            ) : (
                                <span className="text-gray-400 text-base font-bold">Subir Foto</span>
                            )}
                        </div>
                        <input type="file" ref={input1Ref} onChange={(e) => handleFileChange(e, 1)} className="hidden" accept="image/*" />
                    </div>

                    <div className="space-y-4">
                        <p className="text-center font-bold text-gray-800 text-lg">Persona 2</p>
                        <div onClick={() => input2Ref.current?.click()} className="aspect-[16/6] md:aspect-video bg-white rounded-lg border-2 border-dashed border-pink-200 flex items-center justify-center cursor-pointer hover:border-smw-pink transition-colors">
                            {person2 ? (
                                <img src={person2.preview} className="h-full w-full object-cover rounded-lg" alt="Persona 2" />
                            ) : (
                                <span className="text-gray-400 text-base font-bold">Subir Foto</span>
                            )}
                        </div>
                        <input type="file" ref={input2Ref} onChange={(e) => handleFileChange(e, 2)} className="hidden" accept="image/*" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-2">
                        <p className="text-center font-bold text-gray-800">Fondo Eliminado</p>
                        <div className="aspect-[16/4] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                            {person1 ? (
                                <img src={person1.preview} className="h-full object-contain mix-blend-multiply opacity-80" alt="Vista previa Persona 1" />
                            ) : (
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Vista previa</span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-center font-bold text-gray-800">Fondo Eliminado</p>
                        <div className="aspect-[16/4] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                            {person2 ? (
                                <img src={person2.preview} className="h-full object-contain mix-blend-multiply opacity-80" alt="Vista previa Persona 2" />
                            ) : (
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Vista previa</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Generate */}
            <div className="bg-white/70 shadow-sm p-6 rounded-xl border border-white/50 space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Paso 2: Generar Imagen Fusionada</h3>
                <p className="text-base text-gray-600 font-medium">Selecciona una escena preestablecida. El cuadro de prompt a continuación es opcional si deseas escribir el tuyo propio.</p>

                <div className="space-y-6">
                    {sceneCategories.map(category => (
                        <div key={category.title} className="space-y-3">
                            <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">{category.title}</p>
                            <div className="flex flex-wrap gap-2">
                                {category.options.map(opt => (
                                    <button
                                        key={opt.name}
                                        onClick={() => {
                                            setSelectedScene(opt);
                                            setCustomPrompt(opt.prompt);
                                        }}
                                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm border ${selectedScene.name === opt.name ? 'bg-smw-pink text-black border-smw-pink' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-100'}`}
                                    >
                                        {opt.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full h-32 bg-white border-2 border-gray-100 rounded-xl p-4 text-base focus:ring-2 focus:ring-smw-pink focus:border-transparent outline-none resize-none text-black font-medium"
                    placeholder="Describe tu propia escena aquí..."
                />

                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !person1 || !person2}
                    className="w-full bg-smw-pink text-black font-bold py-4 rounded-xl hover:bg-white disabled:bg-smw-pink/50 disabled:cursor-not-allowed text-lg transition-all border border-transparent flex items-center justify-center shadow-md"
                >
                    {isLoading ? <Spinner className="text-black" /> : 'Generar Foto Ahora'}
                </button>
                <p className="text-xs text-gray-400 text-center italic">Para obtener los mejores resultados, usa fotos claras y bien iluminadas. La fusión por IA es experimental y los resultados pueden variar.</p>
            </div>

            {/* Result Area */}
            <div className="bg-white/70 shadow-sm p-6 rounded-xl border border-white/50 space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Resultado — ¡Tu IA PhotoFusion está lista!</h3>
                <div className="aspect-[16/7] bg-white rounded-xl border border-gray-100 flex items-center justify-center relative overflow-hidden shadow-inner">
                    {isLoading ? (
                        <div className="text-center p-4">
                            <Spinner className="w-12 h-12 text-smw-pink mb-4 mx-auto" />
                            <p className="text-lg font-bold text-gray-500 animate-pulse">Fusionando identidades...</p>
                        </div>
                    ) : generatedImage ? (
                        <div className="relative group w-full h-full">
                            <img src={generatedImage} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setZoomedImage(generatedImage)} alt="Resultado" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button onClick={() => setZoomedImage(generatedImage)} className="bg-white/90 text-black p-2 sm:p-3 rounded-full hover:bg-white shadow-md"><svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                <a href={generatedImage} download className="bg-white/90 text-black p-2 sm:p-3 rounded-full hover:bg-white shadow-md"><svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                            </div>
                        </div>
                    ) : (
                        <p className="text-base text-gray-400 font-bold">Tu imagen fusionada aparecerá aquí.</p>
                    )}
                </div>
                {error && <div className="p-4 bg-red-900 text-white rounded-xl text-sm text-center font-bold shadow-lg">{error}</div>}
            </div>

            {/* Information Boxes */}
            <div className="space-y-6 pt-10 border-t border-smw-pink/20">
                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Introducción</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>Bienvenido a IA PhotoFusion, la herramienta definitiva para unir a las personas a través de la distancia y el tiempo. Ya sea que te hayas perdido una foto grupal, quieras verte con un modelo a seguir o simplemente desees crear una toma de dúo de alta moda para tu marca, nuestra IA combina a la perfección dos fotos distintas en una sola obra maestra cohesiva.</p>
                        <p>Utilizando un mapeo de identidad avanzado, nuestro sistema garantiza que ambos sujetos mantengan su parecido al 100% mientras ajusta la iluminación, las sombras y la profundidad de campo para que la composición final parezca haber sido tomada en un estudio profesional.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-smw-pink font-bold hover:underline">
                            {isIntroExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Cómo Funciona</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>Paso 1: Sube los Sujetos</strong> - Proporciona dos fotos claras. Nuestra IA aislará automáticamente a las personas en cada imagen, preparándolas para el proceso de "fusión".</p>
                        <p><strong>Paso 2: Elige tu Estilo</strong> - Selecciona entre nuestras categorías curadas como "Vida Urbana y Ciudad" o "Exterior y Naturaleza". Cada escena está diseñada para proporcionar fondos de grado profesional para tu dúo.</p>
                        <p><strong>Paso 3: Estilo Personalizado</strong> - Usa el cuadro de prompt para añadir detalles específicos. ¿Quieres usar ropa específica o estar en un lugar emblemático? ¡Solo escríbelo!</p>
                        <p><strong>Paso 4: Generar y Refinar</strong> - Nuestro motor renderiza la escena, asegurando que ambas personas estén posicionadas de manera natural y que la calidad general de la imagen sea nítida y profesional.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-smw-pink font-bold hover:underline">
                            {isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Consejos de Venta e Ideas de Monetización</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isSalesMonetizationExpanded ? 'max-h-[2000px]' : 'max-h-[150px]'}`}>
                        <p><strong>1. Servicio de Colaboración Virtual:</strong> Ofrece a influencers o marcas la capacidad de "colaborar" visualmente. Crea tomas promocionales con miembros del equipo de diferentes ubicaciones sin costos de viaje.</p>
                        <p><strong>2. Regalos Nostálgicos Personalizados:</strong> Crea un negocio de fotos de "Reencuentro" para familias o amigos que viven en diferentes partes del mundo. Estos son regalos sentimentales muy poderosos.</p>
                        <p><strong>3. Tomas de Dúo para Marketing de Afiliados:</strong> Promociona marcas de ropa o estilo de vida mostrándote "interactuando" con otros en los productos, creando una prueba social de alto compromiso.</p>
                        <p><strong>4. Creativos Publicitarios de Alta Conversión:</strong> Usa PhotoFusion para colocarte a ti mismo o a un modelo junto a un "cliente satisfecho" para activos de marketing que generen confianza.</p>
                        <p><strong>5. Venta Adicional de Activos Digitales:</strong> Para fotógrafos, ofrece cambios de escena impulsados por IA y fusión de sujetos como un complemento premium a las sesiones de retratos estándar.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isSalesMonetizationExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesMonetizationExpanded(!isSalesMonetizationExpanded)} className="mt-4 text-smw-pink font-bold hover:underline">
                            {isSalesMonetizationExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Consejos Pro</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>• Alineación de la Iluminación:</strong> Para obtener los mejores resultados, intenta usar fotos de origen tomadas con direcciones de iluminación similares (ej., ambas de lado o ambas de frente).</p>
                        <p><strong>• Entradas de Alta Resolución:</strong> Cuanto mejor sea la calidad del selfie original, más precisamente podrá la IA mapear los detalles faciales finos y las texturas del cabello.</p>
                        <p><strong>• Prompts Específicos:</strong> En lugar de "una ciudad", intenta con "de pie en un balcón con la Torre Eiffel a lo lejos durante un atardecer rosa". La especificidad conduce a resultados de grado profesional.</p>
                        <p><strong>• Pistas de Interacción:</strong> En el cuadro de prompt, menciona cómo deben interactuar los sujetos, como "riendo juntos" o "espalda con espalda" para una composición más natural.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-smw-pink font-bold hover:underline">
                            {isProTipsExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-12 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Expanded" className="max-w-full max-h-full object-contain rounded-md shadow-2xl border-4 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoFusion;