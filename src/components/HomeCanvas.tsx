
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64, dataURLtoFile } from '../utils';
import { Spinner } from './common/Spinner';
import interact from 'interactjs';
import html2canvas from 'html2canvas';

interface HomeCanvasProps {
    addCreations: (images: string[]) => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 md:h-10 w-8 md:w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v-1a3 3 0 013-3h10a3 3 0 013 3v1m-4-8l-4-4m0 0l-4-4m4 4V4" />
    </svg>
);

const UploadBox: React.FC<{ title: string, onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void, inputRef: React.RefObject<HTMLInputElement>, dropzoneRef: React.RefObject<HTMLDivElement> }> = ({ title, onFileSelect, inputRef, dropzoneRef }) => (
    <div ref={dropzoneRef} className="w-1/2 md:w-5/12 lg:w-4/12">
        <h3 className="text-base md:text-lg font-bold mb-2 text-center text-negro-fondo">{title}</h3>
        <div 
            onClick={() => inputRef.current?.click()}
            className="aspect-video bg-white/60 backdrop-blur-sm shadow-md rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-rosa-principal/50 hover:border-rosa-principal transition-colors p-2 md:p-4"
        >
            <div className="flex flex-col items-center text-negro-fondo opacity-80 text-center">
                 <UploadIcon />
                <p className="text-xs sm:text-sm font-semibold">Haz clic para subir o arrastrar y soltar</p>
            </div>
            <input type="file" ref={inputRef} onChange={onFileSelect} className="hidden" accept="image/*" />
        </div>
    </div>
);


const HomeCanvas: React.FC<HomeCanvasProps> = ({ addCreations }) => {
    const [product, setProduct] = useState<{ file: File, preview: string } | null>(null);
    const [scene, setScene] = useState<{ file: File, preview: string } | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: 100, height: 100 });
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Info box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);
    
    const placementMarkerRef = useRef<HTMLDivElement>(null);
    const sceneContainerRef = useRef<HTMLDivElement>(null);
    const productInputRef = useRef<HTMLInputElement>(null);
    const sceneInputRef = useRef<HTMLInputElement>(null);
    const productDropzoneRef = useRef<HTMLDivElement>(null);
    const sceneDropzoneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!placementMarkerRef.current || !sceneContainerRef.current) return;

        interact(placementMarkerRef.current)
            .draggable({
                listeners: {
                    move: (event) => setPosition(p => ({ x: p.x + event.dx, y: p.y + event.dy })),
                },
                modifiers: [interact.modifiers.restrictRect({ restriction: 'parent' })],
                inertia: true,
            })
            .resizable({
                edges: { top: true, left: true, bottom: true, right: true },
                listeners: {
                    move: (event) => {
                        setSize({ width: event.rect.width, height: event.rect.height });
                        setPosition(p => ({ x: p.x + event.deltaRect.left, y: p.y + event.deltaRect.top }));
                    }
                },
                modifiers: [
                    interact.modifiers.restrictSize({ min: { width: 30, height: 30 } }),
                    interact.modifiers.aspectRatio({ ratio: 'preserve' }),
                ],
                inertia: true
            });
    }, [product, scene]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'scene') => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const setter = type === 'product' ? setProduct : setScene;
            setter({ file, preview: URL.createObjectURL(file) });
        }
    };
    
    useEffect(() => {
        const setupDragAndDrop = (dropzoneRef: React.RefObject<HTMLDivElement>, type: 'product' | 'scene') => {
            const dropzone = dropzoneRef.current;
            if (!dropzone) return;

            const handleFile = (file: File) => {
                if (file.type.startsWith('image/')) {
                     const setter = type === 'product' ? setProduct : setScene;
                     setter({ file, preview: URL.createObjectURL(file) });
                }
            };
            const dropTarget = dropzone.querySelector('.border-dashed');
            if (!dropTarget) return;

            const onDragOver = (e: DragEvent) => { e.preventDefault(); dropTarget.classList.add('border-rosa-principal', 'bg-white/80'); };
            const onDragLeave = () => { dropTarget.classList.remove('border-rosa-principal', 'bg-white/80'); };
            const onDrop = (e: DragEvent) => {
                e.preventDefault();
                dropTarget.classList.remove('border-rosa-principal', 'bg-white/80');
                if (e.dataTransfer?.files[0]) handleFile(e.dataTransfer.files[0]);
            };

            dropTarget.addEventListener('dragover', onDragOver as EventListener);
            dropTarget.addEventListener('dragleave', onDragLeave as EventListener);
            dropTarget.addEventListener('drop', onDrop as EventListener);
            
            return () => {
                 if (dropTarget) {
                    dropTarget.removeEventListener('dragover', onDragOver as EventListener);
                    dropTarget.removeEventListener('dragleave', onDragLeave as EventListener);
                    dropTarget.removeEventListener('drop', onDrop as EventListener);
                 }
            }
        };

        const cleanupProduct = setupDragAndDrop(productDropzoneRef, 'product');
        const cleanupScene = setupDragAndDrop(sceneDropzoneRef, 'scene');
        
        return () => {
            cleanupProduct?.();
            cleanupScene?.();
        }
    }, []);

    const handleGenerate = async () => {
        if (!product || !scene || !sceneContainerRef.current) return setError('Sube las imágenes del producto y de la escena.');
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const sceneContainerElement = sceneContainerRef.current;
            
            if (placementMarkerRef.current) placementMarkerRef.current.style.visibility = 'hidden';
            const sceneCanvas = await html2canvas(sceneContainerElement, { backgroundColor: '#1C1C1C', useCORS: true, logging: false, scale: 2 });
            if (placementMarkerRef.current) placementMarkerRef.current.style.visibility = 'visible';
            const sceneBase64 = sceneCanvas.toDataURL('image/png').split(',')[1];
            
            const { width: sceneWidth, height: sceneHeight } = sceneCanvas;

            const maskContainer = document.createElement('div');
            maskContainer.style.width = `${sceneContainerElement.offsetWidth}px`;
            maskContainer.style.height = `${sceneContainerElement.offsetHeight}px`;
            maskContainer.style.position = 'absolute';
            maskContainer.style.left = '-9999px';
            maskContainer.style.background = 'black';
            
            const whiteBox = document.createElement('div');
            whiteBox.style.position = 'absolute';
            whiteBox.style.left = `${position.x}px`;
            whiteBox.style.top = `${position.y}px`;
            whiteBox.style.width = `${size.width}px`;
            whiteBox.style.height = `${size.height}px`;
            whiteBox.style.background = 'white';
            
            maskContainer.appendChild(whiteBox);
            document.body.appendChild(maskContainer);

            const maskCanvas = await html2canvas(maskContainer, { backgroundColor: null, scale: 2 });
            document.body.removeChild(maskContainer);
            const maskBase64 = maskCanvas.toDataURL('image/png').split(',')[1];
            
            const productBase64 = await fileToBase64(product.file);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const promptText = `**TASK: Photorealistic Product Placement**

You are an expert photo editor. You will receive a scene image, a product image, and a mask indicating where to place the product. Your task is to create a photorealistic composite.

**CRITICAL RULES:**
1.  **ADD, DON'T REMOVE:** Your ONLY task is to ADD the new product into the scene at the location specified by the mask. You MUST NOT remove, alter, or replace any existing items in the original scene. The final image must contain all original elements plus the newly added product.
2.  **REALISM:** The added product must have realistic lighting, shadows, and reflections to make it look like it naturally belongs in the scene.
3.  **EXACT DIMENSIONS:** The final output image MUST have the exact same dimensions as the input scene image: ${sceneWidth}px width and ${sceneHeight}px height. Do not add any padding, cropping, or black bars.

Use the first image as the scene, the second as the product to add, and the third as the mask for placement.`;
            
            const parts: Part[] = [
                { inlineData: { mimeType: 'image/png', data: sceneBase64 } },
                { inlineData: { mimeType: product.file.type, data: productBase64 } },
                { inlineData: { mimeType: 'image/png', data: maskBase64 } },
                { text: promptText },
            ];
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setGeneratedImage(newImage);
                addCreations([newImage]);
            } else {
                throw new Error('Image generation failed. The model did not return an image.');
            }
        } catch (e) {
            console.error("HomeCanvas Generation Error:", e);
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
        
            setError(`La generación falló: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        if (product?.preview.startsWith('blob:')) URL.revokeObjectURL(product.preview);
        if (scene?.preview.startsWith('blob:')) URL.revokeObjectURL(scene.preview);
        setProduct(null);
        setScene(null);
        setGeneratedImage(null);
        setError(null);
        setPosition({ x: 0, y: 0 });
        setSize({ width: 100, height: 100 });
    };

    const handleAddAnotherItem = () => {
        if (!generatedImage) return;

        const newSceneFile = dataURLtoFile(generatedImage, `composite-scene-${Date.now()}.png`);
        if (newSceneFile) {
            if (scene?.preview.startsWith('blob:')) URL.revokeObjectURL(scene.preview);
            if (product?.preview.startsWith('blob:')) URL.revokeObjectURL(product.preview);
            
            setScene({ file: newSceneFile, preview: generatedImage });
            setProduct(null);
            setGeneratedImage(null);
            setError(null);
            if (productInputRef.current) productInputRef.current.value = '';

            // Reset position to center for the new item
            if (sceneContainerRef.current) {
                const { offsetWidth, offsetHeight } = sceneContainerRef.current;
                setPosition({ x: offsetWidth / 2 - 50, y: offsetHeight / 2 - 50 });
            } else {
                setPosition({ x: 0, y: 0 });
            }
            setSize({ width: 100, height: 100 });
        } else {
            setError("No se pudo procesar la imagen generada para usarla como una nueva escena.");
        }
    };
    
    const handleRefine = async () => {
        if (!generatedImage || !editPrompt.trim()) {
            setError('Por favor, describe tu edición.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const generatedImageFile = dataURLtoFile(generatedImage, 'compuesto.png');
            if (!generatedImageFile) throw new Error("No se pudo procesar la imagen generada para refinar.");
            
            const base64Data = await fileToBase64(generatedImageFile);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const refineInstruction = `
**TAREA: Modificación de imagen PRECISA**

Eres una herramienta de edición de fotos, no un asistente creativo. Tu trabajo es seguir las instrucciones del usuario con precisión quirúrgica.

**INSTRUCCIÓN DEL USUARIO:** "${editPrompt}"

**REGLAS CRÍTICAS:**
1.  **EJECUTAR SOLO LA INSTRUCCIÓN:** Tu ÚNICA tarea es realizar la acción descrita en la "INSTRUCCIÓN DEL USUARIO" y nada más.
2.  **PRESERVACIÓN ESTRICTA:** DEBES preservar cada otra parte de la imagen que no sea el sujeto de la instrucción. NO añadas nuevos objetos, cambies objetos existentes ni alteres el fondo a menos que se te indique explícitamente. Si el usuario pide quitar un objeto, el espacio que ocupaba ahora debe mostrar de manera realista lo que había detrás. NO llenes el espacio con nuevos objetos.
3.  **SIN ADICIONES CREATIVAS:** No "rellenes" espacios vacíos ni "equilibres la composición". Si quitar almohadas deja un sofá vacío, el sofá debe permanecer vacío. NO añadas más almohadas.
4.  **MANTENER EL REALISMO:** La edición debe ser perfecta. Haz coincidir la iluminación, las sombras y las texturas a la perfección.
5.  **RESULTADO DE ALTA CALIDAD:** La imagen final debe ser un resultado fotorrealista de alta resolución de la edición precisa.
`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: generatedImageFile.type } },
                        { text: refineInstruction },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const refinedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setGeneratedImage(refinedImage);
                addCreations([refinedImage]);
                setEditPrompt('');
            } else {
                throw new Error('La refinación falló. El modelo no devolvió una imagen.');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ocurrió un error desconocido.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-rosa-claro p-4 sm:p-6 overflow-y-auto">
            <div className="flex-1">
                {!scene ? (
                    <div className="flex flex-col items-center p-4 md:p-8 pt-8">
                        <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                            <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">Lienzo de Hogar IA</h1>
                            <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                                Sube fotos de un producto y una escena, luego arrastra tu producto a su lugar para crear un montaje fotorrealista.
                            </p>
                        </div>
                        <div className="flex flex-row justify-center items-start gap-4 md:gap-8 w-full max-w-5xl">
                            <UploadBox title="Subir Producto" onFileSelect={(e) => handleFileChange(e, 'product')} inputRef={productInputRef} dropzoneRef={productDropzoneRef} />
                            <UploadBox title="Subir Escena" onFileSelect={(e) => handleFileChange(e, 'scene')} inputRef={sceneInputRef} dropzoneRef={sceneDropzoneRef} />
                        </div>
                        <p className="text-sm text-negro-fondo opacity-80 mt-8">Sube una imagen de escena para comenzar.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-center flex-shrink-0 gap-4">
                             <h2 className="text-2xl font-bold text-negro-fondo">Editor de Lienzo de Hogar IA</h2>
                             <div className="flex items-center gap-2">
                                <button onClick={handleReset} className="text-sm font-semibold py-2 px-4 rounded-lg bg-white/80 hover:bg-white text-negro-fondo">Empezar de nuevo</button>
                                {generatedImage ? (
                                    <button onClick={handleAddAnotherItem} className="bg-rosa-principal text-negro-fondo font-bold py-2 px-6 rounded-lg hover:bg-white">
                                        Añadir otro artículo
                                    </button>
                                ) : (
                                    <button onClick={handleGenerate} disabled={isLoading || !product} className="bg-rosa-principal text-negro-fondo font-bold py-2 px-6 rounded-lg hover:bg-white disabled:bg-rosa-principal/50 disabled:cursor-not-allowed">
                                        {isLoading ? <Spinner /> : 'Generar'}
                                    </button>
                                )}
                             </div>
                        </div>
                        {error && <div className="p-3 bg-red-900 text-white rounded-md text-sm">{error}</div>}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                            <div className="bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px]">
                                <h3 className="text-lg font-semibold mb-2 text-negro-fondo opacity-80">Coloca tu Producto</h3>
                                <div ref={sceneContainerRef} className="relative w-full h-full flex items-center justify-center" style={{ touchAction: 'none' }}>
                                    <img src={scene.preview} className="max-w-full max-h-full object-contain" alt="Fondo de la escena" />
                                    {product ? (
                                        <div
                                            ref={placementMarkerRef}
                                            className="absolute top-0 left-0 cursor-move touch-none"
                                            style={{
                                                transform: `translate(${position.x}px, ${position.y}px)`,
                                                width: `${size.width}px`,
                                                height: `${size.height}px`,
                                                border: '2px dashed #F5B2E1',
                                                boxShadow: '0 0 15px rgba(245, 178, 225, 0.2)',
                                            }}
                                        >
                                            <img 
                                                src={product.preview}
                                                alt="Producto a colocar"
                                                className="w-full h-full object-contain"
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        </div>
                                    ) : (
                                       <>
                                           <label htmlFor="home-canvas-product-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer">
                                               <div className="flex flex-col items-center text-blanco-texto text-center p-8 bg-black/50 rounded-lg border-2 border-dashed border-rosa-principal/50 hover:border-rosa-principal">
                                                   <UploadIcon />
                                                   <p className="font-semibold">Subir Producto para Colocar</p>
                                               </div>
                                           </label>
                                           <input id="home-canvas-product-upload" type="file" ref={productInputRef} onChange={(e) => handleFileChange(e, 'product')} className="hidden" accept="image/*" />
                                       </>
                                    )}
                                </div>
                            </div>
                             <div className="flex flex-col gap-y-4">
                                <div className="bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px] flex-1">
                                    <h3 className="text-lg font-semibold mb-2 text-negro-fondo opacity-80">Montaje Generado</h3>
                                    <div className="w-full h-full flex items-center justify-center">
                                        {isLoading ? (
                                            <Spinner className="w-12 h-12 text-negro-fondo" />
                                        ) : generatedImage ? (
                                            <div className="relative group w-full h-full">
                                                <img 
                                                    src={generatedImage} 
                                                    alt="Montaje generado" 
                                                    className="max-w-full max-h-full object-contain rounded-lg cursor-pointer" 
                                                    onClick={() => setZoomedImage(generatedImage)} 
                                                />
                                                <a href={generatedImage} download="lienzo-hogar-compuesto.png" className="absolute bottom-2 right-2 p-2 bg-black bg-opacity-60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-negro-fondo opacity-80">Tu resultado aparecerá aquí.</p>
                                        )}
                                    </div>
                                </div>
                                {generatedImage && !isLoading && (
                                    <div className="bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 flex-shrink-0">
                                        <label htmlFor="refine-prompt" className="block text-sm font-semibold text-negro-fondo mb-1">Refinar Resultado:</label>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <input
                                                id="refine-prompt"
                                                type="text"
                                                value={editPrompt}
                                                onChange={(e) => setEditPrompt(e.target.value)}
                                                placeholder="ej: quita las almohadas de la izquierda"
                                                className="flex-1 bg-white/50 border-2 border-rosa-principal/50 rounded-lg p-2 focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo placeholder:text-negro-fondo/70"
                                            />
                                            <button
                                                onClick={handleRefine}
                                                disabled={!editPrompt.trim()}
                                                className="bg-rosa-principal text-negro-fondo font-bold py-2 px-4 rounded-lg hover:bg-white disabled:bg-rosa-principal/50 disabled:cursor-not-allowed"
                                            >
                                                Refinar
                                            </button>
                                        </div>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Secciones de Información */}
            <div className="space-y-6 mt-12 border-t border-rosa-principal/20 pt-10">
                {/* Introduction Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Introducción</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p>Bienvenido a Lienzo de Hogar IA, nuestro estudio de composición y puesta en escena digital impulsado por IA de precisión. Esta herramienta está diseñada para creadores, emprendedores y especialistas en marketing que necesitan un control perfecto sobre cómo aparecen los productos en escenas del mundo real.</p>
                        <p>A diferencia de los generadores de imágenes estándar, Lienzo de Hogar IA te permite "dirigir" a la IA. Tú eliges el fondo, eliges el producto y decides exactamente dónde se ubica. Nuestros modelos avanzados luego manejan la compleja física de la luz, las sombras y los reflejos para que la adición parezca 100% natural.</p>
                        <p>Ya sea que estés creando un catálogo de muebles, preparando una casa o creando contenido para redes sociales para el lanzamiento de un nuevo producto, Lienzo de Hogar IA te brinda resultados de nivel profesional con precisión quirúrgica.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-sm text-rosa-principal font-bold uppercase tracking-widest hover:underline">
                            {isIntroExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                {/* How It Works Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Cómo funciona</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p><strong>Paso 1: Sube tu escena</strong> - Comienza subiendo una foto de alta calidad del entorno donde quieres que viva tu producto. Podría ser una sala de estar de lujo, una cocina minimalista o una calle concurrida de la ciudad.</p>
                        <p><strong>Paso 2: Sube tu producto</strong> - Sube una foto clara del producto que quieres añadir. Para obtener mejores resultados, utiliza una foto con un fondo limpio.</p>
                        <p><strong>Paso 3: Posicionar y redimensionar</strong> - Utiliza el cuadro punteado interactivo para arrastrar tu producto al lugar perfecto. Usa los bordes del cuadro para cambiar su tamaño para que las proporciones coincidan con la escena de manera realista.</p>
                        <p><strong>Paso 4: Generar</strong> - Haz clic en "Generar". Nuestra IA tomará tus datos de ubicación y renderizará una nueva versión de la escena con el producto integrado a la perfección, con sombras e iluminación naturales.</p>
                        <p><strong>Paso 5: Refinar (Opcional)</strong> - Si el resultado necesita un ligero ajuste, como quitar una almohada cercana o ajustar el color de un reflejo, utiliza la herramienta "Refinar" para dar comandos específicos y precisos al editor de IA.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-sm text-rosa-principal font-bold uppercase tracking-widest hover:underline">
                            {isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                {/* Sales Tips & Monetization Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Consejos de ventas e ideas de monetización</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p><strong>1. Puesta en escena virtual para bienes raíces:</strong> Ofrece servicios de colocación de muebles virtuales a agentes inmobiliarios. Toma fotos de habitaciones vacías y poblalas con muebles de lujo para ayudar a los compradores potenciales a visualizar su futuro hogar.</p>
                        <p><strong>2. Paquetes de "Estilo de vida" para comercio electrónico:</strong> Las marcas pagan miles por fotos de estilo de vida. Puedes ofrecer un servicio donde tomes sus fotos básicas de productos y las coloques en cientos de entornos de "hogar" diferentes para sus redes sociales y anuncios.</p>
                        <p><strong>3. Contenido para marketing de afiliados:</strong> Promociona decoración del hogar o dispositivos tecnológicos colocándolos en una escena estética que coincida con tu marca personal. Ver un producto "en uso" aumenta las tasas de clics en los enlaces de afiliados.</p>
                        <p><strong>4. Prototipado rápido para diseñadores de interiores:</strong> Utiliza Lienzo de Hogar IA para mostrar a los clientes cómo se vería una lámpara, silla o pieza de arte específica en su habitación real antes de realizar una compra.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-sm text-rosa-principal font-bold uppercase tracking-widest hover:underline">
                            {isSalesTipsExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                {/* Pro Tips Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Consejos profesionales</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p><strong>• Alinea la iluminación:</strong> Para el montaje más creíble, intenta que la dirección de la iluminación de la foto de tu producto coincida con la escena. Si el sol viene de la izquierda en la escena, un producto con luz dándole desde la izquierda se mezclará mucho mejor.</p>
                        <p><strong>• La perspectiva es prioridad:</strong> Presta mucha atención al ángulo. Si la escena se toma desde un ángulo alto, la foto de tu producto también debe ser desde un ángulo alto similar. La IA es buena mezclando, pero hacer coincidir las perspectivas manualmente primero conduce a resultados "pro".</p>
                        <p><strong>• El bucle "Añadir otro":</strong> Utiliza el botón "Añadir otro artículo" para crear escenas complejas. Puedes empezar con una mesa, añadir un portátil, luego añadir una taza de café y finalmente un cuaderno, todo uno por uno para asegurar la colocación perfecta de cada uno.</p>
                        <p><strong>• Usa Refinar para objetos pequeños:</strong> Si la IA añade algo ligeramente fuera de lugar, no reinicies. Usa Refinar para decir "haz que la sombra debajo de la taza sea más suave" o "cambia el color de la taza de café a azul".</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-sm text-rosa-principal font-bold uppercase tracking-widest hover:underline">
                            {isProTipsExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div
                    className="fixed inset-0 bg-black/90 flex justify-center items-start pt-10 md:items-center md:pt-0 z-50 p-4 animate-fade-in"
                    onClick={() => setZoomedImage(null)}
                >
                    <div 
                        className="relative max-w-full max-h-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={zoomedImage}
                            alt="Vista ampliada"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                        <button
                            onClick={() => setZoomedImage(null)}
                            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold transition-all border border-white/20 shadow-lg backdrop-blur-sm"
                            aria-label="Close"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeCanvas;
