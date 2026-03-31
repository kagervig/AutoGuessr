export const MODES = [
  {
    id: "easy",
    label: "Easy",
    description: "4 multiple choice answers",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Select make and model from dropdowns",
  },
  {
    id: "hard",
    label: "Hard",
    description: "Type make, model, and year",
  },
  {
    id: "hardcore",
    label: "Hardcore",
    description: "Hard mode with obscured images",
  },
  {
    id: "competitive",
    label: "Competitive",
    description: "Beat the clock as the image slowly reveals",
  },
  {
    id: "practice",
    label: "Practice",
    description: "Drill a category or region — no leaderboard",
  },
] as const;

export type ModeId = (typeof MODES)[number]["id"];

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
