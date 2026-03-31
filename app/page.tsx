import type { Metadata } from "next";
import { cookies } from "next/headers";
import HomeScreen from "./_components/HomeScreen";

export const metadata: Metadata = {
  title: "Autoguessr",
  description: "Can you identify the car?",
};

interface Props {
  searchParams: Promise<{ filterError?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const cookieStore = await cookies();
  const username = cookieStore.get("autoguessr_username")?.value ?? "";
  const { filterError } = await searchParams;
  return <HomeScreen initialUsername={username} initialFilterError={filterError} />;
}
