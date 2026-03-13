
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface ImageEditorProps {
    addCreations: (images: string[]) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ addCreations }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Info box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setOriginalImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setOriginalImage(reader.result as string);
                setEditedImage(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEdit = async () => {
        if (!originalImageFile || !prompt.trim()) {
            setError('Por favor, sube una imagen e ingresa una instrucción de edición.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            const base64Data = await fileToBase64(originalImageFile);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: originalImageFile.type } },
                        { text: prompt },
                    ],
                },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setEditedImage(newImage);
                addCreations([newImage]);
            } else {
                setError('La edición de imagen falló. No se devolvió ninguna imagen.');
            }
        } catch (e) {
            setError(`Falló: ${e instanceof Error ? e.message : 'Error desconocido'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-rosa-claro rounded-lg shadow-xl p-4 md:p-6 space-y-4 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">Edición de Imágenes</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    Transforma tus imágenes con comandos de texto simples. Cambia fondos, añade objetos o ajusta la iluminación con precisión profesional.
                </p>
            </div>
            {error && <div className="p-4 bg-red-900 text-blanco-texto rounded-md">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0 min-h-[400px]">
                <div className="bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-semibold mb-4 text-negro-fondo opacity-80">Imagen Original</h3>
                    <div className="w-full h-full flex items-center justify-center">
                        {originalImage ? (
                            <img src={originalImage} alt="Original" className="max-h-full max-w-full rounded-md object-contain shadow-sm" />
                        ) : (
                            <button onClick={() => fileInputRef.current?.click()} className="w-full h-full border-2 border-dashed border-rosa-principal rounded-lg flex flex-col items-center justify-center hover:bg-white/80 text-negro-fondo opacity-80 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L16 8M4 16l4.586-4.586a2 2 0 012.828L16 16m-2-2l1.586 1.586a2 2 0 010 2.828L12 20M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-2-2m0 0l-2 2m2-2v12" /></svg>
                                Haz clic para subir
                            </button>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
                <div className="bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-semibold mb-4 text-negro-fondo opacity-80">Resultado Editado</h3>
                    <div className="w-full h-full flex items-center justify-center">
                        {isLoading ? <Spinner className="w-12 h-12 text-negro-fondo" /> : editedImage ? (
                            <div className="relative group h-full flex items-center justify-center">
                                <img src={editedImage} alt="Editada" className="max-h-full max-w-full rounded-md object-contain cursor-zoom-in shadow-sm" onClick={() => setZoomedImage(editedImage)} />
                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setZoomedImage(editedImage)} className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                    </button>
                                    <a href={editedImage} download="editada.png" className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </a>
                                </div>
                            </div>
                        ) : <p className="text-negro-fondo opacity-80 italic">La imagen editada aparecerá aquí.</p>}
                    </div>
                </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm shadow-md rounded-lg p-4 flex-shrink-0">
                 <div className="flex flex-col md:flex-row gap-4">
                    <input 
                        type="text" 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder="ej., Cambia el fondo a una playa de lujo al atardecer" 
                        className="flex-1 bg-white/50 border-2 border-rosa-principal/50 rounded-lg p-3 text-negro-fondo focus:ring-2 focus:ring-rosa-principal outline-none transition-all placeholder:text-negro-fondo/50" 
                        disabled={isLoading} 
                    />
                    <button 
                        onClick={handleEdit} 
                        disabled={isLoading || !prompt.trim() || !originalImage} 
                        className="bg-rosa-principal text-negro-fondo font-bold py-3 px-8 rounded-lg hover:bg-white disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isLoading ? <Spinner /> : 'Aplicar Edición'}
                    </button>
                 </div>
            </div>

            {/* Information Sections */}
            <div className="space-y-6 pt-10 border-t border-rosa-principal/20 flex-shrink-0">
                {/* Introduction Box */}
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/40">
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Introducción</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p>La herramienta de Edición de Imágenes es tu asistente de diseño personal impulsado por IA. Olvida el software complejo y la tediosa edición manual. Con esta herramienta, puedes transformar tus fotos usando comandos de lenguaje natural simples. Describe el cambio que deseas—ya sea cambiar un fondo, añadir un objeto o ajustar la iluminación—y nuestra IA lo ejecutará con precisión profesional.</p>
                        <p>Esto es perfecto para creadores que buscan iterar rápidamente en el contenido, dueños de negocios que necesitan pulir fotos de productos, o cualquier persona que quiera dar vida a su visión creativa sin necesidad de habilidades de edición profesional.</p>
                        <p>Nuestro modelo avanzado entiende el contexto y mantiene la identidad de tus sujetos, asegurando que cada edición parezca fluida y orgánica. Desde cambios estilísticos como "haz que esto parezca una película vintage de los 90" hasta cambios estructurales como "añade una taza de café a la mesa", las posibilidades son infinitas.</p>
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
                    <h2 className="text-2xl font-bold text-negro-fondo mb-6 text-center">Cómo Funciona</h2>
                    <div className={`text-negro-fondo opacity-90 space-y-6 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                        <p><strong>Paso 1: Sube tu Foto</strong> - Haz clic en el cuadro de carga y selecciona la imagen que deseas modificar. Asegúrate de que el sujeto esté claro y la imagen tenga una resolución decente para obtener los mejores resultados.</p>
                        <p><strong>Paso 2: Describe tu Edición</strong> - Escribe tu instrucción en el cuadro de texto. Sé lo más descriptivo posible. Por ejemplo, en lugar de "cambiar fondo", intenta con "cambia el fondo a un balcón de un apartamento de lujo moderno y soleado con vistas a la ciudad".</p>
                        <p><strong>Paso 3: Aplicar Edición</strong> - Haz clic en el botón "Aplicar Edición". Nuestra IA analizará tanto la imagen como tu texto para generar un resultado fluido y de alta resolución que respete la identidad del sujeto original.</p>
                        <p><strong>Paso 4: Guardar y Descargar</strong> - Una vez que aparezca el resultado, puedes expandirlo para ver el detalle fino o descargarlo directamente a tu dispositivo para usarlo en redes sociales, sitios web o materiales de marketing.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-sm text-rosa-principal font-bold uppercase tracking-widest hover:underline">
                            {isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-12" /> {/* Final Spacer */}

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-2 md:p-6 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Expanded" className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageEditor;
