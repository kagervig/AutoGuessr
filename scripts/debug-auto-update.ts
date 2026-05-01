// Debug script — traces the category-copy logic from the auto-update route step by step.
// Run with: DATABASE_URL=... node_modules/.bin/tsx scripts/debug-auto-update.ts

import { prisma } from "../app/lib/prisma.js";

async function main() {
  console.log("=== Step 1: staging images with empty adminCategories ===");
  const allPending = await prisma.stagingImage.findMany({
    where: { status: { notIn: ["PUBLISHED", "REJECTED"] } },
    select: {
      id: true,
      adminMake: true,
      aiMake: true,
      adminModel: true,
      aiModel: true,
      adminYear: true,
      aiYear: true,
      adminCategories: true,
      status: true,
    },
  });
  const noCategories = allPending.filter((img) => img.adminCategories.length === 0);
  console.log(`Found ${noCategories.length} staging images with empty adminCategories:`);
  for (const img of noCategories) {
    console.log(`  id=${img.id} make=${img.adminMake ?? img.aiMake} model=${img.adminModel ?? img.aiModel} year=${img.adminYear ?? img.aiYear} status=${img.status}`);
  }

  console.log("\n=== Step 2: vehicle lookup for each ===");
  for (const img of noCategories) {
    const make = img.adminMake ?? img.aiMake;
    const model = img.adminModel ?? img.aiModel;
    const year = img.adminYear ?? img.aiYear;
    if (!make || !model || !year) {
      console.log(`  SKIP ${img.id} — missing make/model/year`);
      continue;
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        make: { equals: make, mode: "insensitive" },
        model: { equals: model, mode: "insensitive" },
        year,
        categories: { some: {} },
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        categories: { select: { category: { select: { slug: true } } } },
      },
    });

    if (!vehicle) {
      // Try without the category filter to see if the vehicle exists at all
      const vehicleNoCat = await prisma.vehicle.findFirst({
        where: {
          make: { equals: make, mode: "insensitive" },
          model: { equals: model, mode: "insensitive" },
          year,
        },
        select: { id: true, make: true, model: true, year: true, categories: { select: { category: { select: { slug: true } } } } },
      });
      if (vehicleNoCat) {
        console.log(`  NO MATCH (no categories) for "${make} ${model} ${year}" — vehicle exists (id=${vehicleNoCat.id}) but has ${vehicleNoCat.categories.length} categories`);
      } else {
        console.log(`  NO MATCH for "${make} ${model} ${year}" — no vehicle found at all`);
      }
    } else {
      const slugs = vehicle.categories.map((vc) => vc.category.slug);
      console.log(`  FOUND vehicle id=${vehicle.id} "${vehicle.make} ${vehicle.model} ${vehicle.year}" categories=[${slugs.join(", ")}]`);
    }
  }
}

main().finally(() => prisma.$disconnect());
