"use client";

// Card for a single image slot in a daily challenge, with reroll and inline car-selector controls.
import { useState } from "react";
import Image from "next/image";
import { Loader2, Shuffle } from "lucide-react";
import type { ChallengeImage, DailyChallenge } from "./challenge-types";

interface Props {
  img: ChallengeImage;
  challengeId: number;
  isFutureChallenge: boolean;
  onUpdate: (challenge: DailyChallenge) => void;
}

export default function ChallengeImageCard({ img, challengeId, isFutureChallenge, onUpdate }: Props) {
  const [isRerolling, setIsRerolling] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [pickerMake, setPickerMake] = useState("");
  const [pickerModel, setPickerModel] = useState("");
  const [pickerMakeOptions, setPickerMakeOptions] = useState<string[]>([]);
  const [pickerModelOptions, setPickerModelOptions] = useState<string[]>([]);
  const [pickerImages, setPickerImages] = useState<{ id: string; url: string }[]>([]);
  const [pickerLoadingImages, setPickerLoadingImages] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [submittingReplaceId, setSubmittingReplaceId] = useState<string | null>(null);

  function handleRandImageUpdate() {
    setIsRerolling(true);
    fetch(`/api/admin/daily-challenge/${challengeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replaceImageId: img.id }),
    })
      .then((r) => r.json())
      .then((data: DailyChallenge & { error?: string }) => {
        if (data.error) { alert(data.error); return; }
        onUpdate(data);
      })
      .catch((err: Error) => alert(err.message))
      .finally(() => setIsRerolling(false));
  }

  // The picker is the inline car-selector that opens beneath an image card when the admin clicks "Replace…".
  // Opens eagerly pre-fetching make options so the picker is ready without a visible loading delay.
  function handleOpenReplace() {
    setIsReplacing(true);
    setPickerMake("");
    setPickerModel("");
    setPickerImages([]);
    setPickerError(null);
    fetch("/api/admin/autocomplete?field=make")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setPickerMakeOptions(d))
      .catch(() => setPickerError("Could not load makes. Check your connection and try again."));
  }

  // Selecting a make resets the model and image selections and fetches matching model options.
  function handlePickerMakeChange(make: string) {
    setPickerMake(make);
    setPickerModel("");
    setPickerImages([]);
    setPickerError(null);
    if (!make) { setPickerModelOptions([]); return; }
    fetch(`/api/admin/autocomplete?field=model&make=${encodeURIComponent(make)}`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setPickerModelOptions(d))
      .catch(() => setPickerError("Could not load models. Check your connection and try again."));
  }

  function handlePickerModelChange(model: string) {
    setPickerModel(model);
    setPickerImages([]);
    setPickerError(null);
    if (!model || !pickerMake) return;
    setPickerLoadingImages(true);
    fetch(`/api/admin/vehicles?make=${encodeURIComponent(pickerMake)}&model=${encodeURIComponent(model)}`)
      .then((r) => r.json())
      .then(({ vehicles }: { vehicles: { id: string }[] }) => {
        if (!vehicles?.length) { setPickerLoadingImages(false); return; }
        return Promise.all(
          vehicles.map((v) =>
            fetch(`/api/admin/vehicles/${v.id}/images`).then((r) => r.json())
          )
        ).then((results) => {
          setPickerImages(results.flatMap((r: { images?: { id: string; url: string }[] }) => r.images ?? []));
        });
      })
      .catch(() => setPickerError("Could not load images. Check your connection and try again."))
      .finally(() => setPickerLoadingImages(false));
  }

  function handleReplaceWithImage(withImageId: string) {
    setSubmittingReplaceId(withImageId);
    fetch(`/api/admin/daily-challenge/${challengeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replaceImageId: img.id, withImageId }),
    })
      .then((r) => r.json())
      .then((data: DailyChallenge & { error?: string }) => {
        if (data.error) { alert(data.error); return; }
        onUpdate(data);
        setIsReplacing(false);
        setPickerMake("");
        setPickerModel("");
        setPickerImages([]);
      })
      .catch((err: Error) => alert(err.message))
      .finally(() => setSubmittingReplaceId(null));
  }

  return (
    <div className="rounded-xl overflow-hidden bg-gray-100">
      <div className="relative">
        {img.url ? (
          <div className="relative aspect-video">
            <Image
              src={img.url}
              alt={`${img.make ?? ""} ${img.model ?? ""}`.trim()}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gray-200" />
        )}
        {isFutureChallenge && (
          <button
            onClick={handleRandImageUpdate}
            disabled={isRerolling}
            title="Replace with a random image"
            aria-label="Reroll image"
            className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-black/70 text-white rounded transition-colors disabled:opacity-40"
          >
            {isRerolling
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Shuffle className="w-3.5 h-3.5" />
            }
          </button>
        )}
      </div>

      <div className="px-2 py-1.5">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{img.make ?? "—"}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{img.model ?? "—"}</p>
        {isFutureChallenge && (
          <button
            onClick={() => isReplacing ? setIsReplacing(false) : handleOpenReplace()}
            className="mt-0.5 text-xs text-blue-600 hover:underline"
          >
            {isReplacing ? "Cancel" : "Replace…"}
          </button>
        )}
      </div>

      {isReplacing && (
        <div className="px-2 pb-3 border-t border-gray-200 pt-2 space-y-2">
          <div>
            <input
              list="picker-makes"
              value={pickerMake}
              onChange={(e) => handlePickerMakeChange(e.target.value)}
              placeholder="Make"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-900"
            />
            <datalist id="picker-makes">
              {pickerMakeOptions.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>

          {pickerMake && (
            <div>
              <input
                list="picker-models"
                value={pickerModel}
                onChange={(e) => handlePickerModelChange(e.target.value)}
                placeholder="Model"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-900"
              />
              <datalist id="picker-models">
                {pickerModelOptions.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
          )}

          {pickerError && (
            <p className="text-xs text-red-500">{pickerError}</p>
          )}

          {pickerLoadingImages && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading images…
            </p>
          )}

          {!pickerLoadingImages && pickerModel && pickerImages.length === 0 && (
            <p className="text-xs text-gray-400">No active images found.</p>
          )}

          {pickerImages.length > 0 && (
            <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto">
              {pickerImages.map((pImg) => (
                <button
                  key={pImg.id}
                  onClick={() => handleReplaceWithImage(pImg.id)}
                  disabled={submittingReplaceId !== null}
                  title="Select this image"
                  className="relative aspect-video rounded overflow-hidden hover:ring-2 ring-blue-500 disabled:opacity-50 transition-all"
                >
                  {submittingReplaceId === pImg.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                  <Image
                    src={pImg.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
