"use client";

import { useEffect, useState, useRef } from "react";

interface MakeRow {
  make: string;
  count: number;
}

interface ModelRow {
  model: string;
  count: number;
}

function InlineEditor({
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
      onBlur={() => onCancel()}
      className="text-sm border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-gray-500 w-full"
    />
  );
}

export default function MakesModelsPanel() {
  const [makes, setMakes] = useState<MakeRow[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(true);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [modelFetch, setModelFetch] = useState<{ models: ModelRow[]; loading: boolean }>({
    models: [],
    loading: false,
  });
  const [editingMake, setEditingMake] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [confirmDeleteMake, setConfirmDeleteMake] = useState<string | null>(null);
  const [confirmDeleteModel, setConfirmDeleteModel] = useState<string | null>(null);
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [savingNewMake, setSavingNewMake] = useState(false);
  const [savingNewModel, setSavingNewModel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/makes")
      .then((r) => r.json())
      .then((d) => setMakes(d))
      .finally(() => setLoadingMakes(false));
  }, []);

  useEffect(() => {
    if (!selectedMake) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- single atomic state update to reset models before fetch
    setModelFetch({ models: [], loading: true });
    fetch(`/api/admin/makes/${encodeURIComponent(selectedMake)}/models`)
      .then((r) => r.json())
      .then((d) => setModelFetch({ models: d, loading: false }))
      .catch(() => setModelFetch({ models: [], loading: false }));
  }, [selectedMake]);

  async function renameMake(from: string, to: string) {
    if (!to || to === from) { setEditingMake(null); return; }
    setError(null);
    const res = await fetch("/api/admin/makes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    if (res.ok) {
      setMakes((ms) => ms.map((m) => (m.make === from ? { ...m, make: to } : m)));
      if (selectedMake === from) setSelectedMake(to);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Rename failed");
    }
    setEditingMake(null);
  }

  async function renameModel(from: string, to: string) {
    if (!to || to === from || !selectedMake) { setEditingModel(null); return; }
    setError(null);
    const res = await fetch(`/api/admin/makes/${encodeURIComponent(selectedMake)}/models`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    if (res.ok) {
      setModelFetch((prev) => ({ ...prev, models: prev.models.map((m) => (m.model === from ? { ...m, model: to } : m)) }));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Rename failed");
    }
    setEditingModel(null);
  }

  async function deleteMake(make: string) {
    setError(null);
    const res = await fetch("/api/admin/makes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ make }),
    });
    if (res.ok || res.status === 204) {
      setMakes((ms) => ms.filter((m) => m.make !== make));
      if (selectedMake === make) { setSelectedMake(null); setModelFetch({ models: [], loading: false }); }
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
    }
    setConfirmDeleteMake(null);
  }

  async function deleteModel(model: string) {
    if (!selectedMake) return;
    setError(null);
    const res = await fetch(`/api/admin/makes/${encodeURIComponent(selectedMake)}/models`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    if (res.ok || res.status === 204) {
      setModelFetch((prev) => ({ ...prev, models: prev.models.filter((m) => m.model !== model) }));
      setMakes((ms) => ms.map((m) =>
        m.make === selectedMake ? { ...m, count: m.count - (modelFetch.models.find((mo) => mo.model === model)?.count ?? 0) } : m
      ));
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
    }
    setConfirmDeleteModel(null);
  }

  async function addMake() {
    const make = newMake.trim();
    if (!make) return;
    setError(null);
    setSavingNewMake(true);
    const res = await fetch("/api/admin/makes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ make }),
    });
    setSavingNewMake(false);
    if (res.ok) {
      setMakes((ms) => [...ms, { make, count: 0 }].sort((a, b) => a.make.localeCompare(b.make)));
      setNewMake("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Add failed");
    }
  }

  async function addModel() {
    if (!selectedMake) return;
    const model = newModel.trim();
    if (!model) return;
    setError(null);
    setSavingNewModel(true);
    const res = await fetch(`/api/admin/makes/${encodeURIComponent(selectedMake)}/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    setSavingNewModel(false);
    if (res.ok) {
      setModelFetch((prev) => ({ ...prev, models: [...prev.models, { model, count: 0 }].sort((a, b) => a.model.localeCompare(b.model)) }));
      setNewModel("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Add failed");
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Makes list */}
      <div className="w-72 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Makes ({makes.length})
          </p>
        </div>
        {loadingMakes ? (
          <p className="text-sm text-gray-400 p-4">Loading…</p>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {makes.map((row) => (
              <li
                key={row.make}
                className={`group flex items-center gap-2 px-4 py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${
                  selectedMake === row.make ? "bg-gray-50" : ""
                }`}
                onClick={() => { setSelectedMake(row.make); setEditingMake(null); setConfirmDeleteMake(null); }}
              >
                {editingMake === row.make ? (
                  <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <InlineEditor
                      value={row.make}
                      onSave={(v) => renameMake(row.make, v)}
                      onCancel={() => setEditingMake(null)}
                    />
                  </div>
                ) : confirmDeleteMake === row.make ? (
                  <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-red-600 flex-1">Delete {row.count} vehicle{row.count !== 1 ? "s" : ""}?</span>
                    <button
                      onClick={() => deleteMake(row.make)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      confirm
                    </button>
                    <button
                      onClick={() => setConfirmDeleteMake(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`flex-1 text-sm truncate ${selectedMake === row.make ? "font-medium text-gray-900" : "text-gray-700"}`}>
                      {row.make}
                    </span>
                    <span className="text-xs text-gray-400">{row.count}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingMake(row.make); }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-600 px-1 transition-opacity"
                    >
                      edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteMake(row.make); }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity"
                    >
                      del
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
          <input
            value={newMake}
            onChange={(e) => setNewMake(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addMake(); }}
            placeholder="New make…"
            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
          />
          <button
            onClick={addMake}
            disabled={savingNewMake || !newMake.trim()}
            className="text-sm bg-gray-900 text-white rounded px-2 py-1 hover:bg-gray-700 disabled:opacity-40"
          >
            {savingNewMake ? "…" : "Add"}
          </button>
        </div>
      </div>

      {/* Models list */}
      <div className="flex-1 bg-gray-50 overflow-y-auto flex flex-col">
        {error && (
          <div className="m-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>
        )}
        {!selectedMake ? (
          <p className="text-sm text-gray-400 p-6">Select a make to view its models.</p>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-6 py-3 bg-white border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Models for {selectedMake} ({modelFetch.models.length})
              </p>
            </div>
            {modelFetch.loading ? (
              <p className="text-sm text-gray-400 p-6">Loading…</p>
            ) : (
              <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
                {modelFetch.models.map((row) => (
                  <li
                    key={row.model}
                    className="group flex items-center gap-3 px-6 py-2.5 bg-white hover:bg-gray-50"
                  >
                    {editingModel === row.model ? (
                      <div className="flex-1">
                        <InlineEditor
                          value={row.model}
                          onSave={(v) => renameModel(row.model, v)}
                          onCancel={() => setEditingModel(null)}
                        />
                      </div>
                    ) : confirmDeleteModel === row.model ? (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs text-red-600 flex-1">Delete {row.count} vehicle{row.count !== 1 ? "s" : ""}?</span>
                        <button
                          onClick={() => deleteModel(row.model)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteModel(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">{row.model}</span>
                        <span className="text-xs text-gray-400">{row.count} vehicle{row.count !== 1 ? "s" : ""}</span>
                        <button
                          onClick={() => setEditingModel(row.model)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-gray-600 px-1 transition-opacity"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => setConfirmDeleteModel(row.model)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity"
                        >
                          del
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-gray-200 bg-white px-6 py-3 flex gap-2">
              <input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addModel(); }}
                placeholder={`New model for ${selectedMake}…`}
                className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
              />
              <button
                onClick={addModel}
                disabled={savingNewModel || !newModel.trim()}
                className="text-sm bg-gray-900 text-white rounded px-2 py-1 hover:bg-gray-700 disabled:opacity-40"
              >
                {savingNewModel ? "…" : "Add"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
