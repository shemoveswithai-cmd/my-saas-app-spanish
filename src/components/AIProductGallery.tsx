import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';
import { useLanguage } from '../context/LanguageContext';

interface AIProductGalleryProps {
    addCreations: (images: string[]) => void;
}

const sceneCategories = [
    {
        name: 'Minimalist Studio',
        prompts: [
            'on a clean, seamless white studio backdrop with soft professional lighting',
            'on a minimalist concrete pedestal with architectural shadows',
            'on a light oak wooden shelf against a neutral beige wall',
            'floating elegantly in a void with a soft color-gradient background'
        ]
    },
    {
        name: 'Lifestyle & In-Use',
        prompts: [
            'being used in a natural, candid setting that looks like a real-life moment',
            'casually held by a person in a realistic everyday environment',
            'sitting on a park bench next to a personal item like a bag or book',
            'in a vibrant urban setting, captured in mid-action'
        ]
    },
    {
        name: 'Nature & Outdoors',
        prompts: [
            'resting on a mossy rock in a sun-drenched forest clearing',
            'on a white sand beach with turquoise ocean waves in the blurred background',
            'on a rustic wooden picnic table in a lush green park',
            'against a background of vibrant spring flowers and soft bokeh'
        ]
    },
    {
        name: 'Home & Interior',
        prompts: [
            'on a modern marble kitchen countertop with high-end appliances nearby',
            'on a stylish coffee table in a bright, airy scandinavian living room',
            'neatly arranged on a bedside table in a cozy, sunlit bedroom',
            'on a sleek bathroom vanity surrounded by luxury skincare items'
        ]
    },
    {
        name: 'Abstract & Cosmetics',
        prompts: [
            'surrounded by artistic splashes of water and liquid textures',
            'placed among geometric glass shapes with prismatic light reflections',
            'on a reflective mirror surface with soft-focus floral elements',
            'with dramatic macro lighting showcasing fine product textures'
        ]
    },
    {
        name: 'Food & Beverage',
        prompts: [
            'placed elegantly on a marble table with garnishes and gourmet culinary props',
            'next to a fresh espresso in a high-end breakfast cafe setting',
            'on a rustic cutting board with fresh organic ingredients scattered around',
            'in a dark, moody bar setting with atmospheric lighting'
        ]
    },
    {
        name: 'Hero Shots',
        prompts: [
            'dramatic low-angle lighting with high contrast against a stark, premium black backdrop',
            'illuminated by a single powerful spotlight creating long artistic shadows',
            'with a majestic smoke or mist effect swirling around the base',
            'captured in an epic cinematic composition with lens flares'
        ]
    },
    {
        name: 'Luxury Retail',
        prompts: [
            'displayed in a high-end boutique window with gold accents',
            'on a velvet display stand in a luxury jewelry store',
            'part of a premium flagship store arrangement with glass and chrome',
            'showcased in an exclusive designer showroom'
        ]
    },
    {
        name: 'Cyberpunk & Neon',
        prompts: [
            'illuminated by vibrant purple and blue neon lights in a futuristic urban setting',
            'on a wet city street at night with glowing signs reflected in the ground',
            'in a high-tech lab with glowing digital interfaces in the background',
            'with glitch-style light effects and a moody synthwave aesthetic'
        ]
    },
    {
        name: 'Vintage & Retro',
        prompts: [
            'in a nostalgic 70s themed room with warm grains and analog textures',
            'on a wooden vinyl player cabinet with a warm film-photography look',
            'surrounded by retro technology and mid-century modern furniture',
            'with a classic sepia-toned or Polaroid-style color grade'
        ]
    },
    {
        name: 'Seasonal & Holiday',
        prompts: [
            'decorated with festive ornaments and cozy winter holiday lighting',
            'placed on a sun-drenched porch with autumn leaves and pumpkins',
            'in a bright spring setting with blooming flowers and butterflies',
            'on a summer poolside deck with bright tropical vibes'
        ]
    },
    {
        name: 'High-Fashion Editorial',
        prompts: [
            'part of a complex, artistic high-fashion composition with avant-garde props',
            'as a centerpiece in a surreal, dream-like art installation',
            'captured with experimental double-exposure lighting and high-grain texture',
            'set against a dramatic architectural background with sharp angles'
        ]
    },
    {
        name: 'Luxury Restroom',
        prompts: [
            'on a sleek marble vanity in a high-end luxury bathroom with gold fixtures',
            'next to a freestanding soaking tub with soft ambient spa lighting',
            'on a polished stone shelf surrounded by high-end apothecary bottles',
            'in a modern minimalist restroom with floor-to-ceiling porcelain tiles'
        ]
    },
    {
        name: 'Professional Office',
        prompts: [
            'on a polished mahogany desk in a high-end executive office',
            'next to a modern laptop and designer stationery in a bright workspace',
            'on a glass conference table with a blurred city skyline background',
            'in a creative studio setting with mood boards and architectural tools'
        ]
    },
    {
        name: 'Modern Gym',
        prompts: [
            'on a clean workout bench in a high-tech boutique fitness studio',
            'next to a set of chrome dumbbells on a professional rubber floor',
            'in a bright yoga studio with natural wood floors and large mirrors',
            'on a sleek treadmill console with a blurred gym background'
        ]
    },
    {
        name: 'Artistic Studio',
        prompts: [
            'on a paint-splattered wooden table in a sunlit artist loft',
            'surrounded by pottery tools and raw clay in a rustic ceramic studio',
            'next to a blank canvas and professional brushes in a creative space',
            'on a vintage drafting table with architectural sketches'
        ]
    },
    {
        name: 'Industrial Workshop',
        prompts: [
            'on a heavy-duty metal workbench with industrial tools in the background',
            'surrounded by raw materials like wood and steel in a maker space',
            'in a moody garage setting with dramatic overhead spotlighting',
            'on a weathered concrete floor with industrial machinery bokeh'
        ]
    },
    {
        name: 'Coastal & Nautical',
        prompts: [
            'on a weathered teak deck of a luxury yacht with ocean views',
            'next to a piece of driftwood on a serene, private beach',
            'on a white-washed wooden table in a bright coastal cottage',
            'surrounded by seashells and nautical ropes on a sandy shore'
        ]
    },
    {
        name: 'Tech & Gaming',
        prompts: [
            'on a sleek RGB-lit gaming desk with high-end peripherals',
            'next to a custom-built PC with glowing internal components',
            'in a futuristic command center with multiple digital displays',
            'on a minimalist tech setup with clean cable management'
        ]
    }
];

const aspectRatios = [
    { label: 'Square (1:1)', value: '1:1' },
    { label: 'Portrait (3:4)', value: '3:4' },
    { label: 'Tall (9:16)', value: '9:16' },
    { label: 'Landscape (4:3)', value: '4:3' },
    { label: 'Wide (16:9)', value: '16:9' }
];

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white/70 shadow-sm p-6 rounded-xl border border-white/50 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">{t('Step', 'Paso')} {number}: {title}</h3>
            {children}
        </div>
    );
};

const AIProductGallery: React.FC<AIProductGalleryProps> = ({ addCreations }) => {
    const { t } = useLanguage();
    const [productImages, setProductImages] = useState<{ id: string, file: File, preview: string }[]>([]);
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'category' | 'custom'>('category');
    const [selectedCategory, setSelectedCategory] = useState(sceneCategories[0]);
    const [selectedPrompt, setSelectedPrompt] = useState(sceneCategories[0].prompts[0]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwProductGalleryFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedPrompt) setSelectedPrompt(parsed.selectedPrompt);
                if (parsed.customPrompt) setCustomPrompt(parsed.customPrompt);
                if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
                if (parsed.activeTab) setActiveTab(parsed.activeTab);
            } catch (e) {
                console.error("Failed to load product gallery form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedPrompt,
            customPrompt,
            aspectRatio,
            activeTab
        };
        localStorage.setItem('smwProductGalleryFormState', JSON.stringify(formState));
    }, [selectedPrompt, customPrompt, aspectRatio, activeTab]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const [isIntroExpanded, setIsIntroExpanded] = useState(false);
    const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);
    const [isSalesMonetizationExpanded, setIsSalesMonetizationExpanded] = useState(false);
    const [isProTipsExpanded, setIsProTipsExpanded] = useState(false);

    const productInputRef = useRef<HTMLInputElement>(null);
    const personInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            productImages.forEach(img => URL.revokeObjectURL(img.preview));
            if (personImage) URL.revokeObjectURL(personImage.preview);
        };
    }, [productImages, personImage]);

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map((f: File) => ({
                id: `${f.name}-${Date.now()}`,
                file: f,
                preview: URL.createObjectURL(f)
            }));
            setProductImages(prev => [...prev, ...newFiles].slice(0, 5));
        }
        if (e.target) e.target.value = '';
    };

    const handlePersonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (personImage) URL.revokeObjectURL(personImage.preview);
            setPersonImage({ file, preview: URL.createObjectURL(file) });
        }
        if (e.target) e.target.value = '';
    };

    const handleGenerate = async () => {
        if (productImages.length === 0) {
            setError(t('Please upload at least one product image.', 'Por favor, sube al menos una imagen del producto.'));
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const sceneText = activeTab === 'category' ? selectedPrompt : customPrompt;
            const sessionImages: string[] = [];

            for (let i = 0; i < 6; i++) {
                const parts: Part[] = [{ text: "SOURCE PRODUCT IMAGES:" }];
                for (const img of productImages) {
                    parts.push({ inlineData: { mimeType: img.file.type, data: await fileToBase64(img.file) } });
                }

                if (personImage) {
                    parts.push({ text: "SOURCE PERSON IMAGE:" });
                    parts.push({ inlineData: { mimeType: personImage.file.type, data: await fileToBase64(personImage.file) } });
                }

                const promptText = `**CRITICAL MISSION: PROFESSIONAL PRODUCT PHOTOSHOOT**
Create a high-end e-commerce photograph.
Product: Provided in source product images.
${personImage ? 'Person: The person from the source person image MUST be featured in the photoshoot with the product, interacting with it naturally.' : 'The photoshoot should focus on the product alone.'}
Setting: ${sceneText}.
Style: Photorealistic, professional studio lighting, crisp textures, high-resolution.
100% Identity Accuracy: If a person is featured, their face and likeness must exactly match the source.
Composition: Commercial-grade product placement.
Iteration: ${i + 1}`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [...parts, { text: promptText }] },
                    config: { 
                        responseModalities: [Modality.IMAGE],
                        imageConfig: { aspectRatio: aspectRatio as any }
                    },
                });

                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    const src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    sessionImages.push(src);
                    setGeneratedImages(prev => [...prev, src]);
                }
            }
            if (sessionImages.length > 0) addCreations(sessionImages);
        } catch (e) {
            setError(t('Generation failed. Please try again.', 'La generación falló. Por favor, inténtalo de nuevo.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col bg-rosa-claro min-h-full p-4 md:p-8 space-y-6 overflow-y-auto">
            <div className="bg-white rounded-[1.5rem] shadow-sm p-5 md:p-6 text-center mb-6 border border-rosa-principal/5 max-w-3xl mx-auto">
                <h1 className="text-xl md:text-2xl font-bold text-negro-fondo mb-2 uppercase tracking-tight">{t('AI Product Gallery', 'Galería de Productos con IA')}</h1>
                <p className="text-xs md:text-sm text-negro-fondo opacity-70 max-w-xl mx-auto leading-relaxed">
                    {t('Create professional photoshoots for your products in any scene or style, with or without a model, with high-fidelity results.', 'Crea sesiones de fotos profesionales para tus productos en cualquier escena o estilo, con o sin modelo, con resultados de alta fidelidad.')}
                </p>
            </div>

            {/* Step 1: Product Images */}
            <Step number={1} title={t('Add Product Images', 'Añadir Imágenes del Producto')}>
                <p className="text-base text-gray-600 font-medium">{t('Upload 1-5 images of your product. For best results, use images with a clean background.', 'Sube de 1 a 5 imágenes de tu producto. Para mejores resultados, usa imágenes con un fondo limpio.')}</p>
                <div className="flex flex-wrap gap-4 mt-2">
                    {productImages.map(img => (
                        <div key={img.id} className="relative w-40 h-40 group">
                            <img src={img.preview} className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" alt={t('Product', 'Producto')} />
                            <button onClick={() => setProductImages(prev => prev.filter(x => x.id !== img.id))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow-md transition-all">&times;</button>
                        </div>
                    ))}
                    {productImages.length < 5 && (
                        <div 
                            onClick={() => productInputRef.current?.click()} 
                            className="w-40 h-40 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-pink-200 cursor-pointer hover:border-rosa-principal transition-colors p-4 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 group-hover:text-rosa-principal mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16v1a3 3 0 013-3h10a3 3 0 013 3v1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                            <p className="text-sm font-bold text-gray-400 group-hover:text-gray-600 text-center">{t('Click to add product', 'Haz clic para añadir producto')}</p>
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">PNG, JPG, WEBP</p>
                        </div>
                    )}
                </div>
                <input type="file" ref={productInputRef} multiple onChange={handleProductUpload} className="hidden" accept="image/*" />
            </Step>

            {/* Step 2: Person (Optional) */}
            <Step number={2} title={t('Add a Person (Optional)', 'Añadir una Persona (Opcional)')}>
                <p className="text-base text-gray-600 font-medium">{t('Optionally, upload a photo of a person to feature them in the photoshoot with your product.', 'Opcionalmente, sube una foto de una persona para incluirla en la sesión de fotos con tu producto.')}</p>
                <div className="mt-2">
                    {personImage ? (
                        <div className="relative w-40 h-40">
                            <img src={personImage.preview} className="w-full h-full object-cover rounded-xl border border-gray-100 shadow-sm" alt={t('Person', 'Persona')} />
                            <button onClick={() => setPersonImage(null)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow-md transition-all">&times;</button>
                        </div>
                    ) : (
                        <div 
                            onClick={() => personInputRef.current?.click()} 
                            className="w-40 h-40 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-pink-200 cursor-pointer hover:border-rosa-principal transition-colors p-4 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 group-hover:text-rosa-principal mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <p className="text-sm font-bold text-gray-400 group-hover:text-gray-600 text-center">{t('Click to add person', 'Haz clic para añadir persona')}</p>
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">PNG, JPG, WEBP</p>
                        </div>
                    )}
                </div>
                <input type="file" ref={personInputRef} onChange={handlePersonUpload} className="hidden" accept="image/*" />
            </Step>

            {/* Step 3: Craft Your Scene */}
            <Step number={3} title={t('Craft Your Scene', 'Crea tu Escena')}>
                <div className="space-y-6">
                    <div className="flex border-b border-gray-100">
                        <button 
                            onClick={() => setActiveTab('category')} 
                            className={`px-6 py-2 text-sm font-bold transition-all ${activeTab === 'category' ? 'border-b-2 border-rosa-principal text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('Category Prompts', 'Prompts por Categoría')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('custom')} 
                            className={`px-6 py-2 text-sm font-bold transition-all ${activeTab === 'custom' ? 'border-b-2 border-rosa-principal text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('Custom Prompt', 'Prompt Personalizado')}
                        </button>
                    </div>

                    {activeTab === 'category' ? (
                        <div className="space-y-4">
                            <select 
                                value={selectedCategory.name} 
                                onChange={e => {
                                    const cat = sceneCategories.find(c => c.name === e.target.value)!;
                                    setSelectedCategory(cat);
                                    setSelectedPrompt(cat.prompts[0]);
                                }}
                                className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none text-gray-900 font-medium"
                            >
                                {sceneCategories.map(cat => (
                                    <option key={cat.name} value={cat.name}>
                                        {t(cat.name, {
                                            'Minimalist Studio': 'Estudio Minimalista',
                                            'Lifestyle & In-Use': 'Estilo de Vida y en Uso',
                                            'Nature & Outdoors': 'Naturaleza y Exteriores',
                                            'Home & Interior': 'Hogar e Interior',
                                            'Abstract & Cosmetics': 'Abstracto y Cosméticos',
                                            'Food & Beverage': 'Alimentos y Bebidas',
                                            'Hero Shots': 'Tomas Heroicas',
                                            'Luxury Retail': 'Venta de Lujo',
                                            'Cyberpunk & Neon': 'Cyberpunk y Neón',
                                            'Vintage & Retro': 'Vintage y Retro',
                                            'Seasonal & Holiday': 'Estacional y Festivo',
                                            'High-Fashion Editorial': 'Editorial de Alta Moda',
                                            'Luxury Restroom': 'Baño de Lujo',
                                            'Professional Office': 'Oficina Profesional',
                                            'Modern Gym': 'Gimnasio Moderno',
                                            'Artistic Studio': 'Estudio Artístico',
                                            'Industrial Workshop': 'Taller Industrial',
                                            'Coastal & Nautical': 'Costero y Náutico',
                                            'Tech & Gaming': 'Tecnología y Gaming'
                                        }[cat.name] || cat.name)}
                                    </option>
                                ))}
                            </select>
                            <div className="relative flex items-center">
                                <input 
                                    type="text" 
                                    value={selectedPrompt} 
                                    onChange={e => setSelectedPrompt(e.target.value)}
                                    className="flex-1 bg-white border-2 border-gray-100 rounded-xl p-3 pr-12 text-sm focus:ring-2 focus:ring-rosa-principal outline-none text-gray-900 font-medium"
                                />
                                <button 
                                    onClick={() => setSelectedPrompt(selectedCategory.prompts[Math.floor(Math.random() * selectedCategory.prompts.length)])} 
                                    className="absolute right-2 bg-rosa-principal p-1.5 rounded-lg text-black shadow-sm transition-transform active:scale-95"
                                    title={t('Shuffle Prompt', 'Mezclar Prompt')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <textarea 
                            value={customPrompt} 
                            onChange={e => setCustomPrompt(e.target.value)} 
                            placeholder={t('e.g., A minimalist product display on a marble table with soft morning sunlight...', 'ej., Una exhibición minimalista de productos en una mesa de mármol con luz solar suave de la mañana...')}
                            className="w-full h-24 bg-white border-2 border-gray-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-rosa-principal focus:border-transparent outline-none resize-none text-gray-900 font-medium"
                        />
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{t('Aspect Ratio', 'Relación de Aspecto')}</label>
                        <select 
                            value={aspectRatio} 
                            onChange={e => setAspectRatio(e.target.value)}
                            className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rosa-principal outline-none text-gray-900 font-medium"
                        >
                            {aspectRatios.map(ar => (
                                <option key={ar.value} value={ar.value}>
                                    {t(ar.label, {
                                        'Square (1:1)': 'Cuadrado (1:1)',
                                        'Portrait (3:4)': 'Retrato (3:4)',
                                        'Tall (9:16)': 'Alto (9:16)',
                                        'Landscape (4:3)': 'Paisaje (4:3)',
                                        'Wide (16:9)': 'Ancho (16:9)'
                                    }[ar.label] || ar.label)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </Step>

            {/* Step 4: Generate */}
            <Step number={4} title={t('Generate!', '¡Generar!')}>
                <p className="text-base text-gray-600 font-medium">{t('Generate 6 high-quality images for your product gallery.', 'Genera 6 imágenes de alta calidad para tu galería de productos.')}</p>
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading || productImages.length === 0} 
                    className="w-full bg-rosa-principal text-black font-bold py-4 rounded-xl hover:bg-white disabled:bg-rosa-principal/50 disabled:cursor-not-allowed shadow-md text-lg transition-all"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 bg-black rounded-sm animate-pulse"></div>
                            <span>{t('Your photos are being generated...', 'Tus fotos se están generando...')}</span>
                        </div>
                    ) : t('Generate 6 Photos', 'Generar 6 Fotos')}
                </button>
            </Step>

            {/* Result Box */}
            <div className="bg-white/70 shadow-sm p-6 rounded-xl border border-white/50 space-y-6">
                <h3 className="text-xl font-bold text-gray-900">{t('Your Product Photoshoot', 'Tu Sesión de Fotos de Producto')}</h3>
                <div className="min-h-[400px] relative">
                    {error && <div className="absolute top-0 left-0 right-0 p-4 bg-red-900 text-white rounded-xl text-center font-bold z-10">{error}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-square bg-white rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden relative shadow-inner group">
                                {isLoading && i >= generatedImages.length ? (
                                    <div className="text-center p-4 flex flex-col items-center justify-center h-full">
                                        <div className="w-12 h-12 bg-rosa-principal rounded-lg mb-4 animate-pulse shadow-sm"></div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">{t('Photos are being generated...', 'Las fotos se están generando...')}</p>
                                    </div>
                                ) : generatedImages[i] ? (
                                    <div className="relative group w-full h-full">
                                        <img src={generatedImages[i]} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105" onClick={() => setZoomedImage(generatedImages[i])} alt={t('Gallery Result', 'Resultado de la Galería')} />
                                        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setZoomedImage(generatedImages[i])} className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80 backdrop-blur-sm shadow-md transition-transform active:scale-95"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg></button>
                                            <a href={generatedImages[i]} download className="bg-black/60 text-white p-2 rounded-full hover:bg-black/80 backdrop-blur-sm shadow-md transition-transform active:scale-95"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                                        </div>
                                    </div>
                                ) : <span className="text-gray-100 text-6xl font-bold">{i + 1}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Information Boxes */}
            <div className="space-y-6 pt-10 border-t border-rosa-principal/20">
                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Introduction', 'Introducción')}</h2>
                    <div className={`text-gray-700 space-y-4 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isIntroExpanded ? 'max-h-[1000px] overflow-y-auto' : 'max-h-[150px]'}`}>
                        <p>{t('The AI Product Gallery is a specialized tool for creators, e-commerce boutique owners, and entrepreneurs who need high-end commercial photography without the high-end budget. Instead of spending thousands on studio rentals and photographers, you can now generate world-class product visuals in seconds.', 'La Galería de Productos con IA es una herramienta especializada para creadores, dueños de boutiques de comercio electrónico y emprendedores que necesitan fotografía comercial de alta gama sin el presupuesto de alta gama. En lugar de gastar miles en alquileres de estudios y fotógrafos, ahora puedes generar visuales de productos de clase mundial en segundos.')}</p>
                        <p>{t('Our AI accurately recognizes your product\'s form, texture, and branding, then intelligently places it into professionally lit, beautifully styled scenes. Whether you need a minimalist studio look or a lifestyle shot with a model, this tool handles the heavy lifting, delivering consistency and quality for your brand.', 'Nuestra IA reconoce con precisión la forma, textura y marca de tu producto, luego lo coloca inteligentemente en escenas con iluminación profesional y un estilo hermoso. Ya sea que necesites un aspecto de estudio minimalista o una toma de estilo de vida con un modelo, esta herramienta se encarga del trabajo pesado, ofreciendo consistencia y calidad para tu marca.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isIntroExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsIntroExpanded(!isIntroExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isIntroExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('How It Works', 'Cómo Funciona')}</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isHowItWorksExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>{t('Step 1: Add Product Images', 'Paso 1: Añadir Imágenes del Producto')}</strong> - {t('Upload up to 5 clear photos of your product. Multiple angles help the AI understand the geometry and texture better. Use a clean background for best results.', 'Sube hasta 5 fotos claras de tu producto. Múltiples ángulos ayudan a la IA a entender mejor la geometría y la textura. Usa un fondo limpio para mejores resultados.')}</p>
                        <p><strong>{t('Step 2: Add a Person (Optional)', 'Paso 2: Añadir una Persona (Opcional)')}</strong> - {t('If you want your product to be modeled, upload a clear photo of yourself or a model. The AI will integrate the product into their hands or the scene with them.', 'Si quieres que tu producto sea modelado, sube una foto clara de ti mismo o de un modelo. La IA integrará el producto en sus manos o en la escena con ellos.')}</p>
                        <p><strong>{t('Step 3: Craft Your Scene', 'Paso 3: Crea tu Escena')}</strong> - {t('Choose from curated categories like "Minimalism Studio Lifestyle" or "In Use Natural & Outdoors." You can also write a completely custom description to fit your unique brand vibe.', 'Elige entre categorías curadas como "Estilo de Vida en Estudio Minimalista" o "En Uso Natural y Exteriores". También puedes escribir una descripción completamente personalizada para que se ajuste al ambiente único de tu marca.')}</p>
                        <p><strong>{t('Step 4: Generate', 'Paso 4: Generar')}</strong> - {t('Click the button and receive 6 high-resolution variations. Our engine ensures the product remains consistent while varying the angle and lighting for each shot.', 'Haz clic en el botón y recibe 6 variaciones de alta resolución. Nuestro motor asegura que el producto se mantenga consistente mientras varía el ángulo y la iluminación para cada toma.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isHowItWorksExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isHowItWorksExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Sales Tips & Monetization Ideas', 'Consejos de Ventas e Ideas de Monetización')}</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isSalesMonetizationExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>{t('1. Professional E-commerce Catalogs:', '1. Catálogos Profesionales de Comercio Electrónico:')}</strong> {t('Use the "Minimalist Studio" category to create a unified, clean look for your Shopify, Amazon, or Etsy store. Consistency increases trust and conversion rates.', 'Usa la categoría "Estudio Minimalista" para crear un aspecto unificado y limpio para tu tienda Shopify, Amazon o Etsy. La consistencia aumenta la confianza y las tasas de conversión.')}</p>
                        <p><strong>{t('2. Seasonal Marketing Materials:', '2. Materiales de Marketing Estacionales:')}</strong> {t('Instantly update your products for holidays. Describe a "cozy winter living room with a fireplace" for Q4 sales, or a "bright tropical beach" for summer launches.', 'Actualiza instantáneamente tus productos para las festividades. Describe una "sala de estar acogedora de invierno con chimenea" para las ventas del cuarto trimestre, o una "playa tropical brillante" para los lanzamientos de verano.')}</p>
                        <p><strong>{t('3. Affiliate Marketing Duo Shots:', '3. Tomas Duo de Marketing de Afiliados:')}</strong> {t('Promote clothing or lifestyle brands by showing yourself "interacting" with others in the products, creating high-engagement social proof.', 'Promociona marcas de ropa o estilo de vida mostrándote "interactuando" con otros en los productos, creando una prueba social de alto compromiso.')}</p>
                        <p><strong>{t('4. High-Conversion Ad Creative:', '4. Creativos Publicitarios de Alta Conversión:')}</strong> {t('Use PhotoFusion to place yourself or a model next to a "satisfied customer" for trust-building marketing assets.', 'Usa PhotoFusion para colocarte a ti mismo o a un modelo junto a un "cliente satisfecho" para activos de marketing que generen confianza.')}</p>
                        <p><strong>{t('5. Digital Asset Upselling:', '5. Venta Adicional de Activos Digitales:')}</strong> {t('For photographers, offer AI-powered scene changes and subject merging as a premium add-on to standard portrait sessions.', 'Para fotógrafos, ofrece cambios de escena impulsados por IA y fusión de sujetos como un complemento premium a las sesiones de retrato estándar.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isSalesMonetizationExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsSalesMonetizationExpanded(!isSalesMonetizationExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isSalesMonetizationExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-md border border-white/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t('Pro Tips', 'Consejos Pro')}</h2>
                    <div className={`text-gray-700 space-y-6 leading-relaxed text-base transition-all duration-500 overflow-hidden relative ${isProTipsExpanded ? 'max-h-[1000px]' : 'max-h-[150px]'}`}>
                        <p><strong>{t('• Lighting Direction:', '• Dirección de la Iluminación:')}</strong> {t('If your product has strong shadows in the source photo, describe the lighting in your prompt (e.g., "dynamic side lighting") to help the AI blend it naturally.', 'Si tu producto tiene sombras marcadas en la foto de origen, describe la iluminación en tu prompt (ej., "iluminación lateral dinámica") para ayudar a la IA a mezclarlo de forma natural.')}</p>
                        <p><strong>{t('• Resolution Matters:', '• La Resolución Importa:')}</strong> {t('High-resolution source photos lead to high-resolution results. Avoid blurry phone photos for the best identity preservation.', 'Las fotos de origen de alta resolución conducen a resultados de alta resolución. Evita fotos borrosas de teléfonos para la mejor preservación de la identidad.')}</p>
                        <p><strong>{t('• Match the Setting to the Product:', '• Empareja el Entorno con el Producto:')}</strong> {t('Skincare looks incredible in "Luxury Bathroom" settings, while outdoorsy gear thrives in "Natural & Outdoors" prompts. Match the environment to the expected use case for maximum realism.', 'El cuidado de la piel se ve increíble en entornos de "Baño de Lujo", mientras que el equipo para exteriores prospera en prompts de "Naturaleza y Exteriores". Empareja el entorno con el caso de uso esperado para el máximo realismo.')}</p>
                        <p><strong>{t('• Iterate:', '• Itera:')}</strong> {t('If the first batch isn\'t perfect, try a slightly different scene prompt. Small changes in your description can lead to big differences in the final composition.', 'Si el primer lote no es perfecto, prueba con un prompt de escena ligeramente diferente. Pequeños cambios en tu descripción pueden llevar a grandes diferencias en la composición final.')}</p>
                        <div className={`absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/70 to-transparent ${isProTipsExpanded ? 'hidden' : ''}`} />
                    </div>
                    <div className="text-center">
                        <button onClick={() => setIsProTipsExpanded(!isProTipsExpanded)} className="mt-4 text-rosa-principal font-bold hover:underline uppercase tracking-widest">
                            {isProTipsExpanded ? t('Read Less', 'Leer Menos') : t('Read More', 'Leer Más')}
                        </button>
                    </div>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 md:p-12 animate-fade-in" onClick={() => setZoomedImage(null)}>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={zoomedImage} alt={t('Expanded', 'Ampliada')} className="max-w-full max-h-full object-contain rounded-md shadow-2xl border-4 border-white/10" />
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/60 hover:bg-black/80 text-white rounded-full w-14 h-14 flex items-center justify-center text-4xl font-bold transition-all border border-white/20 shadow-xl backdrop-blur-md">&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIProductGallery;