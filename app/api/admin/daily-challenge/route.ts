// Admin: list all daily challenges ordered newest first.
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const challenges = await prisma.dailyChallenge.findMany({
    orderBy: { date: "desc" },
  });

  return Response.json({ challenges });
}
