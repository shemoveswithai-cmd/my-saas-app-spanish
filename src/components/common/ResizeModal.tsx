import React, { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from './Spinner';

type AspectChoice = "1:1" | "9:16" | "4:5" | "16:9" | "3:4" | "4:3";
type Mode = "fit" | "fill"; // fit = letterbox, fill = center-crop

const ASPECT_MAP: Record<AspectChoice, number> = {
  "1:1": 1 / 1,
  "9:16": 9 / 16,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
  "3:4": 3 / 4,
  "4:3": 4 / 3,
};

interface ResizeModalProps {
  open: boolean;
  onClose: () => void;
  /** URL or data: URL of the picked avatar */
  src: string | null;
  /** Called with a Blob URL + Blob once resize completes */
  onSave: (url: string, blob: Blob, meta: { w: number; h: number; aspect: AspectChoice; mode: Mode }) => void;
  /** Max dimension (long edge) to render at; 2048 is good for quality without huge files */
  maxLongEdge?: number;
}

export const ResizeModal: React.FC<ResizeModalProps> = ({
  open,
  onClose,
  src,
  onSave,
  maxLongEdge = 2048,
}: ResizeModalProps) => {
  const [aspect, setAspect] = useState<AspectChoice>("9:16");
  const [mode, setMode] = useState<Mode>("fill");
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [letterbox, setLetterbox] = useState<"transparent" | "#ffffff" | "#000000">("#ffffff");
  const [quality] = useState<number>(0.92);
  const [isWorking, setIsWorking] = useState(false);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const ratio = useMemo(() => ASPECT_MAP[aspect], [aspect]);
  
  // Create a preview canvas effect
  useEffect(() => {
    if (!open || !src) {
        setPreviewUrl(null);
        return;
    };

    let isCancelled = false;
    
    const generatePreview = async () => {
        try {
            const img = await loadImage(src);
            if(isCancelled) return;

            const { w: W, h: H } = computeTargetSize(ratio, Math.min(img.naturalWidth, 512)); // smaller preview
            const canvas = document.createElement("canvas");
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext("2d")!;
            if (!ctx) return;

            if (mode === "fit") {
                drawContain(ctx, img, W, H, format === "png" && letterbox === "transparent" ? "transparent" : letterbox);
            } else {
                drawCover(ctx, img, W, H);
            }
            if (!isCancelled) setPreviewUrl(canvas.toDataURL());
        } catch(e) {
            console.error("Preview generation failed", e);
            if (!isCancelled) setPreviewUrl(src); // fallback to original
        }
    };
    
    generatePreview();
    
    return () => { isCancelled = true; }

  }, [open, src, aspect, mode, format, letterbox, ratio]);


  async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  function computeTargetSize(ratio: number, longEdge: number) {
    if (ratio >= 1) { // wide
      const w = longEdge;
      const h = Math.round(longEdge / ratio);
      return { w, h };
    } else { // tall
      const h = longEdge;
      const w = Math.round(longEdge * ratio);
      return { w, h };
    }
  }

  function drawContain(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    W: number,
    H: number,
    bg: string | "transparent",
  ) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const ir = iw / ih;
    const tr = W / H;

    let rw: number, rh: number;
    if (ir > tr) {
      rw = W;
      rh = Math.round(W / ir);
    } else {
      rh = H;
      rw = Math.round(H * ir);
    }
    const dx = Math.round((W - rw) / 2);
    const dy = Math.round((H - rh) / 2);

    if (bg !== "transparent") {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, dx, dy, rw, rh);
  }

  function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(W / iw, H / ih);
    const sw = Math.round(W / scale);
    const sh = Math.round(H / scale);
    const sx = Math.round((iw - sw) / 2);
    const sy = Math.round((ih - sh) / 2);

    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  }

  async function handleResize() {
    if (isWorking || !src) return;
    setIsWorking(true);
    try {
      const img = await loadImage(src);
      const { w: W, h: H } = computeTargetSize(ratio, maxLongEdge);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      if (!ctx) throw new Error("Canvas not supported");

      if (mode === "fit") {
        drawContain(ctx, img, W, H, format === "png" && letterbox === "transparent" ? "transparent" : letterbox);
      } else {
        drawCover(ctx, img, W, H);
      }

      const mime = format === "png" ? "image/png" : "image/jpeg";
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b as Blob), mime, quality),
      );
      const url = URL.createObjectURL(blob);
      onSave(url, blob, { w: W, h: H, aspect, mode });
    } catch (e) {
      console.error(e);
      alert("Resize failed. See console for details.");
    } finally {
      setIsWorking(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg shadow-xl w-full max-w-4xl flex flex-col lg:flex-row gap-6 max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <div className="flex-shrink-0 space-y-4 lg:w-80">
            <h3 className="text-xl font-bold text-smw-gray-dark">Resize & Edit</h3>
            
            <div>
                <label className="block text-sm font-medium text-smw-gray-dark opacity-80 mb-1">New Aspect Ratio</label>
                <select className="w-full bg-white/50 border-2 border-smw-pink/50 rounded-lg p-2 focus:ring-2 focus:ring-smw-pink focus:outline-none text-smw-gray-dark" value={aspect} onChange={(e) => setAspect(e.target.value as AspectChoice)}>
                {Object.keys(ASPECT_MAP).map((k) => (
                    <option key={k} value={k}>{k}</option>
                ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-smw-gray-dark opacity-80 mb-2">Resize Mode</label>
                <div className="flex bg-white/50 rounded-full p-1">
                    <button
                        className={`w-1/2 text-center rounded-full py-1 text-sm font-semibold transition-colors ${mode === "fill" ? "bg-smw-pink text-smw-gray-dark" : "text-smw-gray-dark opacity-80 hover:bg-white"}`}
                        onClick={() => setMode("fill")}
                    >
                        Fill (Crop)
                    </button>
                    <button
                        className={`w-1/2 text-center rounded-full py-1 text-sm font-semibold transition-colors ${mode === "fit" ? "bg-smw-pink text-smw-gray-dark" : "text-smw-gray-dark opacity-80 hover:bg-white"}`}
                        onClick={() => setMode("fit")}
                    >
                        Fit (Letterbox)
                    </button>
                </div>
            </div>
            
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-smw-gray-dark opacity-80 mb-2">Format</label>
                    <div className="flex bg-white/50 rounded-full p-1">
                        <button className={`w-1/2 text-center rounded-full py-1 text-xs font-semibold transition-colors ${format === "png" ? "bg-smw-pink text-smw-gray-dark" : "text-smw-gray-dark opacity-80 hover:bg-white"}`} onClick={() => setFormat("png")}>PNG</button>
                        <button className={`w-1/2 text-center rounded-full py-1 text-xs font-semibold transition-colors ${format === "jpeg" ? "bg-smw-pink text-smw-gray-dark" : "text-smw-gray-dark opacity-80 hover:bg-white"}`} onClick={() => setFormat("jpeg")}>JPEG</button>
                    </div>
                </div>
                {mode === "fit" && format === "png" && (
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-smw-gray-dark opacity-80 mb-2">Background</label>
                        <select className="w-full bg-white/50 border-2 border-smw-pink/50 rounded-lg p-1.5 focus:ring-2 focus:ring-smw-pink focus:outline-none text-smw-gray-dark text-xs" value={letterbox} onChange={(e) => setLetterbox(e.currentTarget.value as any)}>
                            <option value="transparent">Transparent</option>
                            <option value="#000000">Black</option>
                            <option value="#ffffff">White</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="pt-4 space-y-2">
              <button onClick={handleResize} className="w-full px-4 py-3 rounded-xl bg-smw-pink text-smw-gray-dark font-bold flex items-center justify-center hover:bg-white/80" disabled={isWorking}>
                {isWorking ? <Spinner /> : "Resize & Download"}
              </button>
              <button onClick={onClose} className="w-full px-4 py-2 rounded-xl bg-white/80 text-smw-gray-dark font-semibold hover:bg-white">
                Close
              </button>
            </div>
        </div>
        <div className="flex-1 bg-white/50 rounded-lg flex flex-col p-2 relative min-h-0 overflow-y-auto">
             <div className="relative group w-full h-auto flex items-center justify-center my-auto">
                <img src={previewUrl || src} alt="preview" className="max-w-full object-contain rounded-md shadow-md" />
            </div>
        </div>
      </div>
    </div>
  );
}