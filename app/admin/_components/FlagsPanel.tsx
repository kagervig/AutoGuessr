"use client";

// Admin panel section showing a breakdown of active images by boolean flag.
import { useEffect, useState } from "react";
import type { FlagsReport } from "@/app/api/admin/flags/route";

const FLAG_ROWS: { key: keyof FlagsReport["flags"]; label: string }[] = [
  { key: "hardcoreEligible",    label: "Hardcore eligible" },
  { key: "cropped",             label: "Cropped (partial view)" },
  { key: "logoVisible",         label: "Logo visible" },
  { key: "modelNameVisible",    label: "Model name visible" },
  { key: "hasMultipleVehicles", label: "Multiple vehicles in image" },
  { key: "faceVisible",         label: "Face visible" },
  { key: "vehicleUnmodified",   label: "Vehicle unmodified" },
];

function PctBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gray-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-gray-500 text-xs w-10 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function FlagsPanel() {
  const [report, setReport] = useState<FlagsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/flags")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then((d) => setReport(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  const thClass = "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="max-w-2xl mx-auto p-6">
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {report && (
        <>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Image flags — {report.total.toLocaleString()} active images
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className={thClass}>Flag</th>
                  <th className={`${thClass} text-right`}>Set</th>
                  <th className={`${thClass} text-right`}>Not set</th>
                  <th className={thClass}>% set</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FLAG_ROWS.map(({ key, label }) => {
                  const count = report.flags[key];
                  const notSet = report.total - count;
                  const pct = report.total === 0 ? 0 : (count / report.total) * 100;
                  return (
                    <tr key={key}>
                      <td className="px-4 py-2 text-gray-800">{label}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-700">{count.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-400">{notSet.toLocaleString()}</td>
                      <td className="px-4 py-2"><PctBar pct={pct} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
