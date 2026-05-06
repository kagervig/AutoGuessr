import type { NextRequest } from "next/server";
import type { StagingStatus } from "../../../generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { computeAgreements, CONFIRMATION_THRESHOLD } from "@/app/lib/staging";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get("status") as StagingStatus | null;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const make = searchParams.get("make");
  const model = searchParams.get("model");

  const where: any = {};
  if (statusParam && statusParam !== "ALL") {
    where.status = statusParam;
  }
  if (make) {
    where.OR = [
      { adminMake: make },
      { confirmedMake: make },
      { aiMake: make }
    ];
  }
  if (model) {
    // If we have a make filter, model usually belongs to it. 
    // This is a bit complex due to the 3-tier structure.
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { adminModel: model },
        { confirmedModel: model },
        { aiModel: model }
      ]
    });
  }

  const [images, totalCount, countRows] = await Promise.all([
    prisma.stagingImage.findMany({
      where,
      include: { suggestions: true },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stagingImage.count({ where }),
    prisma.stagingImage.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts = Object.fromEntries(
    countRows.map((r) => [r.status, r._count._all])
  ) as Partial<Record<StagingStatus, number>>;

  const items = images.map((img) => {
    const agreements = computeAgreements(img.suggestions);
    return {
      id: img.id,
      imageUrl: imageUrl(img.cloudinaryPublicId, img.id),
      filename: img.filename,
      status: img.status,
      createdAt: img.createdAt,
      ai: {
        make: img.aiMake,
        model: img.aiModel,
        year: img.aiYear,
        bodyStyle: img.aiBodyStyle,
        confidence: img.aiConfidence,
      },
      admin: {
        make: img.adminMake,
        model: img.adminModel,
        year: img.adminYear,
        trim: img.adminTrim,
        bodyStyle: img.adminBodyStyle,
        rarity: img.adminRarity,
        era: img.adminEra,
        regionSlug: img.adminRegionSlug,
        countryOfOrigin: img.adminCountryOfOrigin,
        categories: img.adminCategories,
        isHardcoreEligible: img.adminIsHardcoreEligible,
        notes: img.adminNotes,
        copyrightHolder: img.adminCopyrightHolder,
        isCropped: img.adminIsCropped,
        isLogoVisible: img.adminIsLogoVisible,
        isModelNameVisible: img.adminIsModelNameVisible,
        hasMultipleVehicles: img.adminHasMultipleVehicles,
        isFaceVisible: img.adminIsFaceVisible,
        isVehicleUnmodified: img.adminIsVehicleUnmodified,
      },
      confirmed: {
        make: img.confirmedMake,
        model: img.confirmedModel,
        year: img.confirmedYear,
        trim: img.confirmedTrim,
      },
      agreements: {
        make: { ...agreements.make, confirmed: (agreements.make?.count ?? 0) >= CONFIRMATION_THRESHOLD },
        model: { ...agreements.model, confirmed: (agreements.model?.count ?? 0) >= CONFIRMATION_THRESHOLD },
        year: { ...agreements.year, confirmed: (agreements.year?.count ?? 0) >= CONFIRMATION_THRESHOLD },
        trim: { ...agreements.trim, confirmed: (agreements.trim?.count ?? 0) >= CONFIRMATION_THRESHOLD },
      },
      suggestionCount: img.suggestions.length,
    };
  });

  return Response.json({
    items,
    counts,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit)
  });
}
