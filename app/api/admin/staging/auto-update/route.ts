// Fills in missing region/country for pending staging images using the make origin lookup,
// and updates era from year when both are present and era is not yet set.

import { prisma } from "@/app/lib/prisma";
import { lookupMakeOrigin } from "@/scripts/lib/make-origins";
import { eraFromYear } from "@/app/lib/constants";

export async function POST() {
  const candidates = await prisma.stagingImage.findMany({
    where: {
      status: { notIn: ["PUBLISHED", "REJECTED"] },
      OR: [
        { adminRegionSlug: null },
        { adminCountryOfOrigin: null },
      ],
    },
    select: {
      id: true,
      aiMake: true,
      adminMake: true,
      aiYear: true,
      adminYear: true,
      adminEra: true,
      adminRegionSlug: true,
      adminCountryOfOrigin: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const img of candidates) {
    const make = img.adminMake ?? img.aiMake;
    if (!make) { skipped++; continue; }

    const origin = lookupMakeOrigin(make);
    if (!origin) { skipped++; continue; }

    const year = img.adminYear ?? img.aiYear;
    const era = !img.adminEra && year ? eraFromYear(year) : undefined;

    await prisma.stagingImage.update({
      where: { id: img.id },
      data: {
        adminRegionSlug: img.adminRegionSlug ?? origin.regionSlug,
        adminCountryOfOrigin: img.adminCountryOfOrigin ?? origin.countryOfOrigin,
        ...(era ? { adminEra: era } : {}),
      },
    });
    updated++;
  }

  return Response.json({ updated, skipped });
}
