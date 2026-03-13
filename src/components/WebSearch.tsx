import React, { useState, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, GroundingChunk } from "@google/genai";
import { Spinner } from './common/Spinner';

type GroundingTool = 'googleSearch' | 'googleMaps';

const WebSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [tool, setTool] = useState<GroundingTool>('googleSearch');

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwWebSearchFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.query) setQuery(parsed.query);
                if (parsed.tool) setTool(parsed.tool);
            } catch (e) {
                console.error("Failed to load web search form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            query,
            tool
        };
        localStorage.setItem('smwWebSearchFormState', JSON.stringify(formState));
    }, [query, tool]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerateContentResponse | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    useEffect(() => {
        if (tool === 'googleMaps') {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (err) => {
                    setError(`Geolocation error: ${err.message}. Please enable location services.`);
                }
            );
        }
    }, [tool]);

    const handleSearch = async () => {
        if (!query.trim()) {
            setError('Please enter a query.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: query,
                config: {
                    tools: tool === 'googleSearch' ? [{ googleSearch: {} }] : [{ googleMaps: {} }],
                    ...(tool === 'googleMaps' && userLocation && {
                        toolConfig: {
                            retrievalConfig: {
                                latLng: userLocation
                            }
                        }
                    })
                },
            });
            setResult(response);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to perform search. ${errorMessage}`);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderGroundingChunks = (chunks: GroundingChunk[] | undefined) => {
        if (!chunks || chunks.length === 0) return null;

        const uniqueLinks = new Map<string, { uri: string, title: string }>();

        chunks.forEach(chunk => {
             if (chunk.web) {
                 if(chunk.web.uri) uniqueLinks.set(chunk.web.uri, {uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri});
             } else if (chunk.maps) {
                 if(chunk.maps.uri) uniqueLinks.set(chunk.maps.uri, {uri: chunk.maps.uri, title: chunk.maps.title || chunk.maps.uri});
             }
        });
        
        return (
            <div className="mt-4 pt-4 border-t border-smw-gray-light">
                <h4 className="font-semibold text-smw-text-dim mb-2">Sources:</h4>
                <div className="flex flex-wrap gap-2">
                    {Array.from(uniqueLinks.values()).map((link) => (
                        <a key={link.uri} href={link.uri} target="_blank" rel="noopener noreferrer" className="text-sm bg-smw-gray-light text-smw-pink px-3 py-1 rounded-full hover:bg-smw-gray-dark transition-colors">
                            {link.title}
                        </a>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-smw-gray-dark rounded-lg shadow-xl p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-bold text-smw-pink">Web & Maps Grounding</h2>
            
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={tool === 'googleSearch' ? 'e.g., Who won the last olympics?' : 'e.g., Good Italian restaurants nearby'}
                    className="flex-1 bg-smw-gray-light border border-smw-gray-light rounded-lg p-2 focus:ring-2 focus:ring-smw-pink focus:outline-none"
                    disabled={isLoading}
                />
                 <select
                    value={tool}
                    onChange={(e) => setTool(e.target.value as GroundingTool)}
                    className="bg-smw-gray-light border border-smw-gray-light rounded-lg p-2 focus:ring-2 focus:ring-smw-pink focus:outline-none"
                    disabled={isLoading}
                >
                    <option value="googleSearch">Google Search</option>
                    <option value="googleMaps">Google Maps</option>
                </select>
                <button
                    onClick={handleSearch}
                    disabled={isLoading || !query.trim()}
                    className="bg-smw-pink text-smw-gray-dark font-bold py-2 px-4 rounded-lg flex items-center justify-center hover:bg-smw-pink-light disabled:bg-smw-gray-light disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : 'Search'}
                </button>
            </div>
            
            {error && <div className="p-4 bg-red-900 text-smw-text rounded-md">{error}</div>}

            <div className="flex-1 bg-smw-black rounded-lg p-4 overflow-y-auto">
                {isLoading ? (
                    <div className="text-center pt-10">
                        <Spinner className="w-12 h-12 mx-auto" />
                        <p className="mt-4 text-smw-text-dim">Searching the web...</p>
                    </div>
                ) : result ? (
                    <div>
                        <p className="whitespace-pre-wrap text-smw-text">{result.text}</p>
                        {renderGroundingChunks(result.candidates?.[0]?.groundingMetadata?.groundingChunks)}
                    </div>
                ) : (
                    <p className="text-smw-text-dim text-center pt-10">Search results will appear here.</p>
                )}
            </div>
        </div>
    );
};

export default WebSearch;