"use client";

// Admin panel for toggling feature flags (game modes, daily challenge, COTD).
import { useEffect, useState } from "react";

interface FlagRow {
  key: string;
  label: string;
  description: string;
  group: string;
  enabled: boolean;
}

export default function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then((d) => setFlags(d.flags))
      .catch((e) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: string, enabled: boolean) {
    setSavingKey(key);
    setError(null);
    const previous = flags;
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
    } catch (e) {
      setFlags(previous);
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingKey(null);
    }
  }

  const groups = Array.from(new Set(flags.map((f) => f.group)));

  return (
    <div className="max-w-2xl mx-auto p-6">
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {!loading && (
        <>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Feature flags
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Disabling a flag hides the entry point and blocks the API. Missing flags default to enabled.
          </p>
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{group}</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
                  {flags
                    .filter((f) => f.group === group)
                    .map((f) => (
                      <div key={f.key} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{f.label}</p>
                          <p className="text-xs text-gray-500">{f.description}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{f.key}</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={f.enabled}
                          aria-label={`Toggle ${f.label}`}
                          disabled={savingKey === f.key}
                          onClick={() => toggle(f.key, !f.enabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
                            f.enabled ? "bg-green-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              f.enabled ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
