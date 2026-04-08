import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { computeAgreements, CONFIRMATION_THRESHOLD } from "@/app/lib/staging";

const DOWNVOTE_THRESHOLD = 5;

export async function GET() {
  const images = await prisma.stagingImage.findMany({
    where: { status: "COMMUNITY_REVIEW" },
    include: { suggestions: true },
    orderBy: { createdAt: "asc" },
  });

  const response = images.map((img) => {
    const agreements = computeAgreements(img.suggestions);

    const suggestions = img.suggestions
      .filter((s) => s.downvotes < DOWNVOTE_THRESHOLD)
      .map((s) => ({
        id: s.id,
        username: s.username,
        suggestedMake: s.suggestedMake,
        suggestedModel: s.suggestedModel,
        suggestedYear: s.suggestedYear,
        suggestedTrim: s.suggestedTrim,
        upvotes: s.upvotes,
        downvotes: s.downvotes,
        netVotes: s.upvotes - s.downvotes,
      }))
      .sort((a, b) => b.netVotes - a.netVotes);

    return {
      id: img.id,
      imageUrl: imageUrl(img.cloudinaryPublicId, img.id),
      ai: {
        make: img.aiMake,
        model: img.aiModel,
        year: img.aiYear,
      },
      suggestions,
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
    };
  });

  return Response.json(response);
}
