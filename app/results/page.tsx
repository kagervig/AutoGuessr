import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import ResultsScreen from "@/app/_components/ResultsScreen";
import { prisma } from "@/app/lib/prisma";
import { calcGrade, APPROX_MAX_PER_ROUND } from "@/app/lib/grade";
import { MODES } from "@/app/lib/constants";

interface SearchParams {
  gameId?: string;
  mode?: string;
  username?: string;
}

const MODE_LABELS: Record<string, string> = Object.fromEntries(
  MODES.map((m) => [m.id, m.label])
);

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { gameId, mode, username } = await searchParams;

  if (!gameId) return { title: "Autoguessr — Results" };

  const session = await prisma.gameSession.findUnique({
    where: { id: gameId },
    select: { finalScore: true, rounds: { select: { id: true } } },
  });

  if (!session) return { title: "Autoguessr — Results" };

  const score = session.finalScore ?? 0;
  const roundCount = session.rounds.length;
  const approxMax = roundCount * APPROX_MAX_PER_ROUND;
  const { grade } = calcGrade(approxMax > 0 ? score / approxMax : 0);
  const modeLabel = MODE_LABELS[mode ?? ""] ?? mode ?? "";

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const ogParams = new URLSearchParams({
    score: String(score),
    grade,
    mode: modeLabel,
  });

  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;
  const title = `Autoguessr — ${grade} · ${score.toLocaleString()} pts`;
  const description = `${username ? `${username} scored ` : ""}${score.toLocaleString()} pts in ${modeLabel} mode. Can you beat it?`;

  return {
    title,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
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
