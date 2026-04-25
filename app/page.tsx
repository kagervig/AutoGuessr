import type { Metadata } from "next";
import HomeScreen from "./_components/HomeScreen";
import { CarOfTheDayCardServer } from "./_components/CarOfTheDayCardServer";
import { FEATURE_FLAG_KEY } from "@/app/lib/feature-flags";
import { getFeatureFlagMap } from "@/app/lib/feature-flags-server";

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
  return (
    <HomeScreen
      initialFilterError={filterError}
      flags={flags}
      cotdSlot={flags[FEATURE_FLAG_KEY.CarOfTheDay] ? <CarOfTheDayCardServer /> : null}
    />
  );
}
