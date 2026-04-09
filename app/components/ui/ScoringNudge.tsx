"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, X } from "lucide-react";

const SCORE_THRESHOLD = 10_000;

interface Props {
  mode: string;
  score: number;
}

export function ScoringNudge({ mode, score }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || score >= SCORE_THRESHOLD) return null;

  return (
    <div className="relative rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 text-left shadow-[0_0_24px_rgba(220,38,38,0.12)]">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/20 p-2 shrink-0">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black tracking-wide text-white">Want a higher score?</p>
          <p className="text-sm text-white/60 leading-relaxed">
            Learn how points are calculated — make, model, year, speed, and difficulty all factor in.
          </p>
          <Link
            href={`/scoring?mode=${mode}`}
            className="mt-2 inline-block sm:hidden rounded-lg bg-primary px-5 py-2.5 text-sm font-black tracking-widest uppercase text-white hover:brightness-110 transition-all self-end ml-auto"
          >
            Learn More
          </Link>
        </div>
        <Link
          href={`/scoring?mode=${mode}`}
          className="hidden sm:block shrink-0 mr-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-black tracking-widest uppercase text-white hover:brightness-110 transition-all"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
}
