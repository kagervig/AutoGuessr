"use client";

// Admin panel section showing active image counts by vehicle, make, and make+model.
import { useCallback, useEffect, useState } from "react";
import type { CoverageReport } from "@/app/api/admin/reports/coverage/route";

type View = "vehicle" | "make" | "model";
type SortDir = "asc" | "desc";

interface OverlayTarget {
  label: string;
  url: string;
}

interface StatsImage {
  id: string;
  filename: string;
  imageUrl: string;
  vehicle: { make: string; model: string; year: number };
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

// ---------------------------------------------------------------------------
// Image overlay
// ---------------------------------------------------------------------------

function ImageOverlay({ target, onClose }: { target: OverlayTarget; onClose: () => void }) {
  const [images, setImages] = useState<StatsImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StatsImage | null>(null);

  useEffect(() => {
    fetch(target.url)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then((d) => setImages(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [target.url]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { if (selected) setSelected(null); else onClose(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, selected]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="font-medium text-gray-800">
            {target.label}
            {!loading && <span className="ml-2 text-sm font-normal text-gray-400">{images.length} images</span>}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-4">
          {loading && <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>}
          {error && <p className="text-sm text-red-500 py-4 text-center">{error}</p>}
          {!loading && !error && images.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No images found.</p>
          )}
          {!loading && images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelected(img)}
                  className="group relative aspect-video rounded overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title={`${img.vehicle.year} ${img.vehicle.make} ${img.vehicle.model} — ${img.filename}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-medium text-gray-800 text-sm">
                {selected.vehicle.year} {selected.vehicle.make} {selected.vehicle.model}
                <span className="ml-2 text-xs text-gray-400 font-normal">{selected.filename}</span>
              </span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.imageUrl} alt={selected.filename} className="w-full object-contain max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// By-vehicle view
// ---------------------------------------------------------------------------

type VehicleRow = CoverageReport["byVehicle"][number];
type VehicleSortKey = "make" | "model" | "year" | "trim" | "count";

function VehicleTable({ rows, onSelect }: { rows: VehicleRow[]; onSelect: (t: OverlayTarget) => void }) {
  const [sortKey, setSortKey] = useState<VehicleSortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  function handleSort(key: VehicleSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "count" ? "desc" : "asc");
    }
  }

  const filtered = search
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.make.toLowerCase().includes(q) ||
          r.model.toLowerCase().includes(q) ||
          String(r.year).includes(q) ||
          (r.trim ?? "").toLowerCase().includes(q)
        );
      })
    : rows;

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = 0;
    let bv: string | number = 0;
    switch (sortKey) {
      case "make":  av = a.make;       bv = b.make;       break;
      case "model": av = a.model;      bv = b.model;      break;
      case "year":  av = a.year;       bv = b.year;       break;
      case "trim":  av = a.trim ?? ""; bv = b.trim ?? ""; break;
      case "count": av = a.count;      bv = b.count;      break;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const thClass = "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap";
  const linkClass = "cursor-pointer hover:underline hover:text-blue-600";

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search make, model, year, trim…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-200 rounded px-3 py-1.5 w-72 focus:outline-none focus:border-gray-400"
        />
        <span className="text-sm text-gray-400">{filtered.length} vehicles</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Vehicle ID</th>
              <th className={thClass} onClick={() => handleSort("make")}>Make <SortIndicator active={sortKey === "make"} dir={sortDir} /></th>
              <th className={thClass} onClick={() => handleSort("model")}>Model <SortIndicator active={sortKey === "model"} dir={sortDir} /></th>
              <th className={thClass} onClick={() => handleSort("year")}>Year <SortIndicator active={sortKey === "year"} dir={sortDir} /></th>
              <th className={thClass} onClick={() => handleSort("trim")}>Trim <SortIndicator active={sortKey === "trim"} dir={sortDir} /></th>
              <th className={`${thClass} text-right`} onClick={() => handleSort("count")}>Images <SortIndicator active={sortKey === "count"} dir={sortDir} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((row) => {
              const vehicleLabel = `${row.year} ${row.make} ${row.model}${row.trim ? ` ${row.trim}` : ""}`;
              return (
                <tr key={row.vehicleId} className="hover:bg-gray-50">
                  <td
                    className={`px-3 py-2 font-mono text-xs text-gray-400 ${linkClass}`}
                    onClick={() => onSelect({ label: vehicleLabel, url: `/api/admin/stats?vehicleId=${row.vehicleId}` })}
                  >
                    {row.vehicleId}
                  </td>
                  <td
                    className={`px-3 py-2 text-gray-800 ${linkClass}`}
                    onClick={() => onSelect({ label: row.make, url: `/api/admin/stats?make=${encodeURIComponent(row.make)}` })}
                  >
                    {row.make}
                  </td>
                  <td
                    className={`px-3 py-2 text-gray-800 ${linkClass}`}
                    onClick={() => onSelect({ label: `${row.make} ${row.model}`, url: `/api/admin/stats?make=${encodeURIComponent(row.make)}&model=${encodeURIComponent(row.model)}` })}
                  >
                    {row.model}
                  </td>
                  <td className="px-3 py-2 text-gray-600 tabular-nums">{row.year}</td>
                  <td className="px-3 py-2 text-gray-400">{row.trim ?? <span className="text-gray-200">—</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-800">{row.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// By-make view
// ---------------------------------------------------------------------------

type MakeRow = CoverageReport["byMake"][number];
type MakeSortKey = "make" | "count";

function MakeTable({ rows, onSelect }: { rows: MakeRow[]; onSelect: (t: OverlayTarget) => void }) {
  const [sortKey, setSortKey] = useState<MakeSortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: MakeSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "count" ? "desc" : "asc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = sortKey === "make" ? a.make : a.count;
    const bv = sortKey === "make" ? b.make : b.count;
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const thClass = "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap";

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm bg-white">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className={thClass} onClick={() => handleSort("make")}>Make <SortIndicator active={sortKey === "make"} dir={sortDir} /></th>
            <th className={`${thClass} text-right`} onClick={() => handleSort("count")}>Images <SortIndicator active={sortKey === "count"} dir={sortDir} /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((row) => (
            <tr key={row.make} className="hover:bg-gray-50">
              <td
                className="px-3 py-2 text-gray-800 cursor-pointer hover:underline hover:text-blue-600"
                onClick={() => onSelect({ label: row.make, url: `/api/admin/stats?make=${encodeURIComponent(row.make)}` })}
              >
                {row.make}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-800">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// By-model view
// ---------------------------------------------------------------------------

type ModelRow = CoverageReport["byModel"][number];
type ModelSortKey = "make" | "model" | "count";

function ModelTable({ rows, onSelect }: { rows: ModelRow[]; onSelect: (t: OverlayTarget) => void }) {
  const [sortKey, setSortKey] = useState<ModelSortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  function handleSort(key: ModelSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "count" ? "desc" : "asc");
    }
  }

  const filtered = search
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return r.make.toLowerCase().includes(q) || r.model.toLowerCase().includes(q);
      })
    : rows;

  const sorted = [...filtered].sort((a, b) => {
    const av = sortKey === "count" ? a.count : sortKey === "make" ? a.make : a.model;
    const bv = sortKey === "count" ? b.count : sortKey === "make" ? b.make : b.model;
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const thClass = "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap";

  return (
    <>
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search make or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-200 rounded px-3 py-1.5 w-64 focus:outline-none focus:border-gray-400"
        />
        <span className="text-sm text-gray-400">{filtered.length} models</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thClass} onClick={() => handleSort("make")}>Make <SortIndicator active={sortKey === "make"} dir={sortDir} /></th>
              <th className={thClass} onClick={() => handleSort("model")}>Model <SortIndicator active={sortKey === "model"} dir={sortDir} /></th>
              <th className={`${thClass} text-right`} onClick={() => handleSort("count")}>Images <SortIndicator active={sortKey === "count"} dir={sortDir} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((row) => (
              <tr key={`${row.make}|${row.model}`} className="hover:bg-gray-50">
                <td
                  className="px-3 py-2 text-gray-800 cursor-pointer hover:underline hover:text-blue-600"
                  onClick={() => onSelect({ label: row.make, url: `/api/admin/stats?make=${encodeURIComponent(row.make)}` })}
                >
                  {row.make}
                </td>
                <td
                  className="px-3 py-2 text-gray-800 cursor-pointer hover:underline hover:text-blue-600"
                  onClick={() => onSelect({ label: `${row.make} ${row.model}`, url: `/api/admin/stats?make=${encodeURIComponent(row.make)}&model=${encodeURIComponent(row.model)}` })}
                >
                  {row.model}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-800">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export default function CoveragePanel() {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("vehicle");
  const [overlay, setOverlay] = useState<OverlayTarget | null>(null);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  useEffect(() => {
    fetch("/api/admin/reports/coverage")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then((d) => setReport(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  const views: [View, string][] = [
    ["vehicle", "By Vehicle"],
    ["make",    "By Make"],
    ["model",   "By Model"],
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-1 mb-5">
        {views.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              view === v
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {report && view === "vehicle" && <VehicleTable rows={report.byVehicle} onSelect={setOverlay} />}
      {report && view === "make"    && <MakeTable    rows={report.byMake}    onSelect={setOverlay} />}
      {report && view === "model"   && <ModelTable   rows={report.byModel}   onSelect={setOverlay} />}

      {overlay && <ImageOverlay target={overlay} onClose={closeOverlay} />}
    </div>
  );
}
