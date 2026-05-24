"use client";
// Animated car image card with hardcore panel grid overlay and round label.
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Image, { ImageLoaderProps } from "next/image";

const cloudinaryLoader = ({ src, width }: ImageLoaderProps) => {
  // If it's a Cloudinary URL, replace the width parameter with the one requested by Next.js
  // Cap it at 850px to ensure we never serve overly large images even on high-DPI screens
  if (src.includes("res.cloudinary.com")) {
    const effectiveWidth = Math.min(width, 850);
    return src.replace(/w_\d+/, `w_${effectiveWidth}`);
  }
  return src;
};

interface Props {
  imageUrl: string;
  currentIndex: number;
  isHardcore: boolean;
  roundState: "answering" | "revealed";
  visiblePanels: boolean[];
}

export function RoundImage({ imageUrl, currentIndex, isHardcore, roundState, visiblePanels }: Props) {
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
  const [hasError, setHasError] = useState(false);

  if (imageUrl !== prevImageUrl) {
    setPrevImageUrl(imageUrl);
    setHasError(false);
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="relative rounded-2xl overflow-hidden aspect-video bg-card border border-white/10 shadow-xl"
      >
        <Image
          loader={cloudinaryLoader}
          src={imageUrl}
          alt="Identify this car"
          fill
          priority
          sizes="(max-width: 850px) 100vw, 850px"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          onError={() => setHasError(true)}
        />

        {/* Image fallback bg */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center bg-card">
          {hasError && <span className="text-sm text-muted-foreground">Image unavailable</span>}
        </div>

        {/* Hardcore grid overlay — panels are removed every 5 seconds */}
        {isHardcore && roundState === "answering" && (
          <div className="absolute -inset-px grid grid-cols-3 grid-rows-3 pointer-events-none">
            {visiblePanels.map((visible, i) => (
              <div
                key={i}
                className="bg-black transition-opacity duration-500"
                style={{ opacity: visible ? 1 : 0 }}
              />
            ))}
          </div>
        )}

        {/* Round label */}
        <div className="absolute top-4 left-4 glass-panel px-3 py-1 rounded-full text-xs font-bold tracking-widest text-white/70 uppercase">
          {isHardcore ? "Hardcore" : `Round ${currentIndex + 1}`}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
