
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

interface ClothesClosetProps {
    addCreations: (images: string[]) => void;
}

const scenes = [
  { name: 'Minimalist Studio', prompt: 'a clean, minimalist photo studio with a seamless light gray background and soft, even lighting' },
  { name: 'City Rooftop', prompt: 'a stylish rooftop overlooking a cityscape at sunset, with a blurred background' },
  { name: 'Cozy Cafe', prompt: 'the interior of a charming cafe with warm lighting, a wooden table, and a window view' },
  { name: 'Autumn Park', prompt: 'a beautiful park in autumn with colorful leaves on the ground and soft sunlight' },
  { name: 'Modern Loft', prompt: 'a bright and airy modern loft apartment with large windows and simple, stylish furniture' },
  { name: 'Tropical Beach', prompt: 'a serene tropical beach with white sand and calm turquoise water during the day' },
];

const poses = [
  'a full-body shot, standing confidently with hands in pockets.',
  'a dynamic walking pose, captured mid-stride with a natural smile.',
  'a relaxed sitting pose on a stool or chair appropriate for the scene.',
  'a three-quarters shot, looking thoughtfully just off-camera.',
  'a candid laughing pose, looking happy and relaxed.',
  'leaning casually against a wall or feature in the environment, looking at the camera.',
];

const Step: React.FC<{ number: number, title: string, children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-negro-fondo p-4 rounded-lg">
        <h3 className="text-md font-bold mb-3">Step {number}: {title}</h3>
        {children}
    </div>
);


const ClothesCloset: React.FC<ClothesClosetProps> = ({ addCreations }) => {
    const [personImage, setPersonImage] = useState<{ file: File, preview: string } | null>(null);
    const [clothingItems, setClothingItems] = useState<{ id: string, file: File, preview: string }[]>([]);
    const [selectedScene, setSelectedScene] = useState<string>(scenes[4].prompt); // Default to Modern Loft

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwClothesClosetFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.selectedScene) setSelectedScene(parsed.selectedScene);
            } catch (e) {
                console.error("Failed to load clothes closet form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            selectedScene
        };
        localStorage.setItem('smwClothesClosetFormState', JSON.stringify(formState));
    }, [selectedScene]);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [collectedErrors, setCollectedErrors] = useState<string[]>([]);

    const personInputRef = useRef<HTMLInputElement>(null);
    const clothingInputRef = useRef<HTMLInputElement>(null);

    const latestImagesRef = useRef({ personImage, clothingItems });
    latestImagesRef.current = { personImage, clothingItems };

    useEffect(() => {
        return () => {
            const { personImage, clothingItems } = latestImagesRef.current;
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
            clothingItems.forEach(item => URL.revokeObjectURL(item.preview));
        };
    }, []);

    const handlePersonImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (personImage?.preview) URL.revokeObjectURL(personImage.preview);
            setPersonImage({ file, preview: URL.createObjectURL(file) });
        }
    };

    const handleClothingItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newItems = Array.from(files).map((file: File) => ({
                id: `${file.name}-${Date.now()}`,
                file,
                preview: URL.createObjectURL(file)
            }));
            setClothingItems(prev => [...prev, ...newItems].slice(0, 6));
        }
    };

    const removeClothingItem = (idToRemove: string) => {
        setClothingItems(prev => {
            const itemToRemove = prev.find(item => item.id === idToRemove);
            if (itemToRemove) URL.revokeObjectURL(itemToRemove.preview);
            return prev.filter(item => item.id !== idToRemove);
        });
    };

    const handleGenerate = async () => {
        if (!personImage) {
            setError('Please upload a photo of a person.');
            return;
        }
        if (clothingItems.length === 0) {
            setError('Please upload at least one clothing item.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setCollectedErrors([]);

        const successfulImages: string[] = [];
        const localCollectedErrors: string[] = [];

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const personBase64 = await fileToBase64(personImage.file);
            const clothingItemParts: Part[] = [];
            for (const item of clothingItems) {
                const clothingBase64 = await fileToBase64(item.file);
                clothingItemParts.push({ inlineData: { mimeType: item.file.type, data: clothingBase64 } });
            }

            for (const pose of poses) {
                try {
                    const prompt = `**CRITICAL MISSION: VIRTUAL FASHION LOOKBOOK**

Your task is to create a high-fashion lookbook image. You will be given a reference photo of a person and one or more reference photos of clothing items. You must dress the person in the clothes and place them in a new scene.

**NON-NEGOTIABLE LIKENESS RULES (THE #1 PRIORITY):**
- **IDENTITY:** The generated person is NOT a 'similar-looking model'. It is the SAME PERSON from the reference photo. Failure to replicate the person exactly is a failure of the entire task.
- **FACE:** The face in the output MUST be an IDENTICAL MATCH to the reference. Replicate every feature: eyes, nose, mouth, skin tone, and face shape. No variations are permitted.
- **HAIR:** The hair in the output MUST be an IDENTICAL MATCH to the reference. Replicate color, style, and texture. No variations.
- **BODY TYPE:** You must maintain the body type seen in the person's reference photo.

**SCENE & CLOTHING DETAILS:**
- **CLOTHING:** The person must be wearing the exact items from the clothing reference photos. Replicate the style, color, and fit of each garment.
- **SCENE:** ${selectedScene}
- **POSE:** ${pose}
- **STYLE:** Ultra-realistic, high-resolution fashion photograph. The lighting on the person and clothing must match the new scene perfectly.

**FINAL CHECK:** Before outputting, ask yourself: "Does the person in my generated image look exactly like the person in the reference photo?" If the answer is no, you must start over.`;
                    
                    const parts: Part[] = [
                        { text: "REFERENCE IMAGE OF THE PERSON (for likeness):" },
                        { inlineData: { mimeType: personImage.file.type, data: personBase64 } },
                        { text: "REFERENCE IMAGES OF THE CLOTHING ITEMS TO WEAR:" },
                        ...clothingItemParts,
                        { text: prompt }
                    ];


                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts },
                        config: { responseModalities: [Modality.IMAGE] },
                    });

                    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (imagePart?.inlineData) {
                        const newImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        successfulImages.push(newImage);
                        setGeneratedImages(prev => [...prev, newImage]);
                    } else {
                         throw new Error("Model did not return an image for this pose.");
                    }
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                    console.error(`Error generating image for pose "${pose}":`, errorMessage);
                    const errorString = `For one pose: ${errorMessage}`;
                    localCollectedErrors.push(errorString);
                    setCollectedErrors(prev => [...prev, errorString]);
                }
            }
            
            if (successfulImages.length > 0) {
                 addCreations(successfulImages);
            }

            if (successfulImages.length === 0) {
                const errorSummary = localCollectedErrors.length > 0 ? `Details: ${[...new Set(localCollectedErrors)].join(', ')}` : 'Please try again.';
                setError(`Failed to generate any images. ${errorSummary}`);
            } else if (successfulImages.length < poses.length) {
                setError(`Successfully generated ${successfulImages.length} out of ${poses.length} images. Some poses may have failed.`);
            }

        } catch (e) {
            let errorMessage = 'An unknown error occurred.';
            if (e instanceof Error) {
                errorMessage = e.message;
            } else if (typeof e === 'string') {
                errorMessage = e;
            } else {
                try {
                    errorMessage = JSON.stringify(e);
                } catch {
                    // fallback if stringify fails
                }
            }
            setError(`A critical error occurred: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-negro-fondo h-full overflow-y-auto p-4 space-y-4 border-r-2 border-rosa-principal max-w-md mx-auto md:mx-0 md:ml-auto">
             <Step number={1} title="Upload Your Photo">
                <div 
                    onClick={() => personInputRef.current?.click()}
                    className="aspect-[4/5] bg-negro-fondo rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-gris-medio-light hover:bg-negro-fondo hover:border-rosa-principal transition-colors p-1"
                >
                    {personImage ? (
                        <img src={personImage.preview} alt="Person preview" className="w-full h-full rounded-md object-cover" />
                    ) : (
                        <span className="text-gris-atenuado text-sm">Click to upload photo</span>
                    )}
                </div>
             </Step>

             <Step number={2} title="Upload Clothing Items (up to 6)">
                <div className="grid grid-cols-3 gap-2">
                    {clothingItems.map(item => (
                        <div key={item.id} className="relative aspect-square">
                            <img src={item.preview} alt="Clothing item" className="w-full h-full object-cover rounded-md" />
                            <button
                                onClick={() => removeClothingItem(item.id)}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-700"
                                aria-label="Remove item"
                            >&times;</button>
                        </div>
                    ))}
                    {clothingItems.length < 6 && (
                        <div 
                            onClick={() => clothingInputRef.current?.click()}
                            className="aspect-square bg-negro-fondo rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-gris-medio-light hover:bg-negro-fondo hover:border-rosa-principal transition-colors"
                        >
                            <span className="text-gris-atenuado p-2 text-2xl font-light">+ Add</span>
                        </div>
                    )}
                </div>
            </Step>

            <Step number={3} title="Choose Your Scene">
                <div className="flex flex-wrap gap-2">
                    {scenes.map(scene => (
                        <button
                            key={scene.name}
                            onClick={() => setSelectedScene(scene.prompt)}
                            className={`px-3 py-1.5 text-sm rounded-md flex items-center transition-colors ${selectedScene === scene.prompt ? 'bg-rosa-principal text-negro-fondo font-semibold' : 'bg-negro-fondo text-blanco-texto hover:bg-negro-fondo'}`}
                        >
                            {scene.name}
                        </button>
                    ))}
                </div>
            </Step>

            <Step number={4} title="Generate Your Lookbook">
                 <button
                    onClick={handleGenerate}
                    disabled={isLoading || !personImage || clothingItems.length === 0}
                    className="w-full bg-rosa-principal text-negro-fondo font-bold py-3 px-4 rounded-lg flex items-center justify-center hover:bg-rosa-claro disabled:bg-negro-fondo disabled:cursor-not-allowed"
                 >
                    {isLoading ? <Spinner /> : 'Generate Lookbook'}
                 </button>
            </Step>
            
            <div className="bg-negro-fondo p-4 rounded-lg">
                <h3 className="text-md font-bold mb-3">Your Virtual Lookbook</h3>
                {error && <div className="p-3 bg-red-900 text-white rounded-md mb-4 text-sm">{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, index) => (
                        <div key={index} className="relative aspect-square bg-negro-fondo rounded-lg flex items-center justify-center">
                            {generatedImages[index] ? (
                                 <div className="relative group w-full h-full">
                                    <img src={generatedImages[index]} alt={`Generated try-on ${index + 1}`} className="w-full h-full object-cover rounded-lg shadow-lg" />
                                    <a
                                        href={generatedImages[index]}
                                        download={`smw-ai-lookbook-${index + 1}.png`}
                                        title="Download Image"
                                        className="absolute bottom-1 right-1 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </a>
                                </div>
                            ) : isLoading && index >= generatedImages.length + collectedErrors.length ? (
                                <Spinner />
                            ) : (
                               <span className="text-gris-atenuado text-3xl font-bold">{index + 1}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <input type="file" ref={personInputRef} onChange={handlePersonImageChange} className="hidden" accept="image/*" />
            <input type="file" ref={clothingInputRef} onChange={handleClothingItemsChange} className="hidden" accept="image/*" multiple />
        </div>
    );
};

export default ClothesCloset;
