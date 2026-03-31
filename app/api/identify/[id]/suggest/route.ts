import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { computeAgreements, confirmedFromAgreements } from "@/app/lib/staging";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const { username, make, model, year, trim } = body;

  if (!username || typeof username !== "string" || username.trim().length === 0) {
    return Response.json({ error: "username is required" }, { status: 400 });
  }

  if (!make && !model && !year && !trim) {
    return Response.json(
      { error: "At least one of make, model, year, or trim is required" },
      { status: 400 }
    );
  }

  const staging = await prisma.stagingImage.findUnique({ where: { id } });
  if (!staging) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (staging.status !== "COMMUNITY_REVIEW") {
    return Response.json({ error: "This image is not open for community identification" }, { status: 400 });
  }

  // Upsert the user's suggestion (one record per user per image)
  await prisma.communityIdentification.upsert({
    where: { stagingImageId_username: { stagingImageId: id, username: username.trim() } },
    update: {
      suggestedMake: make ?? null,
      suggestedModel: model ?? null,
      suggestedYear: year ? parseInt(year, 10) : null,
      suggestedTrim: trim ?? null,
    },
    create: {
      stagingImageId: id,
      username: username.trim(),
      suggestedMake: make ?? null,
      suggestedModel: model ?? null,
      suggestedYear: year ? parseInt(year, 10) : null,
      suggestedTrim: trim ?? null,
    },
  });

  // Recompute agreements and persist newly confirmed fields
  const allSuggestions = await prisma.communityIdentification.findMany({
    where: { stagingImageId: id },
  });

  const agreements = computeAgreements(allSuggestions);
  const confirmed = confirmedFromAgreements(agreements);

  // Only update fields that are newly confirmed (don't overwrite admin values)
  await prisma.stagingImage.update({
    where: { id },
    data: {
      ...(confirmed.confirmedMake !== undefined && { confirmedMake: confirmed.confirmedMake }),
      ...(confirmed.confirmedModel !== undefined && { confirmedModel: confirmed.confirmedModel }),
      ...(confirmed.confirmedYear !== undefined && { confirmedYear: confirmed.confirmedYear }),
      ...(confirmed.confirmedTrim !== undefined && { confirmedTrim: confirmed.confirmedTrim }),
    },
  });

  return Response.json({
    agreements: {
      make: { value: agreements.make?.value ?? null, count: agreements.make?.count ?? 0 },
      model: { value: agreements.model?.value ?? null, count: agreements.model?.count ?? 0 },
      year: { value: agreements.year?.value ?? null, count: agreements.year?.count ?? 0 },
      trim: { value: agreements.trim?.value ?? null, count: agreements.trim?.count ?? 0 },
    },
    confirmed,
  });
}
