export const ROUNDS_PER_GAME = parseInt(process.env.ROUNDS_PER_GAME ?? "10", 10);

export const DAILY_DISCOVERY_BONUS = 1000;

export const BODY_STYLES = [
  "coupe", "sedan", "convertible", "hatchback", "wagon",
  "suv", "truck", "pickup", "van", "roadster", "targa", "compact", "special_purpose",
] as const;

export const ERAS = ["classic", "retro", "modern", "contemporary"] as const;

export const RARITIES = ["common", "uncommon", "rare", "ultra_rare"] as const;

export const GameMode = {
  Daily: "daily_challenge",
  Easy: "easy",
  Standard: "standard",
  Hardcore: "hardcore",
  TimeAttack: "time_attack",
  Custom: "custom",
  Practice: "practice",
} as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];
export const MODES = [
  {
    id: GameMode.Daily,
    label: "Daily Challenge",
    description: "One challenge, every day. Shared with the world.",
  },
  {
    id: GameMode.Easy,
    label: "Rookie",
    description: "4 multiple choice answers. Perfect for warming up.",
  },
  {
    id: GameMode.Standard,
    label: "Standard",
    description: "Type the exact make, model, and year.",
  },
  {
    id: GameMode.Hardcore,
    label: "Hardcore",
    description: "Standard rules, but images are heavily obscured.",
  },
  {
    id: GameMode.TimeAttack,
    label: "Time Attack",
    description: "Beat the clock as the image slowly reveals itself.",
  },
  {
    id: GameMode.Custom,
    label: "Custom",
    description: "Choose a category, region, or country — then identify cars from that collection.",
  },
  {
    id: GameMode.Practice,
    label: "Garage",
    description: "Drill specific categories or regions. No leaderboard.",
  },
] as const;

export type ModeId = GameMode;

export const COUNTRIES = [
  { code: "US", label: "USA" },
  { code: "JP", label: "Japan" },
  { code: "DE", label: "Germany" },
  { code: "IT", label: "Italy" },
  { code: "FR", label: "France" },
  { code: "GB", label: "UK" },
  { code: "SE", label: "Sweden" },
  { code: "KR", label: "Korea" },
  { code: "AU", label: "Australia" },
] as const;

export function eraFromYear(year: number): string {
  if (year < 1970) return "classic";
  if (year < 2000) return "retro";
  if (year < 2015) return "modern";
  return "contemporary";
}

// Fallback filter data used when the database has not been seeded yet
export const FALLBACK_CATEGORIES = [
  { id: "classic", slug: "classic", label: "Classic" },
  { id: "muscle", slug: "muscle", label: "Muscle" },
  { id: "supercar", slug: "supercar", label: "Supercar" },
  { id: "exotic", slug: "exotic", label: "Exotic" },
  { id: "rare", slug: "rare", label: "Rare" },
  { id: "sports", slug: "sports", label: "Sports" },
  { id: "european", slug: "european", label: "European" },
  { id: "family", slug: "family", label: "Family" },
  { id: "compact", slug: "compact", label: "Compact" },
  { id: "race", slug: "race", label: "Race" },
  { id: "rally", slug: "rally", label: "Rally" },
  { id: "jdm", slug: "jdm", label: "JDM" },
  { id: "luxury", slug: "luxury", label: "Luxury" },
  { id: "electric", slug: "electric", label: "Electric" },
  { id: "concept", slug: "concept", label: "Concept" },
];

export const FALLBACK_REGIONS = [
  { id: "north_america", slug: "north_america", label: "North America" },
  { id: "europe", slug: "europe", label: "Europe" },
  { id: "east_asia", slug: "east_asia", label: "East Asia" },
  { id: "jdm", slug: "jdm", label: "JDM" },
  { id: "south_america", slug: "south_america", label: "South America" },
  { id: "australia", slug: "australia", label: "Australia" },
  { id: "uk", slug: "uk", label: "United Kingdom" },
];
