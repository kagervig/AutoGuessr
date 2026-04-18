// Finds staging images that are stuck in a non-PUBLISHED status but already have a
// corresponding Image record, and marks them as PUBLISHED to resolve the inconsistency.
// This can occur when a publish transaction partially succeeds and then crashes.

import { prisma } from "@/app/lib/prisma";

export async function POST() {
  const stuck = await prisma.stagingImage.findMany({
    where: { status: { not: "PUBLISHED" } },
    select: { id: true, cloudinaryPublicId: true, status: true },
  });

  if (stuck.length === 0) {
    return Response.json({ fixed: 0 });
  }

  const publicIds = stuck.map((s) => s.cloudinaryPublicId);
  const publishedImages = await prisma.image.findMany({
    where: { filename: { in: publicIds } },
    select: { filename: true },
  });

  const publishedSet = new Set(publishedImages.map((i) => i.filename));
  const toFix = stuck.filter((s) => publishedSet.has(s.cloudinaryPublicId));

  if (toFix.length === 0) {
    return Response.json({ fixed: 0 });
  }

  await prisma.stagingImage.updateMany({
    where: { id: { in: toFix.map((s) => s.id) } },
    data: { status: "PUBLISHED", reviewedAt: new Date() },
  });

  return Response.json({ fixed: toFix.length });
}
