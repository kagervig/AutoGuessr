// Deep-link page for a single archived Car of the Day entry.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { Navbar } from "@/app/components/layout/Navbar";
import { CarOfTheDayCard } from "@/app/_components/CarOfTheDayCard";
import type { CarOfTheDayData } from "@/app/_components/CarOfTheDayCard";

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Car of the Day — ${date} — Autoguessr`,
  };
}

export default async function ArchiveDatePage({ params }: Props) {
  const { date: dateParam } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) notFound();

  const date = new Date(`${dateParam}T00:00:00.000Z`);
  if (isNaN(date.getTime())) notFound();

  const entry = await prisma.featuredVehicleOfDay.findUnique({
    where: { date },
    include: {
      vehicle: { select: { id: true, make: true, model: true, trivia: true } },
      image: { select: { id: true, filename: true } },
    },
  });

  if (!entry) notFound();

  const cookieStore = await cookies();
  const foundDatesRaw = cookieStore.get("cotd_found_dates")?.value;
  let isFound = false;
  if (foundDatesRaw) {
    try {
      const dates: string[] = JSON.parse(decodeURIComponent(foundDatesRaw));
      isFound = dates.includes(dateParam);
    } catch {
      // Malformed cookie — treat as not found
    }
  }

  const data: CarOfTheDayData = {
    date: dateParam,
    vehicle: {
      id: entry.vehicle.id,
      make: entry.vehicle.make,
      model: entry.vehicle.model,
      displayModel: entry.vehicle.trivia?.displayModel ?? null,
    },
    image: {
      id: entry.image.id,
      filename: entry.image.filename,
      url: imageUrl(entry.image.filename, entry.vehicle.id),
    },
    trivia: entry.vehicle.trivia
      ? {
          productionYears: entry.vehicle.trivia.productionYears,
          engine: entry.vehicle.trivia.engine,
          layout: entry.vehicle.trivia.layout,
          regionalNames: entry.vehicle.trivia.regionalNames,
          funFacts: entry.vehicle.trivia.funFacts,
        }
      : null,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 sm:px-6 pt-32 pb-20">
        <Link
          href="/car-of-the-day/archive"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Archive
        </Link>

        <CarOfTheDayCard data={data} isFound={isFound} />
      </main>
    </div>
  );
}
