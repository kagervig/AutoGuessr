"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Settings2,
  Keyboard,
  EyeOff,
  Timer,
  Wrench,
  Power,
} from "lucide-react";
import { MODES, COUNTRIES, FALLBACK_CATEGORIES, FALLBACK_REGIONS } from "@/app/lib/constants";
import type { ModeId } from "@/app/lib/constants";
import { Navbar } from "@/app/components/layout/Navbar";
import { ModeCard } from "@/app/components/ui/ModeCard";
import { FilterGroup } from "@/app/components/ui/FilterGroup";
import { cn } from "@/app/lib/utils";

const MODE_ICONS: Record<string, React.ReactNode> = {
  easy: <ShieldCheck className="w-6 h-6" />,
  medium: <Settings2 className="w-6 h-6" />,
  hard: <Keyboard className="w-6 h-6" />,
  hardcore: <EyeOff className="w-6 h-6" />,
  competitive: <Timer className="w-6 h-6" />,
  practice: <Wrench className="w-6 h-6" />,
};

interface FilterOption {
  id: string;
  slug: string;
  label: string;
}

interface DimensionStat {
  dimensionType: string;
  dimensionKey: string;
  correct: number;
  incorrect: number;
  streak: number;
}

interface Props {
  initialUsername: string;
  initialFilterError?: string;
}

export default function HomeScreen({ initialUsername, initialFilterError }: Props) {
  const router = useRouter();

  const [username, setUsername] = useState(initialUsername);
  const [selectedMode, setSelectedMode] = useState<ModeId | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>(FALLBACK_CATEGORIES);
  const [regions, setRegions] = useState<FilterOption[]>(FALLBACK_REGIONS);
  const [filterError, setFilterError] = useState<string | null>(initialFilterError ?? null);
  const [practiceStats, setPracticeStats] = useState<DimensionStat[]>([]);

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories?.length) setCategories(data.categories);
        if (data.regions?.length) setRegions(data.regions);
      })
      .catch(() => {
        // Fallback data already set as initial state
      });
  }, []);

  useEffect(() => {
    if (!username.trim()) {
      setPracticeStats([]);
      return;
    }
    fetch(`/api/practice/stats?username=${encodeURIComponent(username.trim())}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPracticeStats(data);
      })
      .catch(() => {});
  }, [username]);

  function handleStart() {
    if (!selectedMode) return;

    if (username.trim()) {
      document.cookie = `autoguessr_username=${encodeURIComponent(username.trim())}; max-age=${60 * 60 * 24 * 365}; path=/`;
    }

    const filterConfig = {
      categorySlugs: selectedCategories,
      regionSlugs: selectedRegions,
      countries: selectedCountries,
    };

    const params = new URLSearchParams({ mode: selectedMode });
    if (username.trim()) params.set("username", username.trim());
    params.set("filter", encodeURIComponent(JSON.stringify(filterConfig)));

    router.push(`/game?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground bg-noise relative">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-bg.png"
            alt=""
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-7xl lg:text-9xl font-display font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-6 drop-shadow-2xl">
              AUTOGUESSR
            </h1>
            <p className="text-lg sm:text-2xl text-primary font-bold tracking-widest uppercase">
              Identify. Compete. Dominate.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Configuration Form */}
      <section className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* Username */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <label htmlFor="username" className="block text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3 text-center">
            Driver Tag (Optional)
          </label>
          <div className="relative group">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ENTER ALIAS"
              maxLength={32}
              className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-6 py-4 text-center text-xl font-display font-bold uppercase tracking-wider text-white placeholder:text-white/20 focus:outline-none focus:border-primary focus:bg-white/10 transition-all duration-300"
              autoComplete="off"
              spellCheck="false"
            />
            <div className="absolute inset-0 rounded-xl ring-2 ring-primary/0 group-focus-within:ring-primary/20 transition-all duration-300 pointer-events-none" />
          </div>
        </motion.div>

        {/* Mode Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-display font-black tracking-widest text-white uppercase">
              Select Mode
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {MODES.map((mode) => (
              <ModeCard
                key={mode.id}
                id={mode.id}
                title={mode.label}
                description={mode.description}
                icon={MODE_ICONS[mode.id]}
                selected={selectedMode === mode.id}
                featured={mode.id === "easy"}
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  mode.id === "easy" && "md:col-span-2 md:row-span-2",
                  mode.id === "practice" && "md:col-span-3"
                )}
              />
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-display font-black tracking-widest text-white uppercase">
              Vehicle Filters
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
            <span className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Optional</span>
          </div>

          <div className="space-y-4">
            <FilterGroup
              title="CATEGORIES"
              options={categories.map((c) => ({ label: c.label, value: c.slug }))}
              selectedValues={selectedCategories}
              onChange={setSelectedCategories}
            />
            <FilterGroup
              title="REGIONS"
              options={regions.map((r) => ({ label: r.label, value: r.slug }))}
              selectedValues={selectedRegions}
              onChange={setSelectedRegions}
            />
            <FilterGroup
              title="COUNTRIES"
              options={COUNTRIES.map((c) => ({ label: c.label, value: c.code }))}
              selectedValues={selectedCountries}
              onChange={setSelectedCountries}
            />
          </div>
        </motion.div>

        {/* Filter error */}
        {filterError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-800 bg-red-900/20 px-6 py-4 text-sm text-red-400"
          >
            {filterError}
          </motion.p>
        )}

        {/* Practice stats */}
        {practiceStats.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-display font-black tracking-widest text-white uppercase">
                Practice Progress
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
            </div>
            <div className="space-y-2">
              {practiceStats.map((s) => (
                <div
                  key={`${s.dimensionType}-${s.dimensionKey}`}
                  className="flex items-center justify-between glass-panel rounded-xl px-4 py-3"
                >
                  <span className="capitalize text-sm font-medium text-zinc-300">
                    {s.dimensionKey.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">
                    <span className="text-green-400 font-bold">{s.correct}</span>
                    {" / "}
                    {s.correct + s.incorrect}
                    {s.streak > 0 && (
                      <span className="ml-2 text-primary font-bold">{s.streak} streak</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Bottom padding for sticky CTA */}
        <div className="h-32" />
      </section>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 z-50 p-6 glass-panel border-t border-white/10 flex justify-center">
        <button
          onClick={handleStart}
          disabled={!selectedMode}
          className={cn(
            "group relative px-12 py-5 rounded-full font-display font-black text-xl tracking-widest uppercase transition-all duration-500 overflow-hidden flex items-center gap-3",
            selectedMode
              ? "bg-primary text-white shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:shadow-[0_0_60px_rgba(220,38,38,0.6)] hover:scale-105 active:scale-95"
              : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
          )}
        >
          {selectedMode && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          )}
          <Power className={cn("w-6 h-6", selectedMode && "animate-pulse")} />
          <span>Start Engine</span>
        </button>
      </div>
    </div>
  );
}
