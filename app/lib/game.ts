import type { Vehicle } from "../generated/prisma/client";
import { GameMode } from "./constants";

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Normalise a string for fuzzy comparison
export function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Returns true if the guess matches the target via exact → alias → Levenshtein ≤ 2
export function fuzzyMatch(guess: string, target: string, aliases: string[]): boolean {
  const g = normalise(guess);
  const t = normalise(target);
  if (g === t) return true;
  if (aliases.some((a) => normalise(a) === g)) return true;
  return levenshtein(g, t) <= 2;
}

export interface Choice {
  vehicleId: string;
  label: string;
}

export type VehicleForDistractor = Pick<Vehicle, "id" | "era" | "make" | "model"> & {
  categorySlugs?: string[];
};

// Fisher-Yates shuffle — returns a new array
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Pick `count` distractor vehicles for a given correct vehicle.
//
// Priority order:
//   1. At most 1 same-make vehicle (brand confusion is plausible)
//   2. Same-category, different make (e.g. other supercars, other muscle cars)
//   3. Same-era, different make
//   4. Anything else
//
// Deduplicates by make+model to prevent identical labels in the answer choices.
export function selectDistractors(
  correct: VehicleForDistractor,
  pool: VehicleForDistractor[],
  count = 3
): VehicleForDistractor[] {
  const others = pool.filter(
    (v) => v.id !== correct.id && !(v.make === correct.make && v.model === correct.model)
  );

  const correctCategories = new Set(correct.categorySlugs ?? []);

  const sameMake            = shuffle(others.filter((v) => v.make === correct.make));
  const sameCategoryDiffMake = shuffle(others.filter(
    (v) => v.make !== correct.make && (v.categorySlugs ?? []).some((s) => correctCategories.has(s))
  ));
  const sameEraDiffMake     = shuffle(others.filter((v) => v.make !== correct.make && v.era === correct.era));
  const fallback            = shuffle(others.filter((v) => v.make !== correct.make));

  const seen = new Set<string>();
  const result: VehicleForDistractor[] = [];

  function fill(candidates: VehicleForDistractor[], max?: number) {
    let added = 0;
    for (const v of candidates) {
      if (result.length >= count) break;
      if (max !== undefined && added >= max) break;
      const key = `${v.make}|${v.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(v);
        added++;
      }
    }
  }

  fill(sameMake, 1);
  fill(sameCategoryDiffMake);
  fill(sameEraDiffMake);
  fill(fallback);

  return result;
}

export function vehicleLabel(vehicle: Pick<Vehicle, "make" | "model">): string {
  return `${vehicle.make} ${vehicle.model}`;
}

export function imageUrl(filename: string, vehicleId: string): string {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${filename}`;
  }
  // Stable placeholder per vehicle during local development
  return `https://picsum.photos/seed/${vehicleId}/800/600`;
}

export function scoreRound({
  makeCorrect,
  modelCorrect,
  yearDelta,
  elapsedMs,
  timeLimitMs,
  mode,
  panelsRevealed,
}: {
  makeCorrect: boolean;
  modelCorrect: boolean;
  yearDelta: number | null;
  elapsedMs: number;
  timeLimitMs: number;
  mode: GameMode;
  panelsRevealed?: number;
}): {
  makePoints: number;
  modelPoints: number;
  yearBonus: number | null;
  timeBonus: number;
  modeMultiplier: number;
  pointsEarned: number;
} {
  const makePoints = makeCorrect ? 300 : 0;
  // Medium mode awards model points independently of make (partial credit for separate fields)
  const modelPoints = mode === GameMode.Custom
    ? (modelCorrect ? 400 : 0)
    : (makeCorrect && modelCorrect ? 400 : 0);

  const yearBonusApplies = ([GameMode.Standard, GameMode.Hardcore, GameMode.TimeAttack] as GameMode[]).includes(mode);
  const yearBonus =
    yearBonusApplies && yearDelta !== null
      ? Math.max(0, Math.round(200 * (1 - yearDelta / 5)))
      : null;

  // Time bonus only applies when at least the make is correct
  const timeBonus =
    mode !== GameMode.Practice && makeCorrect
      ? Math.max(0, Math.round(100 * (1 - elapsedMs / timeLimitMs)))
      : 0;

  const multipliers: Record<GameMode, number> = {
    [GameMode.Easy]: 1.0,
    [GameMode.Custom]: 1.0,
    [GameMode.Standard]: 1.7,
    [GameMode.TimeAttack]: 2.0,
    [GameMode.Practice]: 0,
    [GameMode.Hardcore]: 1.0,
  };

  let modeMultiplier: number;
  if (mode === GameMode.Hardcore && panelsRevealed !== undefined) {
    // Scale from 4.0 (1 panel revealed) down to 1.0 (all 9 panels revealed)
    const clamped = Math.max(1, Math.min(9, panelsRevealed));
    modeMultiplier = 1.0 + 3.0 * (9 - clamped) / 8;
  } else {
    modeMultiplier = multipliers[mode] ?? 1.0;
  }

  const base = makePoints + modelPoints + (yearBonus ?? 0) + timeBonus;
  const pointsEarned = mode === GameMode.Practice ? 0 : Math.floor(base * modeMultiplier);

  return { makePoints, modelPoints, yearBonus, timeBonus, modeMultiplier, pointsEarned };
}

// Returns a flat bonus awarded when correctly identifying a statistically hard image.
// Thresholds are based on the image's historical incorrect-guess ratio.
export function proLevelBonus(correctGuesses: number, incorrectGuesses: number): number {
  const total = correctGuesses + incorrectGuesses;
  if (total === 0) return 0;
  const incorrectRatio = incorrectGuesses / total;
  if (incorrectRatio > 0.95) return 1000;
  if (incorrectRatio > 0.90) return 500;
  if (incorrectRatio > 0.70) return 300;
  if (incorrectRatio > 0.50) return 100;
  return 0;
}

export const TIME_LIMITS: Record<GameMode, number> = {
  [GameMode.Easy]: 30_000,
  [GameMode.Custom]: 30_000,
  [GameMode.Standard]: 30_000,
  [GameMode.Hardcore]: 30_000,
  [GameMode.TimeAttack]: 15_000,
  [GameMode.Practice]: 30_000,
};
