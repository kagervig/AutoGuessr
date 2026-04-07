import type { Vehicle } from "../generated/prisma/client";

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
// Prefers vehicles from the same era to keep choices plausible.
export function selectDistractors(
  correct: Pick<Vehicle, "id" | "era">,
  pool: Pick<Vehicle, "id" | "era" | "make" | "model">[],
  count = 3
): Pick<Vehicle, "id" | "era" | "make" | "model">[] {
  const others = pool.filter((v) => v.id !== correct.id);
  const sameEra = others.filter((v) => v.era === correct.era);
  const candidates = sameEra.length >= count ? sameEra : others;
  return shuffle(candidates).slice(0, count);
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
}: {
  makeCorrect: boolean;
  modelCorrect: boolean;
  yearDelta: number | null;
  elapsedMs: number;
  timeLimitMs: number;
  mode: string;
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
  const modelPoints = mode === "medium"
    ? (modelCorrect ? 400 : 0)
    : (makeCorrect && modelCorrect ? 400 : 0);

  const yearBonusApplies = ["hard", "hardcore", "competitive"].includes(mode);
  const yearBonus =
    yearBonusApplies && yearDelta !== null
      ? Math.max(0, Math.round(200 * (1 - yearDelta / 5)))
      : null;

  // Time bonus only applies when at least the make is correct
  const timeBonus =
    mode !== "practice" && makeCorrect
      ? Math.max(0, Math.round(100 * (1 - elapsedMs / timeLimitMs)))
      : 0;

  const multipliers: Record<string, number> = {
    easy: 1.0,
    medium: 1.3,
    hard: 1.7,
    hardcore: 2.2,
    competitive: 2.0,
    practice: 0,
  };
  const modeMultiplier = multipliers[mode] ?? 1.0;

  const base = makePoints + modelPoints + (yearBonus ?? 0) + timeBonus;
  const pointsEarned = mode === "practice" ? 0 : Math.floor(base * modeMultiplier);

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

export const TIME_LIMITS: Record<string, number> = {
  easy: 30_000,
  medium: 45_000,
  hard: 60_000,
  hardcore: 90_000,
  competitive: 30_000,
};
