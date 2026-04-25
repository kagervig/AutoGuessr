import type { Metadata } from "next";
import HomeScreen from "./_components/HomeScreen";
import { CarOfTheDayCardServer } from "./_components/CarOfTheDayCardServer";

export const metadata: Metadata = {
  title: "Autoguessr",
  description: "Can you identify the car?",
};

interface Props {
  searchParams: Promise<{ filterError?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const { filterError } = await searchParams;
  return (
    <HomeScreen
      initialFilterError={filterError}
      cotdSlot={<CarOfTheDayCardServer />}
    />
  );
}
