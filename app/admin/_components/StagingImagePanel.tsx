"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import ImagesPanel from "./ImagesPanel";
import CheckboxField from "./CheckboxField";
import MakesModelsPanel from "./MakesModelsPanel";
import CategoriesPanel from "./CategoriesPanel";
import RegionsPanel from "./RegionsPanel";
import StatsPanel from "./StatsPanel";
import DuplicatesPanel from "./DuplicatesPanel";
import ReportsPanel from "./ReportsPanel";
import FlagsPanel from "./FlagsPanel";
import CoveragePanel from "./CoveragePanel";
import StagingEditFields from "./StagingEditFields";
import ReviewQueuePanel from "./ReviewQueuePanel";
import { useStagingAutocomplete } from "./useStagingAutocomplete";
import {
  emptyForm,
  formFromImage,
  formToPayload,
  STATUS_LABELS,
  STATUS_COLOURS,
} from "./staging-types";
import type { AdminPage, StagingImage, StagingStatus, EditForm } from "./staging-types";

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

export default function StagingImagePanel() {
  const [activePage, setActivePage] = useState<AdminPage>("images");
  const [images, setImages] = useState<StagingImage[]>([]);
  const [counts, setCounts] = useState<Partial<Record<StagingStatus, number>>>({});
  const [statusFilter, setStatusFilter] = useState<StagingStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm());
  const lastSelectedIdxRef = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autocomplete = useStagingAutocomplete(editForm, setEditForm);

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

  function handleImageClick(img: StagingImage, shiftKey: boolean) {
    const idx = images.findIndex((i) => i.id === img.id);
    if (shiftKey && lastSelectedIdxRef.current !== null && selectedIds.length > 0) {
      const from = Math.min(lastSelectedIdxRef.current, idx);
      const to = Math.max(lastSelectedIdxRef.current, idx);
      const rangeIds = images.slice(from, to + 1).map((i) => i.id);
      setSelectedIds((prev) => [...new Set([...prev, ...rangeIds])]);
    } else {
      setSelectedIds([img.id]);
      setEditForm(formFromImage(img));
      lastSelectedIdxRef.current = idx;
    }
    setError(null);
  }

  function toggleImageSelection(id: string) {
    const idx = images.findIndex((i) => i.id === id);
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((i) => i !== id);
        if (next.length === 1) {
          const remaining = images.find((img) => img.id === next[0]);
          if (remaining) setEditForm(formFromImage(remaining));
        } else if (next.length === 0) {
          setEditForm(emptyForm());
        }
        return next;
      }
      lastSelectedIdxRef.current = idx;
      return [...prev, id];
    });
    setError(null);
  }

  function patchImage(updated: Partial<StagingImage> & { id: string }) {
    setImages((imgs) => imgs.map((img) => (img.id === updated.id ? { ...img, ...updated } : img)));
  }

  function removeImage(id: string, oldStatus: StagingStatus, newStatus?: StagingStatus) {
    setImages((imgs) =>
      statusFilter === "ALL"
        ? imgs.map((img) => (img.id === id && newStatus ? { ...img, status: newStatus } : img))
        : imgs.filter((img) => img.id !== id)
    );
    setCounts((c) => {
      const next = { ...c };
      next[oldStatus] = Math.max(0, (next[oldStatus] ?? 0) - 1);
      if (newStatus) next[newStatus] = (next[newStatus] ?? 0) + 1;
      return next;
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/staging/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(editForm)),
    });
    setSaving(false);
    if (res.ok) {
      patchImage(await res.json());
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
    }
  }

  async function saveMultiple() {
    setSaving(true);
    setError(null);
    let lastError: string | null = null;
    try {
      for (const id of selectedIds) {
        const img = images.find((i) => i.id === id);
        if (!img) continue;

        // Flags always apply across all selected images.
        // Text fields only apply if the image has no existing admin value for that field.
        const payload: Record<string, unknown> = {
          isHardcoreEligible: editForm.isHardcoreEligible,
          isCropped: editForm.isCropped,
          isLogoVisible: editForm.isLogoVisible,
          isModelNameVisible: editForm.isModelNameVisible,
          hasMultipleVehicles: editForm.hasMultipleVehicles,
          isFaceVisible: editForm.isFaceVisible,
          isVehicleUnmodified: editForm.isVehicleUnmodified,
        };

        if (!img.admin.make) payload.make = editForm.make || null;
        if (!img.admin.model) payload.model = editForm.model || null;
        if (!img.admin.year) payload.year = editForm.year || null;
        if (!img.admin.trim) payload.trim = editForm.trim || null;
        if (!img.admin.bodyStyle) payload.bodyStyle = editForm.bodyStyle || null;
        if (!img.admin.rarity) payload.rarity = editForm.rarity || null;
        if (!img.admin.era) payload.era = editForm.era || null;
        if (!img.admin.regionSlug) payload.regionSlug = editForm.regionSlug || null;
        if (!img.admin.countryOfOrigin) payload.countryOfOrigin = editForm.countryOfOrigin || null;
        if (!img.admin.categories?.length) payload.categories = editForm.categories;
        if (!img.admin.notes) payload.notes = editForm.notes || null;
        if (!img.admin.copyrightHolder) payload.copyrightHolder = editForm.copyrightHolder || null;

        const res = await fetch(`/api/admin/staging/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          patchImage(await res.json());
        } else {
          const d = await res.json().catch(() => ({}));
          lastError = d.error ?? "Save failed";
        }
      }
    } finally {
      setSaving(false);
    }
    if (lastError) setError(lastError);
  }

  async function setStatus(id: string, status: StagingStatus) {
    const oldStatus = images.find((img) => img.id === id)?.status;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/staging/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (res.ok) {
      if (oldStatus) removeImage(id, oldStatus, status);
      if (status === "REJECTED" || status === "PUBLISHED") setSelectedIds([]);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Status update failed");
    }
  }

  async function publish(id: string) {
    // Save current form state first, then publish
    const oldStatus = images.find((img) => img.id === id)?.status;
    setSaving(true);
    setError(null);
    const saveRes = await fetch(`/api/admin/staging/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(editForm)),
    });
    setSaving(false);

    if (!saveRes.ok) {
      const d = await saveRes.json().catch(() => ({}));
      setError(d.error ?? "Save failed");
      return;
    }

    setPublishing(true);
    const res = await fetch(`/api/admin/staging/${id}/publish`, { method: "POST" });
    setPublishing(false);

    if (res.ok) {
      if (oldStatus) removeImage(id, oldStatus, "PUBLISHED");
      setSelectedIds([]);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Publish failed");
    }
  }

  const isMultiSelect = selectedIds.length > 1;
  const selected = selectedIds.length === 1 ? (images.find((img) => img.id === selectedIds[0]) ?? null) : null;
  const isPublished = selected?.status === "PUBLISHED";

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Admin</h1>
          <nav className="flex gap-0.5">
            {(
              [
                ["images", "Images"],
                ["staging", "Staging"],
                ["review", "Review"],
                ["makes-models", "Makes & Models"],
                ["categories", "Categories"],
                ["regions", "Regions"],
                ["stats", "Stats"],
                ["duplicates", "Duplicates"],
                ["flags", "Flags"],
                ["coverage", "Coverage"],
                ["reports", "Reports"],
              ] as [AdminPage, string][]
            ).map(([page, label]) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activePage === page
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Game
        </Link>
      </header>

      {activePage === "images" && <ImagesPanel />}
      {activePage === "review" && <ReviewQueuePanel />}
      {activePage === "makes-models" && <MakesModelsPanel />}
      {activePage === "categories" && <CategoriesPanel />}
      {activePage === "regions" && <RegionsPanel />}
      {activePage === "stats" && <StatsPanel />}
      {activePage === "duplicates" && <DuplicatesPanel />}
      {activePage === "flags" && <FlagsPanel />}
      {activePage === "coverage" && <CoveragePanel />}
      {activePage === "reports" && <ReportsPanel />}

      {activePage === "staging" && (
      <>
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
                setSelectedIds([]);
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

      <div className="flex h-[calc(100vh-96px)]">
        {/* Image grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-400 p-4">Loading…</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No images.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className={`group relative rounded-lg overflow-hidden border-2 text-left transition-all cursor-pointer ${
                    selectedIds.includes(img.id)
                      ? "border-gray-900 shadow-md"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  {/* Checkbox for multi-select — large hit area covers top-left corner */}
                  <div
                    className="absolute top-0 left-0 z-10 w-10 h-10 flex items-start justify-start p-2 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleImageSelection(img.id); }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(img.id)}
                      onChange={() => {}}
                      className="w-4 h-4 rounded cursor-pointer accent-gray-900 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={selectedIds.includes(img.id) ? { opacity: 1 } : {}}
                    />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.filename}
                    onClick={(e) => { if (e.shiftKey) e.preventDefault(); handleImageClick(img, e.shiftKey); }}
                    className="w-full aspect-[4/3] object-cover bg-gray-100 select-none"
                  />
                  <div className="p-1.5 bg-white select-none" onClick={(e) => { if (e.shiftKey) e.preventDefault(); handleImageClick(img, e.shiftKey); }}>
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {(selected || isMultiSelect) && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              {/* Multi-select header */}
              {isMultiSelect && (
                <div className="bg-blue-50 rounded-lg px-3 py-2.5 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-blue-900">{selectedIds.length} images selected</p>
                    <p className="text-xs text-blue-600 mt-0.5">Changes will be applied to all selected images.</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIds.map((id) => {
                      const img = images.find((i) => i.id === id);
                      if (!img) return null;
                      return (
                        <div key={id} className="relative group/thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.imageUrl}
                            alt={img.filename}
                            className="w-16 h-12 object-cover rounded border border-blue-200"
                          />
                          <button
                            onClick={() => toggleImageSelection(id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white rounded-full text-[10px] leading-none flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            aria-label="Deselect"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Image preview — single select only */}
              {selected && (
                <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.imageUrl}
                alt={selected.filename}
                className="w-full aspect-[4/3] object-cover rounded-lg bg-gray-100"
              />

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
                </>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

              {isPublished && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
                  This image is published. Edit it directly from the Images tab.
                </p>
              )}

              <StagingEditFields
                form={editForm}
                setForm={setEditForm}
                makeOptions={autocomplete.makeOptions}
                modelOptions={autocomplete.modelOptions}
                trimOptions={autocomplete.trimOptions}
                countryOptions={autocomplete.countryOptions}
                regionOptions={autocomplete.regionOptions}
                copyrightHolderOptions={autocomplete.copyrightHolderOptions}
                categoryOptions={autocomplete.categoryOptions}
                disabled={isPublished}
              />

              <button
                onClick={() => isMultiSelect ? saveMultiple() : saveEdit(selected!.id)}
                disabled={saving || publishing}
                className="w-full text-sm bg-gray-900 text-white rounded px-3 py-2 hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : isMultiSelect ? `Apply to ${selectedIds.length} images` : "Save changes"}
              </button>

              {/* Actions — single select only */}
              {selected && (
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
              )}
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
