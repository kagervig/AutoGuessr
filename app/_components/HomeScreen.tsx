"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MODES, COUNTRIES, FALLBACK_CATEGORIES, FALLBACK_REGIONS } from "@/app/lib/constants";
import type { ModeId } from "@/app/lib/constants";

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

  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

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

  const hasFilter =
    selectedCategories.length > 0 ||
    selectedRegions.length > 0 ||
    selectedCountries.length > 0;

  return (
    <main className="min-h-screen bg-zinc-900 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-8">

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Autoguessr
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Can you identify the car?</p>
        </div>

        {/* Username */}
        <section className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Optional"
            maxLength={32}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-amber-500"
          />
          <p className="text-xs text-zinc-600">
            Enter a username to appear on the leaderboard and track your progress.
          </p>
        </section>

        {/* Mode */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={[
                    "flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700/60",
                  ].join(" ")}
                >
                  <span className="font-semibold">{mode.label}</span>
                  <span className="text-xs text-zinc-500">{mode.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Filter */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Filter{" "}
            <span className="font-normal normal-case text-zinc-600">
              — optional, leave blank for all cars
            </span>
          </p>

          {/* Categories */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.slug);
                return (
                  <button
                    key={cat.slug}
                    onClick={() =>
                      setSelectedCategories(toggle(selectedCategories, cat.slug))
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
                    ].join(" ")}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regions */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Region</p>
            <div className="flex flex-wrap gap-2">
              {regions.map((reg) => {
                const isSelected = selectedRegions.includes(reg.slug);
                return (
                  <button
                    key={reg.slug}
                    onClick={() =>
                      setSelectedRegions(toggle(selectedRegions, reg.slug))
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
                    ].join(" ")}
                  >
                    {reg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Countries */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Country</p>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((country) => {
                const isSelected = selectedCountries.includes(country.code);
                return (
                  <button
                    key={country.code}
                    onClick={() =>
                      setSelectedCountries(toggle(selectedCountries, country.code))
                    }
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
                    ].join(" ")}
                  >
                    {country.label}
                  </button>
                );
              })}
            </div>
          </div>

          {hasFilter && (
            <button
              onClick={() => {
                setSelectedCategories([]);
                setSelectedRegions([]);
                setSelectedCountries([]);
              }}
              className="text-xs text-zinc-600 underline hover:text-zinc-400"
            >
              Clear filters
            </button>
          )}
        </section>

        {/* Error */}
        {filterError && (
          <p className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {filterError}
          </p>
        )}

        {/* Start */}
        <button
          disabled={!selectedMode}
          onClick={handleStart}
          className="w-full rounded-xl bg-amber-500 py-4 text-base font-bold text-zinc-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start Game
        </button>

        {/* Practice skill progress */}
        {practiceStats.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Practice Progress
            </p>
            <div className="space-y-1">
              {practiceStats.map((s) => (
                <div
                  key={`${s.dimensionType}-${s.dimensionKey}`}
                  className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                >
                  <span className="capitalize text-zinc-300">{s.dimensionKey.replace(/_/g, " ")}</span>
                  <span className="text-zinc-500">
                    <span className="text-green-400">{s.correct}</span>
                    {" / "}
                    {s.correct + s.incorrect}
                    {s.streak > 0 && (
                      <span className="ml-2 text-amber-400">{s.streak} streak</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
