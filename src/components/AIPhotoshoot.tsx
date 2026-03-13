import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64, dataURLtoFile } from '../utils';
import { Spinner } from './common/Spinner';
import { UserProfile } from '../App';
import { Feature, features } from './Sidebar';

interface AIPhotoshootProps {
    addCreations: (images: string[]) => void;
    user: UserProfile;
    setActiveFeature: (feature: Feature) => void;
}

interface PromptCategory {
    category: string;
    prompts: string[];
}

const fashionPrompts: PromptCategory[] = [
    { 
        category: 'Estilo Streetwear', 
        prompts: [
            "Posando en un parque de skate urbano con grafitis y texturas de hormigón.",
            "Caminando por un callejón urbano vibrante lleno de arte callejero y luces de neón.",
            "Apoyado en una valla de tela metálica en un distrito industrial de la ciudad.",
            "Cruzando una concurrida calle metropolitana con taxis amarillos desenfocados al fondo.",
            "Sentado en los escalones de un edificio de piedra rojiza en un barrio de moda."
        ] 
    },
    { category: 'Chic Urbano', prompts: ["De pie en una moderna plaza de la ciudad con rascacielos de cristal reflejando el cielo.", "Posando contra una pared de ladrillo texturizado en un elegante distrito de lofts del centro.", "Caminando por un distrito de compras de lujo al aire libre con escaparates exclusivos.", "Apoyado en una barandilla con vistas a una concurrida intersección de la ciudad al anochecer.", "Una toma elegante en una estación de metro con paredes de azulejos y trenes en movimiento."] },
    { category: 'Minimalismo y Moderno', prompts: ["Un estudio limpio y luminoso con un fondo blanco sin costuras y sombras suaves.", "Posando frente a una pared de hormigón gris liso con líneas arquitectónicas.", "Un entorno de galería de arte moderno con paredes blancas y suelos de hormigón pulido.", "De pie en una habitación con ventanales de suelo a techo y cortinas blancas transparent.", "Una composición de alta moda austera con un fondo de color pastel sólido."] },
    { category: 'Profesional de Negocios', prompts: ["De pie con confianza en un elegante y moderno vestíbulo corporativo de cristal.", "Sentado en un escritorio de caoba en una oficina de lujo con vistas a la ciudad.", "Caminando a paso ligero por un espacio de coworking luminoso y diáfano.", "Dando una presentación en una sala de conferencias moderna con paredes de cristal.", "Un entorno de retrato profesional con un fondo de biblioteca gris texturizado."] },
    { category: 'Glamour Nocturno', prompts: ["Caminando por una alfombra roja con flashes de cámaras y cuerdas de terciopelo.", "De pie en una escalera de mármol en el gran vestíbulo de un hotel de lujo.", "Tomando una copa en un exclusivo bar en la azotea con un horizonte urbano resplandeciente.", "Posando en un balcón por la noche con las luces de la ciudad desenfocadas al fondo.", "Un escenario dramático iluminado por focos con cortinas de terciopelo."] },
    { category: 'Vintage y Retro', prompts: ["Apoyado en un coche descapotable clásico de los años 50 en el aparcamiento de un restaurante retro.", "Dentro de un acogedor salón de estilo de los 70 con alfombras y paneles de madera.", "Caminando frente a un cine retro con un letrero de neón brillante.", "Posando en una biblioteca antigua llena de libros encuadernados en cuero.", "Una escena callejera en tono sepia con adoquines y farolas antiguas."] },
    { category: 'Ropa Deportiva', prompts: ["Estirando en una esterilla de yoga en un estudio luminoso y soleado con plantas.", "Trotando por un pintoresco sendero fluvial en un moderno parque de la ciudad.", "Posando en un gimnasio de boxeo descarnado y de alto contraste con sacos colgantes.", "Descansando en un banco en un vestuario moderno con diseño elegante.", "De pie en una pista de tenis en un día soleado con cielos azules despejados."] },
    { category: 'Ropa de Descanso y Confort', prompts: ["Relajándose en un sofá de terciopelo de felpa en una sala de estar acogedora y bañada por el sol.", "Sentado en un asiento junto a la ventana envuelto en una manta con una vista lluviosa afuera.", "Tumbado en una cama blanca con almohadas mullidas y luz suave de la mañana.", "Leyendo un libro en un rincón acogedor rodeado de plantas de interior.", "De pie en una cocina moderna con una taza de café en la mano."] },
    { category: 'Look Bohemio', prompts: ["De pie en un campo de flores silvestres altas durante la hora dorada.", "Posando frente a un tapiz de macramé dentro de una tienda rústica.", "Caminando descalzo por una playa de arena con dunas y hierba marina.", "Sentado en una alfombra persa en un festival de música al aire libre con guirnaldas de luces.", "Apoyado en una cabaña de madera rústica en un claro del bosque."] },
    { category: 'Pasarela Editorial', prompts: ["Caminando por una pasarela de moda de alto brillo con focos dramáticos.", "Posando en un túnel futurista con tiras de luces LED de neón.", "Un set de vanguardia de alto concepto con formas geométricas y sombras marcadas.", "De pie en un estanque de agua con un fondo oscuro y melancólico.", "Una sala de espejos creando reflejos infinitos de la modelo."] },
    { category: 'Estética de Estilo de Vida', prompts: ["Paseando a un perro en un frondoso y exclusivo barrio residencial.", "Comprando en una tienda boutique, sosteniendo bolsas de compras.", "Riendo con amigos en un picnic en un parque soleado.", "Buscando flores en un colorido mercado de agricultores al aire libre.", "Montando una bicicleta vintage por una calle tranquila bordeada de árboles."] },
    { category: 'Automotriz de Lujo', prompts: ["Apoyado en un elegante coche deportivo de lujo negro en un garaje moderno.", "Bajando de un jet privado en una pista de aterrizaje.", "Sentado en el asiento del conductor de un descapotable de alta gama con interior de cuero.", "De pie junto a un SUV de lujo frente a una mansión moderna.", "Posando en una sala de exposición llena de superdeportivos exóticos."] },
    { category: 'Sesión de Fotos Estacional', prompts: ["Caminando por un parque cubierto de vibrantes hojas de otoño naranjas y rojas.", "De pie en un paraíso invernal nevado con pinos.", "Posando en un jardín floreciente lleno de flores en primavera.", "Relajándose junto a una piscina azul resplandeciente en el calor del verano.", "Una escena de porche de cabaña acogedora con calabazas y decoración de otoño."] },
    { category: 'Cultura de Café', prompts: ["Sentado en una pequeña mesa redonda fuera de un café de estilo parisino.", "Dentro de una cafetería rústica con ladrillos vistos e iluminación cálida.", "Sosteniendo una taza de café con arte latte junto a una ventana con gotas de lluvia.", "Trabajando en un ordenador portátil en una mesa comunitaria en un bar de café de moda.", "De pie en el mostrador de una panadería luminosa y moderna."] },
    { category: 'Retratos de Hora Dorada', prompts: ["Contraluz por el sol poniente en un campo de hierba alta.", "En la azotea de una ciudad con el sol poniéndose bajo el horizonte.", "Caminando por la playa mientras el sol tiñe el cielo de naranja y rosa.", "Luz solar filtrándose a través de los árboles en un bosque, creando rayos de luz.", "Un retrato de primer plano bañado en una luz dorada cálida y suave."] },
    { category: 'Viajes y Resort', prompts: ["Relajándose en una piscina infinita con vistas a un océano tropical.", "Caminando por las coloridas calles de un pueblo italiano.", "De pie en un balcón con vistas a la Torre Eiffel.", "Explorando antiguas ruinas de piedra en un lugar desértico soleado.", "Posando en un muelle de madera sobre aguas turquesas cristalinas."] }
];

const aspectRatios = [
    { label: 'cuadrado (1:1)', value: '1:1' },
    { label: 'retrato (3:4)', value: '3:4' },
    { label: 'retrato (4:5)', value: '4:5' },
    { label: 'vertical (9:16)', value: '9:16' },
    { label: 'horizontal (4:3)', value: '4:3' },
    { label: 'panorámico (16:9)', value: '16:9' }
];

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4">
        <h3 className="text-base font-semibold text-gray-400 mb-4 tracking-tight lowercase">paso {number}: {title}</h3>
        {children}
    </div>
);

const AIPhotoshoot: React.FC<AIPhotoshootProps> = ({ addCreations, user, setActiveFeature }) => {
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [bodyType, setBodyType] = useState('Igual que la foto');
    const [clothingItems, setClothingItems] = useState<{ id: string, file: File, preview: string }[]>([]);
    const [promptMode, setPromptMode] = useState<'Categorías' | 'Personalizado'>('Categorías');
    const [selectedCategory, setSelectedCategory] = useState(fashionPrompts[0].category);
    const [selectedPrompt, setSelectedPrompt] = useState(fashionPrompts[0].prompts[0]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState('3:4');

    // Load form state from localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem('smwPhotoshootMode');
        const savedCategory = localStorage.getItem('smwPhotoshootCategory');
        const savedPrompt = localStorage.getItem('smwPhotoshootPrompt');
        const savedCustomPrompt = localStorage.getItem('smwPhotoshootCustomPrompt');
        const savedAspectRatio = localStorage.getItem('smwPhotoshootAspectRatio');
        
        if (savedMode) setPromptMode(savedMode as 'Categorías' | 'Personalizado');
        if (savedCategory) setSelectedCategory(savedCategory);
        if (savedPrompt) setSelectedPrompt(savedPrompt);
        if (savedCustomPrompt) setCustomPrompt(savedCustomPrompt);
        if (savedAspectRatio) setSelectedAspectRatio(savedAspectRatio);
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        localStorage.setItem('smwPhotoshootMode', promptMode);
        localStorage.setItem('smwPhotoshootCategory', selectedCategory);
        localStorage.setItem('smwPhotoshootPrompt', selectedPrompt);
        localStorage.setItem('smwPhotoshootCustomPrompt', customPrompt);
        localStorage.setItem('smwPhotoshootAspectRatio', selectedAspectRatio);
    }, [promptMode, selectedCategory, selectedPrompt, customPrompt, selectedAspectRatio]);
    
    const [cameraAngle, setCameraAngle] = useState<'4 ángulos' | 'ángulo fijo'>('4 ángulos');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [isMagicEditOpen, setIsMagicEditOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Expansion states for info sections
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);
    
    const personInputRef = useRef<HTMLInputElement>(null);
    const clothingInputRef = useRef<HTMLInputElement>(null);

    const iterationCount = 4; // Set back to 4 for tight 2x2 grid

    const initialSelfieRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.aiTwinSelfie && user.aiTwinSelfie !== initialSelfieRef.current) {
             const file = dataURLtoFile(user.aiTwinSelfie, "ai-twin.png");
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
            if (personImage?.preview && personImage.preview !== user?.aiTwinSelfie) URL.revokeObjectURL(personImage.preview);
            clothingItems.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, [clothingItems, personImage, user?.aiTwinSelfie]);

    const handlePersonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (personImage?.preview && personImage.preview !== user?.aiTwinSelfie) URL.revokeObjectURL(personImage.preview);
            setPersonImage({ file, preview: URL.createObjectURL(file) });
        }
    };

    const handleClothingItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newItems = Array.from(files).map((file: File) => ({ id: `${file.name}-${Date.now()}`, file, preview: URL.createObjectURL(file) }));
            setClothingItems(prev => [...prev, ...newItems].slice(0, 6));
        }
        if (e.target) e.target.value = '';
    };

    const removeClothingItem = (idToRemove: string) => {
        setClothingItems(prev => {
            const itemToRemove = prev.find(item => item.id === idToRemove);
            if (itemToRemove) URL.revokeObjectURL(itemToRemove.preview);
            return prev.filter(item => item.id !== idToRemove);
        });
    };

    const shufflePrompt = () => {
        const categoryData = fashionPrompts.find(p => p.category === selectedCategory);
        if (categoryData) {
            const random = categoryData.prompts[Math.floor(Math.random() * categoryData.prompts.length)];
            setSelectedPrompt(random);
        }
    };

    useEffect(() => { shufflePrompt(); }, [selectedCategory]);

    const handleMagicEdit = async () => {
        if (editingIndex === null || !personImage || !editInstruction) return;
        const imageToEdit = generatedImages[editingIndex];
        if (!imageToEdit) return;

        setIsEditing(true);
        setError(null);
        setLoadingMessage('Aplicando ediciones mágicas...');

        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            console.log("DEBUG: AIPhotoshoot handleMagicEdit started. API Key:", apiKey ? "Found" : "Missing");
            if (!apiKey) throw new Error("Clave API no encontrada. Por favor, comprueba tu configuración.");
            const ai = new GoogleGenAI({ apiKey });
            const personBase64 = await fileToBase64(personImage.file);
            const currentImageBase64 = imageToEdit.split(',')[1];

            const prompt = `**MISIÓN CRÍTICA: EDICIÓN MÁGICA**
Eres un experto editor de imágenes de IA. Tu tarea es modificar la "IMAGEN ACTUAL" basándote en la instrucción del usuario: "${editInstruction}".

BLOQUEO DE IDENTIDAD ESTRICTO:
La persona en la imagen editada DEBE ser una coincidencia 100% perfecta a nivel de píxel con la imagen de "FUENTE DE IDENTIDAD".
Mantén sus rasgos faciales exactos, cejas, nariz y estructura ósea.
NO cambies el modelo. NO embellezcas.

INSTRUCCIÓN:
Modifica la "IMAGEN ACTUAL" ÚNICAMENTE como se solicita: "${editInstruction}".
Ejemplo: Si el usuario dice "haz los pantalones más largos", solo extiende los pantalones. Mantén la pose, el fondo y la camisa idénticos a la "IMAGEN ACTUAL".

SALIDA:
Devuelve la imagen modificada.`;

            const parts: Part[] = [
                { text: "FUENTE DE IDENTIDAD (REFERENCIA FACIAL ESTRICTA):" },
                { inlineData: { mimeType: personImage.file.type, data: personBase64 } },
                { text: "IMAGEN ACTUAL (PARA SER EDITADA):" },
                { inlineData: { mimeType: 'image/png', data: currentImageBase64 } },
                { text: prompt }
            ];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    systemInstruction: "Eres un editor de imágenes de clase mundial y especialista en preservación de identidad. Tu prioridad absoluta es aplicar la edición solicitada asegurando que el rostro de la persona siga siendo una coincidencia 100% precisa con la fuente de identidad. No cambies la identidad de la persona. Solo cambia los elementos específicos solicitados en la instrucción de edición. Mantén el estilo y la iluminación de la imagen original.",
                    responseModalities: [Modality.IMAGE],
                    imageConfig: { aspectRatio: selectedAspectRatio as any }
                }
            });

            const candidate = response.candidates?.[0];
            if (candidate?.finishReason === 'SAFETY') {
                throw new Error("La edición mágica fue bloqueada por filtros de seguridad. Por favor, intenta una instrucción diferente.");
            }

            const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setGeneratedImages(prev => {
                    const next = [...prev];
                    next[editingIndex] = src;
                    return next;
                });
                addCreations([src]);
                setIsMagicEditOpen(false);
                setEditInstruction('');
                setEditingIndex(null);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                throw new Error("La IA no devolvió una imagen. Por favor, intenta una instrucción más clara.");
            }
        } catch (e: any) {
            setError(e.message || 'La edición mágica falló. Por favor, inténtalo de nuevo.');
        } finally {
            setIsEditing(false);
            setLoadingMessage('');
        }
    };

    const handleGenerate = async () => {
        if (!personImage) {
            setError('Por favor, sube una foto tuya en el Paso 1.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setLoadingMessage('Inicializando...');

        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            console.log("DEBUG: AIPhotoshoot handleGenerate started. API Key:", apiKey ? "Found" : "Missing");
            if (!apiKey) throw new Error("Clave API no encontrada. Por favor, comprueba tu configuración.");
            const ai = new GoogleGenAI({ apiKey });
            const personBase64 = await fileToBase64(personImage.file);
            const clothingItemParts: Part[] = [];
            for (const item of clothingItems) {
                const clothingBase64 = await fileToBase64(item.file);
                clothingItemParts.push({ inlineData: { mimeType: item.file.type, data: clothingBase64 } });
            }

            const mainPrompt = promptMode === 'Categorías' ? selectedPrompt : customPrompt;
            if (!mainPrompt && promptMode === 'Personalizado') {
                 setError('Por favor, introduce una descripción personalizada.');
                 setIsLoading(false);
                 return;
            }

            const angleDescriptions = [
                "Una pose de retrato frontal con confianza.",
                "Una pose en ángulo de tres cuartos, mirando ligeramente hacia otro lado de la cámara.",
                "Una pose espontánea dinámica y natural.",
                "Una toma de belleza de primer plano centrada en el rostro y la expresión."
            ];
            const sessionImages: string[] = [];

            for (let i = 0; i < iterationCount; i++) {
                setLoadingMessage(`Diseñando pose ${i + 1} de ${iterationCount}...`);
                const currentAngle = cameraAngle === '4 ángulos' ? angleDescriptions[i] : "Una pose natural y favorecedora adecuada para la escena.";
                const bodyTypeInstruction = bodyType !== 'Igual que la foto' ? `La persona debe ser representada con un tipo de cuerpo ${bodyType.toLowerCase()}.` : 'Mantén el tipo de cuerpo de la imagen de origen.';
                
                const prompt = `**MANDATORIO: BLOQUEO DE IDENTIDAD PERFECTO A NIVEL DE PÍXEL**
Estás creando una imagen de moda profesional para la persona específica que se muestra en la imagen de "FUENTE DE IDENTIDAD".
FUENTE DE IDENTIDAD: La primera imagen proporcionada.

REQUISITOS ESTRICTOS:
1. El rostro en la imagen generada debe ser una coincidencia EXACTA, 100% con la FUENTE DE IDENTIDAD.
2. Preserva perfectamente su forma específica de cejas arqueadas, estructura ocular, puente nasal y contorno de labios.
3. Mantén su tono de piel exacto y estructura ósea facial.
4. NO generes un rostro de modelo genérico. NO "embellezcas" ni suavices sus rasgos.
5. La persona en la salida debe ser inequívocamente la misma persona que en la fuente.
6. **IMPORTANTE:** Incluso si la solicitud del usuario a continuación pide cambios en la ropa o la escena, el ROSTRO y la IDENTIDAD de la persona de la imagen de origen DEBEN permanecer 100% idénticos.

ESCENA Y ESTILO: ${mainPrompt}
CUERPO: ${bodyTypeInstruction}
POSE: ${currentAngle}
ROPA: Debe llevar las prendas proporcionadas si están adjuntas.
FOTOGRAFÍA: Editorial de moda de alta gama, ultra realista, resolución 8k, iluminación cinematográfica.`;
                
                const parts: Part[] = [
                    { text: "FUENTE DE IDENTIDAD (DEBE COINCIDIR EL ROSTRO AL 100%):" }, 
                    { inlineData: { mimeType: personImage.file.type, data: personBase64 } }
                ];
                if (clothingItemParts.length > 0) {
                    parts.push({ text: "REFERENCIA DE ROPA:" });
                    parts.push(...clothingItemParts);
                }
                parts.push({ text: prompt });

                const response = await ai.models.generateContent({ 
                    model: 'gemini-2.5-flash-image', 
                    contents: { parts }, 
                    config: { 
                        systemInstruction: "Eres un especialista en preservación de identidad y fotógrafo de moda de clase mundial. Tu prioridad absoluta y no negociable es asegurar que el rostro del sujeto en la imagen generada sea una coincidencia 100% precisa y perfecta a nivel de píxel con la imagen de fuente de identidad proporcionada. Debes capturar cada detalle único de sus rasgos faciales—cejas, ojos, nariz, labios y estructura ósea—sin ninguna modificación. La identidad debe ser idéntica e inequívoca. No coincidir exactamente con el rostro es un fallo de la misión.",
                        responseModalities: [Modality.IMAGE],
                        imageConfig: { aspectRatio: selectedAspectRatio as any }
                    } 
                });

                const candidate = response.candidates?.[0];
                if (candidate?.finishReason === 'SAFETY') {
                    throw new Error("La generación fue bloqueada por filtros de seguridad. Por favor, intenta una descripción o atuendo diferente.");
                }

                const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    sessionImages.push(src);
                    setGeneratedImages(prev => [...prev, src]);
                } else {
                    throw new Error("La IA no devolvió una imagen. Esto podría deberse a un problema temporal del servicio.");
                }
                
                if (i < iterationCount - 1) {
                    for (let countdown = 12; countdown > 0; countdown--) {
                        setLoadingMessage(`Siguiente pose en ${countdown}s...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e: any) {
            console.error("Generation error:", e);
            const msg = e.message || "";
            if (msg.includes("SAFETY")) {
                setError("Generación bloqueada por filtros de seguridad. Por favor, intenta una descripción diferente.");
            } else if (msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
                setError(
                    <div className="flex flex-col gap-3">
                        <p className="font-bold">Cuota de IA Agotada</p>
                        <p className="text-xs opacity-90">Se ha alcanzado el límite de generación compartido. Puedes esperar un minuto para que se restablezca, o conectar tu propia clave API para obtener resultados ilimitados y más rápidos.</p>
                        <button 
                            onClick={() => (window as any).aistudio?.openSelectKey?.()}
                            className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm self-start"
                        >
                            Conecta Tu Propia Clave API
                        </button>
                    </div>
                );
            } else {
                setError(e.message || 'Servicio ocupado. Por favor, espera un momento.');
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    return (
        <div className="flex flex-col bg-smw-pink-light min-h-full p-4 md:p-8 space-y-6 overflow-y-auto text-smw-gray-dark">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">Moda IA</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    Pruébate virtualmente cualquier atuendo. Sube tu foto y ropa para crear tu look perfecto con calidad de estudio profesional.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col space-y-4">
                    <Step number={1} title="sube tu foto">
                         <div onClick={() => personInputRef.current?.click()} className="aspect-video bg-white rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-smw-pink transition-all p-4 group overflow-hidden">
                            {personImage ? (
                                <img src={personImage.preview} alt="Vista previa de la persona" className="h-full object-contain rounded-lg" />
                            ) : (
                                <div className="text-center opacity-30 group-hover:opacity-60 transition-opacity">
                                    <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    <p className="text-sm font-black uppercase tracking-widest">haz clic para subir retrato</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={handlePersonImageChange} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title="personaliza cuerpo y ropa">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-semibold text-gray-400 uppercase mb-2 block tracking-widest lowercase">tipo de cuerpo</label>
                                <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-smw-pink outline-none lowercase font-medium">
                                    <option value="Igual que la foto">Igual que la foto</option><option value="Delgado">Delgado</option><option value="Atlético">Atlético</option><option value="Curvilíneo">Curvilíneo</option><option value="Talla grande">Talla grande</option>
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase block tracking-widest lowercase">añadir ropa (opcional)</label>
                                    <button 
                                        onClick={() => {
                                            const flatlayFeature = features.find(f => f.id === 'flatlay-picture');
                                            if (flatlayFeature) setActiveFeature(flatlayFeature);
                                        }}
                                        className="text-[9px] font-black text-smw-pink uppercase tracking-widest hover:underline flex items-center gap-1"
                                    >
                                        <span>ir directamente a flat lay ai</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 shadow-sm">
                                    <div className="bg-red-600 text-white p-1 rounded-full flex-shrink-0 mt-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-red-700 uppercase tracking-tight leading-tight">advertencia: se requiere flat lay</p>
                                        <p className="text-[10px] text-red-600 font-bold leading-tight mt-0.5">debes tener una imagen de flat lay antes de subirla aquí. no se permiten caras ni cuerpos.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {clothingItems.map(item => <div key={item.id} className="relative aspect-square"><img src={item.preview} alt="Artículo" className="w-full h-full object-cover rounded-md" /><button onClick={() => removeClothingItem(item.id)} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">&times;</button></div>)}
                                    {clothingItems.length < 6 && <div onClick={() => clothingInputRef.current?.click()} className="aspect-square bg-white border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center cursor-pointer hover:border-smw-pink transition-colors"><span className="text-xs font-bold text-gray-400">añadir</span></div>}
                                </div>
                                <input type="file" ref={clothingInputRef} onChange={handleClothingItemsChange} className="hidden" accept="image/*" multiple />
                            </div>
                        </div>
                    </Step>

                    <Step number={3} title="descripción y ajustes">
                        <div className="space-y-4">
                            <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100">
                                {(['Categorías', 'Personalizado'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setPromptMode(mode)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all lowercase ${promptMode === mode ? 'bg-slate-700 text-white shadow-md' : 'text-gray-400'}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                            {promptMode === 'Categorías' ? (
                                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-semibold text-black focus:ring-2 focus:ring-smw-pink outline-none">
                                    {fashionPrompts.map(p => <option key={p.category} value={p.category}>{p.category}</option>)}
                                </select>
                            ) : (
                                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="describe la escena..." className="w-full h-24 bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-smw-pink outline-none resize-none lowercase" />
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 mb-2 block tracking-widest lowercase">relación de aspecto</label>
                                    <div className="flex flex-wrap gap-1">
                                        {aspectRatios.map(ar => (
                                            <button key={ar.value} onClick={() => setSelectedAspectRatio(ar.value)} className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all lowercase ${selectedAspectRatio === ar.value ? 'bg-slate-800 text-white' : 'bg-white text-gray-400 border-gray-100'}`}>{ar.label}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 mb-2 block tracking-widest lowercase">poses</label>
                                    <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100">
                                        {(['4 ángulos', 'ángulo fijo'] as const).map(mode => (
                                            <button key={mode} onClick={() => setCameraAngle(mode)} className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all lowercase ${cameraAngle === mode ? 'bg-smw-pink text-gray-900 shadow-sm' : 'text-gray-400'}`}>{mode}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Step>

                    <button onClick={handleGenerate} disabled={isLoading || !personImage} className="w-full bg-slate-800 text-white font-black py-5 rounded-xl shadow-lg hover:bg-slate-900 transition-all disabled:opacity-50 text-xl lowercase">
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner className="w-6 h-6 text-smw-pink" /><span>creando moda...</span></div> : 'generar fotos de moda'}
                    </button>
                    {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-black text-center animate-pulse lowercase">{error}</div>}
                </div>

                {/* Fixed Results Gallery (Compact 2x2 grid) */}
                <div className="bg-white shadow-xl p-8 rounded-[2.5rem] border border-white min-h-[500px] flex flex-col">
                    <h3 className="text-lg font-black text-center text-gray-300 uppercase tracking-widest mb-8 opacity-40">galería de resultados</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {isLoading && generatedImages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-6">
                                <Spinner className="w-12 h-12 text-smw-pink" />
                                <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">{loadingMessage}</p>
                            </div>
                        ) : generatedImages.length === 0 ? (
                            <div className="grid grid-cols-2 gap-6 h-full">
                                {[1, 2, 3, 4].map(n => <div key={n} className="bg-gray-50 rounded-[2rem] aspect-square flex items-center justify-center border-2 border-dashed border-gray-100 shadow-inner"><span className="text-7xl font-black text-gray-100 opacity-60">{n}</span></div>)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                {generatedImages.map((img, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-3xl overflow-hidden shadow-md border-4 border-white transition-all hover:shadow-xl">
                                        <img src={img} className="w-full h-full object-cover cursor-zoom-in" alt="Resultado" onClick={() => setZoomedImage(img)} />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => setZoomedImage(img)} className="bg-white/90 text-slate-800 p-1.5 sm:p-2.5 rounded-full shadow-md hover:scale-110 transition-transform" title="Ver en Pantalla Completa">
                                                <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingIndex(idx);
                                                    setIsMagicEditOpen(true);
                                                }} 
                                                className="bg-smw-pink text-gray-900 p-1.5 sm:p-2.5 rounded-full shadow-md hover:scale-110 transition-transform"
                                                title="Edición Mágica"
                                            >
                                                <svg className="h-4 w-4 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <a href={img} download className="bg-white/90 text-slate-800 p-1.5 sm:p-2.5 rounded-full shadow-md hover:scale-110 transition-transform" title="Descargar Imagen">
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

            {/* Bottom Content Blocks - Refined to match requested smaller style */}
            <div className="max-w-7xl mx-auto w-full pt-8 space-y-6 pb-20">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-widest lowercase">introducción</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-sm transition-all duration-700 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <p className="lowercase">bienvenido a **moda ai**, tu estudio personal de vestuario de lujo. olvida las molestias de los probadores físicos y las costosas sesiones de fotos de moda. con nuestro motor, puedes probarte virtualmente cualquier atuendo, desde streetwear hasta vestidos de gala, en cualquier entorno imaginable.</p>
                        <p className="lowercase">nuestra tecnología avanzada garantiza que tu identidad facial exacta se preserve mientras mapea sin problemas las prendas sobre tu figura. construye una marca de moda de alta gama, prueba looks de temporada o crea contenido impresionante para redes sociales con calidad de grado comercial.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-[10px] font-bold text-smw-pink uppercase tracking-[0.2em] border-b border-smw-pink pb-1 hover:text-black hover:border-black transition-all lowercase">{isIntroExpanded ? 'leer menos' : 'leer más'}</button>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-xl font-bold text-gray-900 mb-8 uppercase tracking-widest lowercase">cómo funciona</h2>
                    <div className={`text-gray-700 space-y-8 leading-relaxed text-sm transition-all duration-700 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-left">
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black">paso 1: sube tu identidad</span> - proporciona una foto clara de tu rostro. esto garantiza una coincidencia de identidad del 100% en cada toma de alta moda.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black">paso 2: ropa y cuerpo</span> - opcionalmente sube prendas específicas y selecciona tu tipo de cuerpo para guiar el ajuste de la ia.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black">paso 3: selecciona la escena</span> - elige de nuestra biblioteca de entornos de moda curados o describe tu visión única.</p>
                            </div>
                            <div className="space-y-1">
                                <p className="lowercase"><span className="font-semibold text-black">paso 4: genera el look</span> - elige tu relación de aspecto y haz clic en generar para recibir 4 variaciones de moda de calidad de estudio.</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/100 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-[10px] font-bold text-smw-pink uppercase tracking-[0.2em] border-b border-smw-pink pb-1 hover:text-black hover:border-black transition-all lowercase">{isHowItWorksExpanded ? 'leer menos' : 'leer más'}</button>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-xl font-bold text-gray-900 mb-8 uppercase tracking-widest lowercase">consejos de ventas y monetización</h2>
                    <div className={`text-gray-700 space-y-8 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            <div className="bg-gray-50/50 p-6 rounded-2xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-smw-pink uppercase tracking-[0.1em] lowercase">1. branding de "influencer de moda"</p>
                                <p className="lowercase">crea contenido de lookbook de alto compromiso para tus seguidores. los visuales profesionales construyen autoridad y atraen acuerdos de marca premium.</p>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-2xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-smw-pink uppercase tracking-[0.1em] lowercase">2. lookbooks de afiliados</p>
                                <p className="lowercase">pruébate virtualmente atuendos de tus minoristas favoritos y enlázalos a través de programas de afiliados. las fotos de alta calidad conducen a ventas significativamente mayores.</p>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-2xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-smw-pink uppercase tracking-[0.1em] lowercase">3. servicio de maquetas para boutiques</p>
                                <p className="lowercase">si eres dueño de una boutique, usa moda ai para mostrar cómo se ve tu ropa en personas reales sin contratar modelos para cada artículo nuevo.</p>
                            </div>
                            <div className="bg-gray-50/50 p-6 rounded-2xl space-y-2 border border-gray-100">
                                <p className="text-[10px] font-bold text-smw-pink uppercase tracking-[0.1em] lowercase">4. portafolios de estilismo personal</p>
                                <p className="lowercase">construye un portafolio digital mostrando tu rango de estilismo. las escenas de alta fidelidad hacen que tu trabajo se vea costoso y de clase mundial.</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-[10px] font-bold text-smw-pink uppercase tracking-[0.2em] border-b border-smw-pink pb-1 hover:text-black hover:border-black transition-all lowercase">{isSalesTipsExpanded ? 'leer menos' : 'leer más'}</button>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative overflow-hidden group">
                    <h2 className="text-xl font-bold text-gray-900 mb-8 uppercase tracking-widest lowercase">consejos profesionales</h2>
                    <div className={`text-gray-700 space-y-8 leading-relaxed text-sm transition-all duration-700 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[2000px]' : 'max-h-[100px]'}`}>
                        <div className="space-y-6 text-left max-w-4xl mx-auto">
                            <div className="flex gap-6 items-start">
                                <span className="text-3xl font-bold text-smw-pink leading-none">01</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">la iluminación lo es todo:</span> para obtener el resultado más creíble, sube una foto de origen con iluminación suave y natural. evita las sombras marcadas o los flashes fuertes.</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <span className="text-3xl font-bold text-smw-pink leading-none">02</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">coincide con la vibra:</span> haz que la expresión de tu foto de origen coincida con la escena. un look profesional funciona mejor para "chic de negocios", mientras que una sonrisa encaja perfectamente con "estilo de vida".</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <span className="text-3xl font-bold text-smw-pink leading-none">03</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">detalles personalizados:</span> en la descripción personalizada, describe texturas específicas como "seda", "cuero" o "denim" para ayudar a la ia a renderizar detalles de prendas de alta fidelidad.</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <span className="text-3xl font-bold text-smw-pink leading-none">04</span>
                                <div className="space-y-1">
                                    <p className="lowercase"><span className="font-semibold text-black">usa 4:5 para el feed:</span> al generar para instagram, selecciona la relación de aspecto de retrato 4:5. ocupa la mayor parte del espacio de la pantalla y se siente más premium en la plataforma.</p>
                                </div>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-[10px] font-bold text-smw-pink uppercase tracking-[0.2em] border-b border-smw-pink pb-1 hover:text-black hover:border-black transition-all lowercase">{isProTipsExpanded ? 'leer menos' : 'leer más'}</button>
                </div>
            </div>

            {/* Magic Edit Modal */}
            {isMagicEditOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[4000] p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">✨ edición mágica</h3>
                                <button onClick={() => setIsMagicEditOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            <div className="aspect-square w-48 mx-auto rounded-2xl overflow-hidden border-4 border-gray-50 shadow-inner">
                                {editingIndex !== null && generatedImages[editingIndex] && <img src={generatedImages[editingIndex]} alt="Para editar" className="w-full h-full object-cover" />}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">¿qué te gustaría cambiar?</label>
                                <textarea 
                                    value={editInstruction}
                                    onChange={(e) => setEditInstruction(e.target.value)}
                                    placeholder="ej: haz sus pantalones más largos, cambia el color de la camisa a verde esmeralda..."
                                    className="w-full h-32 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-smw-pink outline-none resize-none lowercase font-medium"
                                />
                            </div>

                            <button 
                                onClick={handleMagicEdit}
                                disabled={isEditing || !editInstruction}
                                className="w-full bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg hover:bg-slate-900 transition-all disabled:opacity-50 text-lg lowercase flex items-center justify-center gap-2"
                            >
                                {isEditing ? <><Spinner className="w-5 h-5 text-smw-pink" /><span>aplicando magia...</span></> : 'aplicar edición mágica'}
                            </button>
                            
                            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">la identidad de origen se preservará estrictamente</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-[5000] flex items-center gap-3 animate-bounce">
                    <span className="text-smw-pink text-xl">✨</span>
                    <span className="text-sm font-bold uppercase tracking-widest">¡magia aplicada con éxito!</span>
                </div>
            )}

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex flex-col z-[3000] animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="w-full flex justify-end p-6"><button onClick={() => setZoomedImage(null)} className="text-white bg-white/10 hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center text-3xl font-light border border-white/10 backdrop-blur-md transition-all">&times;</button></div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={e => e.stopPropagation()}><img src={zoomedImage} alt="Ampliado" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-4 border-white/10" /></div>
                </div>
            )}
        </div>
    );
};

export default AIPhotoshoot;