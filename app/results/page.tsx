import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ResultsScreen from "@/app/_components/ResultsScreen";

export const metadata: Metadata = { title: "Autoguessr — Results" };

interface SearchParams {
  sessionId?: string;
  mode?: string;
  username?: string;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { sessionId, mode, username } = await searchParams;
  if (!sessionId || !mode) redirect("/");

  return <ResultsScreen sessionId={sessionId} mode={mode} username={username ?? ""} />;
}
