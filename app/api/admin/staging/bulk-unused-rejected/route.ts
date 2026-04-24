// DELETE handler — removes rejected staging images (and any linked inactive Image records)
// that have never been served in a round, daily challenge, or as car-of-the-day.
import { prisma } from "@/app/lib/prisma";
import { cloudinary } from "@/app/lib/cloudinary";

const CLOUDINARY_BATCH_SIZE = 100;

export async function DELETE() {
  const rejected = await prisma.stagingImage.findMany({
    where: { status: "REJECTED" },
    select: { id: true, cloudinaryPublicId: true },
  });

  if (rejected.length === 0) {
    return Response.json({ deleted: 0 });
  }

  const publicIds = rejected.map((s) => s.cloudinaryPublicId);

  // Find any linked Image records (filename === cloudinaryPublicId)
  const linkedImages = await prisma.image.findMany({
    where: { filename: { in: publicIds } },
    select: {
      id: true,
      filename: true,
      _count: { select: { rounds: true, featuredDays: true } },
    },
  });

  const usedFilenames = new Set<string>();

  // Exclude images referenced in rounds or car-of-the-day
  for (const img of linkedImages) {
    if (img._count.rounds > 0 || img._count.featuredDays > 0) {
      usedFilenames.add(img.filename);
    }
  }

  // Exclude images referenced in any DailyChallenge (String[] — no FK)
  const linkedImageIds = linkedImages.map((img) => img.id);
  if (linkedImageIds.length > 0) {
    const challengesReferencing = await prisma.dailyChallenge.findMany({
      where: { imageIds: { hasSome: linkedImageIds } },
      select: { imageIds: true },
    });
    const referencedIds = new Set(challengesReferencing.flatMap((c) => c.imageIds));
    for (const img of linkedImages) {
      if (referencedIds.has(img.id)) usedFilenames.add(img.filename);
    }
  }

  const safeStaging = rejected.filter((s) => !usedFilenames.has(s.cloudinaryPublicId));
  if (safeStaging.length === 0) {
    return Response.json({ deleted: 0, skipped: rejected.length });
  }

  const safeStagingIds = safeStaging.map((s) => s.id);
  const safePublicIds = safeStaging.map((s) => s.cloudinaryPublicId);
  const safeLinkedImageIds = linkedImages
    .filter((img) => !usedFilenames.has(img.filename) && safePublicIds.includes(img.filename))
    .map((img) => img.id);

  try {
    for (let i = 0; i < safePublicIds.length; i += CLOUDINARY_BATCH_SIZE) {
      const batch = safePublicIds.slice(i, i + CLOUDINARY_BATCH_SIZE);
      await cloudinary.api.delete_resources(batch, { resource_type: "image" });
    }
  } catch (err) {
    console.error("[bulk-unused-rejected] Cloudinary delete failed:", err);
    return Response.json({ error: "Cloudinary delete failed — no records removed" }, { status: 502 });
  }

  if (safeLinkedImageIds.length > 0) {
    await prisma.image.deleteMany({ where: { id: { in: safeLinkedImageIds } } });
  }
  await prisma.stagingImage.deleteMany({ where: { id: { in: safeStagingIds } } });

  console.log(`[bulk-unused-rejected] Deleted ${safeStagingIds.length} staging images from Cloudinary and DB`);

  const skipped = rejected.length - safeStaging.length;
  return Response.json({ deleted: safeStagingIds.length, skipped });
}
