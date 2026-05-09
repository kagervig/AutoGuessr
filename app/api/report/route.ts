// Handles image problem reports: creates an ImageReport, flags the image, and sends an email.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import type { BodyStyle, Era, Rarity } from "@/app/generated/prisma/client";

const BODY_STYLES: BodyStyle[] = [
  "coupe",
  "sedan",
  "convertible",
  "hatchback",
  "wagon",
  "suv",
  "truck",
  "pickup",
  "van",
  "roadster",
  "targa",
  "compact",
  "special_purpose",
];
const ERAS: Era[] = ["classic", "retro", "modern", "contemporary"];
const RARITIES: Rarity[] = ["common", "uncommon", "rare", "ultra_rare"];

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    imageId,
    certainty,
    comment,
    suggestedMake,
    suggestedModel,
    suggestedYear,
    suggestedTrim,
    suggestedCountryOfOrigin,
    suggestedBodyStyle,
    suggestedEra,
    suggestedRarity,
  } = body as {
    imageId?: string;
    certainty?: number;
    comment?: string;
    suggestedMake?: string;
    suggestedModel?: string;
    suggestedYear?: number;
    suggestedTrim?: string;
    suggestedCountryOfOrigin?: string;
    suggestedBodyStyle?: string;
    suggestedEra?: string;
    suggestedRarity?: string;
  };

  if (!imageId) {
    return Response.json({ error: "imageId is required" }, { status: 400 });
  }
  if (
    typeof certainty !== "number" ||
    !Number.isInteger(certainty) ||
    certainty < 0 ||
    certainty > 100
  ) {
    return Response.json(
      { error: "certainty must be an integer 0–100" },
      { status: 400 },
    );
  }
  if (
    !comment?.trim() &&
    !suggestedMake &&
    !suggestedModel &&
    !suggestedYear &&
    !suggestedTrim &&
    !suggestedCountryOfOrigin &&
    !suggestedBodyStyle &&
    !suggestedEra &&
    !suggestedRarity
  ) {
    return Response.json(
      { error: "At least one suggested change or comment is required" },
      { status: 400 },
    );
  }
  if (
    suggestedBodyStyle &&
    !BODY_STYLES.includes(suggestedBodyStyle as BodyStyle)
  ) {
    return Response.json(
      { error: "Invalid suggestedBodyStyle" },
      { status: 400 },
    );
  }
  if (suggestedEra && !ERAS.includes(suggestedEra as Era)) {
    return Response.json({ error: "Invalid suggestedEra" }, { status: 400 });
  }
  if (suggestedRarity && !RARITIES.includes(suggestedRarity as Rarity)) {
    return Response.json({ error: "Invalid suggestedRarity" }, { status: 400 });
  }

  const deactivated = certainty >= 75;

  const result = await prisma.$transaction(async (tx) => {
    const image = await tx.image.findUnique({
      where: { id: imageId },
      include: { vehicle: true },
    });
    if (!image) return null;

    await tx.imageReport.create({
      data: {
        imageId,
        certainty,
        comment: comment?.trim() || null,
        suggestedMake: suggestedMake || null,
        suggestedModel: suggestedModel || null,
        suggestedYear: suggestedYear ?? null,
        suggestedTrim: suggestedTrim || null,
        suggestedCountryOfOrigin: suggestedCountryOfOrigin || null,
        suggestedBodyStyle: suggestedBodyStyle
          ? (suggestedBodyStyle as BodyStyle)
          : null,
        suggestedEra: suggestedEra ? (suggestedEra as Era) : null,
        suggestedRarity: suggestedRarity ? (suggestedRarity as Rarity) : null,
      },
    });

    await tx.image.update({
      where: { id: imageId },
      data: {
        needsReview: true,
        ...(deactivated ? { isActive: false } : {}),
      },
    });

    return image;
  });

  if (!result) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  return Response.json({ success: true, deactivated });
}
