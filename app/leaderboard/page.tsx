import type { Metadata } from "next";
import { cookies } from "next/headers";
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
  const cookieStore = await cookies();
  const username = cookieStore.get("autoguessr_username")?.value ?? "";
  const { mode } = await searchParams;

  return <LeaderboardScreen username={username} initialMode={mode} />;
}
