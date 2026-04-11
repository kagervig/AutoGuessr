"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/app/components/layout/Navbar";

const CONFIRMATION_THRESHOLD = 5;
const DOWNVOTE_REMOVAL_THRESHOLD = 5;

interface FieldAgreement {
  value: string | number | null;
  count: number;
  confirmed: boolean;
  threshold: number;
}

interface Suggestion {
  id: string;
  username: string;
  suggestedMake: string | null;
  suggestedModel: string | null;
  suggestedYear: number | null;
  suggestedTrim: string | null;
  upvotes: number;
  downvotes: number;
  netVotes: number;
}

interface CommunityImage {
  id: string;
  imageUrl: string;
  ai: { make: string | null; model: string | null; year: number | null };
  suggestions: Suggestion[];
  agreements: {
    make: FieldAgreement;
    model: FieldAgreement;
    year: FieldAgreement;
    trim: FieldAgreement;
  };
}

interface SuggestForm {
  make: string;
  model: string;
  year: string;
  trim: string;
}

function ProgressField({ label, field }: { label: string; field: FieldAgreement }) {
  const pct = Math.min((field.count / CONFIRMATION_THRESHOLD) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {field.value !== null && (
            <span className={`text-sm font-bold ${field.confirmed ? "text-green-400" : "text-white"}`}>
              {String(field.value)}
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">{field.count}/{CONFIRMATION_THRESHOLD}</span>
          {field.confirmed && (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full font-bold tracking-wider uppercase">
              confirmed
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${field.confirmed ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  username,
  imageId,
  onVoted,
}: {
  suggestion: Suggestion;
  username: string;
  imageId: string;
  onVoted: () => void;
}) {
  const isOwn = suggestion.username === username.trim();
  const [voting, setVoting] = useState(false);

  async function vote(isUpvote: boolean) {
    if (!username.trim() || isOwn || voting) return;
    setVoting(true);
    await fetch(`/api/identify/${imageId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: suggestion.id, username: username.trim(), isUpvote }),
    });
    setVoting(false);
    onVoted();
  }

  const parts = [
    suggestion.suggestedYear,
    suggestion.suggestedMake,
    suggestion.suggestedModel,
    suggestion.suggestedTrim,
  ].filter(Boolean);

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${isOwn ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10"}`}>
      {/* Vote controls */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <button
          onClick={() => vote(true)}
          disabled={isOwn || voting || !username.trim()}
          aria-label="Upvote"
          className="text-muted-foreground hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors leading-none text-base"
        >
          ▲
        </button>
        <span className={`text-xs font-bold tabular-nums ${suggestion.netVotes > 0 ? "text-green-400" : suggestion.netVotes < 0 ? "text-red-400" : "text-muted-foreground"}`}>
          {suggestion.netVotes}
        </span>
        <button
          onClick={() => vote(false)}
          disabled={isOwn || voting || !username.trim()}
          aria-label="Downvote"
          className="text-muted-foreground hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors leading-none text-base"
        >
          ▼
        </button>
      </div>

      {/* Suggestion content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">
          {parts.length > 0 ? parts.join(" ") : <span className="italic text-muted-foreground font-normal">No details</span>}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isOwn ? "Your suggestion" : suggestion.username}
          {` · ${suggestion.upvotes}↑ ${suggestion.downvotes}↓`}
        </p>
      </div>
    </div>
  );
}

export default function IdentifyScreen() {
  const [images, setImages] = useState<CommunityImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(
    () => localStorage.getItem("autoguessr_username") ?? ""
  );
  const [forms, setForms] = useState<Record<string, SuggestForm>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchImages = useCallback(async () => {
    const res = await fetch("/api/identify");
    const data = await res.json();
    setImages(data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- setState calls in fetchImages are async (after await), not synchronous cascades
  useEffect(() => { fetchImages(); }, [fetchImages]);

  function getForm(id: string): SuggestForm {
    return forms[id] ?? { make: "", model: "", year: "", trim: "" };
  }

  function setField(id: string, field: keyof SuggestForm, value: string) {
    setForms((prev) => ({ ...prev, [id]: { ...getForm(id), [field]: value } }));
  }

  async function submit(id: string) {
    if (!username.trim()) {
      setErrors((e) => ({ ...e, [id]: "Please enter your username above." }));
      return;
    }
    const form = getForm(id);
    if (!form.make && !form.model && !form.year && !form.trim) {
      setErrors((e) => ({ ...e, [id]: "Fill in at least one field." }));
      return;
    }

    localStorage.setItem("autoguessr_username", username.trim());
    setSubmitting(id);
    setErrors((e) => ({ ...e, [id]: "" }));

    const res = await fetch(`/api/identify/${id}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        make: form.make || null,
        model: form.model || null,
        year: form.year || null,
        trim: form.trim || null,
      }),
    });

    setSubmitting(null);

    if (res.ok) {
      setSubmitted((s) => new Set(s).add(id));
      setLoading(true);
      await fetchImages();
    } else {
      const d = await res.json();
      setErrors((e) => ({ ...e, [id]: d.error ?? "Submission failed" }));
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground bg-noise">
      <Navbar />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6 space-y-10">

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-display font-black tracking-widest text-white uppercase">
              Community ID
            </h1>
            <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">
            Work together to identify mystery cars. Vote on suggestions or add your own — 5 agreements confirms a field.
          </p>
        </motion.div>

        {/* Username */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel rounded-xl p-5"
        >
          <label className="block text-xs font-display font-black tracking-widest text-muted-foreground uppercase mb-3">
            Driver Tag
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ENTER ALIAS"
            className="w-full sm:w-72 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white placeholder:text-white/20 focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Required to submit or vote. Suggestions with {DOWNVOTE_REMOVAL_THRESHOLD}+ downvotes are hidden.
          </p>
        </motion.div>

        {loading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        )}

        {!loading && images.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel rounded-xl p-10 text-center"
          >
            <p className="text-white font-bold">No images need identifying right now.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back later or{" "}
              <Link href="/" className="text-primary hover:underline">play the game</Link>.
            </p>
          </motion.div>
        )}

        {images.map((img, i) => {
          const form = getForm(img.id);
          const isSubmitted = submitted.has(img.id);
          const isSubmitting = submitting === img.id;
          const userSuggestion = img.suggestions.find((s) => s.username === username.trim());
          const hasAnySuggestions = img.suggestions.length > 0;

          return (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.05 }}
              className="glass-panel rounded-xl overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt="Mystery car"
                className="w-full aspect-video object-cover"
              />

              <div className="p-5 space-y-5">
                {/* AI hint */}
                {(img.ai.make || img.ai.model) && (
                  <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    AI hint: {[img.ai.year, img.ai.make, img.ai.model].filter(Boolean).join(" ")}
                  </p>
                )}

                {/* Suggestions */}
                {hasAnySuggestions && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-display font-black tracking-widest text-muted-foreground uppercase">
                        Suggestions
                      </p>
                      <span className="text-xs text-muted-foreground">{img.suggestions.length} {img.suggestions.length !== 1 ? "entries" : "entry"}</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    {img.suggestions.map((s) => (
                      <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        username={username}
                        imageId={img.id}
                        onVoted={() => { setLoading(true); fetchImages(); }}
                      />
                    ))}
                  </div>
                )}

                {/* Confirmation progress */}
                {hasAnySuggestions && (
                  <div className="space-y-3 pt-1 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-display font-black tracking-widest text-muted-foreground uppercase">
                        Progress
                      </p>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    {img.agreements.make.value !== null && <ProgressField label="Make" field={img.agreements.make} />}
                    {img.agreements.model.value !== null && <ProgressField label="Model" field={img.agreements.model} />}
                    {img.agreements.year.value !== null && <ProgressField label="Year" field={img.agreements.year} />}
                    {img.agreements.trim.value !== null && <ProgressField label="Trim" field={img.agreements.trim} />}
                  </div>
                )}

                {/* Suggestion form */}
                <div className="space-y-3 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-display font-black tracking-widest text-muted-foreground uppercase">
                      {userSuggestion || isSubmitted ? "Update Suggestion" : "Add Suggestion"}
                    </p>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["make", "model", "trim"] as const).map((field) => (
                      <input
                        key={field}
                        type="text"
                        value={form[field]}
                        onChange={(e) => setField(img.id, field, e.target.value)}
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
                      />
                    ))}
                    <input
                      type="number"
                      value={form.year}
                      onChange={(e) => setField(img.id, "year", e.target.value)}
                      placeholder="Year"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {errors[img.id] && (
                    <p className="text-xs text-red-400">{errors[img.id]}</p>
                  )}

                  <button
                    onClick={() => submit(img.id)}
                    disabled={isSubmitting || !username.trim()}
                    className="w-full text-sm font-display font-black tracking-widest uppercase bg-primary text-white rounded-lg px-3 py-2.5 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? "Submitting…" : userSuggestion || isSubmitted ? "Update Suggestion" : "Submit Suggestion"}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
