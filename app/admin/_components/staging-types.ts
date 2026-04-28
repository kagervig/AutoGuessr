// Shared types, constants, and utilities for staging image admin panels.

export type AdminPage =
  | "images"
  | "staging"
  | "review"
  | "makes-models"
  | "categories"
  | "regions"
  | "stats"
  | "duplicates"
  | "flags"
  | "coverage"
  | "reports"
  | "car-of-the-day"
  | "feature-flags";

export type StagingStatus =
  | "PENDING_REVIEW"
  | "COMMUNITY_REVIEW"
  | "READY"
  | "PUBLISHED"
  | "REJECTED";

export interface Agreements {
  make: { value: string | null; count: number; confirmed: boolean };
  model: { value: string | null; count: number; confirmed: boolean };
  year: { value: number | null; count: number; confirmed: boolean };
  trim: { value: string | null; count: number; confirmed: boolean };
}

export interface StagingImage {
  id: string;
  imageUrl: string;
  filename: string;
  status: StagingStatus;
  createdAt: string;
  ai: {
    make: string | null;
    model: string | null;
    year: number | null;
    bodyStyle: string | null;
    confidence: number | null;
  };
  admin: {
    make: string | null;
    model: string | null;
    year: number | null;
    trim: string | null;
    bodyStyle: string | null;
    rarity: string | null;
    era: string | null;
    regionSlug: string | null;
    countryOfOrigin: string | null;
    categories: string[];
    isHardcoreEligible: boolean | null;
    notes: string | null;
    copyrightHolder: string | null;
    isCropped: boolean | null;
    isLogoVisible: boolean | null;
    isModelNameVisible: boolean | null;
    hasMultipleVehicles: boolean | null;
    isFaceVisible: boolean | null;
    isVehicleUnmodified: boolean | null;
  };
  confirmed: {
    make: string | null;
    model: string | null;
    year: number | null;
    trim: string | null;
  };
  agreements: Agreements;
  suggestionCount: number;
}

export interface EditForm {
  make: string;
  model: string;
  year: string;
  trim: string;
  bodyStyle: string;
  rarity: string;
  era: string;
  regionSlug: string;
  countryOfOrigin: string;
  categories: string[];
  isHardcoreEligible: boolean;
  notes: string;
  copyrightHolder: string;
  isCropped: boolean;
  isLogoVisible: boolean;
  isModelNameVisible: boolean;
  hasMultipleVehicles: boolean;
  isFaceVisible: boolean;
  isVehicleUnmodified: boolean;
}

export const STATUS_LABELS: Record<StagingStatus, string> = {
  PENDING_REVIEW: "Pending",
  COMMUNITY_REVIEW: "Community",
  READY: "Ready",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

export const STATUS_COLOURS: Record<StagingStatus, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  COMMUNITY_REVIEW: "bg-blue-100 text-blue-800",
  READY: "bg-green-100 text-green-800",
  PUBLISHED: "bg-gray-100 text-gray-600",
  REJECTED: "bg-red-100 text-red-700",
};

export function emptyForm(): EditForm {
  return {
    make: "",
    model: "",
    year: "",
    trim: "",
    bodyStyle: "",
    rarity: "",
    era: "",
    regionSlug: "",
    countryOfOrigin: "",
    categories: [],
    isHardcoreEligible: false,
    notes: "",
    copyrightHolder: "",
    isCropped: false,
    isLogoVisible: false,
    isModelNameVisible: false,
    hasMultipleVehicles: false,
    isFaceVisible: false,
    isVehicleUnmodified: true,
  };
}

export function formFromImage(img: StagingImage): EditForm {
  return {
    make: img.admin.make ?? img.confirmed.make ?? img.ai.make ?? "",
    model: img.admin.model ?? img.confirmed.model ?? img.ai.model ?? "",
    year: String(img.admin.year ?? img.confirmed.year ?? img.ai.year ?? ""),
    trim: img.admin.trim ?? img.confirmed.trim ?? "",
    bodyStyle: img.admin.bodyStyle ?? img.ai.bodyStyle ?? "",
    rarity: img.admin.rarity ?? "",
    era: img.admin.era ?? "",
    regionSlug: img.admin.regionSlug ?? "",
    countryOfOrigin: img.admin.countryOfOrigin ?? "",
    categories: img.admin.categories ?? [],
    isHardcoreEligible: img.admin.isHardcoreEligible ?? false,
    notes: img.admin.notes ?? "",
    copyrightHolder: img.admin.copyrightHolder ?? "",
    isCropped: img.admin.isCropped ?? false,
    isLogoVisible: img.admin.isLogoVisible ?? false,
    isModelNameVisible: img.admin.isModelNameVisible ?? false,
    hasMultipleVehicles: img.admin.hasMultipleVehicles ?? false,
    isFaceVisible: img.admin.isFaceVisible ?? false,
    isVehicleUnmodified: img.admin.isVehicleUnmodified ?? true,
  };
}

export function formToPayload(form: EditForm): Record<string, unknown> {
  return {
    make: form.make || null,
    model: form.model || null,
    year: form.year || null,
    trim: form.trim || null,
    bodyStyle: form.bodyStyle || null,
    rarity: form.rarity || null,
    era: form.era || null,
    regionSlug: form.regionSlug || null,
    countryOfOrigin: form.countryOfOrigin || null,
    categories: form.categories,
    isHardcoreEligible: form.isHardcoreEligible,
    notes: form.notes || null,
    copyrightHolder: form.copyrightHolder || null,
    isCropped: form.isCropped,
    isLogoVisible: form.isLogoVisible,
    isModelNameVisible: form.isModelNameVisible,
    hasMultipleVehicles: form.hasMultipleVehicles,
    isFaceVisible: form.isFaceVisible,
    isVehicleUnmodified: form.isVehicleUnmodified,
  };
}
