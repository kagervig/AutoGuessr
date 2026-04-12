"use client";
// Animated car image card with hardcore panel grid overlay and round label.
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  imageUrl: string;
  currentIndex: number;
  isHardcore: boolean;
  roundState: "answering" | "revealed";
  visiblePanels: boolean[];
}

export function RoundImage({ imageUrl, currentIndex, isHardcore, roundState, visiblePanels }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="relative rounded-2xl overflow-hidden aspect-video bg-card border border-white/10 shadow-xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={imageUrl}
          src={imageUrl}
          alt="Identify this car"
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Image fallback bg */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center bg-card">
          <span className="text-sm text-muted-foreground">Image unavailable</span>
        </div>

        {/* Hardcore grid overlay — panels are removed every 5 seconds */}
        {isHardcore && roundState === "answering" && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
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
