"use client";

// Admin panel section for running the image eligibility report by game mode tier.
import { useState } from "react";
import type { EligibilityReport } from "@/app/api/admin/reports/eligibility/route";

interface SlotRowDef {
  label: string;
  criteria: string;
  need: number | null; // null = informational pool row (no status badge)
  count: number;
  indent?: boolean;
}

function StatusBadge({ need, count }: { need: number | null; count: number }) {
  if (need === null) return <span className="text-gray-300">—</span>;
  if (count === 0)
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
        Empty
      </span>
    );
  if (count < need)
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
        Low
      </span>
    );
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
      OK
    </span>
  );
}

function NeedCell({ need }: { need: number | null }) {
  if (need === null) return <span className="text-gray-300">—</span>;
  return <span>≥{need}</span>;
}

function ModeSection({ title, subtitle, rows }: { title: string; subtitle: string; rows: SlotRowDef[] }) {
  const thClass = "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap";
  return (
    <div className="mb-8">
      <div className="mb-2">
        <span className="font-semibold text-gray-800">{title}</span>
        <span className="ml-2 text-sm text-gray-400">{subtitle}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thClass}>Slot</th>
              <th className={thClass}>Criteria</th>
              <th className={`${thClass} text-right`}>Need</th>
              <th className={`${thClass} text-right`}>Eligible</th>
              <th className={`${thClass} text-center`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={i} className={row.indent ? "bg-gray-50/50" : ""}>
                <td className="px-3 py-2 text-gray-800 whitespace-nowrap">
                  {row.indent && <span className="mr-1 text-gray-300">└─</span>}
                  {row.label}
                </td>
                <td className="px-3 py-2 text-gray-500">{row.criteria}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                  <NeedCell need={row.need} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-800">
                  {row.count.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusBadge need={row.need} count={row.count} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rookieRows(r: EligibilityReport["rookie"]): SlotRowDef[] {
  return [
    { label: "Total pool",           criteria: "correctRatio > 0.75 or never shown, not hardcore eligible", need: null, count: r.pool },
    { label: "Standard sub-pool",    criteria: "not cropped",                               need: null, count: r.standardPool, indent: true },
    { label: "Cropped sub-pool",     criteria: "is cropped",                                need: null, count: r.croppedPool,  indent: true },
    { label: "Slot A – Logo/model",  criteria: "isLogoVisible or isModelNameVisible",        need: 5,    count: r.slotA },
    { label: "Slot B – Rare vehicle",criteria: "rarity is rare or ultra_rare",              need: 1,    count: r.slotB },
    { label: "Slot C – Cropped",     criteria: "isCropped (earns pointsBonus)",             need: 1,    count: r.slotC },
    { label: "Slot D – Fill",        criteria: "any from standard sub-pool",                need: 3,    count: r.slotD },
  ];
}

function standardRows(r: EligibilityReport["standard"]): SlotRowDef[] {
  return [
    { label: "Total pool",           criteria: "correctRatio > 0.50 or never shown",        need: null, count: r.pool },
    { label: "Slot A – HC eligible", criteria: "isHardcoreEligible",                        need: 1,    count: r.slotA },
    { label: "Slot B – Cropped",     criteria: "isCropped",                                 need: 2,    count: r.slotB },
    { label: "Slot C – Rare vehicle",criteria: "rarity is rare or ultra_rare",              need: 1,    count: r.slotC },
    { label: "Slot D – Logo/model",  criteria: "isLogoVisible or isModelNameVisible",        need: 3,    count: r.slotD },
    { label: "Slot E – Fill",        criteria: "any from pool",                             need: 3,    count: r.slotE },
  ];
}

function hardcoreRows(r: EligibilityReport["hardcore"]): SlotRowDef[] {
  return [
    { label: "Total pool",              criteria: "correctRatio < 0.80 or never shown",          need: null, count: r.pool },
    { label: "Slot A – Cropped (4×)",   criteria: "isCropped",                                   need: 4,    count: r.slotA },
    { label: "with model name",         criteria: "isCropped + isModelNameVisible (max 2 of 4)", need: null, count: r.slotAWithModel, indent: true },
    { label: "without model name",      criteria: "isCropped + !isModelNameVisible (min 2 of 4)",need: null, count: r.slotANoModel,   indent: true },
    { label: "Slot B – Hard/HC eligible",criteria: "correctRatio < 0.40 or isHardcoreEligible", need: 2,    count: r.slotB },
    { label: "Slot C – Rare vehicle",   criteria: "rarity is rare or ultra_rare",                need: 1,    count: r.slotC },
    { label: "Slot D – HC eligible",    criteria: "isHardcoreEligible",                          need: 2,    count: r.slotD },
    { label: "Slot E – Fill",           criteria: "any from pool",                               need: 1,    count: r.slotE },
  ];
}

export default function ReportsPanel() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<EligibilityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/eligibility");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={runReport}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Running…" : "Run Report"}
        </button>
        {report && !loading && (
          <span className="text-sm text-gray-400">
            Generated: {new Date(report.generatedAt).toLocaleString()}
            <span className="ml-3 text-gray-300">·</span>
            <span className="ml-3">{report.totalActiveImages.toLocaleString()} active images total</span>
          </span>
        )}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {report && (
        <>
          <ModeSection
            title="Rookie"
            subtitle="Easy mode — needs 10 images per game"
            rows={rookieRows(report.rookie)}
          />
          <ModeSection
            title="Standard"
            subtitle="needs 10 images per game"
            rows={standardRows(report.standard)}
          />
          <ModeSection
            title="Hardcore"
            subtitle="needs 10 images per game"
            rows={hardcoreRows(report.hardcore)}
          />
        </>
      )}
    </div>
  );
}
