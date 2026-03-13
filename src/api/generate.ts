// Server-side Gemini API wrapper
// All Gemini calls go through the backend to keep API key secure

export interface GenerateOptions {
  prompt: string;
  model?: string;
  images?: Array<{ base64: string; mimeType: string }>;
  config?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseModalities?: string[];
  };
}

export interface GenerateResponse {
  text: string | null;
  images: Array<{ data: string; mimeType: string }>;
}

export async function generate(options: GenerateOptions): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.code === 'SUBSCRIPTION_REQUIRED') {
      throw new Error('SUBSCRIPTION_REQUIRED');
    }
    throw new Error(error.error || 'Generation failed');
  }

  return res.json();
}

export async function generateImage(options: {
  prompt: string;
  referenceImages?: Array<{ base64: string; mimeType: string }>;
  config?: { temperature?: number; numberOfImages?: number };
}): Promise<{ images: Array<{ data: string; mimeType: string }>; text: string }> {
  const res = await fetch('/api/generate/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.code === 'SUBSCRIPTION_REQUIRED') {
      throw new Error('SUBSCRIPTION_REQUIRED');
    }
    throw new Error(error.error || 'Image generation failed');
  }

  return res.json();
}

export async function chat(messages: Array<{ role: string; parts: Array<{ text: string }> }>, model?: string) {
  const res = await fetch('/api/generate/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ messages, model })
  });

  if (!res.ok) {
    const error = await res.json();
    if (error.code === 'SUBSCRIPTION_REQUIRED') {
      throw new Error('SUBSCRIPTION_REQUIRED');
    }
    throw new Error(error.error || 'Chat failed');
  }

  return res.json();
}
