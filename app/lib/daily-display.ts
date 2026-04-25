// Display helpers for daily challenges: emoji, percent, and formatting.

import { MAX_DAILY_ROUND_SCORE, ROUNDS_PER_GAME } from "./constants";

export function roundEmoji(score: number): "🟢" | "🟡" | "🔴" {
  if (score >= MAX_DAILY_ROUND_SCORE * 0.8) return "🟢";
  if (score >= MAX_DAILY_ROUND_SCORE * 0.4) return "🟡";
  return "🔴";
}

export function dailyPercent(finalScore: number): number {
  const maxBase = ROUNDS_PER_GAME * MAX_DAILY_ROUND_SCORE;
  const ratio = finalScore / maxBase;
  return Math.min(ratio, 1);
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
