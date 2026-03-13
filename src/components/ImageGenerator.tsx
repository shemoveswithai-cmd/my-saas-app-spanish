
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Spinner } from './common/Spinner';
import { fileToBase64 } from '../utils';

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

interface ImageGeneratorProps {
    addCreations: (images: string[]) => void;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ addCreations }) => {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

    // Load form state from localStorage
    useEffect(() => {
        const savedPrompt = localStorage.getItem('smwImageGenPrompt');
        const savedNegativePrompt = localStorage.getItem('smwImageGenNegativePrompt');
        const savedAspectRatio = localStorage.getItem('smwImageGenAspectRatio');
        
        if (savedPrompt) setPrompt(savedPrompt);
        if (savedNegativePrompt) setNegativePrompt(savedNegativePrompt);
        if (savedAspectRatio) setAspectRatio(savedAspectRatio as AspectRatio);
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        localStorage.setItem('smwImageGenPrompt', prompt);
        localStorage.setItem('smwImageGenNegativePrompt', negativePrompt);
        localStorage.setItem('smwImageGenAspectRatio', aspectRatio);
    }, [prompt, negativePrompt, aspectRatio]);
    
    const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
    const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
    const referenceImageInputRef = useRef<HTMLInputElement>(null);

    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Information box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);
    
    useEffect(() => {
        if (!referenceImageFile) {
            setReferenceImagePreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(referenceImageFile);
        setReferenceImagePreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [referenceImageFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReferenceImageFile(file);
        }
    };

    const removeReferenceImage = () => {
        setReferenceImageFile(null);
        if(referenceImageInputRef.current) {
            referenceImageInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Por favor, ingresa un prompt.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const parts: any[] = [];
            let finalPromptText = prompt;

            if (referenceImageFile) {
                const base64Data = await fileToBase64(referenceImageFile);
                parts.push({ 
                    inlineData: { 
                        mimeType: referenceImageFile.type, 
                        data: base64Data 
                    } 
                });
                
                const aspectRatioDescriptions: Record<AspectRatio, string> = {
                    "1:1": "square (1:1)",
                    "16:9": "wide cinematic landscape (16:9)",
                    "9:16": "tall vertical portrait (9:16)",
                    "4:3": "standard landscape (4:3)",
                    "3:4": "standard portrait (3:4)",
                };
                
                const arDescription = aspectRatioDescriptions[aspectRatio] || "square (1:1)";

                finalPromptText = `
**CRITICAL MISSION: Re-create the person from the reference image with 100% accuracy in a new scene.** This is a likeness test, not an artistic interpretation.

**NON-NEGOTIABLE LIKENESS RULES:**
- **FACE:** The face in the output MUST be an IDENTICAL MATCH to the reference. Replicate every feature: eyes, nose, mouth, skin tone, and face shape. No variations.
- **HAIR:** The hair in the output MUST be an IDENTICAL MATCH to the reference. Replicate color, style, and texture. No variations.
- **IDENTITY:** The generated person is NOT a 'similar-looking person'. It is the SAME PERSON. Failure to replicate the person exactly is a failure of the entire task.

**SCENE DETAILS:**
- **SCENE:** ${prompt}
- **STYLE:** Ultra-realistic, high-resolution photograph.
- **ASPECT RATIO:** The output image MUST be in **${arDescription}** aspect ratio.

**FINAL CHECK:** Does the person in your generated image look exactly like the person in the reference image? If not, start over.`;
            } else {
                // Pure text-to-image path
                finalPromptText = `A high-quality, professional, photorealistic image. 
Subject: ${prompt}
Style: High resolution, detailed textures, professional lighting.`;
            }

            if (negativePrompt.trim()) {
                finalPromptText += `\n\n**NEGATIVE PROMPT (DO NOT INCLUDE):** ${negativePrompt}`;
            }

            parts.push({ text: finalPromptText });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                    imageConfig: {
                        aspectRatio: aspectRatio,
                    }
                },
            });

            let foundImage = false;
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const newImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    setGeneratedImage(newImage);
                    addCreations([newImage]);
                    foundImage = true;
                    break;
                }
            }

            if (!foundImage) {
                // Check if there's a text response explaining why it failed (e.g. safety filters)
                const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
                if (textPart) {
                    setError(`Generación bloqueada o fallida: ${textPart.text}`);
                } else {
                    setError('La generación de imágenes falló. El modelo no devolvió una imagen.');
                }
            }
        } catch (e) {
            console.error("Image Generation Error:", e);
            let errorMessage = 'Ocurrió un error desconocido.';
        
            if (e instanceof Error) {
                errorMessage = e.message;
            } else if (e && typeof e === 'object' && 'message' in e) {
                errorMessage = String((e as { message: unknown }).message);
            } else if (e) {
                try {
                    errorMessage = JSON.stringify(e);
                } catch {
                    errorMessage = String(e);
                }
            }
        
            setError(`Error al generar la imagen. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-smw-pink-light rounded-lg shadow-xl p-4 md:p-6 space-y-4 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">Generación de Imágenes de Calidad de Estudio</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    Impulsado por Imagen 4.0, nuestro modelo más avanzado para convertir texto en imágenes impresionantes y fotorrealistas con calidad de estudio profesional.
                </p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg flex flex-col md:flex-row gap-4 flex-shrink-0">
                <div className="flex-1 flex flex-col gap-2">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="ej., Un retrato fotorrealista de un astronauta, o un lindo dragón de dibujos animados."
                        className="w-full bg-white/50 border-2 border-smw-pink/50 rounded-lg p-3 focus:ring-2 focus:ring-smw-pink focus:outline-none resize-none h-24 text-smw-gray-dark placeholder:text-smw-gray-dark/70"
                        disabled={isLoading}
                    />
                     <input
                        type="text"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="Prompt Negativo (opcional), ej., texto, borroso, marca de agua"
                        className="w-full bg-white/50 border-2 border-smw-pink/30 rounded-lg p-2 focus:ring-2 focus:ring-smw-pink focus:outline-none text-smw-gray-dark placeholder:text-smw-gray-dark/60 text-sm"
                        disabled={isLoading}
                    />
                </div>
                <div className="flex flex-col gap-4 w-full md:w-48">
                    <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                        className="w-full bg-white/50 border-2 border-smw-pink/50 rounded-lg p-3 focus:ring-2 focus:ring-smw-pink focus:outline-none text-smw-gray-dark disabled:bg-white/30 disabled:text-smw-gray-dark/70 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        <option value="1:1">Cuadrado (1:1)</option>
                        <option value="16:9">Paisaje (16:9)</option>
                        <option value="9:16">Retrato (9:16)</option>
                        <option value="4:3">Estándar (4:3)</option>
                        <option value="3:4">Alto (3:4)</option>
                    </select>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full bg-smw-pink text-smw-gray-dark font-bold py-3 px-4 rounded-lg flex items-center justify-center hover:bg-white disabled:bg-smw-pink/50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : 'Generar Imagen'}
                    </button>
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg flex-shrink-0">
                <label className="block text-sm font-medium text-smw-gray-dark mb-1">Parecido (Opcional)</label>
                <p className="text-sm text-smw-gray-dark opacity-90 mb-2">Para crear imágenes de una persona específica, sube una foto de referencia.</p>
                {referenceImagePreview ? (
                    <div className="relative w-24 h-24">
                        <img src={referenceImagePreview} alt="Referencia" className="w-full h-full object-cover rounded-md border border-smw-pink/20" />
                        <button 
                            onClick={removeReferenceImage} 
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-md"
                            aria-label="Eliminar imagen de referencia"
                        >
                            &times;
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => referenceImageInputRef.current?.click()} 
                        disabled={isLoading}
                        className="w-full md:w-1/2 bg-white/50 border-2 border-smw-pink/50 rounded-lg p-2 focus:ring-2 focus:ring-smw-pink focus:outline-none text-smw-gray-dark hover:bg-white/80 transition-all"
                    >
                        Subir Imagen de Referencia
                    </button>
                )}
                <input type="file" ref={referenceImageInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {error && <div className="p-4 bg-red-900 text-smw-text rounded-md flex-shrink-0">{error}</div>}

            <div className="flex-1 flex items-center justify-center bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 min-h-[400px]">
                {isLoading ? (
                    <div className="text-center">
                        <Spinner className="w-12 h-12 text-smw-gray-dark" />
                        <p className="mt-4 text-smw-gray-dark opacity-80 font-bold animate-pulse">Generando tu obra maestra...</p>
                    </div>
                ) : generatedImage ? (
                    <div className="relative group max-h-full">
                        <img src={generatedImage} alt="Generada" className="block max-h-full max-w-full object-contain rounded-lg shadow-lg" />
                        <a
                            href={generatedImage}
                            download="smw-ai-generated-image.jpeg"
                            title="Descargar Imagen"
                            className="absolute bottom-4 right-4 bg-smw-gray-dark bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full transition-all duration-300 shadow-xl backdrop-blur-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </a>
                    </div>
                ) : (
                    <p className="text-smw-gray-dark opacity-80 italic">Tu imagen generada aparecerá aquí.</p>
                )}
            </div>

            {/* Information Sections */}
            <div className="space-y-6 pt-10 border-t border-smw-pink/20 flex-shrink-0">
                {/* Introduction Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Introducción</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p>Bienvenido al Generador de Imágenes de Calidad de Estudio, impulsado por el modelo de vanguardia **Imagen 4.0** de Google. Esta herramienta te permite transformar tus pensamientos más imaginativos en obras de arte de alta resolución y grado profesional. A diferencia de los generadores estándar, Imagen 4.0 destaca en la representación de texturas fotorrealistas, iluminación compleja y detalles precisos.</p>
                        <p>Ya sea que estés creando arte conceptual para un proyecto, visuales de alta gama para redes sociales o activos de marketing profesional, nuestra interfaz te brinda los controles de precisión necesarios para dar vida a tu visión sin necesidad de formación artística previa.</p>
                        <p>Con funciones como el prompt negativo para la reducción de ruido y el mapeo de parecido para la preservación de la identidad personal, tienes un estudio creativo de servicio completo a tu alcance.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isIntroExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                {/* How It Works Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Cómo Funciona</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p><strong>Paso 1: Escribe tu Prompt</strong> - Describe lo que quieres ver en el cuadro de texto principal. Sé lo más específico posible con respecto al sujeto, el entorno y el estado de ánimo (ej., "Una ciudad ciberpunk futurista de noche en Tokio, iluminación cinematográfica, ultra detallado").</p>
                        <p><strong>Paso 2: Establece tu Prompt Negativo</strong> - Usa el segundo cuadro de texto para decirle a la IA lo que **no** quieres. Esto es genial para evitar "borroso", "texto", "marcas de agua" o "rasgos deformados".</p>
                        <p><strong>Paso 3: Selecciona la Relación de Aspecto</strong> - Elige las dimensiones que se ajusten a tu destino. **9:16** es perfecto para Reels/TikTok, **4:5** es ideal para publicaciones de Instagram y **16:9** es mejor para pantallas cinematográficas anchas.</p>
                        <p><strong>Paso 4: Añade Parecido (Opcional)</strong> - Si quieres que la persona generada se parezca a ti o a un individuo específico, sube una foto de referencia de alta calidad. Nuestro modelo de parecido especializado mapeará esos rasgos en la nueva escena.</p>
                        <p><strong>Paso 5: Generar y Descargar</strong> - Haz clic en "Generar Imagen". La IA renderizará tu obra maestra en segundos. Una vez terminada, haz clic en el icono de descarga para guardarla en alta resolución.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                {/* Sales Tips & Monetization Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Consejos de Venta y Monetización</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p><strong>1. Impresión bajo demanda (POD):</strong> Genera patrones únicos de alta gama o arte de personajes y súbelos a sitios como Printful o Redbubble para vender camisetas, pósters y fundas de teléfono personalizadas.</p>
                        <p><strong>2. Servicios de diseño freelance:</strong> Ofrece servicios de "Dirección Creativa de IA" en plataformas como Fiverr o Upwork. Puedes proporcionar banners de redes sociales de grado profesional, encabezados de blogs y portadas de libros a una fracción del costo tradicional.</p>
                        <p><strong>3. Alternativas a fotos de stock:</strong> En lugar de pagar por fotografía de stock genérica, genera imágenes personalizadas y acordes con la marca para tus sitios web o los de tus clientes y materiales de marketing.</p>
                        <p><strong>4. Paquetes de arte digital:</strong> Crea paquetes de arte temáticos (ej., "20 Paisajes Ciberpunk" o "10 Retratos de Moda Boho") y véndelos como activos digitales para otros creadores en Gumroad o Etsy.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isSalesTipsExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                {/* Pro Tips Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Consejos Pro</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p><strong>• Las palabras clave de iluminación son mágicas:</strong> En lugar de solo decir "una habitación", intenta con "una habitación bañada por la cálida luz del sol de la hora dorada" o "una oficina melancólica con iluminación de neón azul volumétrica".</p>
                        <p><strong>• La textura importa:</strong> Incluye texturas descriptivas como "cuero desgastado", "aluminio cepillado", "seda suave" o "hormigón rugoso" para ayudar al modelo a renderizar materiales realistas.</p>
                        <p><strong>• Ajustes de cámara:</strong> Puedes simular estilos de fotografía añadiendo términos como "disparado en película de 35mm", "profundidad de campo f/1.8", "lente gran angular" o "macrofotografía".</p>
                        <p><strong>• Preservación de la identidad:</strong> Para obtener los mejores resultados con el mapeo de parecido, usa una foto de referencia con iluminación neutra y una vista clara y frontal de la cara.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isProTipsExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-10 flex-shrink-0" /> {/* Final padding for scroll */}
        </div>
    );
};

export default ImageGenerator;
