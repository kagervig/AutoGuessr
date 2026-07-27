// Daily challenge game page for a specific archived or current date.
import { notFound } from "next/navigation";
import DailyChallengeScreen from "@/app/_components/DailyChallengeScreen";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Props {
  params: Promise<{ date: string }>;
}

export default async function Page({ params }: Props) {
  const { date } = await params;

  if (!DATE_RE.test(date)) notFound();

  const today = new Date().toISOString().slice(0, 10);
  if (date > today) notFound();

  return <DailyChallengeScreen date={date} />;
}
