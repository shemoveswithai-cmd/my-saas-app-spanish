

export interface Creation {
  id: number;
  url: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

declare global {
    // For AI Studio environment (Veo API Key)
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
        // FIX: Declare the global firebase object to resolve TypeScript errors.
        // The firebase object is initialized via script tags in index.html.
        firebase: any;
    }
}