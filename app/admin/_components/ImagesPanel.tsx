"use client";
// Admin panel for browsing and editing published images and their vehicle data.

import { useEffect, useState, useCallback } from "react";
import Combobox from "@/app/_components/Combobox";
import CheckboxField from "./CheckboxField";
import { BODY_STYLES, ERAS, RARITIES } from "@/app/lib/constants";

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
  const [categoryOptions, setCategoryOptions] = useState<
    { slug: string; label: string }[]
  >([]);
  const [copyrightHolderOptions, setCopyrightHolderOptions] = useState<
    string[]
  >([]);
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "active" | "inactive"
  >("ALL");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [missingFieldFilter, setMissingFieldFilter] = useState("");
  const [deletingUnused, setDeletingUnused] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);
  const [autoUpdating, setAutoUpdating] = useState(false);
  const [autoUpdateResult, setAutoUpdateResult] = useState<string | null>(null);

  const fetchImages = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/images")
      .then((r) => r.json())
      .then((data) => {
        setImages(data.items);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  async function autoUpdate() {
    setAutoUpdating(true);
    setAutoUpdateResult(null);
    const res = await fetch("/api/admin/images/auto-update", { method: "POST" });
    setAutoUpdating(false);
    if (res.ok) {
      const { updated, skipped } = await res.json();
      const parts: string[] = [];
      if (updated > 0) parts.push(`Filled categories for ${updated} vehicle${updated !== 1 ? "s" : ""}`);
      if (skipped > 0) parts.push(`${skipped} skipped (no matching model)`);
      setAutoUpdateResult(parts.length > 0 ? parts.join(", ") + "." : "Nothing to update.");
      if (updated > 0) fetchImages();
    } else {
      setAutoUpdateResult("Auto update failed.");
    }
  }

  // Load autocomplete options once on mount
  useEffect(() => {
    const safeJson = (r: Response) => r.json().catch(() => null);
    fetch("/api/admin/autocomplete?field=make")
      .then(safeJson)
      .then((d) => d && setMakeOptions(d));
    fetch("/api/admin/autocomplete?field=country")
      .then(safeJson)
      .then((d) => d && setCountryOptions(d));
    fetch("/api/admin/autocomplete?field=copyright_holder")
      .then(safeJson)
      .then((d) => d && setCopyrightHolderOptions(d));
    fetch("/api/filters")
      .then(safeJson)
      .then(
        (d) =>
          d &&
          setRegionOptions(
            (d.regions ?? []).map((r: { slug: string }) => r.slug),
          ),
      );
    fetch("/api/admin/categories")
      .then(safeJson)
      .then(
        (d) =>
          d &&
          setCategoryOptions(
            d.map((c: { slug: string; label: string }) => ({
              slug: c.slug,
              label: c.label,
            })),
          ),
      );
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
        }),
      );
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
    }
  }

  async function deactivate() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/images/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    setSaving(false);
    if (res.ok) {
      setImages((prev) =>
        prev.map((img) => (img.id === selectedId ? { ...img, isActive: false } : img))
      );
      setEditForm((f) => f && { ...f, isActive: false });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Deactivate failed");
    }
  }

  async function deleteUnusedInactive() {
    if (!confirm("Delete all unused inactive images from Cloudinary and the database? This cannot be undone.")) return;
    setDeletingUnused(true);
    setDeleteResult(null);
    const res = await fetch("/api/admin/images/bulk-unused-inactive", { method: "DELETE" });
    setDeletingUnused(false);
    if (res.ok) {
      const data = await res.json();
      setDeleteResult(`Deleted ${data.deleted}${data.skipped ? `, skipped ${data.skipped} (referenced in game history)` : ""}`);
      setImages((prev) => prev.filter((img) => img.isActive));
      setSelectedId(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setDeleteResult(data.error ?? "Delete failed");
    }
  }

  const selected = selectedId
    ? (images.find((img) => img.id === selectedId) ?? null)
    : null;

  const uniqueMakes = [...new Set(images.map((img) => img.vehicle.make).filter(Boolean))].sort();
  const uniqueModels = [...new Set(
    images
      .filter((img) => !makeFilter || img.vehicle.make === makeFilter)
      .map((img) => img.vehicle.model)
      .filter(Boolean),
  )].sort();

  function isMissingField(img: ImageItem, field: string): boolean {
    switch (field) {
      case "categories": return img.vehicle.categories.length === 0;
      case "make": return !img.vehicle.make;
      case "model": return !img.vehicle.model;
      case "year": return !img.vehicle.year;
      case "era": return !img.vehicle.era;
      case "region": return !img.vehicle.regionSlug;
      case "country": return !img.vehicle.countryOfOrigin;
      default: return false;
    }
  }

  const filteredImages = images.filter((img) => {
    if (activeFilter === "active" && !img.isActive) return false;
    if (activeFilter === "inactive" && img.isActive) return false;
    if (makeFilter && img.vehicle.make !== makeFilter) return false;
    if (modelFilter && img.vehicle.model !== modelFilter) return false;
    if (missingFieldFilter && !isMissingField(img, missingFieldFilter)) return false;
    return true;
  });

  const activeCount = images.filter((img) => img.isActive).length;
  const inactiveCount = images.filter((img) => !img.isActive).length;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Filter tabs */}
      <div className="border-b border-gray-200 bg-white px-6 flex items-center justify-between flex-shrink-0">
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
              onClick={() => {
                setActiveFilter(filter);
                setSelectedId(null);
              }}
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
        <div className="flex items-center gap-2 py-2">
          {activeFilter === "inactive" && (
            <div className="flex items-center gap-2">
              <button
                onClick={deleteUnusedInactive}
                disabled={deletingUnused || inactiveCount === 0}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingUnused ? "Deleting…" : "Delete unused inactive"}
              </button>
              {deleteResult && <span className="text-xs text-gray-500">{deleteResult}</span>}
            </div>
          )}
          <select
            value={makeFilter}
            onChange={(e) => {
              setMakeFilter(e.target.value);
              setModelFilter("");
              setSelectedId(null);
            }}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white focus:outline-none focus:border-gray-400"
          >
            <option value="">All makes</option>
            {uniqueMakes.map((make) => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>
          <select
            value={modelFilter}
            onChange={(e) => { setModelFilter(e.target.value); setSelectedId(null); }}
            disabled={!makeFilter}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white focus:outline-none focus:border-gray-400 disabled:opacity-40"
          >
            <option value="">All models</option>
            {uniqueModels.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <select
            value={missingFieldFilter}
            onChange={(e) => { setMissingFieldFilter(e.target.value); setSelectedId(null); }}
            className={`text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:border-gray-400 ${
              missingFieldFilter
                ? "border-orange-300 text-orange-700"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            <option value="">Missing field…</option>
            <option value="categories">Missing categories</option>
            <option value="make">Missing make</option>
            <option value="model">Missing model</option>
            <option value="year">Missing year</option>
            <option value="era">Missing era</option>
            <option value="region">Missing region</option>
            <option value="country">Missing country</option>
          </select>
          {autoUpdateResult && (
            <span className="text-xs text-gray-500">{autoUpdateResult}</span>
          )}
          <button
            onClick={autoUpdate}
            disabled={autoUpdating}
            className="text-xs px-2.5 py-1.5 border border-gray-200 rounded text-gray-500 hover:text-gray-700 hover:border-gray-400 disabled:opacity-50"
          >
            {autoUpdating ? "Updating…" : "Auto update"}
          </button>
        </div>
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
                    <p className="text-[10px] text-gray-400">
                      {img.vehicle.year}
                    </p>
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

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
                  {error}
                </p>
              )}

              {/* Vehicle details */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Vehicle details
                </p>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Make
                  </label>
                  <Combobox
                    variant="admin"
                    value={editForm.make}
                    onChange={(v) => {
                      setSelectedMake(v);
                      setEditForm((f) => f && { ...f, make: v });
                    }}
                    options={makeOptions}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Model
                  </label>
                  <Combobox
                    variant="admin"
                    value={editForm.model}
                    onChange={(v) =>
                      setEditForm((f) => f && { ...f, model: v })
                    }
                    options={modelOptions}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Trim
                  </label>
                  <Combobox
                    variant="admin"
                    value={editForm.trim}
                    onChange={(v) => setEditForm((f) => f && { ...f, trim: v })}
                    options={trimOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Year
                  </label>
                  <input
                    type="number"
                    value={editForm.year}
                    onChange={(e) =>
                      setEditForm((f) => f && { ...f, year: e.target.value })
                    }
                    className="w-full text-sm text-black border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400"
                    placeholder="e.g. 1994"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Body style
                    </label>
                    <select
                      value={editForm.bodyStyle}
                      onChange={(e) =>
                        setEditForm(
                          (f) => f && { ...f, bodyStyle: e.target.value },
                        )
                      }
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
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Era
                    </label>
                    <select
                      value={editForm.era}
                      onChange={(e) =>
                        setEditForm((f) => f && { ...f, era: e.target.value })
                      }
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
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Rarity
                    </label>
                    <select
                      value={editForm.rarity}
                      onChange={(e) =>
                        setEditForm(
                          (f) => f && { ...f, rarity: e.target.value },
                        )
                      }
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
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Region slug
                    </label>
                    <Combobox
                      variant="admin"
                      value={editForm.regionSlug}
                      onChange={(v) =>
                        setEditForm((f) => f && { ...f, regionSlug: v })
                      }
                      options={regionOptions}
                      placeholder="e.g. japan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Country of origin
                  </label>
                  <Combobox
                    variant="admin"
                    value={editForm.countryOfOrigin}
                    onChange={(v) =>
                      setEditForm((f) => f && { ...f, countryOfOrigin: v })
                    }
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
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Copyright holder
                  </label>
                  <Combobox
                    variant="admin"
                    value={editForm.copyrightHolder}
                    onChange={(v) =>
                      setEditForm((f) => f && { ...f, copyrightHolder: v })
                    }
                    options={copyrightHolderOptions}
                    placeholder="e.g. Wikimedia Commons"
                  />
                </div>

                <CheckboxField
                  label="Active"
                  checked={editForm.isActive}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, isActive: v })
                  }
                />
                <CheckboxField
                  label="Hardcore eligible"
                  checked={editForm.isHardcoreEligible}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, isHardcoreEligible: v })
                  }
                />
                <CheckboxField
                  label="Cropped (partial view)"
                  checked={editForm.isCropped}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, isCropped: v })
                  }
                />
                <CheckboxField
                  label="Logo visible"
                  checked={editForm.isLogoVisible}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, isLogoVisible: v })
                  }
                />
                <CheckboxField
                  label="Model name visible"
                  checked={editForm.isModelNameVisible}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, isModelNameVisible: v })
                  }
                />
                <CheckboxField
                  label="Multiple vehicles in image"
                  checked={editForm.hasMultipleVehicles}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, hasMultipleVehicles: v })
                  }
                />
                <CheckboxField
                  label="Face visible"
                  checked={editForm.isFaceVisible}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, isFaceVisible: v })
                  }
                />
                <CheckboxField
                  label="Vehicle unmodified"
                  checked={editForm.isVehicleUnmodified}
                  onChange={(v) =>
                    setEditForm((f) => f && { ...f, isVehicleUnmodified: v })
                  }
                />
              </div>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full text-sm bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>

              {selected.isActive && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={deactivate}
                    disabled={saving}
                    className="w-full text-sm border border-red-200 text-red-600 rounded px-3 py-2 hover:bg-red-50 disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
