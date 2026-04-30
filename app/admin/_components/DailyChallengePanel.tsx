"use client";

// Admin panel for viewing and managing Daily Challenges via a monthly calendar.
import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

interface ChallengeImage {
  id: string;
  url: string | null;
  make: string | null;
  model: string | null;
}

interface DailyChallenge {
  id: number;
  date: string;
  imageIds: string[];
  images: ChallengeImage[];
  isPublished: boolean;
  curatedBy: string | null;
  generatedAt: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthBounds(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    start: toDateStr(year, month, 1),
    end: toDateStr(year, month, lastDay),
  };
}

export default function DailyChallengePanel() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(now.getUTCMonth());

  const [challengeMap, setChallengeMap] = useState<Record<string, DailyChallenge>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  useEffect(() => {
    const { start, end } = monthBounds(viewYear, viewMonth);
    fetch(`/api/admin/daily-challenge?startDate=${start}&endDate=${end}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoadError(data.error); setLoading(false); return; }
        const map: Record<string, DailyChallenge> = {};
        for (const c of data.challenges ?? []) map[c.date] = c;
        setLoadError(null);
        setChallengeMap(map);
        setLoading(false);
      })
      .catch((err: Error) => { setLoadError(err.message); setLoading(false); });
  }, [viewYear, viewMonth, revision]);

  function prevMonth() {
    setSelectedDate(null);
    setLoading(true);
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    setSelectedDate(null);
    setLoading(true);
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function handleStartDateChange(val: string) {
    setStartDate(val);
    setEndDate(val);
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenerateResult(null);
    fetch("/api/admin/daily-challenge/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setGenerateResult(`Error: ${data.error}`);
        } else {
          setGenerateResult(`Created ${data.created?.length ?? 0}, skipped ${data.skipped?.length ?? 0}`);
          setRevision((v) => v + 1);
        }
        setGenerating(false);
      })
      .catch((err: Error) => { setGenerateResult(`Error: ${err.message}`); setGenerating(false); });
  }

  function handleDelete() {
    if (!selectedDate) return;
    const challenge = challengeMap[selectedDate];
    if (!challenge) return;
    if (!confirm(`Delete challenge for ${selectedDate}?`)) return;
    setDeleting(true);
    fetch(`/api/admin/daily-challenge/${challenge.id}`, { method: "DELETE" })
      .then(() => {
        setDeleting(false);
        setSelectedDate(null);
        setRevision((v) => v + 1);
      });
  }

  const today = new Date().toISOString().slice(0, 10);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedChallenge = selectedDate ? challengeMap[selectedDate] ?? null : null;

  return (
    <div className="flex h-full">
      {/* Left: calendar + generate form */}
      <aside className="w-72 border-r border-gray-200 p-4 shrink-0 overflow-y-auto flex flex-col gap-6">

        {/* Month navigation */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} aria-label="Previous month" className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} aria-label="Next month" className="p-1 hover:bg-gray-100 rounded transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-6">Loading…</div>
          ) : loadError ? (
            <div className="text-xs text-red-500 py-4 break-all">{loadError}</div>
          ) : (
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const challenge = challengeMap[dateStr];
                const isPastOrToday = dateStr <= today;
                const isSelected = dateStr === selectedDate;

                let cls: string;
                if (!challenge) {
                  cls = isSelected ? "bg-red-600 text-white" : "bg-red-100 text-red-900 hover:bg-red-200";
                } else if (isPastOrToday) {
                  cls = isSelected ? "bg-green-700 text-white" : "bg-green-100 text-green-900 hover:bg-green-200";
                } else {
                  cls = isSelected ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-900 hover:bg-blue-200";
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    aria-label={`${dateStr}${challenge ? " — challenge exists" : " — no challenge"}`}
                    className={`aspect-square flex items-center justify-center text-xs font-medium rounded transition-colors ${cls}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-3 space-y-1">
            {[
              { color: "bg-green-200", label: "Past/present challenge" },
              { color: "bg-blue-200", label: "Future challenge" },
              { color: "bg-red-200", label: "No challenge" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
                <div className={`w-3 h-3 rounded ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Generate form */}
        <form onSubmit={handleGenerate} className="space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Generate</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="w-full px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating…" : "Generate"}
          </button>
          {generateResult && (
            <p className={`text-xs ${generateResult.startsWith("Error") ? "text-red-500" : "text-gray-500"}`}>
              {generateResult}
            </p>
          )}
        </form>
      </aside>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedDate ? (
          <p className="text-gray-400 text-sm">Select a day to view the challenge.</p>
        ) : !selectedChallenge ? (
          <p className="text-gray-500 text-sm">No challenge generated for {selectedDate}.</p>
        ) : (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{selectedChallenge.date}</h2>

              {selectedChallenge.isPublished && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>
              )}
              {selectedChallenge.curatedBy && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Curated by {selectedChallenge.curatedBy}
                </span>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {selectedChallenge.images.map((img) => (
                <div key={img.id} className="rounded-xl overflow-hidden bg-gray-100">
                  {img.url ? (
                    <div className="relative aspect-video">
                      <Image
                        src={img.url}
                        alt={`${img.make ?? ""} ${img.model ?? ""}`.trim()}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-200" />
                  )}
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{img.make ?? "—"}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{img.model ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
