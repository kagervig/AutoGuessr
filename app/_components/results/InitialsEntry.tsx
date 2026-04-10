"use client";

import { useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/app/lib/utils";

// Retro arcade-style 3-character initials entry, inline layout
export function InitialsEntry({
  gameId,
  onSubmitted,
}: {
  gameId: string;
  onSubmitted: () => void;
}) {
  const [letters, setLetters] = useState(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const initials = letters.join("");
  const canSubmit = initials.length >= 1 && !submitting;

  function handleChange(index: number, raw: string) {
    const letter = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    const next = [...letters];
    next[index] = letter;
    setLetters(next);
    if (letter && index < 2) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !letters[index] && index > 0) {
      const next = [...letters];
      next[index - 1] = "";
      setLetters(next);
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === "Enter" && canSubmit) {
      submit();
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/session/initials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, initials: initials.padEnd(3, "_").slice(0, 3) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        setSubmitting(false);
        return;
      }
      onSubmitted();
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-5 border-t border-white/10 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-7 h-7 text-muted-foreground" />
        <span className="text-lg sm:text-xl font-mono tracking-widest uppercase text-muted-foreground">
          Submit to Leaderboard
        </span>
      </div>
      <p className="text-base text-muted-foreground mb-3">Enter your initials</p>
      <div className="flex items-center gap-2">
        {inputRefs.map((ref, i) => (
          <input
            key={i}
            ref={ref}
            type="text"
            inputMode="text"
            maxLength={1}
            value={letters[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Initial ${i + 1}`}
            className={cn(
              "w-10 h-10 sm:w-14 sm:h-14 aspect-square rounded-2xl border-2 bg-white/5 text-center text-xl sm:text-3xl font-black font-mono uppercase tracking-wider text-white transition-colors outline-none shrink-0",
              letters[i]
                ? "border-primary"
                : "border-white/20 focus:border-primary/60"
            )}
            autoFocus={i === 0}
          />
        ))}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="h-10 sm:h-14 px-4 sm:px-6 bg-primary text-white font-black tracking-widest uppercase text-sm sm:text-base rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Submit"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
