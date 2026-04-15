import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { GameMode } from "@/app/lib/constants";

export const metadata: Metadata = { title: "Autoguessr — How Scoring Works" };

const YEAR_ROWS = [
  { accuracy: "Exact", points: "+200" },
  { accuracy: "1 off", points: "+160" },
  { accuracy: "2 off", points: "+120" },
  { accuracy: "3 off",  points: "+80" },
  { accuracy: "4 off",  points: "+40" },
  { accuracy: "5+ off", points: "+0" },
];

const MODE_ROWS = [
  { id: GameMode.Easy,        label: "Easy",        multiplier: "×1.0",              limit: "30s" },
  { id: GameMode.Custom,      label: "Custom",      multiplier: "×1.0",              limit: "45s" },
  { id: GameMode.Standard,    label: "Standard",    multiplier: "×1.7",              limit: "60s" },
  { id: GameMode.TimeAttack,  label: "Time Attack", multiplier: "×2.0",              limit: "30s" },
  { id: GameMode.Hardcore,    label: "Hardcore",    multiplier: "×1.0–×4.0",         limit: "90s" },
  { id: GameMode.Practice,    label: "Practice",    multiplier: "×0 (always 0 pts)", limit: "60s" },
];

interface SearchParams {
  mode?: string;
}

export default async function ScoringPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { mode } = await searchParams;

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Garage
        </Link>

        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-widest uppercase font-display">
            Want a higher score?
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Here&apos;s how it works. Every round, your base points are calculated first — then
            multiplied by your difficulty level. The harder the game, the more points you can earn.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-6">
          <h2 className="text-xl font-black tracking-wider uppercase border-b border-white/10 pb-3">
            Building your base score
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Nail the make{" "}
            <span className="text-white font-bold">(+300)</span> and model{" "}
            <span className="text-white font-bold">(+400)</span> and you&apos;re already at 700.
            Three bonuses stack on top.
          </p>

          {/* Year bonus */}
          <div className="glass-panel rounded-2xl p-6 space-y-4 border border-white/10">
            <div>
              <h3 className="font-black tracking-widest uppercase text-sm text-primary mb-1">
                Year Bonus
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                In Standard, Hardcore, and Time Attack, guessing the year within 5 years earns bonus
                points. Exact year nets you +200; being off by one still gets you +160. Five or more
                off? Nothing. Commit to a year.
              </p>
            </div>
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase tracking-widest border-b border-white/10">
                  <th className="text-left pb-2">Accuracy</th>
                  <th className="text-right pb-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {YEAR_ROWS.map((row) => (
                  <tr key={row.accuracy} className="border-b border-white/5 last:border-0">
                    <td className="py-2 text-white/80">{row.accuracy}</td>
                    <td className={cn(
                      "py-2 text-right font-bold",
                      row.points === "+0" ? "text-muted-foreground" : "text-green-400"
                    )}>
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Speed bonus */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-2">
            <h3 className="font-black tracking-widest uppercase text-sm text-primary">
              Speed Bonus
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Get the make right and answer fast. Up to{" "}
              <span className="text-white font-bold">+100</span> is on the table in every mode
              except Practice — the quicker you lock in, the more you keep.
            </p>
          </div>

          {/* Rare find */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-2">
            <h3 className="font-black tracking-widest uppercase text-sm text-yellow-400">
              Rare Find Bonus
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Some images are genuinely obscure. When you identify one correctly, a bonus between{" "}
              <span className="text-white font-bold">+100 and +1000</span> lands automatically.
              You&apos;ll know it when you see it.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-black tracking-wider uppercase border-b border-white/10 pb-3">
            Then your mode multiplies everything
          </h2>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Time Attack gives you the highest fixed multiplier — but 30 seconds goes fast.
            Hardcore&apos;s multiplier scales with difficulty: the fewer panels you reveal before
            guessing, the higher the ceiling (up to ×4.0). Practice doesn&apos;t count for score.
            Use it to sharpen your eye, not pad your stats.
          </p>

          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-widest border-b border-white/10">
                <th className="text-left pb-2">Mode</th>
                <th className="text-center pb-2">Multiplier</th>
                <th className="text-right pb-2">Time Limit</th>
              </tr>
            </thead>
            <tbody>
              {MODE_ROWS.map((row) => {
                const isActive = mode === row.id;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-white/5 last:border-0 transition-colors",
                      isActive && "bg-primary/10"
                    )}
                  >
                    <td className={cn("py-2.5 pl-2 rounded-l font-bold", isActive ? "text-primary" : "text-white/80")}>
                      {row.label}
                      {isActive && (
                        <span className="ml-2 text-xs text-primary/70 font-normal tracking-widest uppercase">
                          you
                        </span>
                      )}
                    </td>
                    <td className={cn(
                      "py-2.5 text-center",
                      row.id === GameMode.Practice ? "text-muted-foreground" : "text-green-400 font-bold"
                    )}>
                      {row.multiplier}
                    </td>
                    <td className="py-2.5 pr-2 text-right text-white/60 rounded-r">{row.limit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 text-center">
          <p className="text-sm font-mono tracking-widest text-muted-foreground uppercase">
            The short version
          </p>
          <p className="mt-2 text-lg font-black tracking-wide text-white">
            Know your cars. Guess the year. Answer fast. Play Hardcore.
          </p>
        </div>

      </div>
    </main>
  );
}
