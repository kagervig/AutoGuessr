// Shared types for the daily challenge admin panel and its sub-components.

export interface ChallengeImage {
  id: string;
  url: string | null;
  make: string | null;
  model: string | null;
}

export interface DailyChallenge {
  id: number;
  date: string;
  imageIds: string[];
  images: ChallengeImage[];
  isPublished: boolean;
  curatedBy: string | null;
  generatedAt: string;
}
