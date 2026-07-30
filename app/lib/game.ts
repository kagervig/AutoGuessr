import type { Vehicle, CropMethod } from "../generated/prisma/client";
import { GameMode, DAILY_DISCOVERY_BONUS } from "./constants";

/**
 * Calculates the Levenshtein distance between two strings using dynamic programming.
 * Represents the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one string into the other.
 * 
 * @param a - The first string to compare.
 * @param b - The second string to compare.
 * @returns The edit distance between strings a and b.
 */
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

/**
 * Normalises a string for fuzzy comparison by trimming, lowercasing,
 * and removing all non-alphanumeric characters.
 * 
 * @param s - The string to normalise.
 * @returns The normalised string.
 */
export function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Performs a fuzzy match between a user's guess and a target string.
 * A match is successful if the normalised guess:
 * 1. Exactly matches the normalised target.
 * 2. Matches any of the provided aliases.
 * 3. Has a Levenshtein distance of 2 or less from the target.
 * 
 * @param guess - The user's input string.
 * @param target - The correct answer to compare against.
 * @param aliases - Alternative acceptable names for the target.
 * @returns True if the guess is considered a match.
 */
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

/**
 * Randomly shuffles an array using the Fisher-Yates algorithm.
 * 
 * @param arr - The array to shuffle.
 * @returns A new array containing the shuffled elements.
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects a specified number of distractor vehicles for a game round.
 * 
 * Logic flow:
 * 1. If `makeConstraint` is provided, filters the pool exclusively to those makes.
 * 2. Otherwise, applies a priority ladder:
 *    - Up to 1 vehicle from the same make (brand confusion).
 *    - Vehicles from the same category but different make.
 *    - Vehicles from the same era but different make.
 *    - Random fallback vehicles.
 * 3. Deduplicates by make and model to ensure unique answer labels.
 * 
 * @param correct - The vehicle the player must correctly identify.
 * @param pool - The set of candidate vehicles to select distractors from.
 * @param count - The number of distractors to return (default: 3).
 * @param makeConstraint - Optional list of makes to restrict the selection to.
 * @returns An array of distractor vehicles.
 */
export function selectDistractors(
  correct: VehicleForDistractor,
  pool: VehicleForDistractor[],
  count = 3,
  makeConstraint?: string[]
): VehicleForDistractor[] {
  if (makeConstraint?.length) {
    const constrained = shuffle(
      pool.filter(
        (v) =>
          makeConstraint.includes(v.make) &&
          v.id !== correct.id &&
          !(v.make === correct.make && v.model === correct.model)
      )
    );
    const seen = new Set<string>();
    const result: VehicleForDistractor[] = [];
    for (const v of constrained) {
      if (result.length >= count) break;
      const key = `${v.make}|${v.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(v);
      }
    }
    if (result.length < count) {
      console.warn(
        `selectDistractors: only ${result.length}/${count} distractors available within makes [${makeConstraint.join(", ")}]`
      );
    }
    return result;
  }

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

/**
 * Returns a human-readable label for a vehicle.
 * 
 * @param vehicle - The vehicle to label.
 * @returns A string in the format "Make Model".
 */
export function vehicleLabel(vehicle: Pick<Vehicle, "make" | "model">): string {
  return `${vehicle.make} ${vehicle.model}`;
}

/**
 * Generates a Cloudinary image URL for a vehicle photo.
 * Applies different transformation strategies based on the `method`.
 * 
 * @param filename - The filename/public_id in Cloudinary.
 * @param vehicleId - The ID of the vehicle (used as a fallback seed).
 * @param signature - A cryptographic signature for authenticated AI transformations.
 * @param method - The cropping strategy ("standard", "subject", or "conditional").
 * @returns A complete URL to the transformed image.
 */
export function imageUrl(
  filename: string,
  vehicleId: string,
  signature?: string | null,
  method: CropMethod = "standard"
): string {
  if (process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (method === "standard") {
      return `https://res.cloudinary.com/${cloudName}/image/upload/w_850,f_auto,q_auto/${filename}`;
    }

    if (method === "subject") {
      return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,g_auto:subject,ar_16:9,w_850,f_auto,q_auto/${filename}`;
    }

    // Default: conditional
    if (signature) {
      const transformation = "if_ar_lt_1.0/c_fill,ar_16:9,g_auto:coco_v2_car,w_850/if_end/f_auto,q_auto";
      return `https://res.cloudinary.com/${cloudName}/image/upload/${signature}/${transformation}/${filename}`;
    }

    // Fallback if no signature provided for conditional
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_850,f_auto,q_auto/${filename}`;
  }
  // Stable placeholder per vehicle during local development
  return `https://picsum.photos/seed/${vehicleId}/800/600`;
}

/**
 * Calculates the score for a single round based on accuracy, time, and game mode.
 * 
 * @param params - The round results and context.
 * @returns Detailed breakdown of points earned and multipliers applied.
 */
export function scoreRound({
  makeCorrect,
  modelCorrect,
  yearDelta,
  elapsedMs,
  timeLimitMs,
  mode,
  panelsRevealed,
  isDailyDiscovery = false,
  overrideMultiplier,
}: {
  makeCorrect: boolean;
  modelCorrect: boolean;
  yearDelta: number | null;
  elapsedMs: number;
  timeLimitMs: number;
  mode: GameMode;
  panelsRevealed?: number;
  isDailyDiscovery?: boolean;
  overrideMultiplier?: number;
}): {
  makePoints: number;
  modelPoints: number;
  yearBonus: number | null;
  timeBonus: number;
  modeMultiplier: number;
  dailyDiscoveryBonus: number;
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
    [GameMode.Daily]: 1.7,
    [GameMode.Easy]: 1.0,
    [GameMode.Custom]: 1.0,
    [GameMode.Standard]: 1.7,
    [GameMode.TimeAttack]: 2.0,
    [GameMode.Practice]: 0,
    [GameMode.Hardcore]: 1.0,
    [GameMode.Survival]: 1.0,
  };

  let modeMultiplier: number;
  if (overrideMultiplier !== undefined) {
    modeMultiplier = overrideMultiplier;
  } else if (mode === GameMode.Hardcore && panelsRevealed !== undefined) {
    // Scale from 4.0 (1 panel revealed) down to 1.0 (all 9 panels revealed)
    const clamped = Math.max(1, Math.min(9, panelsRevealed));
    modeMultiplier = 1.0 + 3.0 * (9 - clamped) / 8;
  } else {
    modeMultiplier = multipliers[mode] ?? 1.0;
  }

  const base = makePoints + modelPoints + (yearBonus ?? 0) + timeBonus;
  const isCorrect = makeCorrect && modelCorrect;
  const dailyDiscoveryBonus = isDailyDiscovery && isCorrect ? DAILY_DISCOVERY_BONUS : 0;
  const modeScore = mode === GameMode.Practice ? 0 : Math.floor(base * modeMultiplier);
  const pointsEarned = modeScore + dailyDiscoveryBonus;

  return { makePoints, modelPoints, yearBonus, timeBonus, modeMultiplier, dailyDiscoveryBonus, pointsEarned };
}

/**
 * Returns a flat bonus awarded when correctly identifying a statistically difficult image.
 * Difficulty is determined by the historical ratio of incorrect guesses.
 * 
 * @param correctGuesses - Total number of times this image was guessed correctly globally.
 * @param incorrectGuesses - Total number of times this image was guessed incorrectly globally.
 * @returns A flat points bonus (0, 100, 300, 500, or 1000).
 */
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

/**
 * Time limits (in milliseconds) for a single round, keyed by game mode.
 */
export const TIME_LIMITS: Record<GameMode, number> = {
  [GameMode.Daily]: 30_000,
  [GameMode.Easy]: 30_000,
  [GameMode.Custom]: 30_000,
  [GameMode.Standard]: 30_000,
  [GameMode.Hardcore]: 30_000,
  [GameMode.TimeAttack]: 15_000,
  [GameMode.Practice]: 30_000,
  [GameMode.Survival]: 30_000,
};
