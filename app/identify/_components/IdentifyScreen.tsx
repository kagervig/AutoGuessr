"use client";

import { useEffect, useState, useCallback } from "react";

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
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          {field.value !== null && (
            <span className={`text-sm font-medium ${field.confirmed ? "text-green-700" : "text-gray-700"}`}>
              {String(field.value)}
            </span>
          )}
          <span className="text-xs text-gray-400">{field.count}/{CONFIRMATION_THRESHOLD}</span>
          {field.confirmed && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">confirmed</span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${field.confirmed ? "bg-green-500" : "bg-blue-400"}`}
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
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${isOwn ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}`}>
      {/* Vote controls */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <button
          onClick={() => vote(true)}
          disabled={isOwn || voting || !username.trim()}
          aria-label="Upvote"
          className="text-gray-400 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors leading-none text-base"
        >
          ▲
        </button>
        <span className={`text-xs font-bold tabular-nums ${suggestion.netVotes > 0 ? "text-green-600" : suggestion.netVotes < 0 ? "text-red-500" : "text-gray-400"}`}>
          {suggestion.netVotes}
        </span>
        <button
          onClick={() => vote(false)}
          disabled={isOwn || voting || !username.trim()}
          aria-label="Downvote"
          className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors leading-none text-base"
        >
          ▼
        </button>
      </div>

      {/* Suggestion content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {parts.length > 0 ? parts.join(" ") : <span className="italic text-gray-400">No details</span>}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
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
  const [username, setUsername] = useState("");
  const [forms, setForms] = useState<Record<string, SuggestForm>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem("autoguessr_username");
    if (stored) setUsername(stored);
  }, []);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/identify");
    const data = await res.json();
    setImages(data);
    setLoading(false);
  }, []);

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
      await fetchImages();
    } else {
      const d = await res.json();
      setErrors((e) => ({ ...e, [id]: d.error ?? "Submission failed" }));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Help identify cars</h1>
            <p className="text-sm text-gray-500">Vote on suggestions or add your own. 5 agreements confirms a field.</p>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600">← Play</a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Username */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your game username"
            className="w-full sm:w-72 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            Required to submit or vote. Suggestions with {DOWNVOTE_REMOVAL_THRESHOLD}+ downvotes are hidden.
          </p>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {!loading && images.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No images need identifying right now.</p>
            <p className="text-sm text-gray-400 mt-1">Check back later or <a href="/" className="underline">play the game</a>.</p>
          </div>
        )}

        {images.map((img) => {
          const form = getForm(img.id);
          const isSubmitted = submitted.has(img.id);
          const isSubmitting = submitting === img.id;
          const userSuggestion = img.suggestions.find((s) => s.username === username.trim());
          const hasAnySuggestions = img.suggestions.length > 0;

          return (
            <div key={img.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt="Mystery car"
                className="w-full aspect-video object-cover bg-gray-100"
              />

              <div className="p-4 space-y-4">
                {/* AI hint */}
                {(img.ai.make || img.ai.model) && (
                  <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-1.5">
                    AI hint: {[img.ai.year, img.ai.make, img.ai.model].filter(Boolean).join(" ")}
                  </p>
                )}

                {/* Suggestions with voting */}
                {hasAnySuggestions && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Suggestions · {img.suggestions.length} {img.suggestions.length !== 1 ? "entries" : "entry"}
                    </p>
                    {img.suggestions.map((s) => (
                      <SuggestionCard
                        key={s.id}
                        suggestion={s}
                        username={username}
                        imageId={img.id}
                        onVoted={fetchImages}
                      />
                    ))}
                  </div>
                )}

                {/* Confirmation progress */}
                {hasAnySuggestions && (
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmation progress</p>
                    {img.agreements.make.value !== null && <ProgressField label="Make" field={img.agreements.make} />}
                    {img.agreements.model.value !== null && <ProgressField label="Model" field={img.agreements.model} />}
                    {img.agreements.year.value !== null && <ProgressField label="Year" field={img.agreements.year} />}
                    {img.agreements.trim.value !== null && <ProgressField label="Trim" field={img.agreements.trim} />}
                  </div>
                )}

                {/* Suggestion form — hidden if user already has one (show update option instead) */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {userSuggestion || isSubmitted ? "Update your suggestion" : "Add a suggestion"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["make", "model", "trim"] as const).map((field) => (
                      <input
                        key={field}
                        type="text"
                        value={form[field]}
                        onChange={(e) => setField(img.id, field, e.target.value)}
                        placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400"
                      />
                    ))}
                    <input
                      type="number"
                      value={form.year}
                      onChange={(e) => setField(img.id, "year", e.target.value)}
                      placeholder="Year"
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400"
                    />
                  </div>

                  {errors[img.id] && (
                    <p className="text-xs text-red-600 mt-1">{errors[img.id]}</p>
                  )}

                  <button
                    onClick={() => submit(img.id)}
                    disabled={isSubmitting || !username.trim()}
                    className="mt-2 w-full text-sm bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting…" : userSuggestion || isSubmitted ? "Update suggestion" : "Submit suggestion"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
