import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface AIMakeupStudioProps {
    addCreations: (images: string[]) => void;
}

const presets = ["Brillo Natural", "Noche Ahumada", "Atrevido y Creativo", "Elegancia Nupcial"];

const lipColors = [
    { name: 'Rosa Fuerte', hex: '#E91E63' },
    { name: 'Blanco Puro', hex: '#FFFFFF' },
    { name: 'Plata', hex: '#E0E0E0' },
    { name: 'Bronceado', hex: '#BCAAA4' },
    { name: 'Nude', hex: '#D7CCC8' },
    { name: 'Rojo Clásico', hex: '#C62828' },
    { name: 'Ciruela Profundo', hex: '#4A148C' },
    { name: 'Coral Suave', hex: '#EF9A9A' },
    { name: 'Terracota', hex: '#8D6E63' },
];

const blushColors = [
    { name: 'Rosa', hex: '#F48FB1' },
    { name: 'Rosa Empolvado', hex: '#BC8F8F' },
    { name: 'Melocotón', hex: '#EF5350' },
    { name: 'Bronce', hex: '#D2691E' },
];

const eyeshadowColors = [
    { name: 'Degradado', hex: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { name: 'Naranja Vibrante', hex: '#FF9800' },
    { name: 'Azul Eléctrico', hex: '#2196F3' },
    { name: 'Púrpura Profundo', hex: '#673AB7' },
    { name: 'Marrón Rico', hex: '#795548' },
    { name: 'Carbón', hex: '#616161' },
    { name: 'Crema', hex: '#F5F5F5' },
    { name: 'Azul Cielo', hex: '#03A9F4' },
    { name: 'Amatista', hex: '#9C27B0' },
];

const eyelinerStyles = ["Ninguno", "Sutil", "Alado", "Gráfico"];
const lashStyles = ["Natural", "Tenue", "Dramático"];

const Step: React.FC<{ number: number | string, title: string, children: React.ReactNode, isCompleted?: boolean }> = ({ number, title, children, isCompleted }) => (
    <div className={`bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg transition-opacity ${isCompleted ? 'opacity-50' : 'opacity-100'}`}>
        <h3 className="text-md font-bold text-smw-gray-dark mb-3">Paso {number}: {title}</h3>
        {children}
    </div>
);

const ColorSwatch: React.FC<{ hex: string, isSelected: boolean, onClick: () => void }> = ({ hex, isSelected, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-10 h-10 rounded-full border-2 transition-all transform hover:scale-105 ${isSelected ? 'border-smw-pink ring-2 ring-smw-pink ring-offset-2 ring-offset-white' : 'border-gray-200'}`}
        style={{ background: hex }}
    />
);

const PillButton: React.FC<{ label: string, isSelected: boolean, onClick: () => void }> = ({ label, isSelected, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${isSelected ? 'bg-smw-pink text-smw-gray-dark shadow-md' : 'bg-white text-smw-gray-dark border border-gray-100 hover:bg-gray-50'}`}
    >
        {label}
    </button>
);

const AIMakeupStudio: React.FC<AIMakeupStudioProps> = ({ addCreations }) => {
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [selectedPreset, setSelectedPreset] = useState(presets[0]);
    const [lipColor, setLipColor] = useState(lipColors[4]);
    const [blushColor, setBlushColor] = useState(blushColors[0]);
    const [eyeshadowColor, setEyeshadowColor] = useState(eyeshadowColors[4]);
    const [eyeliner, setEyeliner] = useState(eyelinerStyles[1]);
    const [lashes, setLashes] = useState(lashStyles[0]);

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwMakeupFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedPreset) setSelectedPreset(parsed.selectedPreset);
                if (parsed.lipColor) {
                    const color = lipColors.find(c => c.name === parsed.lipColor);
                    if (color) setLipColor(color);
                }
                if (parsed.blushColor) {
                    const color = blushColors.find(c => c.name === parsed.blushColor);
                    if (color) setBlushColor(color);
                }
                if (parsed.eyeshadowColor) {
                    const color = eyeshadowColors.find(c => c.name === parsed.eyeshadowColor);
                    if (color) setEyeshadowColor(color);
                }
                if (parsed.eyeliner) setEyeliner(parsed.eyeliner);
                if (parsed.lashes) setLashes(parsed.lashes);
            } catch (e) {
                console.error("Failed to load makeup form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedPreset,
            lipColor: lipColor.name,
            blushColor: blushColor.name,
            eyeshadowColor: eyeshadowColor.name,
            eyeliner,
            lashes
        };
        localStorage.setItem('smwMakeupFormState', JSON.stringify(formState));
    }, [selectedPreset, lipColor, blushColor, eyeshadowColor, eyeliner, lashes]);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Info box expansion states
    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isMarketingExpanded, setIsMarketingExpanded] = useState(false);

    const personInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
        };
    }, [personImage]);

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
            const b64 = await fileToBase64(personImage.file);
            const sessionImages: string[] = [];
            
            for (let i = 0; i < 4; i++) {
                const prompt = `**MISIÓN CRÍTICA: PRUEBA DE MAQUILLAJE VIRTUAL**

Recrea a la persona de la foto de origen con un 100% de precisión facial y de identidad.
Estilo: Fotografía de belleza fotorrealista, iluminación de estudio.
Aspecto general: ${selectedPreset}.

Aplica los siguientes detalles específicos de maquillaje:
- **Labios:** Lápiz labial ${lipColor.name}.
- **Rubor:** Tono ${blushColor.name}.
- **Sombra de ojos:** Estilo ${eyeshadowColor.name}.
- **Delineador de ojos:** Estilo ${eyeliner}.
- **Pestañas:** Mejora de pestañas ${lashes}.

El maquillaje debe parecer natural y mezclarse perfectamente con la piel de la persona.
Semilla: ${Math.random()}`;

                const res = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { 
                        parts: [
                            { text: "Persona de origen:" }, 
                            { inlineData: { mimeType: personImage.file.type, data: b64 } }, 
                            { text: prompt }
                        ] 
                    },
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
            setError('Error al generar el look de maquillaje virtual. Por favor, inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col bg-smw-pink-light rounded-lg shadow-xl p-4 md:p-6 space-y-4 h-full overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">Estudio de Maquillaje IA</h1>
                <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
                    Prueba virtualmente looks de maquillaje profesional. Sube tu foto y personaliza tu look con resultados de alta fidelidad.
                </p>
            </div>
            {generatedImages.length > 0 && <div className="flex justify-center mb-4"><button onClick={() => {setGeneratedImages([]); setPersonImage(null);}} className="text-sm py-2 px-4 rounded-lg bg-white/80 hover:bg-white text-smw-gray-dark font-semibold shadow-sm">Empezar de nuevo</button></div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Step number={1} title="Sube tu foto">
                        <p className="text-sm text-smw-gray-dark opacity-80 mb-3">Sube un selfie o retrato claro. Para obtener los mejores resultados, asegúrate de que tu rostro esté bien iluminado y mire directamente a la cámara.</p>
                        <div 
                            onClick={() => personInputRef.current?.click()} 
                            className="aspect-square max-w-[300px] mx-auto bg-white/60 rounded-lg flex items-center justify-center border-2 border-dashed border-smw-pink/50 cursor-pointer hover:bg-white transition-colors p-4"
                        >
                            {personImage ? (
                                <img src={personImage.preview} className="max-h-full max-w-full rounded-md shadow-sm" alt="Vista previa" />
                            ) : (
                                <div className="text-center space-y-2 text-smw-gray-dark opacity-60">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 010-2.828L16 8M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586 1.586a2 2 0 010 2.828L12 20M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-2-2m0 0l-2 2m2-2v12" /></svg>
                                    <p className="font-semibold">Haz clic para subir foto</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={personInputRef} onChange={e => e.target.files?.[0] && setPersonImage({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="hidden" accept="image/*" />
                    </Step>

                    <Step number={2} title="Elige un look">
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {presets.map(p => (
                                    <PillButton key={p} label={p} isSelected={selectedPreset === p} onClick={() => setSelectedPreset(p)} />
                                ))}
                            </div>

                            <div className="pt-4 border-t border-smw-pink/20 space-y-6">
                                <h4 className="text-sm font-bold text-smw-gray-dark opacity-60 uppercase tracking-wider">Personalizar</h4>
                                
                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-smw-gray-dark">Labios</p>
                                    <div className="flex flex-wrap gap-3">
                                        {lipColors.map(c => (
                                            <ColorSwatch key={c.name} hex={c.hex} isSelected={lipColor.name === c.name} onClick={() => setLipColor(c)} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-smw-gray-dark">Rubor</p>
                                    <div className="flex flex-wrap gap-3">
                                        {blushColors.map(c => (
                                            <ColorSwatch key={c.name} hex={c.hex} isSelected={blushColor.name === c.name} onClick={() => setBlushColor(c)} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-smw-gray-dark">Sombra de ojos</p>
                                    <div className="flex flex-wrap gap-3">
                                        {eyeshadowColors.map(c => (
                                            <ColorSwatch key={c.name} hex={c.hex} isSelected={eyeshadowColor.name === c.name} onClick={() => setEyeshadowColor(c)} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-smw-gray-dark">Delineador de ojos</p>
                                    <div className="flex flex-wrap gap-2">
                                        {eyelinerStyles.map(e => (
                                            <PillButton key={e} label={e} isSelected={eyeliner === e} onClick={() => setEyeliner(e)} />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold text-smw-gray-dark">Pestañas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {lashStyles.map(l => (
                                            <PillButton key={l} label={l} isSelected={lashes === l} onClick={() => setLashes(l)} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading || !personImage} 
                            className="w-full mt-8 bg-smw-pink text-smw-gray-dark font-bold py-4 rounded-lg hover:bg-white disabled:bg-smw-pink/50 disabled:cursor-not-allowed shadow-md transition-all text-lg"
                        >
                            {isLoading ? <Spinner className="w-6 h-6 text-smw-gray-dark mx-auto" /> : 'Generar look de maquillaje'}
                        </button>
                    </Step>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-center text-smw-gray-dark mb-4 border-b border-smw-pink/20 pb-2">Resultados</h3>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="relative aspect-square bg-white/40 rounded-lg flex items-center justify-center">
                                {isLoading && i >= generatedImages.length ? (
                                    <div className="text-center">
                                        <Spinner className="w-8 h-8 text-smw-gray-dark mb-2" />
                                        <p className="text-[10px] text-smw-gray-dark opacity-60">Aplicando...</p>
                                    </div>
                                ) : generatedImages[i] ? (
                                    <div className="relative group w-full h-full">
                                        <img src={generatedImages[i]} className="w-full h-full object-cover rounded-lg shadow-lg cursor-zoom-in" onClick={() => setZoomedImage(generatedImages[i])} alt="Resultado de maquillaje" />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => setZoomedImage(generatedImages[i])} className="bg-white/90 text-black p-1.5 sm:p-2 rounded-full hover:bg-white shadow-md transition-transform active:scale-95" title="Ver pantalla completa">
                                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                            </button>
                                            <a href={generatedImages[i]} download="ia-makeup-look.png" className="bg-white/90 text-black p-1.5 sm:p-2 rounded-full hover:bg-white shadow-md transition-transform active:scale-95" title="Descargar">
                                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>
                                        </div>
                                    </div>
                                ) : <span className="opacity-30 text-3xl font-bold text-smw-gray-dark">{i + 1}</span>}
                            </div>
                        ))}
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-900 text-white rounded-md text-sm text-center">{error}</div>}
                </div>
            </div>

            {/* Secciones de Información */}
            <div className="space-y-6 mt-8">
                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Introducción</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[120px]'}`}>
                        <p>El Estudio de Maquillaje IA es un laboratorio de belleza virtual que te permite probar instantáneamente looks de maquillaje profesional en tu propio rostro. Utilizando tecnología de IA avanzada, mapea tus rasgos faciales y aplica un estilo de alta definición que incluye base, rubor, sombra de ojos y mejoras de pestañas.</p>
                        <p>Ya sea que estés buscando actualizar tu perfil de redes sociales, ver cómo te quedaría un nuevo look antes de una sesión de fotos o crear contenido para una marca de belleza, esta herramienta ofrece resultados fotorrealistas que mantienen tu identidad y semejanza exactas.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-smw-pink-dark font-bold hover:underline text-smw-gray-dark">
                            {isIntroExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Cómo funciona</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[120px]'}`}>
                        <p><strong>Paso 1: Sube tu foto</strong> - Haz clic en el cuadro de carga y selecciona un selfie de alta calidad. La iluminación natural y una vista clara de tu rostro proporcionarán los resultados más realistas.</p>
                        <p><strong>Paso 2: Aplicación virtual</strong> - Haz clic en "Generar look de maquillaje". Nuestra IA procesará tu imagen, identificando ojos, labios y textura de la piel para aplicar una capa de belleza personalizada.</p>
                        <p><strong>Paso 3: Revisar resultados</strong> - Recibirás 4 variaciones del look. Cada una es ligeramente diferente para darte una gama de opciones.</p>
                        <p><strong>Paso 4: Guardar y usar</strong> - Mira cualquier imagen en pantalla completa para ver los detalles finos, luego descárgala directamente a tu dispositivo.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-smw-pink-dark font-bold hover:underline text-smw-gray-dark">
                            {isHowItWorksExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg">
                    <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Estrategia de ventas y marketing</h2>
                    <div className={`text-smw-gray-dark opacity-90 space-y-4 leading-relaxed text-base transition-all duration-500 ease-in-out overflow-hidden relative ${isMarketingExpanded ? 'max-h-[70vh] overflow-y-auto' : 'max-h-[120px]'}`}>
                        <p><strong>1. Marketing de afiliados de cosméticos:</strong> Crea contenido de "Antes y Después" para promocionar productos de maquillaje. Usa la prueba virtual para mostrar el potencial de un look de "Brillo Natural" y enlaza a tu base, pestañas o paletas favoritas.</p>
                        <p><strong>2. Visuales para blogs de belleza:</strong> La fotografía de alta calidad es cara. Usa el Estudio de Maquillaje IA para generar tomas de belleza profesionales y consistentes para los encabezados de tu blog o las miniaturas de tus artículos.</p>
                        <p><strong>3. Mejora del portafolio:</strong> Si eres maquillador o técnico de pestañas, usa estas imágenes para mostrar a los clientes los tipos de estilos que puedes lograr, o úsalas como puntos de referencia durante las consultas.</p>
                        <p><strong>4. Marca en redes sociales:</strong> Mantén una marca personal pulida asegurándote de que tus fotos de perfil y publicaciones de "estilo de vida" siempre tengan un acabado de maquillaje profesional, sin el tiempo necesario para una aplicación completa en la vida real.</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isMarketingExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsMarketingExpanded(!isMarketingExpanded)} className="mt-4 text-smw-pink-dark font-bold hover:underline text-smw-gray-dark">
                            {isMarketingExpanded ? 'Leer menos' : 'Leer más'}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-2 md:p-6 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Vista ampliada" className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md" aria-label="Cerrar">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIMakeupStudio;