"use client";

// Copies share text to clipboard and shows brief confirmation.
import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      prompt("Copy this:", text);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-5 py-2.5 border border-white/20 rounded-xl text-sm font-semibold text-white hover:border-white/40 transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
      {copied ? "Copied!" : "Share Result"}
    </button>
  );
}
