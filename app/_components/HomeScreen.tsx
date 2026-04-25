"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Settings2,
  Keyboard,
  EyeOff,
  CalendarDays,
  Wrench,
  Power,
  Users,
} from "lucide-react";
import { MODES, COUNTRIES, FALLBACK_CATEGORIES, FALLBACK_REGIONS, GameMode } from "@/app/lib/constants";
import type { ModeId } from "@/app/lib/constants";
import { Navbar } from "@/app/components/layout/Navbar";
import { ModeCard } from "@/app/components/ui/ModeCard";
import { FilterGroup } from "@/app/components/ui/FilterGroup";
import { cn } from "@/app/lib/utils";

const MODE_ICONS: Record<GameMode, React.ReactNode> = {
  [GameMode.Easy]: <ShieldCheck className="w-6 h-6" />,
  [GameMode.Custom]: <Settings2 className="w-6 h-6" />,
  [GameMode.Standard]: <Keyboard className="w-6 h-6" />,
  [GameMode.Hardcore]: <EyeOff className="w-6 h-6" />,
  [GameMode.TimeAttack]: null,
  [GameMode.Practice]: <Wrench className="w-6 h-6" />,
};

interface FilterOption {
  id: string;
  slug: string;
  label: string;
}

interface Props {
  initialFilterError?: string;
  cotdSlot?: React.ReactNode;
}

export default function HomeScreen({ initialFilterError, cotdSlot }: Props) {
  const router = useRouter();

  const [selectedMode, setSelectedMode] = useState<ModeId | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>(FALLBACK_CATEGORIES);
  const [regions, setRegions] = useState<FilterOption[]>(FALLBACK_REGIONS);
  const [countries, setCountries] = useState<{ code: string; label: string }[]>([...COUNTRIES]);
  const [makes, setMakes] = useState<string[]>([]);
  const filterError = initialFilterError ?? null;

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories?.length) setCategories(data.categories);
        if (data.regions?.length) setRegions(data.regions);
        if (data.countries?.length) setCountries(data.countries);
        if (data.makes?.length) setMakes(data.makes);
      })
      .catch(() => {
        // Fallback data already set as initial state
      });
  }, []);

  const isProd = process.env.NODE_ENV === "production";
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).onTurnstileVerified = (token: string) => setTurnstileToken(token);
    return () => {
      delete (window as unknown as Record<string, unknown>).onTurnstileVerified;
    };
  }, []);

  const isCustomMode = selectedMode === GameMode.Custom || selectedMode === GameMode.Practice;
  const hasFilter =
    selectedCategories.length > 0 ||
    selectedRegions.length > 0 ||
    selectedCountries.length > 0 ||
    selectedMakes.length > 0;

  useEffect(() => {
    if (isCustomMode) {
      filterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isCustomMode]);

  function handleStart() {
    if (!selectedMode) return;
    if (isCustomMode && !hasFilter) return;

    const filterConfig = {
      categorySlugs: selectedCategories,
      regionSlugs: selectedRegions,
      countries: selectedCountries,
      makes: selectedMakes,
    };

    const params = new URLSearchParams({ mode: selectedMode });
    params.set("filter", encodeURIComponent(JSON.stringify(filterConfig)));
    if (turnstileToken) params.set("cf_token", turnstileToken);

    router.push(`/game?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground bg-noise relative">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-bg.png"
            alt=""
            fill
            className="object-cover opacity-60 mix-blend-luminosity"
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

        {/* Car of the Day */}
        {cotdSlot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {cotdSlot}
          </motion.div>
        )}

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

          <div className="space-y-4 lg:space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              <ModeCard
                id="daily"
                title="Daily"
                description="One challenge every day. Same cars for everyone. Can you top the leaderboard?"
                icon={<CalendarDays className="w-6 h-6" />}
                selected={false}
                onClick={() => router.push("/daily")}
              />
              {MODES.slice(0, 4).map((mode) => (
                <ModeCard
                  key={mode.id}
                  id={mode.id}
                  title={mode.label}
                  description={mode.description}
                  icon={MODE_ICONS[mode.id]}
                  selected={selectedMode === mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {MODES.slice(4).map((mode) => (
                <ModeCard
                  key={mode.id}
                  id={mode.id}
                  title={mode.label}
                  description={mode.description}
                  icon={MODE_ICONS[mode.id]}
                  selected={selectedMode === mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                />
              ))}
            </div>
            <ModeCard
              id="community"
              title="Community"
              description="Help identify mystery cars. Vote on suggestions from other players."
              icon={<Users className="w-6 h-6" />}
              selected={false}
              onClick={() => router.push("/identify")}
            />
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          ref={filterRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-display font-black tracking-widest text-white uppercase">
              Vehicle Filters
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
            <span className={cn(
              "text-xs font-bold tracking-widest uppercase",
              isCustomMode ? "text-primary" : "text-muted-foreground"
            )}>
              {isCustomMode ? "Required" : "Optional"}
            </span>
          </div>

          {isCustomMode && (
            <p className="text-sm text-muted-foreground mb-6 -mt-4">
              Pick as many filters as you like to test your knowledge in your niche — minimum of one required.
            </p>
          )}

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
              options={countries.map((c) => ({ label: c.label, value: c.code }))}
              selectedValues={selectedCountries}
              onChange={setSelectedCountries}
            />
            {makes.length > 0 && (
              <FilterGroup
                title="MANUFACTURER"
                options={makes.map((m) => ({ label: m, value: m }))}
                selectedValues={selectedMakes}
                onChange={setSelectedMakes}
              />
            )}
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

        {/* Legal links */}
        <div className="flex items-center justify-center gap-6 pt-4 pb-2">
          <a
            href="/terms"
            className="text-xs text-muted-foreground hover:text-white transition-colors tracking-wider"
          >
            Terms of Service
          </a>
          <span className="text-white/10">|</span>
          <a
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-white transition-colors tracking-wider"
          >
            Privacy Policy
          </a>
        </div>

        {/* Bottom padding for sticky CTA */}
        <div className="h-32" />
      </section>

      {/* Sticky Bottom CTA */}
      <AnimatePresence>
      {selectedMode && <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 inset-x-0 z-50 pt-6 px-6 glass-panel border-t border-white/10 flex flex-col items-center gap-3" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        {isProd && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <div className={cn("transition-opacity duration-300", turnstileToken ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
            <div
              className="cf-turnstile"
              data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              data-callback="onTurnstileVerified"
              data-theme="dark"
              data-size="compact"
            />
          </div>
        )}
        <button
          onClick={handleStart}
          disabled={!selectedMode || (isCustomMode && !hasFilter) || (isProd && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)}
          className={cn(
            "group relative px-12 py-5 rounded-full font-display font-black text-xl tracking-widest uppercase transition-all duration-500 overflow-hidden flex items-center gap-3",
            selectedMode && (!isCustomMode || hasFilter) && (!isProd || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || turnstileToken)
              ? "bg-primary text-white shadow-[0_0_40px_rgba(220,38,38,0.4)] hover:shadow-[0_0_60px_rgba(220,38,38,0.6)] hover:scale-105 active:scale-95"
              : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
          )}
        >
          {selectedMode && (!isCustomMode || hasFilter) && (!isProd || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || turnstileToken) && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          )}
          <Power className={cn("w-6 h-6", selectedMode && (!isCustomMode || hasFilter) && (!isProd || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || turnstileToken) && "animate-pulse")} />
          <span>Start Engine</span>
        </button>
      </motion.div>}
      </AnimatePresence>

      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
    </div>
  );
}
