"use client";

import { useEffect, useState, useCallback } from "react";
import Combobox from "@/app/_components/Combobox";

type StagingStatus = "PENDING_REVIEW" | "COMMUNITY_REVIEW" | "READY" | "PUBLISHED" | "REJECTED";

interface Agreements {
  make: { value: string | null; count: number; confirmed: boolean };
  model: { value: string | null; count: number; confirmed: boolean };
  year: { value: number | null; count: number; confirmed: boolean };
  trim: { value: string | null; count: number; confirmed: boolean };
}

interface StagingImage {
  id: string;
  imageUrl: string;
  filename: string;
  status: StagingStatus;
  createdAt: string;
  ai: {
    make: string | null;
    model: string | null;
    year: number | null;
    bodyStyle: string | null;
    confidence: number | null;
  };
  admin: {
    make: string | null;
    model: string | null;
    year: number | null;
    trim: string | null;
    bodyStyle: string | null;
    rarity: string | null;
    era: string | null;
    regionSlug: string | null;
    countryOfOrigin: string | null;
    categories: string[];
    isHardcoreEligible: boolean | null;
    notes: string | null;
  };
  confirmed: {
    make: string | null;
    model: string | null;
    year: number | null;
    trim: string | null;
  };
  agreements: Agreements;
  suggestionCount: number;
}

const STATUS_LABELS: Record<StagingStatus, string> = {
  PENDING_REVIEW: "Pending",
  COMMUNITY_REVIEW: "Community",
  READY: "Ready",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

const STATUS_COLOURS: Record<StagingStatus, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  COMMUNITY_REVIEW: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  PUBLISHED: "bg-gray-100 text-gray-600",
  REJECTED: "bg-red-100 text-red-700",
};

const BODY_STYLES = [
  "coupe",
  "sedan",
  "convertible",
  "hatchback",
  "wagon",
  "suv",
  "truck",
  "pickup",
  "van",
  "roadster",
  "targa",
  "compact",
  "special_purpose",
];
const ERAS = ["classic", "retro", "modern", "contemporary"];
const RARITIES = ["common", "uncommon", "rare", "ultra_rare"];
const CATEGORIES = ["muscle", "supercar", "electric", "classic", "sports", "luxury"];

interface EditForm {
  make: string;
  model: string;
  year: string;
  trim: string;
  bodyStyle: string;
  rarity: string;
  era: string;
  regionSlug: string;
  countryOfOrigin: string;
  categories: string[];
  isHardcoreEligible: boolean;
  notes: string;
}

function AgreementBar({
  label,
  count,
  confirmed,
}: {
  label: string;
  count: number;
  confirmed: boolean;
}) {
  const pct = Math.min((count / 5) * 100, 100);
  return (
    <div className="text-xs">
      <div className="flex justify-between mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className={confirmed ? "text-green-600 font-medium" : "text-gray-400"}>
          {count}/5
        </span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${confirmed ? "bg-green-500" : "bg-blue-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function emptyForm(): EditForm {
  return {
    make: "",
    model: "",
    year: "",
    trim: "",
    bodyStyle: "",
    rarity: "",
    era: "",
    regionSlug: "",
    countryOfOrigin: "",
    categories: [],
    isHardcoreEligible: false,
    notes: "",
  };
}

function formFromImage(img: StagingImage): EditForm {
  return {
    make: img.admin.make ?? img.confirmed.make ?? img.ai.make ?? "",
    model: img.admin.model ?? img.confirmed.model ?? img.ai.model ?? "",
    year: String(img.admin.year ?? img.confirmed.year ?? img.ai.year ?? ""),
    trim: img.admin.trim ?? img.confirmed.trim ?? "",
    bodyStyle: img.admin.bodyStyle ?? img.ai.bodyStyle ?? "",
    rarity: img.admin.rarity ?? "",
    era: img.admin.era ?? "",
    regionSlug: img.admin.regionSlug ?? "",
    countryOfOrigin: img.admin.countryOfOrigin ?? "",
    categories: img.admin.categories ?? [],
    isHardcoreEligible: img.admin.isHardcoreEligible ?? false,
    notes: img.admin.notes ?? "",
  };
}

export default function AdminPanel() {
  const [images, setImages] = useState<StagingImage[]>([]);
  const [counts, setCounts] = useState<Partial<Record<StagingStatus, number>>>({});
  const [statusFilter, setStatusFilter] = useState<StagingStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [makeOptions, setMakeOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [trimOptions, setTrimOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const qs = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/staging${qs}`);
    const data = await res.json();
    setImages(data.items);
    setCounts(data.counts);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Load static autocomplete options once on mount
  useEffect(() => {
    fetch("/api/admin/autocomplete?field=make")
      .then((r) => r.json())
      .then(setMakeOptions);
    fetch("/api/admin/autocomplete?field=country")
      .then((r) => r.json())
      .then(setCountryOptions);
    fetch("/api/filters")
      .then((r) => r.json())
      .then((d) => setRegionOptions((d.regions ?? []).map((r: { slug: string }) => r.slug)));
  }, []);

  // Reload model options when make changes
  useEffect(() => {
    const qs = editForm.make ? `&make=${encodeURIComponent(editForm.make)}` : "";
    fetch(`/api/admin/autocomplete?field=model${qs}`)
      .then((r) => r.json())
      .then(setModelOptions);
  }, [editForm.make]);

  // Reload trim options when make or model changes
  useEffect(() => {
    const make = editForm.make ? `&make=${encodeURIComponent(editForm.make)}` : "";
    const model = editForm.model ? `&model=${encodeURIComponent(editForm.model)}` : "";
    fetch(`/api/admin/autocomplete?field=trim${make}${model}`)
      .then((r) => r.json())
      .then(setTrimOptions);
  }, [editForm.make, editForm.model]);

  function selectImage(img: StagingImage) {
    setSelectedId(img.id);
    setEditForm(formFromImage(img));
    setError(null);
  }

  function toggleCategory(slug: string) {
    setEditForm((f) => ({
      ...f,
      categories: f.categories.includes(slug)
        ? f.categories.filter((c) => c !== slug)
        : [...f.categories, slug],
    }));
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/staging/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: editForm.make || null,
        model: editForm.model || null,
        year: editForm.year || null,
        trim: editForm.trim || null,
        bodyStyle: editForm.bodyStyle || null,
        rarity: editForm.rarity || null,
        era: editForm.era || null,
        regionSlug: editForm.regionSlug || null,
        countryOfOrigin: editForm.countryOfOrigin || null,
        categories: editForm.categories,
        isHardcoreEligible: editForm.isHardcoreEligible,
        notes: editForm.notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      await fetchImages();
    } else {
      const d = await res.json();
      setError(d.error ?? "Save failed");
    }
  }

  async function setStatus(id: string, status: StagingStatus) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/staging/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (res.ok) {
      await fetchImages();
      if (status === "REJECTED" || status === "PUBLISHED") setSelectedId(null);
    } else {
      const d = await res.json();
      setError(d.error ?? "Status update failed");
    }
  }

  async function publish(id: string) {
    // Save current form state first, then publish
    setSaving(true);
    setError(null);
    const saveRes = await fetch(`/api/admin/staging/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: editForm.make || null,
        model: editForm.model || null,
        year: editForm.year || null,
        trim: editForm.trim || null,
        bodyStyle: editForm.bodyStyle || null,
        rarity: editForm.rarity || null,
        era: editForm.era || null,
        regionSlug: editForm.regionSlug || null,
        countryOfOrigin: editForm.countryOfOrigin || null,
        categories: editForm.categories,
        isHardcoreEligible: editForm.isHardcoreEligible,
        notes: editForm.notes || null,
      }),
    });
    setSaving(false);

    if (!saveRes.ok) {
      const d = await saveRes.json();
      setError(d.error ?? "Save failed");
      return;
    }

    setPublishing(true);
    const res = await fetch(`/api/admin/staging/${id}/publish`, { method: "POST" });
    setPublishing(false);

    if (res.ok) {
      setSelectedId(null);
      await fetchImages();
    } else {
      const d = await res.json();
      setError(d.error ?? "Publish failed");
    }
  }

  const selected = images.find((img) => img.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Staging Review</h1>
          <p className="text-sm text-black">
            {Object.values(counts).reduce((a, b) => a + b, 0)} total
          </p>
        </div>
        <a href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Game
        </a>
      </header>

      {/* Status filter tabs */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-1 -mb-px">
          {(
            ["ALL", "PENDING_REVIEW", "COMMUNITY_REVIEW", "READY", "PUBLISHED", "REJECTED"] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setSelectedId(null);
              }}
              className={`px-3 py-2.5 text-sm border-b-2 transition-colors ${
                statusFilter === s
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {s === "ALL"
                ? `All (${Object.values(counts).reduce((a, b) => a + b, 0)})`
                : `${STATUS_LABELS[s]} (${counts[s] ?? 0})`}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex h-[calc(100vh-113px)]">
        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-400 p-4">Loading…</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No images.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => selectImage(img)}
                  className={`group relative rounded-lg overflow-hidden border-2 text-left transition-all ${
                    selectedId === img.id
                      ? "border-gray-900 shadow-md"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.filename}
                    className="w-full aspect-[4/3] object-cover bg-gray-100"
                  />
                  <div className="p-1.5 bg-white">
                    <span
                      className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOURS[img.status]}`}
                    >
                      {STATUS_LABELS[img.status]}
                    </span>
                    {(img.admin.make || img.confirmed.make || img.ai.make) && (
                      <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                        {img.admin.make ?? img.confirmed.make ?? img.ai.make}{" "}
                        {img.admin.model ?? img.confirmed.model ?? img.ai.model}
                      </p>
                    )}
                    {img.suggestionCount > 0 && (
                      <p className="text-[10px] text-blue-500">
                        {img.suggestionCount} suggestion{img.suggestionCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              {/* Image preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.imageUrl}
                alt={selected.filename}
                className="w-full aspect-[4/3] object-cover rounded-lg bg-gray-100"
              />

              {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

              {/* AI suggestions */}
              {(selected.ai.make || selected.ai.model) && (
                <div className="text-xs bg-purple-50 rounded-lg p-3">
                  <p className="font-medium text-purple-700 mb-1">AI suggestion</p>
                  <p className="text-purple-600">
                    {[selected.ai.year, selected.ai.make, selected.ai.model]
                      .filter(Boolean)
                      .join(" ")}
                    {selected.ai.confidence != null && (
                      <span className="ml-1 text-purple-400">
                        ({Math.round(selected.ai.confidence * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Community agreements */}
              {selected.suggestionCount > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Community ({selected.suggestionCount} suggestion
                    {selected.suggestionCount !== 1 ? "s" : ""})
                  </p>
                  {selected.agreements.make.value && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        {selected.agreements.make.value} {selected.agreements.model.value}
                      </p>
                      <AgreementBar
                        label="Make"
                        count={selected.agreements.make.count}
                        confirmed={selected.agreements.make.confirmed}
                      />
                      {selected.agreements.model.value && (
                        <AgreementBar
                          label="Model"
                          count={selected.agreements.model.count}
                          confirmed={selected.agreements.model.confirmed}
                        />
                      )}
                      {selected.agreements.year.value && (
                        <AgreementBar
                          label="Year"
                          count={selected.agreements.year.count}
                          confirmed={selected.agreements.year.confirmed}
                        />
                      )}
                      {selected.agreements.trim.value && (
                        <AgreementBar
                          label="Trim"
                          count={selected.agreements.trim.count}
                          confirmed={selected.agreements.trim.confirmed}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Edit form */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Vehicle details
                </p>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5 capitalize">Make</label>
                  <Combobox
                    variant="admin"
                    value={editForm.make}
                    onChange={(v) => setEditForm((f) => ({ ...f, make: v }))}
                    options={makeOptions}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5 capitalize">Model</label>
                  <Combobox
                    variant="admin"
                    value={editForm.model}
                    onChange={(v) => setEditForm((f) => ({ ...f, model: v }))}
                    options={modelOptions}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5 capitalize">Trim</label>
                  <Combobox
                    variant="admin"
                    value={editForm.trim}
                    onChange={(v) => setEditForm((f) => ({ ...f, trim: v }))}
                    options={trimOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Year</label>
                  <input
                    type="number"
                    value={editForm.year}
                    onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value }))}
                    className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400"
                    placeholder="e.g. 1994"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Body style</label>
                    <select
                      value={editForm.bodyStyle}
                      onChange={(e) => setEditForm((f) => ({ ...f, bodyStyle: e.target.value }))}
                      className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                    >
                      <option value="">— select —</option>
                      {BODY_STYLES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Era</label>
                    <select
                      value={editForm.era}
                      onChange={(e) => setEditForm((f) => ({ ...f, era: e.target.value }))}
                      className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                    >
                      <option value="">— select —</option>
                      {ERAS.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Rarity</label>
                    <select
                      value={editForm.rarity}
                      onChange={(e) => setEditForm((f) => ({ ...f, rarity: e.target.value }))}
                      className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                    >
                      <option value="">— select —</option>
                      {RARITIES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Region slug</label>
                    <Combobox
                      variant="admin"
                      value={editForm.regionSlug}
                      onChange={(v) => setEditForm((f) => ({ ...f, regionSlug: v }))}
                      options={regionOptions}
                      placeholder="e.g. japan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Country of origin</label>
                  <Combobox
                    variant="admin"
                    value={editForm.countryOfOrigin}
                    onChange={(v) => setEditForm((f) => ({ ...f, countryOfOrigin: v }))}
                    options={countryOptions}
                    placeholder="e.g. Japan"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => toggleCategory(slug)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          editForm.categories.includes(slug)
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {slug}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isHardcoreEligible}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, isHardcoreEligible: e.target.checked }))
                    }
                    className="rounded"
                  />
                  Hardcore eligible
                </label>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 resize-none"
                  />
                </div>

                <button
                  onClick={() => saveEdit(selected.id)}
                  disabled={saving || publishing}
                  className="w-full text-sm bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</p>
                {selected.status !== "COMMUNITY_REVIEW" && (
                  <button
                    onClick={() => setStatus(selected.id, "COMMUNITY_REVIEW")}
                    disabled={saving || publishing}
                    className="w-full text-sm border border-blue-200 text-blue-700 rounded px-3 py-2 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Send to community
                  </button>
                )}
                {selected.status !== "PENDING_REVIEW" &&
                  selected.status !== "PUBLISHED" &&
                  selected.status !== "REJECTED" && (
                    <button
                      onClick={() => setStatus(selected.id, "PENDING_REVIEW")}
                      disabled={saving || publishing}
                      className="w-full text-sm border border-gray-200 text-gray-600 rounded px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Back to pending
                    </button>
                  )}
                {selected.status !== "PUBLISHED" && selected.status !== "REJECTED" && (
                  <button
                    onClick={() => publish(selected.id)}
                    disabled={saving || publishing}
                    className="w-full text-sm bg-green-600 text-white rounded px-3 py-2 hover:bg-green-700 disabled:opacity-50"
                  >
                    {publishing ? "Publishing…" : "Approve & publish"}
                  </button>
                )}
                {selected.status !== "REJECTED" && (
                  <button
                    onClick={() => setStatus(selected.id, "REJECTED")}
                    disabled={saving || publishing}
                    className="w-full text-sm border border-red-200 text-red-600 rounded px-3 py-2 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
