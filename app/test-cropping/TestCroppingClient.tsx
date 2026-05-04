"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface ImageInfo {
  id: string;
  filename: string;
  vehicleLabel: string;
  signature: string | null;
}

interface Props {
  images: ImageInfo[];
}

const CLOUD_NAME = "dndmwnmrm";

export default function TestCroppingClient({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actualAR, setActualAR] = useState<number | null>(null);

  if (images.length === 0) {
    return <div>No images found in database.</div>;
  }

  const currentImage = images[currentIndex];
  const isTall = actualAR !== null && actualAR < 1.0;
  
  // 1. Standard URL
  const standardUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${currentImage.filename}`;
  
  // 2. AI-Cropped URL (Subject)
  const aiUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_auto:subject,ar_16:9,w_1280,f_auto,q_auto/${currentImage.filename}`;

  // 3. Conditional COCO v2 (Signed)
  const sigPart = currentImage.signature ? `${currentImage.signature}/` : "";
  const conditionalAiUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${sigPart}if_ar_lt_1.0/c_fill,ar_16:9,g_auto:coco_v2_car,w_1280/if_end/f_auto,q_auto/${currentImage.filename}`;

  // Original URL
  const originalUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${currentImage.filename}`;

  const next = () => {
    setActualAR(null);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = () => {
    setActualAR(null);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const onOriginalLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setActualAR(img.naturalWidth / img.naturalHeight);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{currentImage.vehicleLabel}</h2>
          <div className="flex items-center gap-3 mt-1">
             <p className="text-sm text-muted-foreground">{currentIndex + 1} of {images.length}</p>
             {actualAR && (
               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isTall ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                 Detected: {isTall ? 'Portrait' : 'Landscape'} ({actualAR.toFixed(2)})
               </span>
             )}
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={prev} className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium transition-colors hover:bg-secondary/80">Prev</button>
          <button onClick={next} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium transition-colors hover:bg-primary/80">Next</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { name: "1. Standard (CSS)", url: standardUrl, desc: "Original image center-cropped by browser" },
          { name: "2. AI-Subject (Always)", url: aiUrl, desc: "General AI crop applied to every image" },
          { name: "3. Conditional COCO v2", url: conditionalAiUrl, desc: "Specific car AI (Portrait only), Signed" }
        ].map((item, i) => (
          <div key={i} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-center text-muted-foreground">
              {item.name}
            </h3>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-lg">
              <img 
                src={item.url} 
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.classList.add('opacity-0');
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden flex flex-col items-center justify-center p-4 text-center">
                <span className="text-xs font-bold text-red-400">FAILED</span>
                <span className="text-[10px] opacity-70 mt-1 uppercase">Transformation Blocked</span>
              </div>
            </div>
            <div className="text-center px-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">{item.desc}</p>
              {i === 2 && (
                 <p className={`text-[10px] font-bold mt-1 uppercase ${isTall ? 'text-blue-400' : 'text-green-400'}`}>
                   {isTall ? 'AI logic triggered' : 'AI logic skipped'}
                 </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-white/5 space-y-4 text-center">
        <h3 className="text-lg font-bold">Original Reference</h3>
        <div className="inline-block relative rounded-xl overflow-hidden bg-muted border border-white/10">
          <img 
            src={originalUrl} 
            alt="Original" 
            onLoad={onOriginalLoad}
            className="h-[400px] w-auto block" 
          />
        </div>
        <p className="text-xs text-muted-foreground">Filename: <code className="bg-white/5 px-1 rounded">{currentImage.filename}</code></p>
      </div>

      <div className="text-center pb-8">
        <Link href="/" className="text-primary hover:underline text-sm">Back to Home</Link>
      </div>
    </div>
  );
}
