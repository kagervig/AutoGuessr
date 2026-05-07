import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GameScreen from "../_components/GameScreen";
import DailyChallengeScreen from "../_components/DailyChallengeScreen";

export const metadata: Metadata = { title: "Autoguessr — Play" };

interface Props {
  searchParams: Promise<{ mode?: string; username?: string; filter?: string; cf_token?: string; date?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  if (!params.mode) redirect("/");

  if (params.mode === "daily") {
    return (
      <DailyChallengeScreen
        username={params.username ?? ""}
        date={params.date}
      />
    );
  }

  return (
    <GameScreen
      mode={params.mode}
      username={params.username ?? ""}
      filter={params.filter ?? ""}
      cfToken={params.cf_token}
    />
  );
}
