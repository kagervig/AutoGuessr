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
  date: string; // YYYY-MM-DD
  imageIds: string[];
  images: ChallengeImage[];
  isPublished: boolean;
  curatedBy: string | null;
  generatedAt: string;
}

type ChallengeStatus = "future" | "today" | "past";

function formatChallengeDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

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

function monthBounds(year: number, month: number): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

export default function DailyChallengePanel() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(now.getUTCMonth()); // 0-indexed

  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  function goToPrevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1))
    .toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    const { start, end } = monthBounds(viewYear, viewMonth);
    fetch(`/api/admin/daily-challenge?startDate=${start}&endDate=${end}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `Server error ${r.status}`);
        return data;
      })
      .then((data) => {
        setChallenges(data.challenges ?? []);
      })
      .catch((err: Error) => {
        setLoadError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [revision, viewYear, viewMonth]);

  async function handleGenerate() {
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
      <form action={handleGenerate} className="mb-6 flex items-end gap-3 flex-wrap">
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

      <div className="flex items-center gap-3 mb-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 w-fit">
        <button
          onClick={goToPrevMonth}
          aria-label="Previous month"
          className="px-2 py-1 text-sm text-gray-700 border border-gray-300 rounded bg-white hover:bg-gray-100 transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-gray-700 w-36 text-center">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          aria-label="Next month"
          className="px-2 py-1 text-sm text-gray-700 border border-gray-300 rounded bg-white hover:bg-gray-100 transition-colors"
        >
          ›
        </button>
      </div>

      {loadError && (
        <p className="text-sm text-red-500 mb-4">Error: {loadError}</p>
      )}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : challenges.length === 0 ? (
        <p className="text-sm text-gray-400">No challenges for {monthLabel}.</p>
      ) : (
        <div className="overflow-y-auto max-h-[calc(100vh-220px)] space-y-2">
          {challenges.map((c) => {
            const status = getChallengeStatus(c.date);
            return (
              <div key={c.id} className="border border-gray-200 rounded-lg bg-white">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{formatChallengeDate(c.date)}</span>
                  {status === "future" && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="ml-auto text-xs px-2.5 py-1 border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deleting === c.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
