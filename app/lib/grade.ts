export function calcGrade(pct: number): { grade: string; color: string } {
  if (pct >= 0.9) return { grade: "S", color: "text-yellow-400" };
  if (pct >= 0.75) return { grade: "A", color: "text-green-400" };
  if (pct >= 0.55) return { grade: "B", color: "text-blue-400" };
  if (pct >= 0.35) return { grade: "C", color: "text-muted-foreground" };
  return { grade: "D", color: "text-muted-foreground" };
}

// Hex values for use in contexts where Tailwind classes are unavailable (e.g. ImageResponse)
export const GRADE_HEX: Record<string, string> = {
  S: "#facc15",
  A: "#4ade80",
  B: "#60a5fa",
  C: "#a6a6a6",
  D: "#a6a6a6",
};
