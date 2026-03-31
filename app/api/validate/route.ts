import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { fuzzyMatch } from "@/app/lib/game";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { vehicleId, guessedMake, guessedModel, guessedYear } = body as {
    vehicleId: string;
    guessedMake: string;
    guessedModel: string;
    guessedYear?: number;
  };

  if (!vehicleId || !guessedMake || !guessedModel) {
    return Response.json({ error: "vehicleId, guessedMake, and guessedModel are required" }, { status: 400 });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { aliases: { select: { alias: true, aliasType: true } } },
  });

  if (!vehicle) {
    return Response.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const makeAliases = vehicle.aliases
    .filter((a) => a.aliasType === "make" || a.aliasType === "full")
    .map((a) => a.alias);

  const modelAliases = vehicle.aliases
    .filter((a) => a.aliasType === "model" || a.aliasType === "full" || a.aliasType === "nickname")
    .map((a) => a.alias);

  const makeMatch = fuzzyMatch(guessedMake, vehicle.make, makeAliases);
  const modelMatch = fuzzyMatch(guessedModel, vehicle.model, modelAliases);

  const partialCredit = makeMatch && modelMatch ? 2 : makeMatch ? 1 : 0;

  const yearDelta =
    guessedYear !== undefined && guessedYear !== null
      ? Math.abs(guessedYear - vehicle.year)
      : null;

  return Response.json({ makeMatch, modelMatch, partialCredit, yearDelta });
}
