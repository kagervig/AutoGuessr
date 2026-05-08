"use client";

// Tinder-style single-card review panel for PENDING_REVIEW staging images.
// Keyboard: ← skip, → publish & advance, Esc defocus input.

import { useEffect, useRef, useState, useCallback } from "react";
import StagingEditFields from "./StagingEditFields";
import { useStagingAutocomplete } from "./useStagingAutocomplete";
import {
  emptyForm,
  formFromImage,
  formToPayload,
  STATUS_LABELS,
} from "./staging-types";
import type { StagingImage, StagingStatus, EditForm } from "./staging-types";

const REVIEW_STATUSES: StagingStatus[] = ["PENDING_REVIEW", "PUBLISHED", "REJECTED"];

type RequiredField = "make" | "model" | "year" | "regionSlug" | "countryOfOrigin";

interface Toast {
  id: string;
  message: string;
  onRetry?: () => void;
}

function validateForm(form: EditForm): Partial<Record<RequiredField, string>> | null {
  const errors: Partial<Record<RequiredField, string>> = {};
  if (!form.make) errors.make = "Required";
  if (!form.model) errors.model = "Required";
  if (!form.year) errors.year = "Required";
  if (!form.regionSlug) errors.regionSlug = "Required";
  if (!form.countryOfOrigin) errors.countryOfOrigin = "Required";
  return Object.keys(errors).length > 0 ? errors : null;
}

export default function ReviewQueuePanel() {
  const [statusFilter, setStatusFilter] = useState<StagingStatus>("PENDING_REVIEW");
  const [queue, setQueue] = useState<StagingImage[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm());
  const [inflightCount, setInflightCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredField, string>>>({});
  const [inputFocused, setInputFocused] = useState(false);

  const autocomplete = useStagingAutocomplete(editForm, setEditForm);

  const indexRef = useRef(index);
  indexRef.current = index;
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const fetchQueue = useCallback(async (status: StagingStatus) => {
    setLoading(true);
    const res = await fetch(`/api/admin/staging?status=${status}`);
    const data = await res.json();
    const items = data.items ?? [];
    setQueue(items);
    setIndex(0);
    if (items.length > 0) {
      setEditForm(formFromImage(items[0]));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueue(statusFilter);
  }, [fetchQueue, statusFilter]);

  // Sync edit form when index or queue changes (safety net for other index changes)
  useEffect(() => {
    const card = queue[index];
    if (card) setEditForm(formFromImage(card));
  }, [index, queue]);

  // Preload next 3 images when index changes
  useEffect(() => {
    for (let i = 1; i <= 3; i++) {
      const next = queue[index + i];
      if (!next) break;
      const img = new window.Image();
      img.src = next.imageUrl;
      img.decode().catch(() => {});
    }
  }, [index, queue]);

  // Track whether any text input is focused (to suppress arrow key nav)
  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      const tag = (e.target as HTMLElement).tagName;
      setInputFocused(["INPUT", "TEXTAREA", "SELECT"].includes(tag));
    }
    function onFocusOut() {
      setInputFocused(false);
    }
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  function addToast(toast: Omit<Toast, "id">) {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { ...toast, id }]);
    // Auto-dismiss after 8 seconds
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }

  function removeToast(id: string) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  async function doPublish(cardId: string, form: EditForm) {
    setInflightCount((c) => c + 1);
    try {
      const saveRes = await fetch(`/api/admin/staging/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json().catch(() => ({}));
        throw new Error(d.error ?? "Save failed");
      }
      const pubRes = await fetch(`/api/admin/staging/${cardId}/publish`, { method: "POST" });
      if (!pubRes.ok) {
        const d = await pubRes.json().catch(() => ({}));
        // 400 "already published" is not an error worth reinserting for
        if (pubRes.status === 400) {
          addToast({ message: "Already published — skipped" });
          return;
        }
        throw new Error(d.error ?? "Publish failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      const card = queueRef.current.find((c) => c.id === cardId);
      if (card) {
        // Reinsert the failed card at the current position
        setQueue((q) => {
          const pos = indexRef.current;
          return [...q.slice(0, pos), card, ...q.slice(pos)];
        });
      }
      addToast({
        message,
        onRetry: () => doPublish(cardId, form),
      });
    } finally {
      setInflightCount((c) => c - 1);
    }
  }

  function handleSkip() {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    const nextCard = queue[nextIndex];
    if (nextCard) setEditForm(formFromImage(nextCard));
    setFieldErrors({});
  }

  function handlePublish() {
    const card = queue[index];
    if (!card) return;
    const errors = validateForm(editForm);
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    const capturedForm = { ...editForm };
    const capturedId = card.id;

    // Optimistic advance — next card paints immediately
    const nextIndex = index + 1;
    setIndex(nextIndex);
    const nextCard = queue[nextIndex];
    if (nextCard) setEditForm(formFromImage(nextCard));

    doPublish(capturedId, capturedForm);
  }

  // Keyboard handler — uses refs to avoid stale closures in a stable listener
  const handlersRef = useRef({ handlePublish, handleSkip, inputFocused });
  handlersRef.current = { handlePublish, handleSkip, inputFocused };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (handlersRef.current.inputFocused) return;
      if (e.key === "ArrowRight") { e.preventDefault(); handlersRef.current.handlePublish(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); handlersRef.current.handleSkip(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const card = queue[index];
  const isDone = !loading && index >= queue.length;
  const position = Math.min(index + 1, queue.length);
  const total = queue.length;

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Status filter tabs */}
      <div className="border-b border-gray-200 bg-white px-6 flex-shrink-0">
        <nav className="flex gap-1 -mb-px">
          {REVIEW_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2.5 text-sm border-b-2 transition-colors ${
                statusFilter === s
                  ? "border-gray-900 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </nav>
      </div>

      {/* Toast region */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 bg-red-600 text-white text-sm rounded-lg px-4 py-3 shadow-lg max-w-sm"
            >
              <span className="flex-1">{toast.message}</span>
              {toast.onRetry && (
                <button
                  onClick={() => { toast.onRetry?.(); removeToast(toast.id); }}
                  className="underline text-white/90 hover:text-white flex-shrink-0"
                >
                  Retry
                </button>
              )}
              <button onClick={() => removeToast(toast.id)} className="text-white/70 hover:text-white flex-shrink-0 text-lg leading-none">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Loading…
          </div>
        ) : isDone ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-lg font-medium text-gray-700">All caught up</p>
            <p className="text-sm text-gray-400">No more {STATUS_LABELS[statusFilter].toLowerCase()} images.</p>
            <button
              onClick={() => fetchQueue(statusFilter)}
              className="text-sm bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        ) : card ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Image — top half */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={card.id}
                src={card.imageUrl}
                alt={card.filename}
                className="max-h-full max-w-full object-contain"
              />
              {/* AI suggestion — overlay bottom-left of image */}
              {(card.ai.make || card.ai.model) && (
                <div className="absolute bottom-2 left-2 text-xs bg-black/60 text-white rounded px-2 py-1 flex items-center gap-1">
                  {card.ai.make && card.ai.model ? (
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent([card.ai.year, card.ai.make, card.ai.model].filter(Boolean).join(" "))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-300"
                    >
                      {[card.ai.year, card.ai.make, card.ai.model].filter(Boolean).join(" ")}
                    </a>
                  ) : (
                    <span>{[card.ai.year, card.ai.make, card.ai.model].filter(Boolean).join(" ")}</span>
                  )}
                  {card.ai.confidence != null && (
                    <span className={`ml-1 ${
                      card.ai.confidence >= 0.9
                        ? "text-green-400"
                        : card.ai.confidence >= 0.8
                          ? "text-yellow-400"
                          : "opacity-70"
                    }`}>
                      ({Math.round(card.ai.confidence * 100)}%)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Form — bottom half */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
              <StagingEditFields
                key={card.id}
                form={editForm}
                setForm={setEditForm}
                makeOptions={autocomplete.makeOptions}
                modelOptions={autocomplete.modelOptions}
                trimOptions={autocomplete.trimOptions}
                countryOptions={autocomplete.countryOptions}
                regionOptions={autocomplete.regionOptions}
                copyrightHolderOptions={autocomplete.copyrightHolderOptions}
                categoryOptions={autocomplete.categoryOptions}
                fieldErrors={fieldErrors}
                compact
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
          <button
            onClick={handleSkip}
            disabled={isDone}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 flex items-center gap-1"
          >
            ← Skip
          </button>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            {inputFocused && <span className="text-xs text-gray-400">Esc to defocus</span>}
            {!isDone && <span>{position} / {total}</span>}
            {inflightCount > 0 && (
              <span className="text-xs text-blue-500">Publishing {inflightCount}…</span>
            )}
          </div>

          <button
            onClick={handlePublish}
            disabled={isDone}
            className="text-sm bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 disabled:opacity-40"
          >
            Publish & Next →
          </button>
        </div>
      )}
    </div>
  );
}
