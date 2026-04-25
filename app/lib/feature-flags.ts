// Feature flag registry — pure constants/types safe to import from client and server.
// Server-side helpers (DB access) live in feature-flags-server.ts.
import { GameMode } from "@/app/lib/constants";

export const FEATURE_FLAG_KEY = {
  ModeEasy: "mode_easy",
  ModeStandard: "mode_standard",
  ModeHardcore: "mode_hardcore",
  ModeTimeAttack: "mode_time_attack",
  ModeCustom: "mode_custom",
  ModePractice: "mode_practice",
  DailyChallenge: "daily_challenge",
  CarOfTheDay: "car_of_the_day",
} as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEY)[keyof typeof FEATURE_FLAG_KEY];

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  label: string;
  description: string;
  group: "Game Modes" | "Daily Features";
}

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  { key: FEATURE_FLAG_KEY.ModeEasy,       label: "Rookie",       description: "Multiple-choice game mode.",                 group: "Game Modes" },
  { key: FEATURE_FLAG_KEY.ModeStandard,   label: "Standard",     description: "Type the make, model, and year.",             group: "Game Modes" },
  { key: FEATURE_FLAG_KEY.ModeHardcore,   label: "Hardcore",     description: "Standard rules with heavily obscured images.", group: "Game Modes" },
  { key: FEATURE_FLAG_KEY.ModeTimeAttack, label: "Time Attack",  description: "Beat the clock as the image reveals.",         group: "Game Modes" },
  { key: FEATURE_FLAG_KEY.ModeCustom,     label: "Custom",       description: "User-filtered car collections.",               group: "Game Modes" },
  { key: FEATURE_FLAG_KEY.ModePractice,   label: "Garage",       description: "Practice mode with no leaderboard.",           group: "Game Modes" },
  { key: FEATURE_FLAG_KEY.DailyChallenge, label: "Daily Challenge", description: "One challenge every day.",                  group: "Daily Features" },
  { key: FEATURE_FLAG_KEY.CarOfTheDay,    label: "Car of the Day",  description: "Identify the featured car for a bonus.",     group: "Daily Features" },
];

export const GAME_MODE_FLAG: Record<GameMode, FeatureFlagKey> = {
  [GameMode.Easy]:       FEATURE_FLAG_KEY.ModeEasy,
  [GameMode.Standard]:   FEATURE_FLAG_KEY.ModeStandard,
  [GameMode.Hardcore]:   FEATURE_FLAG_KEY.ModeHardcore,
  [GameMode.TimeAttack]: FEATURE_FLAG_KEY.ModeTimeAttack,
  [GameMode.Custom]:     FEATURE_FLAG_KEY.ModeCustom,
  [GameMode.Practice]:   FEATURE_FLAG_KEY.ModePractice,
};

export type FeatureFlagMap = Record<FeatureFlagKey, boolean>;

const KNOWN_KEYS = new Set<string>(FEATURE_FLAGS.map((f) => f.key));

export function isKnownFeatureFlagKey(key: string): key is FeatureFlagKey {
  return KNOWN_KEYS.has(key);
}
