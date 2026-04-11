import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const categories = [
  { slug: "classic", label: "Classic" },
  { slug: "muscle", label: "Muscle" },
  { slug: "supercar", label: "Supercar" },
  { slug: "exotic", label: "Exotic" },
  { slug: "rare", label: "Rare" },
  { slug: "sports", label: "Sports" },
  { slug: "european", label: "European" },
  { slug: "family", label: "Family" },
  { slug: "compact", label: "Compact" },
  { slug: "race", label: "Race" },
  { slug: "rally", label: "Rally" },
  { slug: "jdm", label: "JDM" },
  { slug: "luxury", label: "Luxury" },
  { slug: "electric", label: "Electric" },
  { slug: "concept", label: "Concept" },
];

const regions = [
  { slug: "north_america", label: "North America" },
  { slug: "europe", label: "Europe" },
  { slug: "east_asia", label: "East Asia" },
  { slug: "south_asia", label: "South Asia" },
  { slug: "jdm", label: "JDM" },
  { slug: "south_america", label: "South America" },
  { slug: "australia", label: "Australia" },
  { slug: "nz_aus", label: "NZ / Australia" },
  { slug: "africa", label: "Africa" },
  { slug: "uk", label: "United Kingdom" },
];

// Sample vehicles: make, model, year, trim, country, region slug, bodyStyle, era, rarity, category slugs
const vehicles = [
  // North America — Muscle / Classic
  {
    make: "Ford", model: "Mustang", year: 1969, trim: "Mach 1",
    country: "US", region: "north_america", bodyStyle: "coupe" as const,
    era: "classic" as const, rarity: "uncommon" as const,
    categories: ["muscle", "classic"],
    aliases: [{ alias: "Mustang Mach 1", aliasType: "full" as const }],
  },
  {
    make: "Chevrolet", model: "Camaro", year: 1969, trim: "SS 396",
    country: "US", region: "north_america", bodyStyle: "coupe" as const,
    era: "classic" as const, rarity: "uncommon" as const,
    categories: ["muscle", "classic"],
    aliases: [
      { alias: "Chevy Camaro", aliasType: "full" as const },
      { alias: "Chevy", aliasType: "make" as const },
    ],
  },
  {
    make: "Dodge", model: "Challenger", year: 1970, trim: "R/T",
    country: "US", region: "north_america", bodyStyle: "coupe" as const,
    era: "classic" as const, rarity: "uncommon" as const,
    categories: ["muscle", "classic"],
    aliases: [],
  },
  {
    make: "Ford", model: "GT40", year: 1966, trim: "Mk II",
    country: "US", region: "north_america", bodyStyle: "coupe" as const,
    era: "classic" as const, rarity: "rare" as const,
    categories: ["race", "exotic", "classic"],
    aliases: [],
  },
  {
    make: "Chevrolet", model: "Corvette", year: 1963, trim: "Sting Ray",
    country: "US", region: "north_america", bodyStyle: "coupe" as const,
    era: "classic" as const, rarity: "uncommon" as const,
    categories: ["sports", "classic"],
    aliases: [{ alias: "Chevy Corvette", aliasType: "full" as const }],
  },

  // Europe — Supercar / Sports / Classic
  {
    make: "Ferrari", model: "458 Italia", year: 2009, trim: null,
    country: "IT", region: "europe", bodyStyle: "coupe" as const,
    era: "modern" as const, rarity: "rare" as const,
    categories: ["supercar", "european"],
    aliases: [{ alias: "458", aliasType: "model" as const }],
  },
  {
    make: "Lamborghini", model: "Aventador", year: 2011, trim: "LP 700-4",
    country: "IT", region: "europe", bodyStyle: "coupe" as const,
    era: "modern" as const, rarity: "ultra_rare" as const,
    categories: ["supercar", "exotic", "european"],
    aliases: [{ alias: "Lambo", aliasType: "make" as const }],
  },
  {
    make: "Porsche", model: "911", year: 2019, trim: "GT3",
    country: "DE", region: "europe", bodyStyle: "coupe" as const,
    era: "contemporary" as const, rarity: "uncommon" as const,
    categories: ["sports", "race", "european"],
    aliases: [{ alias: "911 GT3", aliasType: "full" as const }],
  },
  {
    make: "McLaren", model: "F1", year: 1993, trim: null,
    country: "GB", region: "uk", bodyStyle: "coupe" as const,
    era: "retro" as const, rarity: "ultra_rare" as const,
    categories: ["supercar", "exotic"],
    aliases: [],
  },
  {
    make: "Aston Martin", model: "DB5", year: 1963, trim: null,
    country: "GB", region: "uk", bodyStyle: "coupe" as const,
    era: "classic" as const, rarity: "rare" as const,
    categories: ["classic", "luxury", "european"],
    aliases: [],
  },
  {
    make: "Bugatti", model: "Veyron", year: 2005, trim: "16.4",
    country: "FR", region: "europe", bodyStyle: "coupe" as const,
    era: "modern" as const, rarity: "ultra_rare" as const,
    categories: ["supercar", "exotic", "european"],
    aliases: [],
  },
  {
    make: "BMW", model: "M3", year: 1986, trim: "E30",
    country: "DE", region: "europe", bodyStyle: "sedan" as const,
    era: "retro" as const, rarity: "uncommon" as const,
    categories: ["sports", "european"],
    aliases: [{ alias: "E30 M3", aliasType: "full" as const }],
  },
  {
    make: "Jaguar", model: "E-Type", year: 1961, trim: "Series 1",
    country: "GB", region: "uk", bodyStyle: "roadster" as const,
    era: "classic" as const, rarity: "uncommon" as const,
    categories: ["classic", "european"],
    aliases: [{ alias: "XKE", aliasType: "model" as const }],
  },

  // JDM
  {
    make: "Toyota", model: "Supra", year: 1993, trim: "MK4 RZ",
    country: "JP", region: "jdm", bodyStyle: "coupe" as const,
    era: "retro" as const, rarity: "uncommon" as const,
    categories: ["sports", "jdm"],
    aliases: [{ alias: "MK4 Supra", aliasType: "full" as const }],
  },
  {
    make: "Nissan", model: "Skyline GT-R", year: 1999, trim: "R34",
    country: "JP", region: "jdm", bodyStyle: "coupe" as const,
    era: "retro" as const, rarity: "rare" as const,
    categories: ["sports", "jdm"],
    aliases: [
      { alias: "GT-R R34", aliasType: "full" as const },
      { alias: "Godzilla", aliasType: "nickname" as const },
    ],
  },
  {
    make: "Honda", model: "NSX", year: 1990, trim: null,
    country: "JP", region: "jdm", bodyStyle: "coupe" as const,
    era: "retro" as const, rarity: "uncommon" as const,
    categories: ["sports", "jdm"],
    aliases: [{ alias: "Acura NSX", aliasType: "full" as const }],
  },
  {
    make: "Mazda", model: "RX-7", year: 1992, trim: "FD",
    country: "JP", region: "jdm", bodyStyle: "coupe" as const,
    era: "retro" as const, rarity: "uncommon" as const,
    categories: ["sports", "jdm"],
    aliases: [{ alias: "FD RX-7", aliasType: "full" as const }],
  },
  {
    make: "Mitsubishi", model: "Lancer Evolution", year: 1999, trim: "VI",
    country: "JP", region: "jdm", bodyStyle: "sedan" as const,
    era: "retro" as const, rarity: "uncommon" as const,
    categories: ["sports", "rally", "jdm"],
    aliases: [
      { alias: "Evo VI", aliasType: "full" as const },
      { alias: "Evo", aliasType: "nickname" as const },
    ],
  },

  // Australia
  {
    make: "Ford", model: "Falcon GT", year: 1971, trim: "HO Phase III",
    country: "AU", region: "australia", bodyStyle: "sedan" as const,
    era: "classic" as const, rarity: "rare" as const,
    categories: ["muscle", "classic"],
    aliases: [{ alias: "GTHO", aliasType: "nickname" as const }],
  },
  {
    make: "Holden", model: "Monaro", year: 1969, trim: "GTS 350",
    country: "AU", region: "australia", bodyStyle: "coupe" as const,
    era: "classic" as const, rarity: "rare" as const,
    categories: ["muscle", "classic"],
    aliases: [],
  },
];

// Dev-only staging fixtures covering every admin workflow:
//   - PENDING_REVIEW with AI data only (requires admin to fill fields before publishing)
//   - PENDING_REVIEW with partial admin data already filled
//   - READY with all required fields (can be published immediately)
//   - PUBLISHED with a linked Image record (test reject → image deactivated)
//   - REJECTED (test reactivating status back to PENDING_REVIEW)
//
// cloudinaryPublicId is a fake placeholder; imageUrl() falls back to picsum.photos
// when CLOUDINARY_CLOUD_NAME is unset, so images render in the local admin panel.
const stagingFixtures = [
  {
    cloudinaryPublicId: "dev/staging_pending_ai_only",
    filename: "staging_pending_ai_only.jpg",
    status: "PENDING_REVIEW" as const,
    aiMake: "Toyota",
    aiModel: "Supra",
    aiYear: 1993,
    aiBodyStyle: "coupe",
    aiConfidence: 0.91,
  },
  {
    cloudinaryPublicId: "dev/staging_pending_partial_admin",
    filename: "staging_pending_partial_admin.jpg",
    status: "PENDING_REVIEW" as const,
    aiMake: "Porsche",
    aiModel: "911",
    aiYear: 2019,
    aiBodyStyle: "coupe",
    aiConfidence: 0.87,
    adminMake: "Porsche",
    adminModel: "911",
    adminYear: 2019,
  },
  {
    cloudinaryPublicId: "dev/staging_ready_mustang",
    filename: "staging_ready_mustang.jpg",
    status: "READY" as const,
    aiMake: "Ford",
    aiModel: "Mustang",
    aiYear: 1969,
    aiBodyStyle: "coupe",
    aiConfidence: 0.95,
    adminMake: "Ford",
    adminModel: "Mustang",
    adminYear: 1969,
    adminBodyStyle: "coupe",
    adminEra: "classic",
    adminRarity: "uncommon",
    adminRegionSlug: "north_america",
    adminCountryOfOrigin: "US",
    adminCategories: ["muscle", "classic"],
    adminIsHardcoreEligible: false,
    adminIsVehicleUnmodified: true,
  },
  {
    cloudinaryPublicId: "dev/staging_ready_ferrari",
    filename: "staging_ready_ferrari.jpg",
    status: "READY" as const,
    aiMake: "Ferrari",
    aiModel: "458 Italia",
    aiYear: 2009,
    aiBodyStyle: "coupe",
    aiConfidence: 0.93,
    adminMake: "Ferrari",
    adminModel: "458 Italia",
    adminYear: 2009,
    adminBodyStyle: "coupe",
    adminEra: "modern",
    adminRarity: "rare",
    adminRegionSlug: "europe",
    adminCountryOfOrigin: "IT",
    adminCategories: ["supercar", "european"],
    adminIsHardcoreEligible: true,
    adminIsVehicleUnmodified: true,
  },
  // PUBLISHED fixture — also creates the linked Vehicle+Image so reject can deactivate it
  {
    cloudinaryPublicId: "dev/staging_published_camaro",
    filename: "staging_published_camaro.jpg",
    status: "PUBLISHED" as const,
    aiMake: "Chevrolet",
    aiModel: "Camaro",
    aiYear: 1969,
    aiBodyStyle: "coupe",
    aiConfidence: 0.89,
    adminMake: "Chevrolet",
    adminModel: "Camaro",
    adminYear: 1969,
    adminBodyStyle: "coupe",
    adminEra: "classic",
    adminRarity: "uncommon",
    adminRegionSlug: "north_america",
    adminCountryOfOrigin: "US",
    adminCategories: ["muscle", "classic"],
    adminIsHardcoreEligible: false,
    adminIsVehicleUnmodified: true,
    reviewedAt: new Date(),
  },
  {
    cloudinaryPublicId: "dev/staging_rejected_lambo",
    filename: "staging_rejected_lambo.jpg",
    status: "REJECTED" as const,
    aiMake: "Lamborghini",
    aiModel: "Aventador",
    aiYear: 2011,
    aiBodyStyle: "coupe",
    aiConfidence: 0.78,
    adminMake: "Lamborghini",
    adminModel: "Aventador",
    adminYear: 2011,
    adminBodyStyle: "coupe",
    adminEra: "modern",
    adminRarity: "ultra_rare",
    adminRegionSlug: "europe",
    adminCountryOfOrigin: "IT",
    adminCategories: ["supercar", "exotic", "european"],
    adminIsHardcoreEligible: true,
    adminIsVehicleUnmodified: true,
    reviewedAt: new Date(),
  },
];

async function main() {
  console.log("Seeding categories...");
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
  }

  console.log("Seeding regions...");
  const regionMap = new Map<string, string>();
  for (const reg of regions) {
    const record = await prisma.region.upsert({
      where: { slug: reg.slug },
      update: {},
      create: reg,
    });
    regionMap.set(reg.slug, record.id);
  }

  console.log("Seeding feature flags...");
  await prisma.featureFlag.upsert({
    where: { key: "medium_year_guessing" },
    update: {},
    create: {
      key: "medium_year_guessing",
      enabled: false,
      description: "Adds year input to medium mode, enabling year_bonus scoring",
    },
  });

  console.log("Seeding vehicles...");
  for (const v of vehicles) {
    const regionId = regionMap.get(v.region);
    if (!regionId) throw new Error(`Unknown region slug: ${v.region}`);

    let vehicle = await prisma.vehicle.findFirst({
      where: { make: v.make, model: v.model, year: v.year, trim: v.trim ?? null },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          make: v.make,
          model: v.model,
          year: v.year,
          trim: v.trim,
          countryOfOrigin: v.country,
          regionId,
          bodyStyle: v.bodyStyle,
          era: v.era,
          rarity: v.rarity,
        },
      });
    }

    // Categories
    for (const slug of v.categories) {
      const categoryId = categoryMap.get(slug);
      if (!categoryId) throw new Error(`Unknown category slug: ${slug}`);
      await prisma.vehicleCategory.upsert({
        where: { vehicleId_categoryId: { vehicleId: vehicle.id, categoryId } },
        update: {},
        create: { vehicleId: vehicle.id, categoryId },
      });
    }

    // Aliases
    for (const a of v.aliases) {
      const existing = await prisma.vehicleAlias.findFirst({
        where: { vehicleId: vehicle.id, alias: a.alias },
      });
      if (!existing) {
        await prisma.vehicleAlias.create({
          data: { vehicleId: vehicle.id, alias: a.alias, aliasType: a.aliasType },
        });
      }
    }

    // Placeholder image + stats
    const filename = `placeholder_${v.make.toLowerCase().replace(/\s/g, "_")}_${v.model.toLowerCase().replace(/[\s-]/g, "_")}_${v.year}.jpg`;
    const existingImage = await prisma.image.findFirst({ where: { filename } });
    if (!existingImage) {
      const image = await prisma.image.create({
        data: {
          vehicleId: vehicle.id,
          filename,
          isActive: true,
          isHardcoreEligible: false,
        },
      });
      await prisma.imageStats.create({
        data: { imageId: image.id },
      });
    }

    console.log(`  ✓ ${v.year} ${v.make} ${v.model}`);
  }

  console.log("Seeding staging fixtures...");
  let stagingCount = 0;
  for (const fixture of stagingFixtures) {
    const existing = await prisma.stagingImage.findUnique({
      where: { cloudinaryPublicId: fixture.cloudinaryPublicId },
    });
    if (existing) continue;

    await prisma.stagingImage.create({ data: fixture });

    // PUBLISHED fixtures need a linked Vehicle+Image so that rejecting the staging
    // image can deactivate the correct Image record (matched by filename = cloudinaryPublicId).
    if (fixture.status === "PUBLISHED" && fixture.adminMake && fixture.adminModel && fixture.adminYear && fixture.adminRegionSlug) {
      const region = await prisma.region.findUnique({ where: { slug: fixture.adminRegionSlug } });
      if (region) {
        const vehicle = await prisma.vehicle.create({
          data: {
            make: fixture.adminMake,
            model: fixture.adminModel,
            year: fixture.adminYear,
            countryOfOrigin: fixture.adminCountryOfOrigin ?? "US",
            regionId: region.id,
            bodyStyle: (fixture.adminBodyStyle as never) ?? "coupe",
            era: (fixture.adminEra as never) ?? "classic",
            rarity: (fixture.adminRarity as never) ?? "common",
          },
        });
        const image = await prisma.image.create({
          data: {
            vehicleId: vehicle.id,
            filename: fixture.cloudinaryPublicId,
            isActive: true,
            isHardcoreEligible: fixture.adminIsHardcoreEligible ?? false,
          },
        });
        await prisma.imageStats.create({ data: { imageId: image.id } });
      }
    }

    console.log(`  ✓ ${fixture.status} — ${fixture.cloudinaryPublicId}`);
    stagingCount++;
  }

  console.log("\nDone. Seeded:");
  console.log(`  ${categories.length} categories`);
  console.log(`  ${regions.length} regions`);
  console.log(`  1 feature flag`);
  console.log(`  ${vehicles.length} vehicles with placeholder images`);
  console.log(`  ${stagingCount} staging fixtures`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
