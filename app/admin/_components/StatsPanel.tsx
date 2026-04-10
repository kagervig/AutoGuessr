"use client";

import { useEffect, useState, useCallback } from "react";

type SortKey = "make" | "total" | "correct" | "incorrect" | "successRate" | "thumbsUp" | "thumbsDown" | "reportCount";
type SortDir = "asc" | "desc";

interface ImageStatRow {
  id: string;
  filename: string;
  imageUrl: string;
  vehicle: { make: string; model: string; year: number };
  stats: {
    correctGuesses: number;
    incorrectGuesses: number;
    skipCount: number;
    thumbsUp: number;
    thumbsDown: number;
    reportCount: number;
  } | null;
}

function successRate(row: ImageStatRow): number {
  const stats = row.stats;
  if (!stats) return 0;
  const total = stats.correctGuesses + stats.incorrectGuesses;
  return total === 0 ? 0 : stats.correctGuesses / total;
}

function totalPlays(row: ImageStatRow): number {
  if (!row.stats) return 0;
  return row.stats.correctGuesses + row.stats.incorrectGuesses;
}

export default function StatsPanel() {
  const [rows, setRows] = useState<ImageStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ImageStatRow | null>(null);

  const closeOverlay = useCallback(() => setSelected(null), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeOverlay();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeOverlay]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setRows(d);
        setLoading(false);
      });
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.vehicle.make.toLowerCase().includes(q) ||
      r.vehicle.model.toLowerCase().includes(q) ||
      String(r.vehicle.year).includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sortKey) {
      case "make":
        av = `${a.vehicle.make} ${a.vehicle.model} ${a.vehicle.year}`;
        bv = `${b.vehicle.make} ${b.vehicle.model} ${b.vehicle.year}`;
        break;
      case "total":
        av = totalPlays(a);
        bv = totalPlays(b);
        break;
      case "correct":
        av = a.stats?.correctGuesses ?? 0;
        bv = b.stats?.correctGuesses ?? 0;
        break;
      case "incorrect":
        av = a.stats?.incorrectGuesses ?? 0;
        bv = b.stats?.incorrectGuesses ?? 0;
        break;
      case "successRate":
        av = successRate(a);
        bv = successRate(b);
        break;
      case "thumbsUp":
        av = a.stats?.thumbsUp ?? 0;
        bv = b.stats?.thumbsUp ?? 0;
        break;
      case "thumbsDown":
        av = a.stats?.thumbsDown ?? 0;
        bv = b.stats?.thumbsDown ?? 0;
        break;
      case "reportCount":
        av = a.stats?.reportCount ?? 0;
        bv = b.stats?.reportCount ?? 0;
        break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function SortIndicator({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const thClass = "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search make, model, year…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-200 rounded px-3 py-1.5 w-64 focus:outline-none focus:border-gray-400"
        />
        <span className="text-sm text-gray-400">{filtered.length} images</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={thClass} onClick={() => handleSort("make")}>
                  Vehicle <SortIndicator k="make" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort("total")}>
                  Total <SortIndicator k="total" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort("correct")}>
                  Correct <SortIndicator k="correct" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort("incorrect")}>
                  Incorrect <SortIndicator k="incorrect" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort("successRate")}>
                  Success % <SortIndicator k="successRate" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort("thumbsUp")}>
                  Thumbs Up <SortIndicator k="thumbsUp" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort("thumbsDown")}>
                  Thumbs Down <SortIndicator k="thumbsDown" />
                </th>
                <th className={`${thClass} text-right`} onClick={() => handleSort("reportCount")}>
                  Reports <SortIndicator k="reportCount" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((row) => {
                const total = totalPlays(row);
                const rate = successRate(row);
                return (
                  <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(row)}>
                    <td className="px-3 py-2 text-gray-800">
                      {row.vehicle.year} {row.vehicle.make} {row.vehicle.model}
                      <span className="ml-2 text-xs text-gray-400">{row.filename}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{total}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-600">
                      {row.stats?.correctGuesses ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-500">
                      {row.stats?.incorrectGuesses ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {total === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span
                          className={
                            rate >= 0.6
                              ? "text-green-600"
                              : rate >= 0.4
                              ? "text-yellow-600"
                              : "text-red-500"
                          }
                        >
                          {Math.round(rate * 100)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-600">
                      {row.stats?.thumbsUp ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-500">
                      {row.stats?.thumbsDown ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {row.stats?.reportCount ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={closeOverlay}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-medium text-gray-800">
                {selected.vehicle.year} {selected.vehicle.make} {selected.vehicle.model}
                <span className="ml-2 text-xs text-gray-400 font-normal">{selected.filename}</span>
              </span>
              <button onClick={closeOverlay} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.imageUrl} alt={selected.filename} className="w-full object-contain max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  );
}
