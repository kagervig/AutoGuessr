import type { NextRequest } from "next/server";
import type { StagingStatus, BodyStyle } from "../../../../generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { computeAgreements, CONFIRMATION_THRESHOLD } from "@/app/lib/staging";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const { make, model, year, trim, bodyStyle, notes, status } = body;

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
      ...(notes !== undefined && { adminNotes: notes || null }),
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
      notes: updated.adminNotes,
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
