import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from './Spinner';

export const ApiKeyManager: React.FC<{ children: React.ReactNode, onApiKeyReady: () => void }> = ({ children, onApiKeyReady }) => {
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    const checkApiKey = useCallback(async () => {
        setIsChecking(true);
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const result = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(result);
            if(result) {
                onApiKeyReady();
            }
        } else {
            // Mock for local development if aistudio is not available
            console.warn("aistudio not found. Assuming API key is set for local development.");
            setHasApiKey(true);
            onApiKeyReady();
        }
        setIsChecking(false);
    }, [onApiKeyReady]);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            // Assume success to avoid race conditions and re-check.
            setHasApiKey(true);
            onApiKeyReady();
        }
    };

    if (isChecking) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Spinner />
                <p className="mt-4 text-smw-text-dim">Checking API key status...</p>
            </div>
        );
    }

    if (!hasApiKey) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center bg-smw-gray-dark p-8 rounded-lg">
                <h2 className="text-2xl font-bold text-smw-pink mb-4">API Key Required for Veo</h2>
                <p className="text-smw-text-dim mb-6 max-w-md">
                    To generate videos with Veo, you need to select an API key. This will be used for billing purposes.
                </p>
                <button
                    onClick={handleSelectKey}
                    className="bg-smw-pink hover:bg-smw-pink-light text-smw-gray-dark font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                >
                    Select API Key
                </button>
                <a
                    href="https://ai.google.dev/gemini-api/docs/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-sm text-smw-pink hover:underline"
                >
                    Learn more about billing
                </a>
            </div>
        );
    }

    return <>{children}</>;
};