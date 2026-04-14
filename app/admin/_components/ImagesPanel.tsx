"use client";
// Admin panel for browsing and editing published images and their vehicle data.

import { useEffect, useState } from "react";
import Combobox from "@/app/_components/Combobox";

const BODY_STYLES = [
  "coupe", "sedan", "convertible", "hatchback", "wagon",
  "suv", "truck", "pickup", "van", "roadster", "targa", "compact", "special_purpose",
];
const ERAS = ["classic", "retro", "modern", "contemporary"];
const RARITIES = ["common", "uncommon", "rare", "ultra_rare"];

interface ImageItem {
  id: string;
  imageUrl: string;
  filename: string;
  isActive: boolean;
  isHardcoreEligible: boolean;
  copyrightHolder: string | null;
  isCropped: boolean;
  isLogoVisible: boolean;
  isModelNameVisible: boolean;
  hasMultipleVehicles: boolean;
  isFaceVisible: boolean;
  isVehicleUnmodified: boolean;
  uploadedAt: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    trim: string | null;
    bodyStyle: string;
    era: string;
    rarity: string;
    countryOfOrigin: string;
    regionSlug: string;
    categories: string[];
  };
}

interface EditForm {
  make: string;
  model: string;
  year: string;
  trim: string;
  bodyStyle: string;
  era: string;
  rarity: string;
  countryOfOrigin: string;
  regionSlug: string;
  categories: string[];
  isActive: boolean;
  isHardcoreEligible: boolean;
  copyrightHolder: string;
  isCropped: boolean;
  isLogoVisible: boolean;
  isModelNameVisible: boolean;
  hasMultipleVehicles: boolean;
  isFaceVisible: boolean;
  isVehicleUnmodified: boolean;
}

function formFromItem(item: ImageItem): EditForm {
  return {
    make: item.vehicle.make,
    model: item.vehicle.model,
    year: String(item.vehicle.year),
    trim: item.vehicle.trim ?? "",
    bodyStyle: item.vehicle.bodyStyle,
    era: item.vehicle.era,
    rarity: item.vehicle.rarity,
    countryOfOrigin: item.vehicle.countryOfOrigin,
    regionSlug: item.vehicle.regionSlug,
    categories: item.vehicle.categories,
    isActive: item.isActive,
    isHardcoreEligible: item.isHardcoreEligible,
    copyrightHolder: item.copyrightHolder ?? "",
    isCropped: item.isCropped,
    isLogoVisible: item.isLogoVisible,
    isModelNameVisible: item.isModelNameVisible,
    hasMultipleVehicles: item.hasMultipleVehicles,
    isFaceVisible: item.isFaceVisible,
    isVehicleUnmodified: item.isVehicleUnmodified,
  };
}

export default function ImagesPanel() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [makeOptions, setMakeOptions] = useState<string[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [trimOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ slug: string; label: string }[]>([]);
  const [copyrightHolderOptions, setCopyrightHolderOptions] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "active" | "inactive">("ALL");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/images")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setImages(data.items);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Load autocomplete options once on mount
  useEffect(() => {
    const safeJson = (r: Response) => r.json().catch(() => null);
    fetch("/api/admin/autocomplete?field=make")
      .then(safeJson).then((d) => d && setMakeOptions(d));
    fetch("/api/admin/autocomplete?field=country")
      .then(safeJson).then((d) => d && setCountryOptions(d));
    fetch("/api/admin/autocomplete?field=copyright_holder")
      .then(safeJson).then((d) => d && setCopyrightHolderOptions(d));
    fetch("/api/filters")
      .then(safeJson).then((d) => d && setRegionOptions((d.regions ?? []).map((r: { slug: string }) => r.slug)));
    fetch("/api/admin/categories")
      .then(safeJson).then((d) => d && setCategoryOptions(d.map((c: { slug: string; label: string }) => ({ slug: c.slug, label: c.label }))));
  }, []);

  // Reload model options when make changes
  useEffect(() => {
    const qs = selectedMake ? `&make=${encodeURIComponent(selectedMake)}` : "";
    fetch(`/api/admin/autocomplete?field=model${qs}`)
      .then((r) => r.json().catch(() => null))
      .then((d) => d && setModelOptions(d));
  }, [selectedMake]);

  function handleImageClick(item: ImageItem) {
    setSelectedId(item.id);
    const form = formFromItem(item);
    setEditForm(form);
    setSelectedMake(form.make);
    setError(null);
  }

  function toggleCategory(slug: string) {
    setEditForm((f) => {
      if (!f) return f;
      return {
        ...f,
        categories: f.categories.includes(slug)
          ? f.categories.filter((s) => s !== slug)
          : [...f.categories, slug],
      };
    });
  }

  async function saveEdit() {
    if (!selectedId || !editForm) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/images/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: editForm.make,
        model: editForm.model,
        year: editForm.year,
        trim: editForm.trim,
        bodyStyle: editForm.bodyStyle,
        era: editForm.era,
        rarity: editForm.rarity,
        countryOfOrigin: editForm.countryOfOrigin,
        regionSlug: editForm.regionSlug,
        categories: editForm.categories,
        isActive: editForm.isActive,
        isHardcoreEligible: editForm.isHardcoreEligible,
        copyrightHolder: editForm.copyrightHolder,
        isCropped: editForm.isCropped,
        isLogoVisible: editForm.isLogoVisible,
        isModelNameVisible: editForm.isModelNameVisible,
        hasMultipleVehicles: editForm.hasMultipleVehicles,
        isFaceVisible: editForm.isFaceVisible,
        isVehicleUnmodified: editForm.isVehicleUnmodified,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setImages((prev) =>
        prev.map((img) => {
          if (img.id !== selectedId) return img;
          return {
            ...img,
            isActive: updated.isActive,
            isHardcoreEligible: updated.isHardcoreEligible,
            copyrightHolder: updated.copyrightHolder,
            isCropped: updated.isCropped,
            isLogoVisible: updated.isLogoVisible,
            isModelNameVisible: updated.isModelNameVisible,
            hasMultipleVehicles: updated.hasMultipleVehicles,
            isFaceVisible: updated.isFaceVisible,
            isVehicleUnmodified: updated.isVehicleUnmodified,
            vehicle: updated.vehicle ?? img.vehicle,
          };
        })
      );
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
    }
  }

  const selected = selectedId ? (images.find((img) => img.id === selectedId) ?? null) : null;

  const filteredImages = images.filter((img) => {
    if (activeFilter === "active") return img.isActive;
    if (activeFilter === "inactive") return !img.isActive;
    return true;
  });

  const activeCount = images.filter((img) => img.isActive).length;
  const inactiveCount = images.filter((img) => !img.isActive).length;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Filter tabs */}
      <div className="border-b border-gray-200 bg-white px-6 flex-shrink-0">
        <nav className="flex gap-1 -mb-px">
          {(
            [
              ["ALL", `All (${images.length})`],
              ["active", `Active (${activeCount})`],
              ["inactive", `Inactive (${inactiveCount})`],
            ] as const
          ).map(([filter, label]) => (
            <button
              key={filter}
              onClick={() => { setActiveFilter(filter); setSelectedId(null); }}
              className={`px-3 py-2.5 text-sm border-b-2 transition-colors ${
                activeFilter === filter
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Image grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm text-gray-400 p-4">Loading…</p>
        ) : filteredImages.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">No images.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                onClick={() => handleImageClick(img)}
                className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
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
                    className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      img.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {img.isActive ? "Active" : "Inactive"}
                  </span>
                  <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                    {img.vehicle.make} {img.vehicle.model}
                  </p>
                  <p className="text-[10px] text-gray-400">{img.vehicle.year}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && editForm && (
        <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.imageUrl}
              alt={selected.filename}
              className="w-full aspect-[4/3] object-cover rounded-lg bg-gray-100"
            />

            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

            {/* Vehicle details */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Vehicle details
              </p>

              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Make</label>
                <Combobox
                  variant="admin"
                  value={editForm.make}
                  onChange={(v) => { setSelectedMake(v); setEditForm((f) => f && { ...f, make: v }); }}
                  options={makeOptions}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Model</label>
                <Combobox
                  variant="admin"
                  value={editForm.model}
                  onChange={(v) => setEditForm((f) => f && { ...f, model: v })}
                  options={modelOptions}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Trim</label>
                <Combobox
                  variant="admin"
                  value={editForm.trim}
                  onChange={(v) => setEditForm((f) => f && { ...f, trim: v })}
                  options={trimOptions}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Year</label>
                <input
                  type="number"
                  value={editForm.year}
                  onChange={(e) => setEditForm((f) => f && { ...f, year: e.target.value })}
                  className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400"
                  placeholder="e.g. 1994"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Body style</label>
                  <select
                    value={editForm.bodyStyle}
                    onChange={(e) => setEditForm((f) => f && { ...f, bodyStyle: e.target.value })}
                    className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                  >
                    <option value="">— select —</option>
                    {BODY_STYLES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Era</label>
                  <select
                    value={editForm.era}
                    onChange={(e) => setEditForm((f) => f && { ...f, era: e.target.value })}
                    className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                  >
                    <option value="">— select —</option>
                    {ERAS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Rarity</label>
                  <select
                    value={editForm.rarity}
                    onChange={(e) => setEditForm((f) => f && { ...f, rarity: e.target.value })}
                    className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 bg-white"
                  >
                    <option value="">— select —</option>
                    {RARITIES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Region slug</label>
                  <Combobox
                    variant="admin"
                    value={editForm.regionSlug}
                    onChange={(v) => setEditForm((f) => f && { ...f, regionSlug: v })}
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
                  onChange={(v) => setEditForm((f) => f && { ...f, countryOfOrigin: v })}
                  options={countryOptions}
                  placeholder="e.g. Japan"
                />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {categoryOptions.map(({ slug, label }) => (
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
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Image metadata */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Image metadata
              </p>

              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Copyright holder</label>
                <Combobox
                  variant="admin"
                  value={editForm.copyrightHolder}
                  onChange={(v) => setEditForm((f) => f && { ...f, copyrightHolder: v })}
                  options={copyrightHolderOptions}
                  placeholder="e.g. Wikimedia Commons"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((f) => f && { ...f, isActive: e.target.checked })}
                  className="rounded"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isHardcoreEligible}
                  onChange={(e) => setEditForm((f) => f && { ...f, isHardcoreEligible: e.target.checked })}
                  className="rounded"
                />
                Hardcore eligible
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isCropped}
                  onChange={(e) => setEditForm((f) => f && { ...f, isCropped: e.target.checked })}
                  className="rounded"
                />
                Cropped (partial view)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isLogoVisible}
                  onChange={(e) => setEditForm((f) => f && { ...f, isLogoVisible: e.target.checked })}
                  className="rounded"
                />
                Logo visible
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isModelNameVisible}
                  onChange={(e) => setEditForm((f) => f && { ...f, isModelNameVisible: e.target.checked })}
                  className="rounded"
                />
                Model name visible
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.hasMultipleVehicles}
                  onChange={(e) => setEditForm((f) => f && { ...f, hasMultipleVehicles: e.target.checked })}
                  className="rounded"
                />
                Multiple vehicles in image
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isFaceVisible}
                  onChange={(e) => setEditForm((f) => f && { ...f, isFaceVisible: e.target.checked })}
                  className="rounded"
                />
                Face visible
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isVehicleUnmodified}
                  onChange={(e) => setEditForm((f) => f && { ...f, isVehicleUnmodified: e.target.checked })}
                  className="rounded"
                />
                Vehicle unmodified
              </label>
            </div>

            <button
              onClick={saveEdit}
              disabled={saving}
              className="w-full text-sm bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
