import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ResultsScreen from "@/app/_components/ResultsScreen";

export const metadata: Metadata = { title: "Autoguessr — Results" };

interface SearchParams {
  gameId?: string;
  mode?: string;
  username?: string;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { gameId, mode, username } = await searchParams;
  if (!gameId || !mode) redirect("/");

  const cookieStore = await cookies();
  const hasToken = cookieStore.has(`st_${gameId}`);

  return <ResultsScreen gameId={gameId} hasToken={hasToken} mode={mode} username={username ?? ""} />;
}
