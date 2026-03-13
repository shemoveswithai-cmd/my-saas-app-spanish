
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, Part } from "@google/genai";
import { fileToBase64 } from '../utils';
import { Spinner } from './common/Spinner';

const SYSTEM_INSTRUCTION = `You are my Video Research & Repurposing Analyst.
GOAL: From a video’s transcript, produce the following PACKED OUTPUTS for creators:
1) Executive Summary (5–10 bullets)
2) Key Ideas & Timestamps (topic shifts, arguments, frameworks)
3) Pull-Quotes (exact lines, short, high-impact)
4) Q&A (answer likely viewer questions from the content)
5) Content Repurposing:
   - 10 hooks (YouTube Shorts/Reels/TikTok)
   - 10 title ideas (YouTube long-form)
   - 7 community post ideas
6) Actionable Takeaways (numbered list)
7) Structured Outline (for a remake video)
8) Script Draft (2–4 minute voiceover)
9) Mindmap (Mermaid format: \`mindmap\` code block)
10) SEO Block: keywords, tags, 150-char description
11) Comparison Slot (leave a section ready to add 2nd video later)
12) Data/Names Extract (people, brands, stats mentioned)

CONSTRAINTS:
- If transcript has timestamps, keep them when helpful.
- Do not invent visuals you can’t hear.
- Be concise, creator-ready, and avoid fluff.

OUTPUT FORMAT (use these exact section headings):
## Summary
## Key Ideas & Timestamps
## Pull-Quotes
## Q&A
## Repurpose: Hooks
## Repurpose: Titles
## Repurpose: Community Posts
## Takeaways
## Outline
## Script Draft
## Mindmap (Mermaid)
## SEO Block
## Ready to Compare (leave placeholders)
## Entities (People/Brands/Stats)
`;

const getPromptText = (transcript: string, keyframeCount: number) => {
    let visualAidText = '';
    if (keyframeCount > 0) {
        visualAidText = `
VISUAL AIDS:
- I attached ${keyframeCount} images (keyframes). If useful, describe the scene briefly when referencing a topic, but never overrule the transcript.
`;
    }

    return `
INPUTS YOU’LL RECEIVE:
- TRANSCRIPT: <<${transcript}>>
${visualAidText}
`;
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let inCodeBlock = false;
    let codeBlockContent = '';

    const formatLine = (line: string) => line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const flushListBuffer = () => {
        if (listBuffer) {
            const ListTag = listBuffer.type;
            elements.push(
                <ListTag key={`list-${elements.length}`} className={`${ListTag === 'ol' ? 'list-decimal' : 'list-disc'} list-inside space-y-2 my-3 pl-6`}>
                    {listBuffer.items.map((item, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                </ListTag>
            );
            listBuffer = null;
        }
    };

     const flushCodeBlock = () => {
        if (codeBlockContent) {
            elements.push(
                <pre key={`code-${elements.length}`} className="bg-negro-fondo p-4 rounded-md overflow-x-auto my-3">
                    <code className="font-mono text-sm text-rosa-claro">{codeBlockContent}</code>
                </pre>
            );
            codeBlockContent = '';
        }
    };

    lines.forEach((line, index) => {
        if (line.trim().startsWith('```mindmap')) {
            flushListBuffer();
            inCodeBlock = true;
            return;
        }
        if (line.trim() === '```' && inCodeBlock) {
            flushCodeBlock();
            inCodeBlock = false;
            return;
        }
        if (inCodeBlock) {
            codeBlockContent += line + '\n';
            return;
        }

        if (line.trim().startsWith('## ')) {
            flushListBuffer();
            elements.push(<h3 key={`h3-${index}`} className="text-xl font-bold text-negro-fondo mt-6 mb-3">{line.substring(3)}</h3>);
            return;
        }

        const olMatch = line.match(/^\s*\d+\.\s+(.*)/);
        const ulMatch = line.match(/^\s*[\*-]\s+(.*)/);

        if (olMatch) {
            if (listBuffer?.type !== 'ol') flushListBuffer();
            if (!listBuffer) listBuffer = { type: 'ol', items: [] };
            listBuffer.items.push(formatLine(olMatch[1]));
        } else if (ulMatch) {
            if (listBuffer?.type !== 'ul') flushListBuffer();
            if (!listBuffer) listBuffer = { type: 'ul', items: [] };
            listBuffer.items.push(formatLine(ulMatch[1]));
        } else {
            flushListBuffer();
            if (line.trim()) {
                elements.push(<p key={`p-${index}`} className="my-1.5" dangerouslySetInnerHTML={{ __html: formatLine(line) }} />);
            }
        }
    });

    flushListBuffer();
    flushCodeBlock();

    return <div className="text-base leading-relaxed text-negro-fondo">{elements}</div>;
};


const VideoRepurposer: React.FC = () => {
    const [transcript, setTranscript] = useState('');
    const [keyframes, setKeyframes] = useState<File[]>([]);
    const [keyframePreviews, setKeyframePreviews] = useState<string[]>([]);

    // Load form state from localStorage
    useEffect(() => {
        const savedForm = localStorage.getItem('smwVideoRepurposerFormState');
        if (savedForm) {
            try {
                const parsed = JSON.parse(savedForm);
                if (parsed.transcript) setTranscript(parsed.transcript);
            } catch (e) {
                console.error("Failed to load video repurposer form state", e);
            }
        }
    }, []);

    // Save form state to localStorage
    useEffect(() => {
        const formState = {
            transcript
        };
        localStorage.setItem('smwVideoRepurposerFormState', JSON.stringify(formState));
    }, [transcript]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [chat, setChat] = useState<Chat | null>(null);
    const [followUp, setFollowUp] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const resultContainerRef = useRef<HTMLDivElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setKeyframes(files);
            const urls = files.map(file => URL.createObjectURL(file as Blob));
            setKeyframePreviews(urls);
        }
    };

    const handleGenerate = async () => {
        if (!transcript.trim()) {
            setError('Please enter a transcript.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        setChat(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const promptText = getPromptText(transcript, keyframes.length);

            const parts: Part[] = [{ text: promptText }];
            for (const file of keyframes) {
                const base64Data = await fileToBase64(file);
                parts.push({
                    inlineData: { mimeType: file.type, data: base64Data }
                });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: { role: 'user', parts },
                config: { systemInstruction: SYSTEM_INSTRUCTION },
            });

            const responseText = response.text;
            setResult(responseText);

            const chatSession = ai.chats.create({
                model: 'gemini-2.5-pro',
                history: [
                    { role: 'user', parts },
                    { role: 'model', parts: [{ text: responseText }] }
                ],
                config: { systemInstruction: SYSTEM_INSTRUCTION },
            });
            setChat(chatSession);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Failed to generate analysis. ${errorMessage}`);
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFollowUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!followUp.trim() || !chat || isReplying) return;

        setIsReplying(true);
        const userMessage = `\n\n---\n\n## Follow-up: ${followUp}\n\n`;
        setResult(prev => (prev || '') + userMessage);
        setFollowUp('');

        try {
            const stream = await chat.sendMessageStream({ message: followUp });
            let currentResponse = '';
            for await (const chunk of stream) {
                const previousLength = currentResponse.length;
                currentResponse += chunk.text;
                setResult(prev => (prev || '').substring(0, (prev || '').length - previousLength) + currentResponse);
                if(resultContainerRef.current) {
                    resultContainerRef.current.scrollTop = resultContainerRef.current.scrollHeight;
                }
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Follow-up failed. ${errorMessage}`);
        } finally {
            setIsReplying(false);
        }
    }

    return (
        <div className="grid grid-rows-[auto_auto_1fr] gap-4 h-full bg-rosa-claro rounded-lg shadow-xl p-4 md:p-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-negro-fondo">Video Repurposing Analyst</h2>
                <p className="text-negro-fondo opacity-80 mt-1">Transform video transcripts into a comprehensive content package. Instantly get summaries, social media hooks, script drafts, and more.</p>
            </div>
            
            {/* Inputs Section */}
            <div className="bg-white/60 backdrop-blur-sm shadow-md p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-negro-fondo">Inputs</h3>
                 <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your full video transcript here..."
                    className="w-full h-32 bg-white/50 border-2 border-rosa-principal/50 rounded-lg p-3 focus:ring-2 focus:ring-rosa-principal focus:outline-none resize-y text-negro-fondo placeholder:text-negro-fondo/70"
                    disabled={isLoading}
                />
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white/80 text-negro-fondo py-2 px-4 rounded-lg hover:bg-white"
                            disabled={isLoading}
                        >
                            Upload Keyframes (Optional)
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {keyframePreviews.map((src, index) => (
                            <img key={index} src={src} className="h-12 w-12 object-cover rounded" alt={`Keyframe ${index + 1}`} />
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !transcript.trim()}
                    className="w-full sm:w-auto bg-rosa-principal text-negro-fondo font-bold py-2 px-6 rounded-lg flex items-center justify-center hover:bg-white disabled:bg-rosa-principal/50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : 'Generate Analysis Pack'}
                </button>
            </div>
            
            {/* Outputs Section */}
            <div className={`grid ${chat ? 'grid-rows-[auto_1fr_auto]' : 'grid-rows-[auto_1fr]'} bg-white/60 backdrop-blur-sm shadow-md rounded-lg min-h-0`}>
                {/* Header Row */}
                <div>
                    <h3 className="text-lg font-semibold text-negro-fondo p-4 border-b border-rosa-principal/20">Outputs</h3>
                    {error && <div className="p-4 bg-red-900 text-blanco-texto rounded-md m-4">{error}</div>}
                </div>

                {/* Content Row */}
                <div ref={resultContainerRef} className="p-4 overflow-y-auto min-h-0">
                    {isLoading ? (
                        <div className="text-center pt-10">
                            <Spinner className="w-12 h-12 text-negro-fondo" />
                            <p className="mt-4 text-negro-fondo opacity-80">Analyzing and creating content...</p>
                        </div>
                    ) : result ? (
                        <MarkdownRenderer content={result} />
                    ) : (
                        <p className="text-negro-fondo opacity-80 text-center pt-10">Your content pack will appear here.</p>
                    )}
                </div>

                {/* Footer Row */}
                {chat && (
                    <form onSubmit={handleFollowUp} className="p-4 border-t border-rosa-principal/20 flex items-center">
                        <input
                            type="text"
                            value={followUp}
                            onChange={(e) => setFollowUp(e.target.value)}
                            placeholder="Ask a follow-up..."
                            className="flex-1 bg-white/50 border-2 border-rosa-principal/50 rounded-lg p-2 focus:ring-2 focus:ring-rosa-principal focus:outline-none text-negro-fondo placeholder:text-negro-fondo/70"
                            disabled={isReplying}
                        />
                         <button type="submit" className="ml-4 bg-rosa-principal text-negro-fondo p-2 rounded-lg hover:bg-white disabled:bg-rosa-principal/50" disabled={isReplying || !followUp.trim()}>
                            {isReplying ? <Spinner className="w-6 h-6" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default VideoRepurposer;
