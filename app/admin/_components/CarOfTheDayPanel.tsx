"use client";

// Admin panel for viewing, overriding, and editing trivia for upcoming Cars of the Day.
import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, Edit2, Check, X, RefreshCw, Dices, List } from "lucide-react";

interface TriviaData {
  displayModel: string | null;
  productionYears: string;
  engine: string | null;
  layout: string | null;
  regionalNames: string | null;
  funFacts: string[];
  verifiedByAdmin: boolean;
}

interface DayEntry {
  date: string;
  vehicleId?: string;
  imageId?: string;
  curatedBy?: string | null;
  vehicle?: { id: string; make: string; model: string };
  image?: { id: string; filename: string; url: string };
  trivia?: TriviaData | null;
  error?: string;
}

interface EligibleVehicle {
  id: string;
  make: string;
  model: string;
  image: { id: string; filename: string; url: string } | null;
}

interface TriviaEditState {
  displayModel: string;
  productionYears: string;
  engine: string;
  layout: string;
  regionalNames: string;
  funFacts: [string, string, string];
}

function triviaToEditState(t: TriviaData): TriviaEditState {
  return {
    displayModel: t.displayModel ?? "",
    productionYears: t.productionYears,
    engine: t.engine ?? "",
    layout: t.layout ?? "",
    regionalNames: t.regionalNames ?? "",
    funFacts: [t.funFacts[0] ?? "", t.funFacts[1] ?? "", t.funFacts[2] ?? ""],
  };
}

export default function CarOfTheDayPanel() {
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingTrivia, setEditingTrivia] = useState(false);
  const [triviaForm, setTriviaForm] = useState<TriviaEditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [rerolling, setRerolling] = useState(false);
  const [picking, setPicking] = useState(false);
  const [eligibleVehicles, setEligibleVehicles] = useState<EligibleVehicle[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [pickSearch, setPickSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/car-of-the-day")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setSelectedDate((prev) => prev ?? (data.entries?.[0]?.date ?? null));
        setLoading(false);
      });
  }, [revision]);

  function load() { setRevision((n) => n + 1); }

  async function reroll() {
    if (!selectedDate) return;
    setRerolling(true);
    await fetch(`/api/admin/car-of-the-day/${selectedDate}/reroll`, { method: "POST" });
    setRerolling(false);
    load();
  }

  async function openPicker() {
    if (!selectedDate) return;
    setPicking(true);
    setLoadingEligible(true);
    const res = await fetch(`/api/admin/car-of-the-day/eligible?date=${selectedDate}`);
    const data = await res.json();
    setEligibleVehicles(data.vehicles ?? []);
    setLoadingEligible(false);
  }

  function closePicker() {
    setPicking(false);
    setEligibleVehicles([]);
    setPickSearch("");
  }

  async function pickVehicle(vehicleId: string) {
    if (!selectedDate) return;
    const res = await fetch(`/api/admin/car-of-the-day/${selectedDate}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, curatedBy: "admin" }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to set vehicle");
      return;
    }
    closePicker();
    load();
  }

  const selected = entries.find((e) => e.date === selectedDate);

  function startEditTrivia() {
    if (!selected?.trivia) return;
    setTriviaForm(triviaToEditState(selected.trivia));
    setEditingTrivia(true);
    setSaveError(null);
  }

  function cancelEditTrivia() {
    setEditingTrivia(false);
    setTriviaForm(null);
    setSaveError(null);
  }

  async function saveTrivia() {
    if (!selected?.vehicleId || !triviaForm) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/admin/trivia/${selected.vehicleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayModel: triviaForm.displayModel || null,
        productionYears: triviaForm.productionYears,
        engine: triviaForm.engine || null,
        layout: triviaForm.layout || null,
        regionalNames: triviaForm.regionalNames || null,
        funFacts: triviaForm.funFacts.filter(Boolean),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json();
      setSaveError(err.error ?? "Save failed");
      return;
    }
    setEditingTrivia(false);
    setTriviaForm(null);
    load();
  }

  if (loading) {
    return <div className="p-6 text-gray-500 text-sm">Loading…</div>;
  }

  return (
    <div className="flex h-full">
      {/* Day list */}
      <aside className="w-48 border-r border-gray-200 overflow-y-auto shrink-0">
        {entries.map((e) => (
          <button
            key={e.date}
            onClick={() => { setSelectedDate(e.date); setEditingTrivia(false); setTriviaForm(null); closePicker(); }}
            className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 transition-colors ${
              e.date === selectedDate ? "bg-gray-900 text-white" : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <div className="font-mono text-xs text-gray-400 mb-0.5">{e.date}</div>
            {e.vehicle ? (
              <>
                <div className="font-medium truncate">{e.vehicle.make}</div>
                <div className="text-gray-500 truncate">{e.vehicle.model}</div>
              </>
            ) : (
              <div className="text-red-500 text-xs">{e.error ?? "No vehicle"}</div>
            )}
            {e.curatedBy && (
              <div className="text-xs text-blue-500 mt-0.5">Curated</div>
            )}
          </button>
        ))}
      </aside>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <p className="text-gray-400 text-sm">Select a day to preview.</p>
        ) : selected.error ? (
          <div className="text-red-500 text-sm">{selected.error}</div>
        ) : (
          <div className="max-w-lg space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-gray-900">{selected.date}</h2>
              {selected.curatedBy && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Curated by {selected.curatedBy}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={reroll}
                  disabled={rerolling}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {rerolling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Dices className="w-3 h-3" />}
                  Re-roll
                </button>
                <button
                  onClick={picking ? closePicker : openPicker}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {picking ? <X className="w-3 h-3" /> : <List className="w-3 h-3" />}
                  {picking ? "Cancel" : "Pick vehicle"}
                </button>
              </div>
            </div>

            {/* Vehicle picker */}
            {picking && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Search make or model…"
                    value={pickSearch}
                    onChange={(e) => setPickSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    autoFocus
                  />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {loadingEligible ? (
                    <p className="p-4 text-sm text-gray-400">Loading…</p>
                  ) : eligibleVehicles.filter((v) => {
                    const q = pickSearch.toLowerCase();
                    return !q || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q);
                  }).length === 0 ? (
                    <p className="p-4 text-sm text-gray-400">No eligible vehicles.</p>
                  ) : (
                    eligibleVehicles
                      .filter((v) => {
                        const q = pickSearch.toLowerCase();
                        return !q || v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q);
                      })
                      .map((v) => (
                        <button
                          key={v.id}
                          onClick={() => pickVehicle(v.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                        >
                          {v.image ? (
                            <div className="relative w-14 aspect-video rounded overflow-hidden bg-gray-100 shrink-0">
                              <Image src={v.image.url} alt={`${v.make} ${v.model}`} fill className="object-cover" sizes="56px" />
                            </div>
                          ) : (
                            <div className="w-14 aspect-video rounded bg-gray-100 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">{v.make}</p>
                            <p className="text-sm font-semibold text-gray-900">{v.model}</p>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Vehicle + image preview */}
            {selected.vehicle && selected.image && (
              <div className="flex gap-4 items-start">
                <div className="relative w-[90px] aspect-video rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <Image
                    src={selected.image.url}
                    alt={`${selected.vehicle.make} ${selected.vehicle.model}`}
                    fill
                    className="object-cover"
                    sizes="90px"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">{selected.vehicle.make}</p>
                  <p className="text-xl font-black text-gray-900 italic">
                    {selected.trivia?.displayModel ?? selected.vehicle.model}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Vehicle ID: <span className="font-mono">{selected.vehicleId}</span>
                  </p>
                  {selected.trivia?.verifiedByAdmin && (
                    <span className="text-xs text-green-600 font-medium">✓ Verified by admin</span>
                  )}
                </div>
              </div>
            )}

            {/* Trivia section */}
            {selected.trivia && !editingTrivia && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-gray-700 uppercase tracking-wider text-xs">Trivia</p>
                  <button
                    onClick={startEditTrivia}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
                <Row label="Display model" value={selected.trivia.displayModel ?? "—"} />
                <Row label="Production years" value={selected.trivia.productionYears} />
                <Row label="Engine" value={selected.trivia.engine ?? "—"} />
                <Row label="Layout" value={selected.trivia.layout ?? "—"} />
                <Row label="Regional names" value={selected.trivia.regionalNames ?? "—"} />
                <div>
                  <span className="text-gray-500 text-xs block mb-1">Fun facts</span>
                  <ol className="space-y-1">
                    {selected.trivia.funFacts.map((f, i) => (
                      <li key={i} className="flex gap-2 text-gray-700">
                        <span className="text-orange-400 font-bold shrink-0">{i + 1}.</span>
                        {f}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Trivia editor */}
            {editingTrivia && triviaForm && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <p className="font-bold text-gray-700 uppercase tracking-wider text-xs mb-3">Edit Trivia</p>
                <Field label="Display model (optional override)" value={triviaForm.displayModel}
                  onChange={(v) => setTriviaForm({ ...triviaForm, displayModel: v })} />
                <Field label="Production years *" value={triviaForm.productionYears}
                  onChange={(v) => setTriviaForm({ ...triviaForm, productionYears: v })} />
                <Field label="Engine" value={triviaForm.engine}
                  onChange={(v) => setTriviaForm({ ...triviaForm, engine: v })} />
                <Field label="Layout" value={triviaForm.layout}
                  onChange={(v) => setTriviaForm({ ...triviaForm, layout: v })} />
                <Field label="Regional names" value={triviaForm.regionalNames}
                  onChange={(v) => setTriviaForm({ ...triviaForm, regionalNames: v })} />
                {([0, 1, 2] as const).map((i) => (
                  <Field key={i} label={`Fun fact ${i + 1}`} value={triviaForm.funFacts[i]}
                    onChange={(v) => {
                      const facts = [...triviaForm.funFacts] as [string, string, string];
                      facts[i] = v;
                      setTriviaForm({ ...triviaForm, funFacts: facts });
                    }} />
                ))}
                {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveTrivia}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={cancelEditTrivia}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {!selected.trivia && (
              <p className="text-amber-600 text-sm bg-amber-50 rounded-lg p-3">
                No trivia for this vehicle. Run{" "}
                <code className="font-mono text-xs">npx tsx scripts/generate-trivia.ts --regenerate {selected.vehicleId}</code>
                {" "}to generate it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 text-xs w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
    </div>
  );
}
