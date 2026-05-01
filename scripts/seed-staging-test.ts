// Inserts a few dummy staging image rows for local testing of the auto-update category-copy logic.
// Picks published vehicles that already have categories and creates a PENDING_REVIEW staging row per vehicle.
// Run with: node_modules/.bin/tsx scripts/seed-staging-test.ts

import { prisma } from "../app/lib/prisma.js";

async function main() {
  const vehicles = await prisma.vehicle.findMany({
    where: { categories: { some: {} }, images: { some: {} } },
    select: {
      make: true,
      model: true,
      year: true,
      images: { select: { filename: true }, take: 1 },
      categories: { select: { category: { select: { slug: true } } } },
    },
    take: 5,
  });

  if (vehicles.length === 0) {
    console.log("No published vehicles with categories found — nothing to seed.");
    return;
  }

  let created = 0;
  for (const v of vehicles) {
    const slug = `${v.make}-${v.model}-${v.year}`.replace(/\s+/g, "-");
    const cloudinaryPublicId = `autoguessr/staging/test-${slug}-${Date.now()}`;
    const filename = `staging-test-${slug}.jpg`;
    const existing = await prisma.stagingImage.findFirst({ where: { adminMake: v.make, adminModel: v.model, adminYear: v.year, adminCategories: { isEmpty: true } } });
    if (existing) {
      console.log(`Skipping ${v.year} ${v.make} ${v.model} — test row already exists`);
      continue;
    }
    await prisma.stagingImage.create({
      data: {
        cloudinaryPublicId,
        filename,
        status: "PENDING_REVIEW",
        adminMake: v.make,
        adminModel: v.model,
        adminYear: v.year,
        // adminCategories intentionally left empty — auto-update should copy them
      },
    });
    const catSlugs = v.categories.map((vc) => vc.category.slug).join(", ");
    console.log(`Created staging row: ${v.year} ${v.make} ${v.model} (expected categories: ${catSlugs})`);
    created++;
  }

  console.log(`\nDone — created ${created} staging row(s). Now click "Auto update" in Admin → Staging.`);
}

main().finally(() => prisma.$disconnect());
