"use client";
// Admin panel for reviewing and resolving image reports.
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Report {
  id: string;
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

interface Vehicle {
  make: string;
  model: string;
  year: number;
  trim: string | null;
  bodyStyle: string;
  era: string;
  rarity: string;
  countryOfOrigin: string;
}

interface ReportedImage {
  id: string;
  filename: string;
  isActive: boolean;
  imageUrl: string;
  vehicle: Vehicle;
  vehicleId: string;
  reportCount: number;
  reports: Report[];
}

const VEHICLE_FIELDS: {
  key: keyof Report & `suggested${string}`;
  label: string;
  vehicleKey: keyof Vehicle;
}[] = [
  { key: "suggestedMake", label: "Make", vehicleKey: "make" },
  { key: "suggestedModel", label: "Model", vehicleKey: "model" },
  { key: "suggestedYear", label: "Year", vehicleKey: "year" },
  { key: "suggestedTrim", label: "Trim", vehicleKey: "trim" },
  {
    key: "suggestedCountryOfOrigin",
    label: "Country",
    vehicleKey: "countryOfOrigin",
  },
  { key: "suggestedBodyStyle", label: "Body Style", vehicleKey: "bodyStyle" },
  { key: "suggestedEra", label: "Era", vehicleKey: "era" },
  { key: "suggestedRarity", label: "Rarity", vehicleKey: "rarity" },
];

function ReportRow({
  report,
  vehicle,
  onApply,
}: {
  report: Report;
  vehicle: Vehicle;
  onApply: (reportId: string) => Promise<void>;
}) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const diffs = VEHICLE_FIELDS.filter(({ key }) => {
    const suggested = report[key];
    return (
      suggested != null &&
      String(suggested) !==
        String(
          vehicle[VEHICLE_FIELDS.find((f) => f.key === key)!.vehicleKey] ?? "",
        )
    );
  });

  async function handleApply() {
    setApplying(true);
    setApplyError(null);
    try {
      await onApply(report.id);
      setApplied(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">
            {report.certainty}% certain
          </span>
          <span className="text-gray-400 text-xs">
            {new Date(report.createdAt).toLocaleDateString()}
          </span>
        </div>
        {diffs.length > 0 && (
          <button
            onClick={handleApply}
            disabled={applying || applied}
            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applied ? "Applied" : applying ? "Applying…" : "Apply suggestions"}
          </button>
        )}
        {applyError && <p className="text-xs text-red-500">{applyError}</p>}
      </div>

      {report.comment && (
        <p className="text-gray-600 italic">&ldquo;{report.comment}&rdquo;</p>
      )}

      {diffs.length > 0 ? (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-gray-400 text-left">
              <th className="pb-1 pr-3 font-medium w-24">Field</th>
              <th className="pb-1 pr-3 font-medium">Current</th>
              <th className="pb-1 font-medium">Suggested</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map(({ key, label, vehicleKey }) => (
              <tr key={key} className="border-t border-gray-200">
                <td className="py-1 pr-3 text-gray-500">{label}</td>
                <td className="py-1 pr-3 text-gray-500 line-through">
                  {String(vehicle[vehicleKey] ?? "—")}
                </td>
                <td className="py-1 text-gray-900 font-medium">
                  {String(report[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-gray-400">
          No field changes suggested — comment only.
        </p>
      )}
    </div>
  );
}

function ReportedImageRow({
  item,
  onUpdate,
}: {
  item: ReportedImage;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const label = `${item.vehicle.make} ${item.vehicle.model} ${item.vehicle.year}`;

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    const res = await fetch("/api/admin/reported", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(
        (data as { error?: string }).error ?? `Request failed (${res.status})`,
      );
      return;
    }
    onUpdate();
  }

  async function handleApply(reportId: string) {
    const res = await fetch("/api/admin/reported", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply", imageId: item.id, reportId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        (data as { error?: string }).error ?? `Request failed (${res.status})`,
      );
    }
    onUpdate();
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Summary row — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div
          className="shrink-0 w-28 h-18 relative rounded overflow-hidden bg-gray-100"
          style={{ height: "4.5rem" }}
        >
          <Image
            src={item.imageUrl}
            alt={label}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{label}</span>
            {item.isActive ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                Active
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                Deactivated
              </span>
            )}
            <span className="text-xs text-gray-400">
              {item.reportCount} report{item.reportCount !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {item.filename}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Full image */}
          <div className="relative w-full aspect-video rounded overflow-hidden bg-gray-100">
            <Image
              src={item.imageUrl}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Reports */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Reports ({item.reports.length})
            </p>
            {item.reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                vehicle={item.vehicle}
                onApply={handleApply}
              />
            ))}
          </div>

          {/* Actions */}
          {actionError && <p className="text-xs text-red-500">{actionError}</p>}
          <div className="flex gap-2 flex-wrap pt-1 border-t border-gray-100">
            <button
              onClick={() => patch({ action: "dismiss", imageId: item.id })}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Dismiss (mark reviewed)
            </button>
            {item.isActive ? (
              <button
                onClick={() =>
                  patch({ action: "deactivate", imageId: item.id })
                }
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Deactivate image
              </button>
            ) : (
              <button
                onClick={() =>
                  patch({ action: "reactivate", imageId: item.id })
                }
                disabled={busy}
                className="text-xs px-3 py-1.5 rounded border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-50"
              >
                Reactivate image
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
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

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (items.length === 0)
    return <div className="p-6 text-sm text-gray-400">No reported images.</div>;

  return (
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-500">
        {items.length} image{items.length !== 1 ? "s" : ""} flagged for review
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <ReportedImageRow
            key={item.id}
            item={item}
            onUpdate={fetchReported}
          />
        ))}
      </div>
    </div>
  );
}
