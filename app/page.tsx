import type { Metadata } from "next";
import HomeScreen from "./_components/HomeScreen";
import { CarOfTheDayCardServer } from "./_components/CarOfTheDayCardServer";
import { getFeatureFlagMap } from "@/app/lib/feature-flags-server";
import { FEATURE_FLAG_KEY, GAME_MODE_FLAG } from "@/app/lib/feature-flags";
import { MODES } from "@/app/lib/constants";
import type { ModeId } from "@/app/lib/constants";

export const metadata: Metadata = {
  title: "Autoguessr",
  description: "Can you identify the car?",
};

interface Props {
  searchParams: Promise<{ filterError?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const { filterError } = await searchParams;
  const flags = await getFeatureFlagMap();
  const enabledModes: ModeId[] = MODES
    .map((m) => m.id)
    .filter((id) => flags[GAME_MODE_FLAG[id]]);
  return (
    <HomeScreen
      initialFilterError={filterError}
      enabledModes={enabledModes}
      cotdSlot={flags[FEATURE_FLAG_KEY.CarOfTheDay] ? <CarOfTheDayCardServer /> : null}
    />
  );
}
