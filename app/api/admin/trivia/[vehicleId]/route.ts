// Admin: read or edit trivia for a specific vehicle.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params;
  const trivia = await prisma.vehicleTrivia.findUnique({ where: { vehicleId } });
  if (!trivia) {
    return Response.json({ error: "No trivia found for this vehicle" }, { status: 404 });
  }
  return Response.json(trivia);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params;
  const body = await request.json() as {
    displayModel?: string | null;
    productionYears?: string;
    engine?: string | null;
    layout?: string | null;
    regionalNames?: string | null;
    funFacts?: string[];
  };

  const existing = await prisma.vehicleTrivia.findUnique({ where: { vehicleId } });
  if (!existing) {
    return Response.json({ error: "No trivia found for this vehicle" }, { status: 404 });
  }

  const updated = await prisma.vehicleTrivia.update({
    where: { vehicleId },
    data: {
      ...(body.displayModel !== undefined && { displayModel: body.displayModel }),
      ...(body.productionYears !== undefined && { productionYears: body.productionYears }),
      ...(body.engine !== undefined && { engine: body.engine }),
      ...(body.layout !== undefined && { layout: body.layout }),
      ...(body.regionalNames !== undefined && { regionalNames: body.regionalNames }),
      ...(body.funFacts !== undefined && { funFacts: body.funFacts }),
      verifiedByAdmin: true,
    },
  });

  return Response.json(updated);
}
