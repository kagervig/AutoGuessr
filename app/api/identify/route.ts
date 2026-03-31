import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { computeAgreements, CONFIRMATION_THRESHOLD } from "@/app/lib/staging";

export async function GET() {
  const images = await prisma.stagingImage.findMany({
    where: { status: "COMMUNITY_REVIEW" },
    include: { suggestions: true },
    orderBy: { createdAt: "asc" },
  });

  const response = images.map((img) => {
    const agreements = computeAgreements(img.suggestions);
    return {
      id: img.id,
      imageUrl: imageUrl(img.cloudinaryPublicId, img.id),
      ai: {
        make: img.aiMake,
        model: img.aiModel,
        year: img.aiYear,
      },
      agreements: {
        make: {
          value: agreements.make?.value ?? null,
          count: agreements.make?.count ?? 0,
          confirmed: (agreements.make?.count ?? 0) >= CONFIRMATION_THRESHOLD,
          threshold: CONFIRMATION_THRESHOLD,
        },
        model: {
          value: agreements.model?.value ?? null,
          count: agreements.model?.count ?? 0,
          confirmed: (agreements.model?.count ?? 0) >= CONFIRMATION_THRESHOLD,
          threshold: CONFIRMATION_THRESHOLD,
        },
        year: {
          value: agreements.year?.value ?? null,
          count: agreements.year?.count ?? 0,
          confirmed: (agreements.year?.count ?? 0) >= CONFIRMATION_THRESHOLD,
          threshold: CONFIRMATION_THRESHOLD,
        },
        trim: {
          value: agreements.trim?.value ?? null,
          count: agreements.trim?.count ?? 0,
          confirmed: (agreements.trim?.count ?? 0) >= CONFIRMATION_THRESHOLD,
          threshold: CONFIRMATION_THRESHOLD,
        },
      },
      suggestionCount: img.suggestions.length,
    };
  });

  return Response.json(response);
}
