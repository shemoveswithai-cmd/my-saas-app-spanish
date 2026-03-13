import React, { useMemo, useRef, useState, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { convertFileToSupportedBase64 } from "../utils";
import { Spinner } from './common/Spinner';

interface AI1990sShootsProps {
    addCreations: (images: string[]) => void;
}

type Backdrop = { id: string; label: string; prompt: string; thumb: string };

const BACKDROPS: Backdrop[] = [
  { id: "drama_masks_bw", label: "Máscaras de Drama (B/N)", prompt: "high-contrast theatre comedy and tragedy masks pattern, black background, airbrush style, soft bokeh dots", thumb: 'radial-gradient(circle, #eeeeee, #333333)' },
  { id: "drama_masks_blue", label: "Máscaras de Drama (Azul)", prompt: "deep royal-blue theatre masks, airbrush glow, retro mall-photo vibe, soft bokeh lights", thumb: 'radial-gradient(circle, #4a90e2, #003366)' },
  { id: "neon_hearts_pink", label: "Corazones Neón (Rosa)", prompt: "pink neon hearts repeating pattern, soft bloom, retro 2000s mall studio backdrop", thumb: 'radial-gradient(ellipse at center, #ff79c6 0%, #ff5555 100%)' },
  { id: "airbrush_swirl_blue", label: "Remolinos Airbrush (Azul)", prompt: "ocean-blue airbrush swirls with soft white glow orbs, hazy retro bokeh", thumb: 'radial-gradient(circle, #89f7fe 0%, #66a6ff 100%)' },
  { id: "airbrush_stars_purple", label: "Estrellas Airbrush (Púrpura)", prompt: "vibrant purple airbrush stars with soft bokeh lights", thumb: 'radial-gradient(circle, #d491ff, #a255ff)' },
  { id: "cherries_dice", label: "Cerezas y Dados", prompt: "retro 90s aesthetic with floating cherries and dice pattern, airbrush glow", thumb: 'radial-gradient(circle, #bfff00, #4cd137)' },
  { id: "angel_wings", label: "Alas de Ángel", prompt: "ethereal white angel wings backdrop with soft glowing light", thumb: 'radial-gradient(circle, #fff, #c2e9fb)' },
  { id: "clouds_cotton", label: "Nubes de Algodón", prompt: "soft cotton clouds, sky gradient, bright airbrush glow and bokeh", thumb: 'linear-gradient(to top, #a1c4fd 0%, #c2e9fb 100%)' },
  { id: "blush_roses", label: "Rosas Rubor", prompt: "soft pink blush roses pattern, retro mall studio style", thumb: 'radial-gradient(circle, #ffccd5, #ffb3c1)' },
  { id: "glitter_bokeh_black", label: "Glitter Bokeh (Negro)", prompt: "black backdrop with silver glitter bokeh, retro studio", thumb: 'radial-gradient(circle, #555 0%, #000 100%)' },
  { id: "glitter_bokeh_blue", label: "Glitter Bokeh (Azul)", prompt: "deep blue backdrop with sparkling silver glitter bokeh", thumb: 'radial-gradient(circle, #0052d4, #4364f7, #6fb1fc)' },
  { id: "checkered_dream", label: "Sueño Cuadriculado", prompt: "retro checkered pattern with soft focus airbrush finish", thumb: 'conic-gradient(#555 0.25turn, #888 0.25turn 0.5turn, #555 0.5turn 0.75turn, #888 0.75turn) top left / 40px 40px repeat' },
  { id: "soft_graffiti", label: "Graffiti Suave", prompt: "soft pastel graffiti textures, 90s urban studio style", thumb: 'radial-gradient(circle, #ffafbd, #ffc3a0)' },
  { id: "soft_flames", label: "Llamas Suaves", prompt: "vibrant but soft airbrushed flames in warm tones", thumb: 'radial-gradient(circle, #ff9a9e, #fad0c4)' },
  { id: "money_bokeh", label: "Dinero y Bokeh", prompt: "stylized money patterns with high-end bokeh lighting", thumb: 'radial-gradient(circle, #4facfe, #00f2fe)' },
  { id: "butterflies_glow", label: "Mariposas (Brillo)", prompt: "glowing airbrushed butterflies on a dark atmospheric backdrop", thumb: 'radial-gradient(circle, #434343, #000)' },
  { id: "hearts_blue", label: "Corazones (Azul)", prompt: "glowing blue hearts repeating pattern, airbrush style", thumb: 'radial-gradient(circle, #1dd1a1, #10ac84)' },
  { id: "hearts_lavender", label: "Corazones (Lavanda)", prompt: "lavender and purple glowing hearts backdrop", thumb: 'radial-gradient(circle, #9c88ff, #4834d4)' },
  { id: "sparkle_stars_white", label: "Estrellas Brillantes (Blanco)", prompt: "clean white backdrop with silver airbrushed sparkle stars", thumb: 'radial-gradient(circle, #fdfbfb, #ebedee)' },
  { id: "baroque_scrolls", label: "Pergaminos Barrocos", prompt: "elegant silver or gold baroque scroll pattern on soft background", thumb: 'radial-gradient(circle, #f5f7fa, #c3cfe2)' },
  { id: "velvet_drape", label: "Cortina de Terciopelo", prompt: "deep velvet luxury drapes backdrop with soft rim lighting", thumb: 'linear-gradient(to bottom, #130f40, #000000)' },
  { id: "neon_grid", label: "Rejilla Neón", prompt: "retro 80s/90s neon grid lines with glowing purple light", thumb: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: "pearls_shimmer", label: "Perlas y Brillo", prompt: "shimmering pearlescent backdrop with soft focus bloom", thumb: 'radial-gradient(circle, #fff, #e2ebf0)' },
  { id: "snow_orbs", label: "Orbes de Nieve", prompt: "soft out-of-focus white snow orbs on a light blue background", thumb: 'radial-gradient(circle, #e6e9f0, #eef1f5)' },
];

const RATIOS = [
  { id: "1:1", label: "1:1 (Cuadrado)" },
  { id: "4:5", label: "4:5 Retrato" },
  { id: "9:16", label: "9:16 Retrato" },
  { id: "16:9", label: "16:9 Paisaje" },
];

const PROPS = [
  { id: "furRug", label: "Alfombra de Piel" },
  { id: "whiteCube", label: "Cubo Blanco" },
  { id: "mirrorTable", label: "Mesa de Espejo" },
  { id: "bouquet", label: "Ramo / Flores" },
  { id: "swing", label: "Posando en un Columpio" },
  { id: "featherBoa", label: "Boa de Plumas" },
  { id: "telephone", label: "Teléfono Clásico" },
  { id: "pedestal", label: "Pedestal / Columna" },
  { id: "balloons", label: "Globos" },
  { id: "confetti", label: "Confeti / Brillantina" },
];

const Step: React.FC<{ number: number | string; title: string; children: React.ReactNode; description?: string }> = ({ number, title, children, description }) => (
    <div className="bg-white/60 backdrop-blur-sm shadow-md p-5 rounded-lg border border-white/20">
        <h3 className="text-lg font-bold text-smw-gray-dark">Paso {number}: {title}</h3>
        {description && <p className="text-sm text-smw-gray-dark opacity-80 mt-1 mb-3">{description}</p>}
        <div className="mt-4">{children}</div>
    </div>
);

const AI1990sShoots: React.FC<AI1990sShootsProps> = ({ addCreations }) => {
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => () => previews.forEach(p => URL.revokeObjectURL(p)), [previews]);

  const [backdropId, setBackdropId] = useState(BACKDROPS[0].id);
  const [ratioId, setRatioId] = useState(RATIOS[1].id);
  const [props, setProps] = useState<Record<string, boolean>>({ furRug: true });
  const [customDetails, setCustomDetails] = useState('');

  // Load form state from localStorage
  useEffect(() => {
    const savedForm = localStorage.getItem('smwVintageStudioFormState');
    if (savedForm) {
        try {
            const parsed = JSON.parse(savedForm);
            if (parsed.backdropId) setBackdropId(parsed.backdropId);
            if (parsed.ratioId) setRatioId(parsed.ratioId);
            if (parsed.props) setProps(parsed.props);
            if (parsed.customDetails) setCustomDetails(parsed.customDetails);
        } catch (e) {
            console.error("Failed to load vintage studio form state", e);
        }
    }
  }, []);

  // Save form state to localStorage
  useEffect(() => {
    const formState = {
        backdropId,
        ratioId,
        props,
        customDetails
    };
    localStorage.setItem('smwVintageStudioFormState', JSON.stringify(formState));
  }, [backdropId, ratioId, props, customDetails]);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [isIntroExpanded, setIsIntroExpanded] = useState(false);
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
  const [isSalesTipsExpanded, setIsSalesTipsExpanded] = useState(false);
  const [isPropsModalOpen, setIsPropsModalOpen] = useState(false);

  async function handleGenerate() {
    if (files.length < 1) return setError("Por favor, sube al menos una foto.");
    setLoading(true);
    setResults([]);
    setError(null);

    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) throw new Error("Clave API no encontrada.");
        const ai = new GoogleGenAI({ apiKey });
        const backdrop = BACKDROPS.find(b => b.id === backdropId)!;
        const activeProps = PROPS.filter(p => props[p.id]).map(p => p.label).join(", ");
        
        const subjectParts = [];
        for (const f of files) {
            const { base64Data, mimeType } = await convertFileToSupportedBase64(f);
            subjectParts.push({ inlineData: { mimeType, data: base64Data } });
        }
        
        const generatedUrls = [];
        for (let i = 0; i < 4; i++) {
            const prompt = `**MISIÓN CRÍTICA: ESTUDIO DE GLAMOUR DE LOS AÑOS 90**
Recrea a la persona de la foto de origen con un 100% de precisión de identidad.
Entorno: Un nostálgico estudio de fotografía de glamour estilo centro comercial de los años 90. 
Estilo: Piel retocada con aerógrafo, brillo "bloom" de enfoque suave, iluminación de clave alta. 
Fondo: ${backdrop.prompt}. 
Accesorios: ${activeProps || "Ninguno"}.
Detalles Personalizados: ${customDetails || "Pose estándar de fotografía de glamour."}
Vibra general: Retrato de celebridad vintage de alta gama de una revista de los 90.
Semilla de singularidad: ${Math.random()}`;

            const res = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [...subjectParts, { text: prompt }] },
                config: { 
                    responseModalities: [Modality.IMAGE],
                    imageConfig: { aspectRatio: ratioId as any }
                },
            });
            const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                const url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                generatedUrls.push(url);
                setResults(prev => [...prev, { url }]);
            }
        }
        if (generatedUrls.length > 0) addCreations(generatedUrls);
    } catch (e) {
        setError("La generación falló. Por favor, inténtalo de nuevo.");
    } finally {
        setLoading(false);
    }
  }

  const handleClear = () => {
    setFiles([]);
    setResults([]);
    setError(null);
    setCustomDetails('');
    setProps({ furRug: true });
    setBackdropId(BACKDROPS[0].id);
    setRatioId(RATIOS[1].id);
  };

  return (
    <div className="flex flex-col h-full bg-smw-pink-light rounded-lg shadow-xl p-4 md:p-8 space-y-6 overflow-y-auto">
      <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-smw-pink/5 max-w-3xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold text-smw-black mb-2 uppercase tracking-tight">Sesiones IA de los 90</h1>
          <p className="text-xs md:text-sm text-smw-gray-dark opacity-70 max-w-xl mx-auto leading-relaxed">
              Recrea las icónicas fotos de glamour de los 90 con fondos retro, accesorios y un estilo retocado.
          </p>
      </div>

      <div className="flex flex-col gap-6">
          {/* Step 1 */}
          <Step 
            number={1} 
            title="Sube Fotos del Sujeto" 
            description="La cantidad de fotos que subas (1-3) determinará la cantidad de personas en la imagen final."
          >
              <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[140px] bg-white/40 rounded-lg flex flex-wrap items-center justify-center border-2 border-dashed border-smw-pink/30 cursor-pointer hover:bg-white transition-colors p-6"
              >
                  {previews.length > 0 ? (
                      <div className="flex gap-3">
                        {previews.map((p, idx) => <img key={idx} src={p} className="h-24 w-24 object-cover rounded shadow-md border-2 border-white" />)}
                      </div>
                  ) : (
                      <p className="text-sm text-smw-gray-dark opacity-60">Suelta hasta 3 fotos aquí o haz clic para subir</p>
                  )}
              </div>
              <input type="file" ref={fileInputRef} multiple onChange={e => e.target.files && setFiles(Array.from(e.target.files).slice(0, 3))} className="hidden" accept="image/*" />
          </Step>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Step 2 */}
              <Step number={2} title="Personaliza Tu Sesión">
                  <p className="text-sm text-smw-gray-dark font-bold mb-3">Fondo</p>
                  <div className="grid grid-cols-4 gap-2">
                      {BACKDROPS.map(b => (
                          <button 
                              key={b.id} 
                              onClick={() => setBackdropId(b.id)}
                              className={`aspect-square rounded-md overflow-hidden border-2 transition-all relative group ${backdropId === b.id ? 'border-smw-pink scale-105 shadow-md' : 'border-transparent'}`}
                          >
                              <div style={{ background: b.thumb }} className="w-full h-full" />
                              <div className="absolute inset-x-0 bottom-0 bg-[#1C1C1C] py-1.5 px-0.5">
                                <p className="text-[11px] font-bold text-white text-center leading-tight">{b.label}</p>
                              </div>
                          </button>
                      ))}
                  </div>
              </Step>

              {/* Step 3 */}
              <Step number={3} title="Ajustes de Salida">
                  <div className="space-y-6">
                    <div>
                        <p className="text-sm text-smw-gray-dark font-bold mb-3">Relación de Aspecto</p>
                        <div className="grid grid-cols-2 gap-2">
                            {RATIOS.map(r => (
                                <button 
                                    key={r.id} 
                                    onClick={() => setRatioId(r.id)}
                                    className={`py-2.5 px-3 text-sm font-regular rounded-md border transition-all ${ratioId === r.id ? 'bg-smw-pink text-smw-gray-dark border-smw-pink' : 'bg-white text-smw-gray-dark border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm text-smw-gray-dark font-bold mb-3">Accesorios</p>
                        <button 
                            onClick={() => setIsPropsModalOpen(true)}
                            className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 text-sm text-smw-gray-dark hover:border-smw-pink/50 transition-all group shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-smw-pink/20 p-2 rounded-lg group-hover:bg-smw-pink transition-colors">
                                    <svg className="h-5 w-5 text-smw-gray-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                </div>
                                <span className="font-bold">
                                    {Object.values(props).filter(Boolean).length === 0 
                                        ? "Ningún accesorio seleccionado" 
                                        : `${Object.values(props).filter(Boolean).length} accesorios seleccionados`}
                                </span>
                            </div>
                            <svg className="h-5 w-5 text-smw-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div>
                        <p className="text-sm text-smw-gray-dark font-bold mb-2">Añadir Detalles Personalizados (Opcional)</p>
                        <input 
                            type="text"
                            value={customDetails}
                            onChange={(e) => setCustomDetails(e.target.value)}
                            placeholder="ej., usando una chaqueta de cuero, sosteniendo una guitarra"
                            className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm text-smw-gray-dark focus:ring-2 focus:ring-smw-pink focus:outline-none placeholder:text-smw-gray-dark/40"
                        />
                    </div>
                  </div>
              </Step>
          </div>

          <div className="flex gap-3 pt-2">
              <button 
                  onClick={handleGenerate} 
                  disabled={loading || files.length < 1} 
                  className="px-8 bg-smw-pink text-smw-gray-dark font-bold py-3 rounded-md hover:opacity-90 disabled:opacity-50 transition-all shadow-md"
              >
                  {loading ? <Spinner className="mx-auto" /> : 'Generar 4 Fotos'}
              </button>
              <button 
                  onClick={handleClear}
                  className="px-8 bg-white text-smw-gray-dark font-bold py-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
              >
                  Limpiar
              </button>
          </div>

          {error && <div className="p-4 bg-red-900 text-white rounded-md text-sm text-center font-bold">{error}</div>}

          {/* Results Area */}
          <div className="bg-white/60 backdrop-blur-sm shadow-md p-6 rounded-lg border border-white/20 min-h-[400px]">
              <h3 className="text-lg font-bold text-smw-gray-dark mb-6">Resultados</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {results.length > 0 ? results.map((res, i) => (
                      <div key={i} className="relative aspect-square group">
                          <img 
                            src={res.url} 
                            className="w-full h-full object-cover rounded shadow-lg cursor-zoom-in transition-transform group-hover:scale-[1.02]" 
                            onClick={() => setZoomedImage(res.url)} 
                          />
                          <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={res.url} download className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80 shadow-md">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              </a>
                          </div>
                      </div>
                  )) : (
                      <div className="col-span-full h-64 flex items-center justify-center">
                        <p className="text-smw-gray-dark opacity-60 text-center font-medium">Tus fotos generadas aparecerán aquí.</p>
                      </div>
                  )}
                  {loading && results.length < 4 && [...Array(4 - results.length)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/40 rounded flex flex-col items-center justify-center">
                        <Spinner className="w-8 h-8 text-smw-gray-dark opacity-40" />
                        <p className="text-[10px] font-bold text-smw-gray-dark opacity-40 mt-2 uppercase tracking-widest">Retocando...</p>
                    </div>
                  ))}
              </div>
          </div>
      </div>

      <div className="space-y-6 mt-12 border-t border-smw-pink/20 pt-10">
          {/* Introduction Box */}
          <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/20">
              <h2 className="text-2xl font-bold text-smw-gray-dark mb-6 text-center">Introducción</h2>
              <div className={`text-smw-gray-dark space-y-4 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px]' : 'max-h-[120px]'}`}>
                  <p>El Estudio de Glamour de los 90 trae de vuelta la icónica experiencia de los estudios fotográficos retro: ediciones suaves con aerógrafo, fondos de neón de ensueño, efectos de brillantina y las clásicas vibras de retratos de centros comerciales.</p>
                  <p>Sube tus fotos, elige tu fondo, añade accesorios opcionales y el sistema convertirá instantáneamente tu imagen en un retrato vintage estilo años 90 con esa estética nostálgica que todos recuerdan.</p>
                  <p>Es una forma divertida y creativa de recrear vibras de fotos escolares, tomas de estudio glamurosas, retratos del pasado o fotos grupales con un toque retro.</p>
                  <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/60 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
              </div>
              <div className="text-center">
                  <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-sm text-smw-pink hover:text-smw-pink-dark font-bold uppercase tracking-widest">
                      {isIntroExpanded ? 'Leer Menos' : 'Leer Más'}
                  </button>
              </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/20">
              <h2 className="text-2xl font-bold text-smw-gray-dark mb-8 text-center uppercase tracking-widest">Cómo Funciona</h2>
              <div className={`text-smw-gray-dark space-y-8 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[3000px]' : 'max-h-[300px]'}`}>
                  <section>
                      <h3 className="font-bold text-base mb-2">Paso 1 – Sube Tus Fotos</h3>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Haz clic dentro del cuadro de carga.</li>
                          <li>Añade de 1 a 3 fotos de la persona (o personas) que quieras en la imagen.</li>
                          <li>La cantidad de fotos que subas = la cantidad de personas en la imagen final.</li>
                          <li>Usa fotos claras con buena luz para obtener los mejores resultados.</li>
                      </ul>
                  </section>
                  
                  <section>
                      <h3 className="font-bold text-base mb-2">Paso 2 – Personaliza Tu Sesión</h3>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Desplázate por los fondos y haz clic en el que más te guste (neón, brillantina, nubes, terciopelo, etc.).</li>
                          <li>En Accesorios, marca cualquier artículo que quieras añadir (alfombra de piel, mesa de espejo, flores, globos, etc.).</li>
                          <li>Deja los accesorios sin marcar si prefieres un aspecto limpio y sencillo.</li>
                      </ul>
                  </section>
                  
                  <section>
                      <h3 className="font-bold text-base mb-2">Paso 3 – Elige el Tamaño y la Cantidad de Fotos</h3>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>En Relación de Aspecto, elige el tamaño que necesites:</li>
                          <li className="ml-6"><strong>1:1 (Cuadrado)</strong> – ideal para fotos de perfil y publicaciones.</li>
                          <li className="ml-6"><strong>4:5 Retrato</strong> – genial para el feed de Instagram.</li>
                          <li className="ml-6"><strong>9:16 Retrato</strong> – perfecto para Reels, TikTok e Historias.</li>
                          <li className="ml-6"><strong>16:9 Paisaje</strong> – aspecto cinematográfico de pantalla ancha.</li>
                      </ul>
                  </section>

                  <section>
                      <h3 className="font-bold text-base mb-2">Añadir Detalles Personalizados (Opcional)</h3>
                      <p className="mb-2">Usa este cuadro si quieres que la IA añada algo extra a tu foto de los 90 o haga pequeños cambios en el estilo.</p>
                      <p className="mb-1">Puedes escribir cosas como:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>“usando una chaqueta rosa de los 90”</li>
                          <li>“añadir maquillaje brillante”</li>
                          <li>“combinar los colores del fondo con el atuendo”</li>
                          <li>“añadir un suave brillo de aerógrafo”</li>
                          <li>“cambiar el atuendo a un look de mezclilla de los 90”</li>
                          <li>“añadir lindos accesorios para el cabello de los 90”</li>
                          <li>“añadir un accesorio divertido como un teléfono o un radiocasete”</li>
                      </ul>
                      <p className="mt-2 italic">Este paso es opcional, pero te ayuda a personalizar tu retrato de los 90 exactamente como lo imaginas.</p>
                  </section>

                  <section>
                      <h3 className="font-bold text-base mb-2">Paso 4 – Genera Tus Fotos de los 90</h3>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Haz clic en Generar 4 Fotos (o el botón que veas).</li>
                          <li>Espera unos momentos mientras la IA crea tus imágenes.</li>
                          <li>Tus resultados aparecerán en el cuadro de Resultados en la parte inferior.</li>
                          <li>Haz clic en cada imagen para guardar o descargar tus nuevas fotos de glamour de los 90.</li>
                      </ul>
                  </section>
                  <div className={`absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white/60 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
              </div>
              <div className="text-center">
                  <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-sm text-smw-pink hover:text-smw-pink-dark font-bold uppercase tracking-widest">
                      {isHowItWorksExpanded ? 'Leer Menos' : 'Leer Más'}
                  </button>
              </div>
          </div>

          {/* Sales Tips Box */}
          <div className="bg-white/60 backdrop-blur-sm shadow-md p-8 rounded-lg border border-white/20">
              <h2 className="text-2xl font-bold text-smw-gray-dark mb-8 text-center">✨ Consejos de Venta: Cómo Usar Tus Fotos de los 90</h2>
              <div className={`text-smw-gray-dark space-y-6 leading-relaxed text-sm transition-all duration-500 ease-in-out overflow-hidden relative ${isSalesTipsExpanded ? 'max-h-[2000px]' : 'max-h-[300px]'}`}>
                  <section>
                      <h3 className="font-bold text-base">Vende Sesiones Fotográficas de Nostalgia</h3>
                      <p>Ofrece sesiones virtuales estilo años 90 como un servicio. Tus clientes suben sus fotos y tú entregas un set de retratos retro. Esto puede convertirse en un complemento divertido para cumpleaños, vacaciones o eventos temáticos.</p>
                  </section>
                  
                  <section>
                      <h3 className="font-bold text-base">Crea Contenido para Redes Sociales con Temática de los 90</h3>
                      <p>Usa estas imágenes para destacar en Instagram, Facebook o TikTok con una estética retro única. Ideal para páginas estéticas, influencers o cualquier persona que quiera una vibra divertida del pasado.</p>
                  </section>
                  
                  <section>
                      <h3 className="font-bold text-base">Haz Pósteres Digitales y Gráficos</h3>
                      <p>Convierte las fotos en portadas de revistas de los 90, ediciones de cintas de casete, pósteres estilo álbum o volantes retro. Esto es perfecto para productos digitales o arte imprimible.</p>
                  </section>

                  <section>
                      <h3 className="font-bold text-base">Ofrécelos como un Mini-Servicio de Pago</h3>
                      <p>Si eres creador o dueño de un negocio, puedes cobrar por retratos personalizados de los 90. Solo sube, genera y envía las fotos finales como parte de un “Paquete de Renovación de los 90”.</p>
                  </section>

                  <section>
                      <h3 className="font-bold text-base">Úsalos para la Personalidad de Marca</h3>
                      <p>Las pequeñas empresas pueden crear publicaciones temáticas divertidas, imágenes del personal al estilo retro o gráficos de marketing de los 90 para añadir personalidad a su marca.</p>
                  </section>

                  <section>
                      <h3 className="font-bold text-base">Crea Merchandising</h3>
                      <p>Convierte las fotos de los 90 en pegatinas, fondos de pantalla para el móvil, impresiones digitales o incluso diseños de camisetas para tu audiencia o clientes.</p>
                  </section>

                  <section>
                      <h3 className="font-bold text-base">Fotos Grupales para Fomentar la Interacción</h3>
                      <p>Amigos, parejas y familias pueden recrear la clásica vibra de los estudios de centros comerciales; estas fotos siempre obtienen mucha interacción y comentarios cuando se publican en línea.</p>
                  </section>
                  
                  <div className={`absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white/60 to-transparent ${isSalesTipsExpanded ? 'hidden' : ''}`} />
              </div>
              <div className="text-center">
                  <button onClick={() => setIsSalesTipsExpanded(!isSalesTipsExpanded)} className="mt-4 text-sm text-smw-pink hover:text-smw-pink-dark font-bold uppercase tracking-widest">
                      {isSalesTipsExpanded ? 'Leer Menos' : 'Leer Más'}
                  </button>
              </div>
          </div>
      </div>

      {zoomedImage && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-10 animate-fade-in" onClick={() => setZoomedImage(null)}>
              <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                  <img src={zoomedImage} alt="Expanded" className="max-w-full max-h-full object-contain rounded shadow-2xl border-4 border-white/10" />
                  <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-5 md:right-5 bg-black/60 hover:bg-black/80 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md">&times;</button>
              </div>
          </div>
      )}

      {isPropsModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setIsPropsModalOpen(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-xl font-black text-smw-gray-dark uppercase tracking-tight">Accesorios</h3>
                      <button onClick={() => setIsPropsModalOpen(false)} className="text-gray-400 hover:text-smw-pink transition-colors">
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                      <div className="grid grid-cols-1 gap-3">
                          {PROPS.map(p => (
                              <label key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${props[p.id] ? 'border-smw-pink bg-smw-pink/5 shadow-sm' : 'border-gray-100 hover:border-smw-pink/30 hover:bg-gray-50'}`}>
                                  <span className={`text-base font-bold transition-colors ${props[p.id] ? 'text-smw-gray-dark' : 'text-smw-gray-dark/70'}`}>{p.label}</span>
                                  <div className="relative flex items-center">
                                      <input 
                                          type="checkbox" 
                                          checked={!!props[p.id]} 
                                          onChange={() => setProps(prev => ({...prev, [p.id]: !prev[p.id]}))} 
                                          className="w-6 h-6 rounded-full border-gray-300 text-smw-pink focus:ring-smw-pink transition-all cursor-pointer" 
                                      />
                                  </div>
                              </label>
                          ))}
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
                      <p className="text-xs text-center text-smw-gray-dark opacity-50 font-bold uppercase tracking-widest">
                        {Object.values(props).filter(Boolean).length} seleccionados
                      </p>
                      <button 
                          onClick={() => setIsPropsModalOpen(false)}
                          className="w-full py-4 bg-smw-pink text-smw-gray-dark font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-md"
                      >
                          Confirmar Selección
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AI1990sShoots;