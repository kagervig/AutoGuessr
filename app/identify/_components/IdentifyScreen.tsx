"use client";

import { useEffect, useState, useCallback } from "react";

const THRESHOLD = 5;

interface FieldAgreement {
  value: string | number | null;
  count: number;
  confirmed: boolean;
  threshold: number;
}

interface CommunityImage {
  id: string;
  imageUrl: string;
  ai: { make: string | null; model: string | null; year: number | null };
  agreements: {
    make: FieldAgreement;
    model: FieldAgreement;
    year: FieldAgreement;
    trim: FieldAgreement;
  };
  suggestionCount: number;
}

interface SuggestForm {
  make: string;
  model: string;
  year: string;
  trim: string;
}

function ProgressField({ label, field }: { label: string; field: FieldAgreement }) {
  const pct = Math.min((field.count / THRESHOLD) * 100, 100);
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
          <span className="text-xs text-gray-400">{field.count}/{THRESHOLD}</span>
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
            <p className="text-sm text-gray-500">Agree on a make and model to confirm it for the game.</p>
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
          <p className="text-xs text-gray-400 mt-1">Used to track your contributions. Must match 5 unique users per field to confirm.</p>
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

          return (
            <div key={img.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt="Mystery car"
                className="w-full aspect-video object-cover bg-gray-100"
              />

              <div className="p-4 space-y-4">
                {/* Community progress */}
                {img.suggestionCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Community progress · {img.suggestionCount} suggestion{img.suggestionCount !== 1 ? "s" : ""}
                    </p>
                    {img.agreements.make.value !== null && <ProgressField label="Make" field={img.agreements.make} />}
                    {img.agreements.model.value !== null && <ProgressField label="Model" field={img.agreements.model} />}
                    {img.agreements.year.value !== null && <ProgressField label="Year" field={img.agreements.year} />}
                    {img.agreements.trim.value !== null && <ProgressField label="Trim" field={img.agreements.trim} />}
                  </div>
                )}

                {/* AI hint */}
                {(img.ai.make || img.ai.model) && (
                  <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-1.5">
                    AI hint: {[img.ai.year, img.ai.make, img.ai.model].filter(Boolean).join(" ")}
                  </p>
                )}

                {/* Suggestion form */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {isSubmitted ? "Your suggestion (update)" : "Your suggestion"}
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
                    {isSubmitting ? "Submitting…" : isSubmitted ? "Update suggestion" : "Submit suggestion"}
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
