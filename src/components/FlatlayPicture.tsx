import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface FlatlayPictureProps {
    addCreations: (images: string[]) => void;
}

const Step: React.FC<{ number: number | string, title: string, children: React.ReactNode, isCompleted?: boolean }> = ({ number, title, children, isCompleted }) => (
    <div className={`bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg transition-opacity ${isCompleted ? 'opacity-50' : 'opacity-100'}`}>
        <h3 className="text-md font-bold text-smw-gray-dark mb-3">Paso {number}: {title}</h3>
        {children}
    </div>
);

const backgroundOptions = [
    { name: 'Blanco', type: 'color', value: '#FFFFFF', prompt: 'a plain, solid white color' },
    { name: 'Negro', type: 'color', value: '#000000', prompt: 'a plain, solid black color' },
    { name: 'Gris', type: 'color', value: '#E0E0E0', prompt: 'a plain, solid light gray color' },
    { name: 'Cielo Nublado', type: 'image', preview: 'linear-gradient(to top, #bdc3c7, #2c3e50)', prompt: 'a dramatic, cloudy sky at dusk' },
    { name: 'Hormigón', type: 'image', preview: '#9E9E9E', prompt: 'a smooth, modern concrete surface' },
    { name: 'Fuegos Artificiales', type: 'image', preview: 'radial-gradient(circle at 70% 30%, #ffdd00, transparent 20%), radial-gradient(circle at 30% 80%, #ff6b6b, transparent 20%), #0c0a1a', prompt: 'a dark night sky with blurred, colorful firework bursts' },
    { name: 'Bosque', type: 'image', preview: 'radial-gradient(ellipse at center, #3a5a40 0%, #1e3a24 100%)', prompt: 'a rich, dark forest floor with moss and leaves' },
    { name: 'Mármol', type: 'image', preview: 'linear-gradient(45deg, #fff 80%, #ccc 82%, #fff 84%, #fff 90%, #eee 92%, #fff 94%)', prompt: 'a clean, white marble countertop with subtle gray veining' },
    { name: 'Cielo Nocturno', type: 'image', preview: 'radial-gradient(ellipse at center, #2c3e50 0%, #000000 100%)', prompt: 'a clear night sky full of stars' },
    { name: 'Playa al Atardecer', type: 'image', preview: 'linear-gradient(to top, #34495e, #f1c40f)', prompt: 'a sandy beach at twilight with a dark, colorful sunset sky' },
    { name: 'Invierno', type: 'image', preview: 'radial-gradient(ellipse at center, #e0e6f0 0%, #aab5c9 100%)', prompt: 'a soft, out-of-focus snowy landscape at dusk' },
    { name: 'Madera', type: 'image', preview: '#8B4513 repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)', prompt: 'a rustic, dark wooden tabletop' },
];

interface ProductItem {
    id: string;
    file: File;
    preview: string;
}

const BackgroundSelector: React.FC<{
    selectedBackground: typeof backgroundOptions[0];
    onSelect: (option: typeof backgroundOptions[0]) => void;
    disabled?: boolean;
}> = ({ selectedBackground, onSelect, disabled }) => (
    <div className={`flex flex-wrap gap-x-4 gap-y-2 ${disabled ? 'opacity-50' : ''}`}>
        {backgroundOptions.map(option => (
            <div key={option.name} className="flex flex-col items-center gap-1">
                <button
                    onClick={() => onSelect(option)}
                    disabled={disabled}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${selectedBackground.name === option.name ? 'border-smw-pink ring-2 ring-smw-pink ring-offset-2 ring-offset-white' : 'border-white/50'}`}
                    style={{ background: option.preview || option.value }}
                />
                <p className="text-[10px] text-smw-gray-dark opacity-80 uppercase font-bold">{option.name}</p>
            </div>
        ))}
    </div>
);

const FlatlayPicture: React.FC<FlatlayPictureProps> = ({ addCreations }) => {
    const [productItems, setProductItems] = useState<ProductItem[]>([]);
    const [selectedBackground, setSelectedBackground] = useState(backgroundOptions[0]);

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwFlatlayFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedBackground) {
                    const bg = backgroundOptions.find(o => o.name === parsed.selectedBackground);
                    if (bg) setSelectedBackground(bg);
                }
            } catch (e) {
                console.error("Failed to load flatlay form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedBackground: selectedBackground.name
        };
        localStorage.setItem('smwFlatlayFormState', JSON.stringify(formState));
    }, [selectedBackground]);
    
    const [canvasImage, setCanvasImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Magic Edit State
    const [isMagicEditOpen, setIsMagicEditOpen] = useState(false);
    const [editInstruction, setEditInstruction] = useState('');
    const [swapItemFile, setSwapItemFile] = useState<File | null>(null);
    const [swapItemPreview, setSwapItemPreview] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Info box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);
    const [isProTipExpanded, setIsProTipExpanded] = useState(false);

    const productInputRef = useRef<HTMLInputElement>(null);
    const swapItemInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        return () => {
            productItems.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, []);

    const handleGenerateInitialFlatlay = async () => {
        console.log("DEBUG: handleGenerateInitialFlatlay started");
        if (productItems.length === 0) {
            console.log("DEBUG: No items uploaded");
            return setError('Sube al menos un artículo.');
        }
        setIsLoading(true);
        setLoadingMessage('Creando flatlay...');
        setError(null);
        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            console.log("DEBUG: Using API Key:", apiKey ? "Found" : "Missing");
            if (!apiKey) throw new Error("Clave API no encontrada. Por favor, asegúrate de que tu clave API de Gemini esté configurada en el entorno.");
            
            const ai = new GoogleGenAI({ apiKey });
            const parts: Part[] = [];
            
            console.log(`DEBUG: Processing ${productItems.length} items`);
            for (const item of productItems) {
                const base64 = await fileToBase64(item.file);
                parts.push({ inlineData: { mimeType: item.file.type, data: base64 } });
            }
            
            const promptText = `Create a professional product flat lay. Background: ${selectedBackground.prompt}. Style: Clean, top-down, high resolution. Arrange the items aesthetically. Seed: ${Math.random()}`;
            parts.push({ text: promptText });
            console.log("DEBUG: Sending request to gemini-2.5-flash-image");

            const res = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            console.log("DEBUG: Response received", res);
            const img = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (img) {
                console.log("DEBUG: Image data found in response");
                const src = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
                setCanvasImage(src);
                addCreations([src]);
            } else {
                console.log("DEBUG: No image data in response candidates");
                throw new Error("La IA no devolvió una imagen. Por favor, intenta con un fondo o artículos diferentes.");
            }
        } catch (e) { 
            console.error("DEBUG: Generation error", e);
            const rawError = String(e);
            if (rawError.includes("429") || rawError.includes("quota") || rawError.includes("RESOURCE_EXHAUSTED")) {
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
                setError(e instanceof Error ? e.message : 'Error al generar. Por favor, inténtalo de nuevo.'); 
            }
        }
        finally { 
            console.log("DEBUG: handleGenerateInitialFlatlay finished");
            setIsLoading(false); 
        }
    };

    const handleMagicEdit = async () => {
        console.log("DEBUG: handleMagicEdit started");
        if (!canvasImage || !editInstruction) return;
        setIsEditing(true);
        setError(null);
        try {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            if (!apiKey) throw new Error("Clave API no encontrada. Por favor, asegúrate de que tu clave API de Gemini esté configurada en el entorno.");
            const ai = new GoogleGenAI({ apiKey });
            
            console.log("DEBUG: Preparing magic edit request");
            // Convert current canvas image to file
            const response = await fetch(canvasImage);
            const blob = await response.blob();
            const base64 = await fileToBase64(new File([blob], 'current-flatlay.png', { type: blob.type }));

            const parts: Part[] = [
                { inlineData: { mimeType: blob.type, data: base64 } }
            ];

            let prompt = `You are an expert image editor. I am providing a product flat lay image. 
            Instruction: ${editInstruction}. 
            Maintain the exact same background, lighting, and all other items in the image. 
            Only perform the requested change. 
            If the instruction is to remove something, remove it cleanly and fill the space with the background texture.`;

            if (swapItemFile) {
                console.log("DEBUG: Including swap item in request");
                const swapBase64 = await fileToBase64(swapItemFile);
                parts.push({ inlineData: { mimeType: swapItemFile.type, data: swapBase64 } });
                prompt += `\nI am also providing a new item image. Incorporate this new item into the flat lay aesthetically, matching the lighting, shadows, and style of the scene. Place it naturally within the composition.`;
            }

            parts.push({ text: prompt });
            console.log("DEBUG: Sending magic edit request to gemini-2.5-flash-image");

            const res = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });

            console.log("DEBUG: Magic edit response received", res);
            const imgPart = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imgPart?.inlineData) {
                console.log("DEBUG: Magic edit image data found");
                const newImage = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
                setCanvasImage(newImage);
                addCreations([newImage]);
                setIsMagicEditOpen(false);
                setEditInstruction('');
                setSwapItemFile(null);
                setSwapItemPreview(null);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                console.log("DEBUG: No image data in magic edit response");
                throw new Error("La edición mágica falló al producir una imagen.");
            }
        } catch (e) {
            console.error("DEBUG: Magic edit error", e);
            const rawError = String(e);
            if (rawError.includes("429") || rawError.includes("quota") || rawError.includes("RESOURCE_EXHAUSTED")) {
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
                setError(e instanceof Error ? e.message : 'La edición mágica falló. Por favor, inténtalo de nuevo.');
            }
        } finally {
            console.log("DEBUG: handleMagicEdit finished");
            setIsEditing(false);
        }
    };

    return (
        <div className="flex flex-col bg-smw-pink-light rounded-lg shadow-xl p-4 md:p-6 space-y-4 h-full overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">Flatlay IA</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    Crea composiciones flatlay profesionales para tus productos. Sube tus artículos y los organizaremos en una escena elegante y de alta gama.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {!canvasImage ? (
                        <>
                            <Step number={1} title="Subir Artículos">
                                <p className="text-sm text-smw-gray-dark opacity-80 mb-3">Sube de 1 a 6 fotos de alta calidad de ropa, accesorios o productos. Los organizaremos en una composición flatlay elegante.</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {productItems.map(item => (
                                        <div key={item.id} className="relative aspect-square">
                                            <img src={item.preview} className="w-full h-full object-cover rounded-md border border-smw-pink/20" />
                                            <button onClick={() => setProductItems(p => p.filter(x => x.id !== item.id))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow-md">&times;</button>
                                        </div>
                                    ))}
                                    {productItems.length < 6 && (
                                        <div 
                                            onClick={() => productInputRef.current?.click()} 
                                            className="aspect-square bg-white/50 rounded-lg flex items-center justify-center border-2 border-dashed border-smw-pink/50 cursor-pointer text-smw-gray-dark hover:bg-white transition-colors"
                                        >
                                            <span className="text-2xl font-light">+</span>
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    ref={productInputRef} 
                                    onChange={e => e.target.files && setProductItems(prev => [...prev, ...Array.from(e.target.files!).map((f: File) => ({id: `${f.name}-${Date.now()}`, file: f, preview: URL.createObjectURL(f)}))])} 
                                    className="hidden" 
                                    multiple 
                                    accept="image/*" 
                                />
                            </Step>
                            <Step number={2} title="Elegir Fondo">
                                <p className="text-sm text-smw-gray-dark opacity-80 mb-3">Selecciona la superficie sobre la que se colocarán tus artículos. El mármol y la madera son ideales para vibras de alta gama.</p>
                                <BackgroundSelector selectedBackground={selectedBackground} onSelect={setSelectedBackground} disabled={isLoading} />
                            </Step>
                            <button onClick={handleGenerateInitialFlatlay} disabled={isLoading || productItems.length === 0} className="w-full bg-smw-pink text-smw-gray-dark font-bold py-3 rounded-lg hover:bg-white disabled:bg-smw-pink/50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Spinner className="w-5 h-5 text-smw-gray-dark" />
                                        <span>Generando...</span>
                                    </>
                                ) : 'Crear Flatlay'}
                            </button>
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 shadow-sm animate-fade-in">
                                    <p className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {error}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <Step number="✓" title="Creación Lista" isCompleted>
                                <p className="text-sm text-smw-gray-dark">Tu flatlay profesional ha sido generado. Usa el botón de descarga en la imagen para guardarlo para tus materiales de marketing.</p>
                            </Step>
                            <button onClick={() => {setCanvasImage(null); setProductItems([]);}} className="w-full bg-white/60 border border-smw-pink text-smw-gray-dark font-bold py-3 rounded-lg hover:bg-white transition-all shadow-sm">Crear Otro</button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col bg-white/60 backdrop-blur-sm shadow-md rounded-lg min-h-[400px]">
                    <h3 className="text-lg font-bold text-center text-smw-gray-dark p-4 border-b border-smw-pink/20">Vista Previa del Resultado</h3>
                    <div className="w-full flex-1 flex items-center justify-center relative p-4">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10">
                                <p className="text-[10px] text-smw-gray-dark font-black uppercase tracking-widest animate-pulse text-center px-6">Tu flat lay se está generando</p>
                            </div>
                        )}
                        {canvasImage ? (
                            <div className="relative group w-full h-full flex items-center justify-center">
                                <img src={canvasImage} alt="Resultado de Flatlay" className="max-h-full max-w-full object-contain rounded-md shadow-lg cursor-zoom-in" onClick={() => setZoomedImage(canvasImage)} />
                                <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-3 opacity-100 transition-opacity">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => setZoomedImage(canvasImage)} className="bg-black/60 text-white p-2.5 rounded-full hover:bg-black/80 transition-colors shadow-lg border border-white/20" title="Ver en Pantalla Completa">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                        </button>
                                        <button onClick={() => setIsMagicEditOpen(true)} className="bg-smw-pink text-smw-gray-dark p-2.5 rounded-full hover:bg-white transition-colors shadow-lg border border-white/20" title="Edición Mágica">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <a href={canvasImage} download="foto-flatlay-ai.png" className="bg-white text-smw-gray-dark p-2.5 rounded-full hover:bg-gray-100 transition-colors shadow-lg border border-white/20" onClick={e => e.stopPropagation()} title="Descargar Imagen">
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </a>
                                    </div>
                                    {showSuccess && (
                                        <div className="bg-smw-gray-dark text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce border border-white/10">
                                            <span className="text-smw-pink text-sm">✨</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Magia Aplicada con Éxito.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : !isLoading && (
                            <div className="text-center space-y-2 opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-smw-gray-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L16 8M4 16l4.586-4.586a2 2 0 012.828L16 16m-2-2l1.586 1.586a2 2 0 010 2.828L12 20M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-2-2m0 0l-2 2m2-2v12" /></svg>
                                <p className="text-smw-gray-dark font-medium">El resultado aparecerá aquí</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Restored Information Sections */}
            <div className="space-y-6 mt-8">
                {/* Introduction Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Introducción</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>La función Flatlay IA te permite organizar múltiples artículos en una toma flatlay limpia y organizada que parece un tablero de moda profesional. Esta herramienta es perfecta para ropa, zapatos, accesorios, pelucas, productos de belleza o cualquier cosa que quieras mostrar. Todo lo que necesitas hacer es subir hasta seis artículos, elegir tu fondo y el sistema generará un flatlay pulido que parece hecho en un estudio. Esto es ideal para creadores, dueños de boutiques, influencers, estilistas o cualquier persona que quiera construir hermosos diseños de productos sin necesidad de equipo de fotografía o habilidades de edición.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isIntroExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* How It Works Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Cómo Funciona</h2>
                    <div className={`text-smw-gray-dark space-y-8 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[2000px] overflow-y-auto' : 'max-h-[250px]'}`}>
                        <section>
                            <h3 className="font-bold text-base mb-2">Paso 1 – Sube Imágenes de Productos (hasta 6)</h3>
                            <p className="mb-2">Toca el cuadro de carga y selecciona cada producto que quieras incluir en tu flatlay. Asegúrate de que cada imagen se centre solo en el artículo en sí. Si es una camisa, sube solo la camisa. Si es cabello, sube solo el cabello. Si son zapatos, sube solo los zapatos. Evita subir modelos de cuerpo completo aquí, porque el sistema intentará generar el look completo exactamente como se muestra. Mantener cada artículo por separado te da un flatlay más limpio y preciso y te permite construir un tablero de atuendo completo desde cero.</p>
                        </section>
                        
                        <section>
                            <h3 className="font-bold text-base mb-2">Paso 2 – Personaliza tu Flatlay</h3>
                            <p className="mb-2">Elige tu estilo de fondo favorito. Tienes múltiples opciones como mármol, madera, blanco, hormigón, invierno, cielo nublado, cielo nocturno y más. Selecciona el fondo que mejor se adapte a la estética de tu marca o al look que intentas crear.</p>
                            <p className="mb-2">Si quieres crear un estilo visual específico o añadir un toque creativo, puedes usar el Prompt de Estilo. Este campo es opcional y te permite describir cómo quieres que se organice el flatlay. Por ejemplo, puedes escribir cosas como:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>“Diseño minimalista con espaciado ordenado,”</li>
                                <li>“Sombras suaves, look de tablero de moda limpio,”</li>
                                <li>“Organizado estéticamente como un collage de Pinterest.”</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="font-bold text-base mb-2">Paso 3 – Genera tu Flatlay</h3>
                            <p>Toca “Crear Flatlay” y espera un momento mientras la plataforma diseña tu tablero. Tu flatlay completado aparecerá en la sección de lienzo a continuación. Una vez que veas el resultado, puedes guardarlo, descargarlo o seguir ajustándolo.</p>
                        </section>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* Sales and Marketing Strategy Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Estrategia de Ventas y Marketing</h2>
                    <div className={`text-smw-gray-dark space-y-4 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isMarketingExpanded ? 'max-h-[2000px] overflow-y-auto' : 'max-h-[250px]'}`}>
                        <p>Tus flatlays no son solo para fines estéticos; son herramientas poderosas que pueden ayudarte a construir tu marca, aumentar el compromiso y ganar dinero en línea. Después de generar tu flatlay, piénsalo como un tablero de atuendo digital que puedes usar en todas tus plataformas.</p>
                        <p>Usa tus flatlays para crear publicaciones en Pinterest con tus enlaces de productos adjuntos. La gente busca en Pinterest todos los días ideas de atuendos, inspiración para el armario, looks de viaje, atuendos de temporada y tableros de estilo. Publicar tus flatlays con enlaces de afiliados puede generar tráfico constante e ingresos pasivos.</p>
                        <p>También puedes subir tus flatlays en Instagram, Facebook o TikTok como parte de tu contenido de moda. Hacen publicaciones de carrusel increíbles, historias, tableros de humor e incluso transiciones de video. Crea un video corto usando tus flatlays, añade tus enlaces de afiliados en la descripción o biografía, y guía a tu audiencia a comprar tus artículos.</p>
                        <p>Si tienes una boutique o tienda digital, tus flatlays pueden convertirse en tus fotos oficiales de productos. Se ven limpios, modernos y diseñados profesionalmente, perfectos para listar productos sin necesidad de costosas sesiones de fotos.</p>
                        <p>Para los creadores que construyen kits de marca o paquetes de atuendos, los flatlays te ayudan a organizar visualmente colecciones como “Armario Cápsula de Invierno”, “Looks para una Cita Nocturna” o “Esenciales de Viaje”. Estos se pueden convertir en productos digitales descargables, libros electrónicos o guías de estilo.</p>
                        <p>El uso de flatlays consistentes también fortalece tu marca personal. Cuando la gente vea tus tableros, reconocerá instantáneamente tu estilo y se sentirá más conectada con tu contenido, lo que aumenta la confianza y las conversiones.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isMarketingExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsMarketingExpanded(!isMarketingExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isMarketingExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>

                {/* Pro Tip Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Consejo Pro</h2>
                    <div className={`text-smw-gray-dark space-y-4 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isProTipExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>Una vez que se haya generado tu flatlay, puedes añadir más artículos al instante tocando la opción “Añadir Más Artículos”. Así que si olvidaste subir un bolso, una chaqueta, gafas de sol o zapatos, no tienes que empezar de nuevo. Simplemente añádelos y regenera tu flatlay hasta que se ajuste perfectamente a tu visión.</p>
                        <p>También puedes eliminar artículos usando el prompt negativo. Por ejemplo, puedes escribir cosas como “eliminar bolso”, “eliminar zapatos” o “eliminar chaqueta”, y el sistema lo limpiará por ti. Esto te da un control total sobre el look final.</p>
                        <p>Otro consejo importante es subir siempre fotos limpias de un solo artículo. No subas una foto de un modelo completo usando múltiples piezas. La IA intentará recrear el atuendo completo exactamente como se muestra y no separará los artículos. Subir fotos de productos individuales limpias hace que tu tablero de lienzo sea más preciso y te ayuda a mezclar y combinar sin esfuerzo.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isProTipExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipExpanded(!isProTipExpanded)} className="mt-4 text-sm text-smw-pink font-bold uppercase tracking-widest hover:underline">
                            {isProTipExpanded ? 'Leer Menos' : 'Leer Más'}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-2 md:p-6 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Vista Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md" aria-label="Cerrar">&times;</button>
                    </div>
                </div>
            )}

            {/* Magic Edit Modal */}
            {isMagicEditOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-smw-gray-dark uppercase tracking-tighter">✨ Edición Mágica y Cambio</h3>
                                <button onClick={() => setIsMagicEditOpen(false)} className="text-gray-400 hover:text-black transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            <div className="flex gap-4 justify-center">
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actual</p>
                                    <div className="aspect-square w-24 rounded-xl overflow-hidden border-2 border-gray-100 shadow-inner">
                                        {canvasImage && <img src={canvasImage} alt="Para editar" className="w-full h-full object-cover" />}
                                    </div>
                                </div>
                                {swapItemPreview && (
                                    <div className="flex flex-col items-center gap-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nuevo Artículo</p>
                                        <div className="aspect-square w-24 rounded-xl overflow-hidden border-2 border-smw-pink/30 shadow-inner relative group">
                                            <img src={swapItemPreview} alt="Nuevo artículo" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => {setSwapItemFile(null); setSwapItemPreview(null);}}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">1. Describe el cambio</label>
                                    <textarea 
                                        value={editInstruction}
                                        onChange={(e) => setEditInstruction(e.target.value)}
                                        placeholder="ej: quita el bolso y añade el nuevo..."
                                        className="w-full h-24 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-smw-pink outline-none resize-none font-medium text-smw-gray-dark"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">2. Añadir Nuevo Artículo (Opcional)</label>
                                    <div 
                                        onClick={() => swapItemInputRef.current?.click()}
                                        className="w-full py-4 border-2 border-dashed border-smw-pink/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-smw-pink/5 transition-colors"
                                    >
                                        <svg className="w-6 h-6 text-smw-pink mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        <p className="text-xs font-bold text-smw-gray-dark">Subir artículo para añadir/cambiar</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={swapItemInputRef}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setSwapItemFile(file);
                                                setSwapItemPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleMagicEdit}
                                disabled={isEditing || !editInstruction}
                                className="w-full bg-smw-pink text-smw-gray-dark font-black py-4 rounded-xl shadow-lg hover:bg-white transition-all disabled:opacity-50 text-lg uppercase flex items-center justify-center gap-2"
                            >
                                {isEditing ? <><Spinner className="w-5 h-5 text-smw-gray-dark" /><span>Aplicando Magia...</span></> : 'Aplicar Edición Mágica'}
                            </button>
                            
                            <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">El resto de tus artículos se preservarán</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlatlayPicture;