import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GameScreen from "../_components/GameScreen";

export const metadata: Metadata = { title: "Autoguessr — Play" };

interface Props {
  searchParams: Promise<{ mode?: string; username?: string; filter?: string; cf_token?: string; daily?: string; dailyDate?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const isDaily = params.daily === "true";
  if (!params.mode && !isDaily) redirect("/");
  return (
    <GameScreen
      mode={params.mode ?? (isDaily ? "easy" : "")}
      username={params.username ?? ""}
      filter={params.filter ?? ""}
      cfToken={params.cf_token}
      daily={isDaily}
      dailyDate={params.dailyDate}
    />
  );
}
