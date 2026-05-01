// Fills missing categories on published vehicles by copying from a sibling vehicle
// (same make+model, any year) that already has categories assigned.

import { prisma } from "@/app/lib/prisma";

export async function POST() {
  const noCats = await prisma.vehicle.findMany({
    where: { categories: { none: {} } },
    select: { id: true, make: true, model: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const vehicle of noCats) {
    const sibling = await prisma.vehicle.findFirst({
      where: { make: vehicle.make, model: vehicle.model, categories: { some: {} } },
      select: { categories: { select: { categoryId: true } } },
    });

    if (!sibling || sibling.categories.length === 0) { skipped++; continue; }

    await prisma.vehicleCategory.createMany({
      data: sibling.categories.map((vc) => ({ vehicleId: vehicle.id, categoryId: vc.categoryId })),
      skipDuplicates: true,
    });
    updated++;
  }

  return Response.json({ updated, skipped });
}
