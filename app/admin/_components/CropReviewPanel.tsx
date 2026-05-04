"use client";

import { useEffect, useState, useCallback } from "react";
import type { CropMethod } from "@/app/generated/prisma/client";

interface ImageItem {
  id: string;
  filename: string;
  vehicleLabel: string;
  cropMethod: CropMethod;
  urls: {
    standard: string;
    subject: string;
    conditional: string;
    original: string;
  };
}

const STORAGE_KEY = "autoguessr_admin_crop_review_index";

export default function CropReviewPanel() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/images/review");
    const data = await res.json();
    setImages(data.items || []);
    
    // Resume from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed < (data.items?.length || 0)) {
        setIndex(parsed);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const advance = (newIndex: number) => {
    setIndex(newIndex);
    localStorage.setItem(STORAGE_KEY, newIndex.toString());
  };

  const handleSelectCrop = async (method: CropMethod) => {
    const current = images[index];
    if (!current) return;

    setSaving(true);
    const res = await fetch("/api/admin/images/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, cropMethod: method }),
    });

    if (res.ok) {
      advance(index + 1);
    }
    setSaving(false);
  };

  const handleReject = async () => {
    const current = images[index];
    if (!current) return;

    if (!confirm("Are you sure you want to deactivate and reject this image?")) return;

    setSaving(true);
    const res = await fetch("/api/admin/images/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: current.id, isActive: false }),
    });

    if (res.ok) {
      advance(index + 1);
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (confirm("Reset progress to the beginning?")) {
      advance(0);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading images...</div>;
  
  if (index >= images.length) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">All caught up!</h2>
        <p className="text-gray-500">You have reviewed all active images.</p>
        <button onClick={handleReset} className="px-4 py-2 bg-gray-900 text-white rounded-md">Restart Review</button>
      </div>
    );
  }

  const current = images[index];

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-gray-50">
      {/* Header Info */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-black">{current.vehicleLabel}</h2>
          <p className="text-sm text-gray-500">
            Image {index + 1} of {images.length} • Current Method: <span className="font-mono uppercase font-bold text-blue-600">{current.cropMethod}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
          >
            Reset Progress
          </button>
          <button 
            onClick={() => advance(index + 1)}
            className="px-4 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Skip Image
          </button>
        </div>
      </div>

      {/* Main Comparison Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
          {[
            { id: 'standard', name: 'Standard (Center)', url: current.urls.standard, desc: 'Original frame, center-cropped' },
            { id: 'subject', name: 'AI-Subject', url: current.urls.subject, desc: 'General AI subject-aware crop' },
            { id: 'conditional', name: 'Conditional COCO v2', url: current.urls.conditional, desc: 'Signed, car-specific AI (Portrait only)' },
          ].map((opt) => (
            <div key={opt.id} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center">{opt.name}</h3>
              <button 
                disabled={saving}
                onClick={() => handleSelectCrop(opt.id as CropMethod)}
                className={`w-full text-left p-2 rounded-2xl border-4 transition-all hover:shadow-xl active:scale-[0.98] bg-white ${
                  current.cropMethod === opt.id ? 'border-blue-500 shadow-md' : 'border-transparent hover:border-gray-200'
                }`}
              >
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 mb-3 border border-gray-100">
                  <img src={opt.url} alt={opt.name} className="w-full h-full object-cover" />
                </div>
                <div className="px-2 pb-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-bold text-gray-900">{opt.name}</p>
                    {current.cropMethod === opt.id && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 leading-tight">{opt.desc}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer - Original Image & Actions */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="h-32 w-auto bg-black rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm">
              <img src={current.urls.original} alt="Original" className="h-full w-auto object-contain" />
            </div>
            <div>
              <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1">Original Image</h4>
              <p className="text-xs text-gray-500 max-w-xs">Use this as reference for the full context of the photograph before it was cropped.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 italic mb-1">Image quality or composition issues?</p>
              <button 
                disabled={saving}
                onClick={handleReject}
                className="px-8 py-3 border-2 border-red-100 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                Reject Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
