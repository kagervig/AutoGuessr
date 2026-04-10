"use client";

import { useEffect, useState, useRef } from "react";

interface RegionRow {
  id: string;
  slug: string;
  label: string;
  vehicleCount: number;
}

type EditingField = "slug" | "label";

function FieldEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") onSave(draft.trim());
    if (e.key === "Escape") onCancel();
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-gray-500"
    />
  );
}

export default function RegionsPanel() {
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/regions")
      .then((r) => r.json())
      .then((d) => setRegions(d))
      .finally(() => setLoading(false));
  }, []);

  async function updateField(id: string, field: EditingField, next: string, current: string) {
    if (!next || next === current) { setEditingId(null); setEditingField(null); return; }
    setError(null);
    const res = await fetch(`/api/admin/regions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    });
    if (res.ok) {
      setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: next } : r)));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Update failed");
    }
    setEditingId(null);
    setEditingField(null);
  }

  function startEdit(id: string, field: EditingField) {
    setEditingId(id);
    setEditingField(field);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingField(null);
  }

  async function deleteRegion(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/regions/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setRegions((rs) => rs.filter((r) => r.id !== id));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
    }
  }

  async function createRegion() {
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, "_");
    const label = newLabel.trim();
    if (!slug || !label) { setError("Slug and label are required"); return; }
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setRegions((rs) => [...rs, created].sort((a, b) => a.slug.localeCompare(b.slug)));
      setNewSlug("");
      setNewLabel("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Create failed");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Add region
        </p>
        <div className="flex gap-2">
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug (e.g. north_america)"
            className="text-sm text-gray-900 border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 w-48"
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. North America)"
            className="text-sm text-gray-900 border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") createRegion(); }}
          />
          <button
            onClick={createRegion}
            disabled={saving}
            className="text-sm bg-gray-900 text-white rounded px-3 py-1.5 hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Regions ({regions.length})
        </p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : regions.length === 0 ? (
          <p className="text-sm text-gray-400">No regions yet.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Slug</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Label</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Vehicles</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {regions.map((region) => (
                  <tr key={region.id} className="group">
                    <td className="px-4 py-2">
                      {editingId === region.id && editingField === "slug" ? (
                        <FieldEditor
                          value={region.slug}
                          onSave={(v) => updateField(region.id, "slug", v, region.slug)}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <span
                          className="font-mono text-xs text-gray-500 cursor-pointer hover:text-gray-700"
                          onClick={() => startEdit(region.id, "slug")}
                          title="Click to edit slug"
                        >
                          {region.slug}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === region.id && editingField === "label" ? (
                        <FieldEditor
                          value={region.label}
                          onSave={(v) => updateField(region.id, "label", v, region.label)}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-gray-500 text-gray-800"
                          onClick={() => startEdit(region.id, "label")}
                          title="Click to edit label"
                        >
                          {region.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">{region.vehicleCount}</td>
                    <td className="px-4 py-2 text-right">
                      {region.vehicleCount === 0 && (
                        <button
                          onClick={() => deleteRegion(region.id)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity"
                        >
                          delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
