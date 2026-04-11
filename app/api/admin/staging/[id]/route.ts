import type { NextRequest } from "next/server";
import type { StagingStatus } from "../../../../generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { computeAgreements, CONFIRMATION_THRESHOLD } from "@/app/lib/staging";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const {
    make, model, year, trim, bodyStyle,
    rarity, era, regionSlug, countryOfOrigin, categories, isHardcoreEligible,
    notes, copyrightHolder, isCropped, isLogoVisible, isModelNameVisible,
    hasMultipleVehicles, isFaceVisible, isVehicleUnmodified, status,
  } = body;

  const VALID_STATUSES: StagingStatus[] = [
    "PENDING_REVIEW",
    "COMMUNITY_REVIEW",
    "READY",
    "PUBLISHED",
    "REJECTED",
  ];

  if (status && !VALID_STATUSES.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.stagingImage.update({
    where: { id },
    data: {
      ...(make !== undefined && { adminMake: make || null }),
      ...(model !== undefined && { adminModel: model || null }),
      ...(year !== undefined && { adminYear: year ? parseInt(year, 10) : null }),
      ...(trim !== undefined && { adminTrim: trim || null }),
      ...(bodyStyle !== undefined && { adminBodyStyle: bodyStyle || null }),
      ...(rarity !== undefined && { adminRarity: rarity || null }),
      ...(era !== undefined && { adminEra: era || null }),
      ...(regionSlug !== undefined && { adminRegionSlug: regionSlug || null }),
      ...(countryOfOrigin !== undefined && { adminCountryOfOrigin: countryOfOrigin || null }),
      ...(categories !== undefined && { adminCategories: Array.isArray(categories) ? categories : [] }),
      ...(isHardcoreEligible !== undefined && { adminIsHardcoreEligible: Boolean(isHardcoreEligible) }),
      ...(notes !== undefined && { adminNotes: notes || null }),
      ...(copyrightHolder !== undefined && { adminCopyrightHolder: copyrightHolder || null }),
      ...(isCropped !== undefined && { adminIsCropped: Boolean(isCropped) }),
      ...(isLogoVisible !== undefined && { adminIsLogoVisible: Boolean(isLogoVisible) }),
      ...(isModelNameVisible !== undefined && { adminIsModelNameVisible: Boolean(isModelNameVisible) }),
      ...(hasMultipleVehicles !== undefined && { adminHasMultipleVehicles: Boolean(hasMultipleVehicles) }),
      ...(isFaceVisible !== undefined && { adminIsFaceVisible: Boolean(isFaceVisible) }),
      ...(isVehicleUnmodified !== undefined && { adminIsVehicleUnmodified: Boolean(isVehicleUnmodified) }),
      ...(status !== undefined && { status }),
      reviewedAt: new Date(),
    },
    include: { suggestions: true },
  });

  const agreements = computeAgreements(updated.suggestions);

  return Response.json({
    id: updated.id,
    imageUrl: imageUrl(updated.cloudinaryPublicId, updated.id),
    status: updated.status,
    admin: {
      make: updated.adminMake,
      model: updated.adminModel,
      year: updated.adminYear,
      trim: updated.adminTrim,
      bodyStyle: updated.adminBodyStyle,
      rarity: updated.adminRarity,
      era: updated.adminEra,
      regionSlug: updated.adminRegionSlug,
      countryOfOrigin: updated.adminCountryOfOrigin,
      categories: updated.adminCategories,
      isHardcoreEligible: updated.adminIsHardcoreEligible,
      notes: updated.adminNotes,
      copyrightHolder: updated.adminCopyrightHolder,
      isCropped: updated.adminIsCropped,
      isLogoVisible: updated.adminIsLogoVisible,
      isModelNameVisible: updated.adminIsModelNameVisible,
      hasMultipleVehicles: updated.adminHasMultipleVehicles,
      isFaceVisible: updated.adminIsFaceVisible,
      isVehicleUnmodified: updated.adminIsVehicleUnmodified,
    },
    confirmed: {
      make: updated.confirmedMake,
      model: updated.confirmedModel,
      year: updated.confirmedYear,
      trim: updated.confirmedTrim,
    },
    agreements: {
      make: { ...agreements.make, confirmed: (agreements.make?.count ?? 0) >= CONFIRMATION_THRESHOLD },
      model: { ...agreements.model, confirmed: (agreements.model?.count ?? 0) >= CONFIRMATION_THRESHOLD },
      year: { ...agreements.year, confirmed: (agreements.year?.count ?? 0) >= CONFIRMATION_THRESHOLD },
      trim: { ...agreements.trim, confirmed: (agreements.trim?.count ?? 0) >= CONFIRMATION_THRESHOLD },
    },
  });
}
