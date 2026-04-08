import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const { suggestionId, username, isUpvote } = body;

  if (!username || typeof username !== "string" || username.trim().length === 0) {
    return Response.json({ error: "username is required" }, { status: 400 });
  }

  if (typeof isUpvote !== "boolean") {
    return Response.json({ error: "isUpvote must be a boolean" }, { status: 400 });
  }

  if (!suggestionId || typeof suggestionId !== "string") {
    return Response.json({ error: "suggestionId is required" }, { status: 400 });
  }

  const staging = await prisma.stagingImage.findUnique({ where: { id } });
  if (!staging) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (staging.status !== "COMMUNITY_REVIEW") {
    return Response.json({ error: "This image is not open for community identification" }, { status: 400 });
  }

  const suggestion = await prisma.communityIdentification.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion || suggestion.stagingImageId !== id) {
    return Response.json({ error: "Suggestion not found" }, { status: 404 });
  }

  if (suggestion.username === username.trim()) {
    return Response.json({ error: "Cannot vote on your own suggestion" }, { status: 400 });
  }

  await prisma.communityVote.upsert({
    where: { suggestionId_username: { suggestionId, username: username.trim() } },
    update: { isUpvote },
    create: { suggestionId, username: username.trim(), isUpvote },
  });

  // Recompute vote counts from source of truth
  const votes = await prisma.communityVote.findMany({ where: { suggestionId } });
  const upvotes = votes.filter((v) => v.isUpvote).length;
  const downvotes = votes.filter((v) => !v.isUpvote).length;

  await prisma.communityIdentification.update({
    where: { id: suggestionId },
    data: { upvotes, downvotes },
  });

  return Response.json({ upvotes, downvotes, netVotes: upvotes - downvotes });
}
