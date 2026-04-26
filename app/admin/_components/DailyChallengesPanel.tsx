"use client";

// Admin panel for reviewing, publishing, and curating daily challenge image sets.
import { useEffect, useState } from "react";
import Image from "next/image";
import { RefreshCw, Dices, List, Check, X, ChevronDown, ChevronRight, Plus } from "lucide-react";

const CHALLENGE_SIZE = 10;

interface ChallengeImage {
  id: string;
  url: string;
  vehicleId: string;
  vehicleName: string;
  year: number;
  isHardcoreEligible: boolean;
}

interface UpcomingChallenge {
  id: number;
  challengeNumber: number;
  date: string;
  isPublished: boolean;
  curatedBy: string | null;
  images: ChallengeImage[];
}

interface PastChallenge {
  id: number;
  challengeNumber: number;
  date: string;
  isPublished: boolean;
  playerCount: number;
  topScore: number | null;
}

interface PickerImage {
  id: string;
  imageUrl: string;
  vehicle: { id: string; make: string; model: string; year: number; era: string };
}

export default function DailyChallengesPanel() {
  const [upcoming, setUpcoming] = useState<UpcomingChallenge[]>([]);
  const [past, setPast] = useState<PastChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ challengeId: number; slotIndex: number } | null>(null);
  const [pickerImages, setPickerImages] = useState<PickerImage[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerMakeModels, setPickerMakeModels] = useState<Record<string, string[]>>({});
  const [pickerMake, setPickerMake] = useState("");
  const [pickerModel, setPickerModel] = useState("");
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [generateFrom, setGenerateFrom] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [generateTo, setGenerateTo] = useState(() => {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 7);
    return end.toISOString().slice(0, 10);
  });
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetch("/api/admin/daily-challenges")
      .then((r) => r.json())
      .then((data) => {
        setUpcoming(data.upcoming ?? []);
        setPast(data.past ?? []);
        setSelectedId((prev) => prev ?? (data.upcoming?.[0]?.id ?? null));
        setLoading(false);
      });

    // Pre-fetch make-to-models map on mount
    fetch("/api/admin/autocomplete?field=make_models")
      .then((r) => r.json())
      .then((data) => setPickerMakeModels(data ?? {}));
  }, [revision]);

  function reload() { 
    setLoading(true);
    setRevision((n) => n + 1); 
  }

  async function publish(id: string) {
    setPublishing(id);
    await fetch(`/api/admin/daily-challenges/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: true }),
    });
    setPublishing(null);
    reload();
  }

  async function unpublish(id: string) {
    setPublishing(id);
    await fetch(`/api/admin/daily-challenges/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: false }),
    });
    setPublishing(null);
    reload();
  }

  async function reroll(challengeId: string, slotIndex: number) {
    setRerolling(slotIndex);
    const res = await fetch(`/api/admin/daily-challenges/${challengeId}/reroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIndex }),
    });
    setRerolling(null);
    if (res.ok) {
      const { image } = await res.json();
      setUpcoming((prev) => prev.map((c) => {
        if (c.id !== challengeId) return c;
        const images = [...c.images];
        images[slotIndex] = image;
        return { ...c, images, curatedBy: "admin" };
      }));
    } else {
      const err = await res.json();
      alert(err.error ?? "Re-roll failed");
    }
  }

  async function openPicker(challengeId: string, slotIndex: number) {
    setPicker({ challengeId, slotIndex });
    setPickerSearch("");
    setPickerMake("");
    setPickerModel("");
    setPickerImages([]);
  }

  useEffect(() => {
    if (!picker) return;
    
    // Don't fetch anything if no filters are applied.
    // Specifically: wait for both Make + Model, OR a search query.
    const hasMakeModel = pickerMake && pickerModel;
    const hasSearch = pickerSearch.length >= 2;

    if (!hasMakeModel && !hasSearch) {
      return;
    }

    const timeout = setTimeout(async () => {
      setLoadingPicker(true);
      const params = new URLSearchParams({
        activeOnly: "true",
        limit: "100",
        search: pickerSearch,
        make: pickerMake,
        model: pickerModel,
      });
      const res = await fetch(`/api/admin/images?${params.toString()}`);
      const data = await res.json();
      setPickerImages(data.items ?? []);
      setLoadingPicker(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [picker, pickerSearch, pickerMake, pickerModel]);

  function closePicker() {
    setPicker(null);
    setPickerImages([]);
    setPickerSearch("");
  }

  async function swapImage(imageId: string) {
    if (!picker) return;
    setSwapping(true);
    const res = await fetch(`/api/admin/daily-challenges/${picker.challengeId}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotIndex: picker.slotIndex, imageId }),
    });
    setSwapping(false);
    if (res.ok) {
      const { image } = await res.json();
      const { challengeId, slotIndex } = picker;
      setUpcoming((prev) => prev.map((c) => {
        if (c.id !== challengeId) return c;
        const images = [...c.images];
        images[slotIndex] = image;
        return { ...c, images, curatedBy: "admin" };
      }));
      closePicker();
    } else {
      const err = await res.json();
      alert(err.error ?? "Swap failed");
    }
  }

  async function generate() {
    if (!generateFrom || !generateTo) return;
    setGenerating(true);
    setGenerateResult(null);
    const res = await fetch("/api/admin/daily-challenges/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDate: generateFrom, toDate: generateTo }),
    });
    const data = await res.json();
    setGenerating(false);
    const msgs: string[] = [];
    if (data.generated?.length) msgs.push(`Generated: #${data.generated.join(", #")}`);
    if (data.skipped?.length) msgs.push(`Skipped (exist): #${data.skipped.join(", #")}`);
    if (data.errors?.length) msgs.push(`Errors: ${data.errors.map((e: { challengeNumber: number; error: string }) => `#${e.challengeNumber}: ${e.error}`).join("; ")}`);
    setGenerateResult(msgs.join(" · ") || "Nothing to do.");
    if (data.generated?.length) reload();
  }

  const selected = upcoming.find((c) => c.id === selectedId);

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>;

  return (
    <div className="flex h-[calc(100vh-48px)]">
      {/* Sidebar */}
      <aside className="w-52 border-r border-gray-200 shrink-0 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex flex-col flex-1 min-h-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 shrink-0">Upcoming</p>
          <div className="overflow-y-auto flex-1">
          {upcoming.length === 0 && (
            <p className="text-xs text-gray-400">No upcoming challenges.</p>
          )}
          {upcoming.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
                c.id === selectedId ? "bg-gray-900 text-white" : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <div className="font-mono text-xs opacity-60 mb-0.5">{c.date}</div>
              <div className="font-medium">Challenge #{c.challengeNumber}</div>
              <div className="flex gap-1 mt-1">
                {c.isPublished ? (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Published</span>
                ) : (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Unpublished</span>
                )}
                {c.curatedBy && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Curated</span>
                )}
              </div>
            </button>
          ))}
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-600 transition-colors"
          >
            {showPast ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Past ({past.length})
          </button>
          {showPast && past.map((c) => (
            <div key={c.id} className="px-3 py-2 text-xs text-gray-600 border-b border-gray-50 last:border-0">
              <div className="font-mono text-gray-400">{c.date}</div>
              <div className="font-medium text-gray-700">#{c.challengeNumber}</div>
              <div className="text-gray-400">{c.playerCount} players · top {c.topScore ?? "—"}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Generate form */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Generate Challenges</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={generateFrom}
              onChange={(e) => setGenerateFrom(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={generateTo}
              onChange={(e) => setGenerateTo(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <button
              onClick={generate}
              disabled={generating || !generateFrom || !generateTo}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {generating ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
          {generateResult && <p className="mt-2 text-xs text-gray-600">{generateResult}</p>}
        </div>

        {/* Selected challenge detail */}
        {!selected ? (
          <p className="text-gray-400 text-sm">Select an upcoming challenge to review.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">Challenge #{selected.challengeNumber}</h2>
              <span className="font-mono text-sm text-gray-400">{selected.date}</span>
              {selected.isPublished ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unpublished</span>
              )}
              {selected.curatedBy && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Curated by {selected.curatedBy}
                </span>
              )}
              <div className="ml-auto">
                {selected.isPublished ? (
                  <button
                    onClick={() => unpublish(selected.id)}
                    disabled={publishing === selected.id}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    {publishing === selected.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    Unpublish
                  </button>
                ) : (
                  <button
                    onClick={() => publish(selected.id)}
                    disabled={publishing === selected.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {publishing === selected.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Publish
                  </button>
                )}
              </div>
            </div>

            {/* Image grid — always 10 slots */}
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: CHALLENGE_SIZE }, (_, i) => {
                const img = selected.images[i];
                return img ? (
                  <div key={img.id} className="space-y-1">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={img.url}
                        alt={img.vehicleName}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                      {img.isHardcoreEligible && (
                        <span className="absolute top-1 right-1 text-xs bg-orange-500 text-white px-1 rounded font-bold">HC</span>
                      )}
                      <span className="absolute top-1 left-1 text-xs bg-black/50 text-white px-1 rounded font-mono">{i + 1}</span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium truncate">{img.vehicleName}</p>
                    <p className="text-xs text-gray-400">{img.year}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => reroll(selected.id, i)}
                        disabled={rerolling === i}
                        title="Re-roll this slot"
                        className="flex items-center gap-0.5 px-1.5 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                        {rerolling === i ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Dices className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => openPicker(selected.id, i)}
                        title="Pick a specific image"
                        className="flex items-center gap-0.5 px-1.5 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        <List className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={`empty-${i}`} className="space-y-1">
                    <button
                      onClick={() => openPicker(selected.id, i)}
                      className="relative w-full aspect-video rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 text-gray-400" />
                    </button>
                    <p className="text-xs text-gray-400 font-medium">Slot {i + 1}</p>
                    <p className="text-xs text-gray-300">—</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Image picker modal */}
        {picker && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <p className="font-semibold text-sm text-gray-900">Pick image for slot {picker.slotIndex + 1}</p>
                <button onClick={closePicker} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 border-b border-gray-100 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={pickerMake}
                    onChange={(e) => {
                      setPickerMake(e.target.value);
                      setPickerModel("");
                      setPickerImages([]);
                      setPickerSearch("");
                    }}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">All Makes</option>
                    {Object.keys(pickerMakeModels).sort().map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={pickerModel}
                    onChange={(e) => {
                      setPickerModel(e.target.value);
                      setPickerImages([]);
                      setPickerSearch("");
                    }}
                    disabled={!pickerMake}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                  >
                    <option value="">All Models</option>
                    {(pickerMakeModels[pickerMake] ?? []).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Or search by name/filename…"
                  value={pickerSearch}
                  onChange={(e) => {
                    setPickerSearch(e.target.value);
                  }}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {loadingPicker ? (
                  <p className="p-4 text-sm text-gray-400">Loading…</p>
                ) : !pickerMake || (!pickerModel && pickerSearch.length < 2) ? (
                  <p className="p-4 text-sm text-gray-400 text-center">
                    Select a <span className="font-semibold text-gray-600">Make and Model</span>, or type at least 2 characters to browse images.
                  </p>
                ) : pickerImages.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">No images found.</p>
                ) : (
                  pickerImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => swapImage(img.id)}
                      disabled={swapping}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 disabled:opacity-50"
                    >
                      <div className="relative w-16 aspect-video rounded overflow-hidden bg-gray-100 shrink-0">
                        <Image src={img.imageUrl} alt={`${img.vehicle.make} ${img.vehicle.model}`} fill className="object-cover" sizes="64px" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">{img.vehicle.make}</p>
                        <p className="text-sm font-semibold text-gray-900">{img.vehicle.model}</p>
                        <p className="text-xs text-gray-400">{img.vehicle.year} · {img.vehicle.era}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
