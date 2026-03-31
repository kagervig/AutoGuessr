import type { CommunityIdentification } from "../generated/prisma/client";

export const CONFIRMATION_THRESHOLD = 5;

export interface FieldAgreements {
  make: { value: string; count: number } | null;
  model: { value: string; count: number } | null;
  year: { value: number; count: number } | null;
  trim: { value: string; count: number } | null;
}

// For each field, find the most-agreed-upon value and its unique-user count.
export function computeAgreements(suggestions: CommunityIdentification[]): FieldAgreements {
  function topValue<T extends string | number>(
    values: (T | null)[]
  ): { value: T; count: number } | null {
    const counts = new Map<T, number>();
    for (const v of values) {
      if (v !== null && v !== undefined) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    if (counts.size === 0) return null;
    const [value, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { value, count };
  }

  return {
    make: topValue(suggestions.map((s) => s.suggestedMake)),
    model: topValue(suggestions.map((s) => s.suggestedModel)),
    year: topValue(suggestions.map((s) => s.suggestedYear)),
    trim: topValue(suggestions.map((s) => s.suggestedTrim)),
  };
}

// Returns the confirmed values for fields that have reached the threshold.
export function confirmedFromAgreements(agreements: FieldAgreements) {
  return {
    confirmedMake:
      agreements.make && agreements.make.count >= CONFIRMATION_THRESHOLD
        ? agreements.make.value
        : undefined,
    confirmedModel:
      agreements.model && agreements.model.count >= CONFIRMATION_THRESHOLD
        ? agreements.model.value
        : undefined,
    confirmedYear:
      agreements.year && agreements.year.count >= CONFIRMATION_THRESHOLD
        ? agreements.year.value
        : undefined,
    confirmedTrim:
      agreements.trim && agreements.trim.count >= CONFIRMATION_THRESHOLD
        ? agreements.trim.value
        : undefined,
  };
}
