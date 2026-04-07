import type { Metadata } from "next";
import LeaderboardScreen from "@/app/_components/LeaderboardScreen";

export const metadata: Metadata = { title: "Autoguessr — Leaderboard" };

interface SearchParams {
  mode?: string;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { mode } = await searchParams;

  return <LeaderboardScreen initialMode={mode} />;
}
