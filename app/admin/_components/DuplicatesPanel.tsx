"use client";

import { useState } from "react";

type Algorithm = "md5" | "sha1" | "sha256" | "phash";

interface DuplicateImage {
  id: string;
  filename: string;
  imageUrl: string;
  source: "staging" | "published";
  label: string;
}

interface DuplicateGroup {
  hash: string;
  distance?: number;
  images: DuplicateImage[];
}

interface ScanResult {
  algorithm: Algorithm;
  threshold?: number;
  offset: number;
  scanned: number;
  total: number;
  hasMore: boolean;
  duplicateGroups: DuplicateGroup[];
  fetchErrors: string[];
}

const ALGORITHMS: { id: Algorithm; label: string }[] = [
  { id: "md5", label: "MD5" },
  { id: "sha1", label: "SHA-1" },
  { id: "sha256", label: "SHA-256" },
  { id: "phash", label: "pHash" },
];

const SOURCE_COLOURS: Record<DuplicateImage["source"], string> = {
  staging: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-700",
};

async function rejectImage(img: DuplicateImage): Promise<void> {
  if (img.source === "staging") {
    const res = await fetch(`/api/admin/staging/${img.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    if (!res.ok) throw new Error(await res.text());
  } else {
    const res = await fetch(`/api/admin/images/${img.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (!res.ok) throw new Error(await res.text());
  }
}

const PAGE_SIZE = 500;

interface VehicleDuplicateGroup {
  make: string;
  model: string;
  primary: { id: string; year: number; trim: string | null; _count: { images: number } };
  duplicates: { id: string; year: number; trim: string | null; _count: { images: number } }[];
}

export default function DuplicatesPanel() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("sha256");
  const [threshold, setThreshold] = useState(10);
  const [scanning, setScanning] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [summary, setSummary] = useState<Omit<ScanResult, "duplicateGroups"> | null>(null);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [rejecting, setRejecting] = useState<Set<string>>(new Set());
  const [rejectErrors, setRejectErrors] = useState<Record<string, string>>({});
  const [scannedSoFar, setScannedSoFar] = useState(0);

  const [vehicleGroups, setVehicleGroups] = useState<VehicleDuplicateGroup[]>([]);
  const [scanningVehicles, setScanningVehicles] = useState(false);
  const [dedupingVehicles, setDedupingVehicles] = useState(false);
  const [dedupeResult, setDedupeResult] = useState<{ mergedCount: number; deletedCount: number } | null>(null);

  async function scanVehicles() {
    setScanningVehicles(true);
    setDedupeResult(null);
    try {
      const res = await fetch("/api/admin/duplicates/vehicles");
      const data = await res.json();
      setVehicleGroups(data.duplicateGroups);
    } catch (err) {
      console.error(err);
    } finally {
      setScanningVehicles(false);
    }
  }

  async function dedupeVehicles() {
    if (!confirm(`Are you sure you want to merge ${vehicleGroups.length} groups of duplicate vehicles?`)) return;
    setDedupingVehicles(true);
    try {
      const res = await fetch("/api/admin/duplicates/vehicles", { method: "POST" });
      const data = await res.json();
      setDedupeResult(data);
      setVehicleGroups([]);
    } catch (err) {
      console.error(err);
    } finally {
      setDedupingVehicles(false);
    }
  }

  async function runScan(offset = 0) {
    setScanning(true);
    if (offset === 0) {
      setGroups([]);
      setSummary(null);
      setRejectErrors({});
      setScannedSoFar(0);
    }
    const qs = new URLSearchParams({ algorithm, offset: String(offset), limit: String(PAGE_SIZE) });
    if (algorithm === "phash") qs.set("threshold", String(threshold));
    const res = await fetch(`/api/admin/duplicates?${qs}`);
    const data: ScanResult = await res.json();
    const { duplicateGroups, ...rest } = data;
    setGroups((prev) => mergeGroups(prev, duplicateGroups));
    setScannedSoFar((prev) => prev + data.scanned);
    setSummary(rest);
    setScanning(false);
  }

  function mergeGroups(existing: DuplicateGroup[], incoming: DuplicateGroup[]): DuplicateGroup[] {
    const map = new Map(existing.map((g) => [g.hash, g]));
    for (const g of incoming) {
      const prev = map.get(g.hash);
      if (prev) {
        const ids = new Set(prev.images.map((i) => i.id));
        map.set(g.hash, { ...g, images: [...prev.images, ...g.images.filter((i) => !ids.has(i.id))] });
      } else {
        map.set(g.hash, g);
      }
    }
    return Array.from(map.values());
  }

  async function handleReject(img: DuplicateImage) {
    setRejecting((prev) => new Set(prev).add(img.id));
    setRejectErrors((prev) => { const next = { ...prev }; delete next[img.id]; return next; });
    try {
      await rejectImage(img);
      // Remove the image from its group; drop the group if only one image remains
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, images: g.images.filter((i) => i.id !== img.id) }))
          .filter((g) => g.images.length > 1)
      );
    } catch (err) {
      setRejectErrors((prev) => ({ ...prev, [img.id]: String(err) }));
    } finally {
      setRejecting((prev) => { const next = new Set(prev); next.delete(img.id); return next; });
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-10 pb-10 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Make/Model Duplicates</h2>
        <p className="text-sm text-gray-500 mb-6">
          Finds vehicles that share the same make and model. The record with the most images is kept as the primary, 
          and all other records are merged into it (images, aliases, and guesses are reassigned).
        </p>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={scanVehicles}
            disabled={scanningVehicles || dedupingVehicles}
            className="px-4 py-1.5 text-sm bg-white text-gray-900 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {scanningVehicles ? "Scanning..." : "Scan for duplicates"}
          </button>
          {vehicleGroups.length > 0 && (
            <button
              onClick={dedupeVehicles}
              disabled={dedupingVehicles}
              className="px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {dedupingVehicles ? "Deduplicating..." : `Merge ${vehicleGroups.length} duplicate groups`}
            </button>
          )}
        </div>

        {dedupeResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Successfully merged {dedupeResult.mergedCount} groups and deleted {dedupeResult.deletedCount} duplicate vehicle records.
          </div>
        )}

        {vehicleGroups.length > 0 && (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {vehicleGroups.map((group, i) => (
              <div key={i} className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">{group.make} {group.model}</h3>
                <div className="space-y-1.5">
                  <div className="text-xs text-green-700 flex items-center gap-2 bg-green-50 p-1.5 rounded">
                    <span className="font-bold px-1 bg-green-600 text-white rounded text-[10px]">KEEP</span>
                    <span className="font-mono">{group.primary.id}</span>
                    <span>Year: {group.primary.year}</span>
                    <span>Trim: {group.primary.trim || "—"}</span>
                    <span className="font-semibold">Images: {group.primary._count.images}</span>
                  </div>
                  {group.duplicates.map((dup) => (
                    <div key={dup.id} className="text-xs text-red-600 flex items-center gap-2 bg-red-50 p-1.5 rounded">
                      <span className="font-bold px-1 bg-red-600 text-white rounded text-[10px]">MERGE</span>
                      <span className="font-mono">{dup.id}</span>
                      <span>Year: {dup.year}</span>
                      <span>Trim: {dup.trim || "—"}</span>
                      <span className="font-semibold">Images: {dup._count.images}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Image Content Duplicates</h2>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Algorithm</p>
          <div className="flex gap-1">
            {ALGORITHMS.map(({ id, label }) => (
              <button
                key={id}
                disabled={scanning}
                onClick={() => setAlgorithm(id)}
                className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                  algorithm === id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                } disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {algorithm === "phash" && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">
              Similarity threshold:{" "}
              <span className="font-medium text-gray-700">{threshold} / 64 bits</span>
            </p>
            <input
              type="range"
              min={1}
              max={20}
              value={threshold}
              disabled={scanning}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-48 accent-gray-900 disabled:opacity-50"
            />
          </div>
        )}

        <button
          onClick={() => runScan(0)}
          disabled={scanning}
          className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {scanning ? "Scanning…" : "Run scan"}
        </button>
      </div>

      {/* Scanning state */}
      {scanning && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="inline-block w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
          Fetching and hashing images…
        </div>
      )}

      {/* Results */}
      {summary && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Scanned{" "}
              <span className="font-medium text-gray-900">{scannedSoFar}</span>
              {" of "}
              <span className="font-medium text-gray-900">{summary.total}</span>{" "}
              images using{" "}
              <span className="font-medium text-gray-900">{summary.algorithm.toUpperCase()}</span>
              {summary.threshold !== undefined && <> (threshold {summary.threshold}/64)</>}
              {" — "}
              {groups.length === 0 ? (
                <span className="text-green-600">no duplicates found</span>
              ) : (
                <span className="text-red-600 font-medium">
                  {groups.length} duplicate group{groups.length !== 1 ? "s" : ""} found
                </span>
              )}
            </p>
            {summary.hasMore && (
              <button
                onClick={() => runScan(summary.offset + PAGE_SIZE)}
                disabled={scanning}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {scanning ? "Scanning…" : `Scan next ${PAGE_SIZE}`}
              </button>
            )}
          </div>

          {summary.fetchErrors.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setErrorsOpen((o) => !o)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {errorsOpen ? "▾" : "▸"} {summary.fetchErrors.length} image
                {summary.fetchErrors.length !== 1 ? "s" : ""} failed to fetch
              </button>
              {errorsOpen && (
                <ul className="mt-1 ml-3 text-xs text-gray-400 space-y-0.5">
                  {summary.fetchErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="space-y-4">
            {groups.map((group, i) => (
              <div
                key={group.hash}
                className="border border-gray-200 rounded-lg overflow-hidden bg-white"
              >
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    Group {i + 1} — {summary.algorithm.toUpperCase()}:{" "}
                    <span className="font-mono text-gray-500">{group.hash}</span>
                  </span>
                  {group.distance !== undefined && (
                    <span className="text-xs text-gray-500">
                      max distance: {group.distance}/64
                    </span>
                  )}
                </div>

                <div className="divide-y divide-gray-100">
                  {group.images.map((img) => (
                    <div key={img.id} className="flex items-center gap-3 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.imageUrl}
                        alt={img.filename}
                        className="w-20 h-14 object-cover rounded border border-gray-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{img.label}</p>
                        <p className="text-xs text-gray-400 font-mono truncate">{img.filename}</p>
                        {rejectErrors[img.id] && (
                          <p className="text-xs text-red-500 mt-0.5">{rejectErrors[img.id]}</p>
                        )}
                      </div>
                      <span
                        className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full font-medium ${SOURCE_COLOURS[img.source]}`}
                      >
                        {img.source}
                      </span>
                      <button
                        onClick={() => handleReject(img)}
                        disabled={rejecting.has(img.id)}
                        className="flex-shrink-0 px-3 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      >
                        {rejecting.has(img.id)
                          ? "…"
                          : img.source === "staging"
                          ? "Reject"
                          : "Deactivate"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
