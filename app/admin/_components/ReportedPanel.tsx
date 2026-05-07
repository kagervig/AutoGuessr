"use client";
// Admin panel for images flagged for review (needsReview = true).
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface LatestReport {
  certainty: number;
  comment: string | null;
  createdAt: string;
  suggestedMake: string | null;
  suggestedModel: string | null;
  suggestedYear: number | null;
  suggestedTrim: string | null;
  suggestedCountryOfOrigin: string | null;
  suggestedBodyStyle: string | null;
  suggestedEra: string | null;
  suggestedRarity: string | null;
}

interface ReportedImage {
  id: string;
  filename: string;
  isActive: boolean;
  needsReview: boolean;
  uploadedAt: string;
  imageUrl: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    trim: string | null;
    bodyStyle: string;
    era: string;
    rarity: string;
    countryOfOrigin: string;
  };
  reportCount: number;
  latestReport: LatestReport | null;
}

export default function ReportedPanel() {
  const [items, setItems] = useState<ReportedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReported = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reported");
      if (!res.ok) throw new Error("Failed to load reported images");
      setItems(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReported();
  }, [fetchReported]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-500">{error}</div>;
  }
  if (items.length === 0) {
    return <div className="p-6 text-sm text-gray-400">No reported images.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-500">{items.length} image{items.length !== 1 ? "s" : ""} flagged for review</p>
      <div className="space-y-3">
        {items.map((item) => {
          const label = `${item.vehicle.make} ${item.vehicle.model} ${item.vehicle.year}`;
          const report = item.latestReport;
          return (
            <div key={item.id} className="flex gap-4 bg-white rounded-lg border border-gray-200 p-4">
              <div className="shrink-0 w-32 h-20 relative rounded overflow-hidden bg-gray-100">
                <Image src={item.imageUrl} alt={label} fill className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900">{label}</span>
                  {item.isActive ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Active</span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Deactivated</span>
                  )}
                  <span className="text-xs text-gray-400">{item.reportCount} report{item.reportCount !== 1 ? "s" : ""}</span>
                </div>
                {report && (
                  <p className="text-xs text-gray-500">
                    Latest: {report.certainty}% certain
                    {report.comment ? ` — "${report.comment}"` : ""}
                  </p>
                )}
                <p className="text-xs text-gray-400 truncate">{item.filename}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
