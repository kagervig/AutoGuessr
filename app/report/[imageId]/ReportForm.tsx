"use client";
// Client-side report form for flagging image problems.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface VehicleData {
  make: string;
  model: string;
  year: number;
  trim: string | null;
  countryOfOrigin: string;
  bodyStyle: string;
  era: string;
  rarity: string;
}

interface ImageData {
  id: string;
  filename: string;
  vehicleId: string;
  imageUrl: string;
  vehicle: VehicleData;
}

const BODY_STYLES = [
  "coupe", "sedan", "convertible", "hatchback", "wagon",
  "suv", "truck", "pickup", "van", "roadster", "targa", "compact", "special_purpose",
];
const ERAS = ["classic", "retro", "modern", "contemporary"];
const RARITIES = ["common", "uncommon", "rare", "ultra_rare"];

const INPUT_CLASS = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30";
const LABEL_CLASS = "block text-xs text-white/50 mb-1";
const SECTION_CLASS = "space-y-3";

interface Props {
  imageId: string;
  returnTo?: string;
}

export default function ReportForm({ imageId, returnTo }: Props) {
  const router = useRouter();
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [trim, setTrim] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [bodyStyle, setBodyStyle] = useState("");
  const [era, setEra] = useState("");
  const [rarity, setRarity] = useState("");
  const [comment, setComment] = useState("");
  const [certainty, setCertainty] = useState(50);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/images/${imageId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: ImageData) => {
        setImageData(data);
        setMake(data.vehicle.make);
        setModel(data.vehicle.model);
        setYear(String(data.vehicle.year));
        setTrim(data.vehicle.trim ?? "");
        setCountryOfOrigin(data.vehicle.countryOfOrigin);
        setBodyStyle(data.vehicle.bodyStyle);
        setEra(data.vehicle.era);
        setRarity(data.vehicle.rarity);
      })
      .catch(() => setFetchError("Failed to load image details."));
  }, [imageId]);

  if (fetchError) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-red-400">{fetchError}</p>
      </main>
    );
  }

  if (!imageData) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  const cv = imageData.vehicle;
  const hasVehicleChange =
    make !== cv.make ||
    model !== cv.model ||
    year !== String(cv.year) ||
    trim !== (cv.trim ?? "") ||
    countryOfOrigin !== cv.countryOfOrigin ||
    bodyStyle !== cv.bodyStyle ||
    era !== cv.era ||
    rarity !== cv.rarity;

  const canSubmit = !submitting && (hasVehicleChange || comment.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !imageData) return;

    setSubmitting(true);
    setSubmitError(null);

    const cv = imageData.vehicle;
    const payload: Record<string, unknown> = { imageId, certainty };

    if (comment.trim()) payload.comment = comment.trim();
    if (make !== cv.make) payload.suggestedMake = make;
    if (model !== cv.model) payload.suggestedModel = model;
    if (year !== String(cv.year)) payload.suggestedYear = parseInt(year, 10);
    if (trim !== (cv.trim ?? "")) payload.suggestedTrim = trim;
    if (countryOfOrigin !== cv.countryOfOrigin) payload.suggestedCountryOfOrigin = countryOfOrigin;
    if (bodyStyle !== cv.bodyStyle) payload.suggestedBodyStyle = bodyStyle;
    if (era !== cv.era) payload.suggestedEra = era;
    if (rarity !== cv.rarity) payload.suggestedRarity = rarity;

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Submission failed");
      }
      setSubmitted(true);
      if (returnTo) {
        setTimeout(() => router.push(returnTo), 1500);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-white text-lg">Thank you! Your report has been submitted and will be reviewed shortly.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div>
          {returnTo && (
            <button
              onClick={() => router.push(returnTo)}
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              Back to results
            </button>
          )}
          <h1 className="text-2xl font-bold text-white">Report a Problem</h1>
          <p className="text-sm text-white mt-1">Help us keep AutoGuessr accurate. In the form below, please let us know what you believe the vehicle shown in the image to be. We review every report and will update the database if required.</p>
        </div>

        {/* Image preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageData.imageUrl}
          alt={`${imageData.vehicle.make} ${imageData.vehicle.model}`}
          className="w-full rounded-xl object-cover aspect-video"
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Vehicle details */}
          <section className={SECTION_CLASS}>
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Vehicle Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Make</label>
                <input className={INPUT_CLASS} value={make} onChange={(e) => setMake(e.target.value)} placeholder={cv.make} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Model</label>
                <input className={INPUT_CLASS} value={model} onChange={(e) => setModel(e.target.value)} placeholder={cv.model} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Year</label>
                <input className={INPUT_CLASS} type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder={String(cv.year)} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Trim</label>
                <input className={INPUT_CLASS} value={trim} onChange={(e) => setTrim(e.target.value)} placeholder={cv.trim ?? "—"} />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLASS}>Country of Origin</label>
                <input className={INPUT_CLASS} value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} placeholder={cv.countryOfOrigin} />
              </div>
              <div>
                <label className={LABEL_CLASS}>Body Style</label>
                <select className={INPUT_CLASS} value={bodyStyle} onChange={(e) => setBodyStyle(e.target.value)}>
                  {BODY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Era</label>
                <select className={INPUT_CLASS} value={era} onChange={(e) => setEra(e.target.value)}>
                  {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLASS}>Rarity</label>
                <select className={INPUT_CLASS} value={rarity} onChange={(e) => setRarity(e.target.value)}>
                  {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Comment */}
          <section className={SECTION_CLASS}>
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Comment</h2>
            <textarea
              className={cn(INPUT_CLASS, "resize-none h-24")}
              placeholder="Additional comments (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </section>

          {/* Certainty */}
          <section className={SECTION_CLASS}>
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Certainty</h2>
            <label className={LABEL_CLASS}>How certain are you that something is wrong?</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={certainty}
                onChange={(e) => setCertainty(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm text-white w-12 text-right">{certainty}%</span>
            </div>
            <p className="text-xs text-white/40 mt-1">The image will be flagged for review by our team.</p>
          </section>

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </form>
      </div>
    </main>
  );
}
