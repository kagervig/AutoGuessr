// DELETE handler — removes inactive images that have never been served in a round,
// daily challenge, or as car-of-the-day, from both Cloudinary and the database.
import { prisma } from "@/app/lib/prisma";
import { cloudinary } from "@/app/lib/cloudinary";

const CLOUDINARY_BATCH_SIZE = 100;

export async function DELETE() {
  const candidates = await prisma.image.findMany({
    where: { isActive: false },
    select: {
      id: true,
      filename: true,
      _count: { select: { rounds: true, featuredDays: true } },
    },
  });

  const unusedImages = candidates.filter(
    (img) => img._count.rounds === 0 && img._count.featuredDays === 0
  );

  if (unusedImages.length === 0) {
    return Response.json({ deleted: 0 });
  }

  const unusedIds = unusedImages.map((img) => img.id);
  const unusedFilenames = unusedImages.map((img) => img.filename);

  // Exclude any image referenced in a DailyChallenge (stored as a String[] — no FK)
  // We use dynamic access here so this branch can be deployed without the DailyChallenge schema
  let referencedInChallenge = new Set<string>();
  const dcModel = (prisma as unknown as Record<string, unknown>).dailyChallenge as {
    findMany: (args: {
      where: { imageIds: { hasSome: string[] } };
      select: { imageIds: true };
    }) => Promise<{ imageIds: string[] }[]>;
  } | undefined;
  
  if (dcModel) {
    const challengesReferencing = await dcModel.findMany({
      where: { imageIds: { hasSome: unusedIds } },
      select: { imageIds: true },
    });
    referencedInChallenge = new Set(
      challengesReferencing.flatMap((c) => c.imageIds)
    );
  }

  const safeImages = unusedImages.filter((img) => !referencedInChallenge.has(img.id));
  if (safeImages.length === 0) {
    return Response.json({ deleted: 0 });
  }

  const safeIds = safeImages.map((img) => img.id);
  const safeFilenames = safeImages.map((img) => img.filename);

  try {
    for (let i = 0; i < safeFilenames.length; i += CLOUDINARY_BATCH_SIZE) {
      const batch = safeFilenames.slice(i, i + CLOUDINARY_BATCH_SIZE);
      await cloudinary.api.delete_resources(batch, { resource_type: "image" });
    }
  } catch (err) {
    console.error("[bulk-unused-inactive] Cloudinary delete failed:", err);
    return Response.json({ error: "Cloudinary delete failed — no records removed" }, { status: 502 });
  }

  await prisma.image.deleteMany({ where: { id: { in: safeIds } } });
  console.log(`[bulk-unused-inactive] Deleted ${safeIds.length} images from Cloudinary and DB`);

  const skipped = unusedFilenames.length - safeFilenames.length;
  return Response.json({ deleted: safeIds.length, skipped });
}
