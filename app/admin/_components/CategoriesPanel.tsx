"use client";

import { useEffect, useState, useRef } from "react";

interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  vehicleCount: number;
}

function LabelEditor({
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

export default function CategoriesPanel() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d))
      .finally(() => setLoading(false));
  }, []);

  async function updateLabel(id: string, label: string, currentLabel: string) {
    if (!label || label === currentLabel) { setEditingId(null); return; }
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, label } : c)));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Update failed");
    }
    setEditingId(null);
  }

  async function deleteCategory(id: string) {
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setCategories((cs) => cs.filter((c) => c.id !== id));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
    }
  }

  async function createCategory() {
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, "_");
    const label = newLabel.trim();
    if (!slug || !label) { setError("Slug and label are required"); return; }
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      setCategories((cs) => [...cs, created].sort((a, b) => a.slug.localeCompare(b.slug)));
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
          Add category
        </p>
        <div className="flex gap-2">
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug (e.g. muscle)"
            className="text-sm text-gray-900 border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 w-40"
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Muscle Cars)"
            className="text-sm text-gray-900 border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-gray-400 flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") createCategory(); }}
          />
          <button
            onClick={createCategory}
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
          Categories ({categories.length})
        </p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categories yet.</p>
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
                {categories.map((cat) => (
                  <tr key={cat.id} className="group">
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-2">
                      {editingId === cat.id ? (
                        <LabelEditor
                          value={cat.label}
                          onSave={(v) => updateLabel(cat.id, v, cat.label)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-gray-500 text-gray-800"
                          onClick={() => setEditingId(cat.id)}
                          title="Click to edit"
                        >
                          {cat.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">{cat.vehicleCount}</td>
                    <td className="px-4 py-2 text-right">
                      {cat.vehicleCount === 0 && (
                        <button
                          onClick={() => deleteCategory(cat.id)}
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
