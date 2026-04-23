// Admin: stub endpoint for triggering Gemini trivia regeneration for a single vehicle.
// Full implementation lives in scripts/generate-trivia.ts (Phase 12).
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { make: true, model: true },
  });

  if (!vehicle) {
    return Response.json({ error: "Vehicle not found" }, { status: 404 });
  }

  return Response.json(
    {
      message: "Trivia regeneration is handled by scripts/generate-trivia.ts. Run: npx tsx scripts/generate-trivia.ts --regenerate " + vehicleId,
      vehicleId,
      make: vehicle.make,
      model: vehicle.model,
    },
    { status: 202 }
  );
}
