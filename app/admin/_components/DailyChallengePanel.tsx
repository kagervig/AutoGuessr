"use client";

// Admin panel for generating and managing daily challenges.
import { useEffect, useState } from "react";
import Image from "next/image";

interface ChallengeImage {
  id: string;
  url: string | null;
  make: string | null;
  model: string | null;
}

interface DailyChallenge {
  id: number;
  challengeNumber: number;
  date: string; // YYYY-MM-DD
  imageIds: string[];
  images: ChallengeImage[];
  isPublished: boolean;
  curatedBy: string | null;
  generatedAt: string;
}

type ChallengeStatus = "future" | "today" | "past";

function getChallengeStatus(dateStr: string): ChallengeStatus {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (d.getTime() === today.getTime()) return "today";
  return d > today ? "future" : "past";
}

const STATUS_BADGE: Record<ChallengeStatus, string> = {
  future: "bg-blue-100 text-blue-700",
  today: "bg-green-100 text-green-700",
  past: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  future: "Future",
  today: "Live today",
  past: "Past",
};

export default function DailyChallengePanel() {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editImageIds, setEditImageIds] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/daily-challenge")
      .then((r) => r.json())
      .then((data) => {
        setChallenges(data.challenges ?? []);
        setLoading(false);
      });
  }, [revision]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await fetch("/api/admin/daily-challenge/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json() as { created?: DailyChallenge[]; skipped?: string[]; error?: string };
      if (!res.ok) {
        setGenerateResult(`Error: ${data.error}`);
      } else {
        setGenerateResult(`Created ${data.created?.length ?? 0}, skipped ${data.skipped?.length ?? 0}`);
        setRevision((v) => v + 1);
      }
    } finally {
      setGenerating(false);
    }
  }

  function openEditor(challenge: DailyChallenge) {
    setEditingId(challenge.id);
    setEditImageIds(challenge.imageIds.join("\n"));
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditImageIds("");
    setSaveError(null);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setSaveError(null);
    const imageIds = editImageIds
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch(`/api/admin/daily-challenge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setSaveError(data.error ?? "Save failed");
      } else {
        setEditingId(null);
        setRevision((v) => v + 1);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this challenge?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/daily-challenge/${id}`, { method: "DELETE" });
      if (res.ok) setRevision((v) => v + 1);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <form onSubmit={handleGenerate} className="mb-6 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={generating}
          className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating…" : "Generate"}
        </button>
        {generateResult && (
          <span className="text-sm text-gray-500">{generateResult}</span>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : challenges.length === 0 ? (
        <p className="text-sm text-gray-400">No challenges yet.</p>
      ) : (
        <div className="overflow-y-auto max-h-[calc(100vh-220px)] space-y-2">
          {challenges.map((c) => {
            const status = getChallengeStatus(c.date);
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className="border border-gray-200 rounded-lg bg-white">
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-sm font-medium text-gray-900">#{c.challengeNumber}</span>
                  <span className="text-sm text-gray-500">{c.date}</span>
                  {status === "future" && !isEditing && (
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => openEditor(c)}
                        className="text-xs px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        className="text-xs px-2.5 py-1 border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deleting === c.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnail grid */}
                {!isEditing && (
                  <div className="px-4 pb-3 grid grid-cols-5 gap-2">
                    {c.images.map((img) => (
                      <div key={img.id} className="flex flex-col gap-1">
                        <div className="relative w-full aspect-[4/3] bg-gray-100 rounded overflow-hidden">
                          {img.url ? (
                            <Image
                              src={img.url}
                              alt={img.make && img.model ? `${img.make} ${img.model}` : img.id}
                              fill
                              sizes="120px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                              ?
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate leading-tight">
                          {img.make && img.model ? `${img.make} ${img.model}` : img.id}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    <label className="block text-xs text-gray-500">
                      Image IDs (one per line or comma-separated)
                    </label>
                    <textarea
                      value={editImageIds}
                      onChange={(e) => setEditImageIds(e.target.value)}
                      rows={10}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono text-gray-900"
                    />
                    {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        disabled={saving}
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
