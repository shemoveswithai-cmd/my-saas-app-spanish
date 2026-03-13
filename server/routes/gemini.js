import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { authenticate, requireSubscription } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Main generate endpoint - requires auth + subscription
router.post('/', authenticate, requireSubscription, async (req, res) => {
  try {
    const { prompt, model, images, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const modelName = model || 'gemini-2.0-flash-exp';
    
    // Build content parts
    const contents = [];

    // Add images if provided
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img.base64 && img.mimeType) {
          contents.push({
            inlineData: {
              data: img.base64,
              mimeType: img.mimeType
            }
          });
        }
      }
    }

    // Add text prompt
    contents.push(prompt);

    const generationConfig = {
      temperature: config?.temperature || 0.9,
      topP: config?.topP || 0.95,
      topK: config?.topK || 40,
      maxOutputTokens: config?.maxOutputTokens || 8192,
      ...(config?.responseModalities && { responseModalities: config.responseModalities })
    };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: generationConfig
    });
    
    // Handle different response types
    const output = {
      text: response.text || null,
      images: []
    };

    // Check for inline images in candidates
    if (response.candidates) {
      for (const candidate of response.candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              output.images.push({
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType
              });
            }
          }
        }
      }
    }

    res.json(output);
  } catch (error) {
    console.error('Gemini generation error:', error);
    res.status(500).json({ 
      error: 'Generation failed', 
      details: error.message 
    });
  }
});

// Image generation endpoint
router.post('/image', authenticate, requireSubscription, async (req, res) => {
  try {
    const { prompt, referenceImages, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const contents = [];

    // Add reference images if provided
    if (referenceImages && Array.isArray(referenceImages)) {
      for (const img of referenceImages) {
        if (img.base64 && img.mimeType) {
          contents.push({
            inlineData: {
              data: img.base64,
              mimeType: img.mimeType
            }
          });
        }
      }
    }

    contents.push(prompt);

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature: config?.temperature || 1
      }
    });

    const images = [];
    let text = response.text || '';

    // Extract images from response
    if (response.candidates) {
      for (const candidate of response.candidates) {
        for (const part of (candidate.content?.parts || [])) {
          if (part.inlineData) {
            images.push({
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType
            });
          }
        }
      }
    }

    res.json({ images, text });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Image generation failed', 
      details: error.message 
    });
  }
});

// Chat endpoint
router.post('/chat', authenticate, requireSubscription, async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const modelName = model || 'gemini-2.0-flash-exp';
    
    // Format messages for chat
    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: m.parts
    }));
    
    const chat = ai.chats.create({
      model: modelName,
      history: history
    });

    const lastMessage = messages[messages.length - 1];
    const response = await chat.sendMessage({ message: lastMessage.parts[0].text });

    res.json({
      role: 'model',
      parts: [{ text: response.text }]
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Chat failed', 
      details: error.message 
    });
  }
});

export default router;
