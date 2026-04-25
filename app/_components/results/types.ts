export interface GuessData {
  isCorrect: boolean;
  makePoints: number;
  modelPoints: number;
  yearBonus: number | null;
  yearDelta: number | null;
  timeBonus: number;
  modeMultiplier: number;
  proBonus: number;
  pointsEarned: number;
  rawInput: string;
  guessedVehicle: { make: string; model: string; year: number } | null;
}

export interface RoundData {
  sequenceNumber: number;
  imageUrl: string;
  image: {
    filename: string;
    vehicleId: string;
    vehicle: {
      make: string;
      model: string;
      year: number;
      countryOfOrigin: string;
    };
  };
  guess: GuessData | null;
}

export interface DailyLeaderboardEntry {
  id: string;
  initials: string;
  finalScore: number;
}

export interface SessionData {
  id: string;
  mode: string;
  finalScore: number | null;
  rounds: RoundData[];
  personalBest: number | null;
  dailyChallengeId: string | null;
  dailyChallengeNumber: number | null;
  dailyRank: number | null;
  dailyLeaderboard: DailyLeaderboardEntry[];
}
