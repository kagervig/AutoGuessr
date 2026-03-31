import type { Metadata } from "next";
import { redirect } from "next/navigation";
import GameScreen from "../_components/GameScreen";

export const metadata: Metadata = { title: "Autoguessr — Play" };

interface Props {
  searchParams: Promise<{ mode?: string; username?: string; filter?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  if (!params.mode) redirect("/");
  return (
    <GameScreen
      mode={params.mode}
      username={params.username ?? ""}
      filter={params.filter ?? ""}
    />
  );
}
