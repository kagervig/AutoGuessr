"use client";
// Sticky top HUD showing the back button, round progress dots, mode label, and username.
import { ArrowLeft } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface Props {
  modeLabel: string;
  username: string;
  currentIndex: number;
  totalRounds: number;
  onBack: () => void;
}

export function GameHeader({ modeLabel, username, currentIndex, totalRounds, onBack }: Props) {
  return (
    <div className="sticky top-0 z-40 glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Garage
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: totalRounds }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i < currentIndex
                    ? "bg-green-500"
                    : i === currentIndex
                      ? "bg-primary scale-125"
                      : "bg-white/15",
                )}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {currentIndex + 1}/{totalRounds}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-bold tracking-widest text-primary uppercase">
            {modeLabel}
          </span>
          {username && (
            <span className="hidden sm:block text-xs font-mono text-muted-foreground">
              {username}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
