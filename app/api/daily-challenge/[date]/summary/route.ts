// GET /api/daily-challenge/[date]/summary — per-round results for a player's completed challenge session.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getChallengeByDate } from "@/app/lib/daily-challenge";
import { vehicleLabel, imageUrl } from "@/app/lib/game";
import {
  DAILY_HARDCORE_BONUS,
  DAILY_DISCOVERY_BONUS,
  DAILY_RARE_FIND_BONUS,
} from "@/app/lib/constants";

type RoundBonus = { isHardcore: boolean; isCotd: boolean; isRareFind: boolean };
type BonusEntry = { type: "hardcore" | "cotd" | "rareFind"; points: number };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date: dateParam } = await params;
  const playerId = request.nextUrl.searchParams.get("playerId");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return Response.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  if (!playerId) {
    return Response.json({ error: "playerId is required." }, { status: 400 });
  }

  const challenge = await getChallengeByDate(dateParam);
  if (!challenge) {
    return Response.json({ error: "Challenge not found." }, { status: 404 });
  }

  const session = await prisma.dailyChallengeSession.findUnique({
    where: { playerId_challengeId: { playerId, challengeId: challenge.id } },
    select: {
      totalScore: true,
      roundScores: true,
      answerVehicleIds: true,
      guessVehicleIds: true,
      roundBonuses: true,
    },
  });

  if (!session || session.totalScore === null) {
    return Response.json({ error: "No completed session found." }, { status: 404 });
  }

  const allVehicleIds = [...new Set([...session.answerVehicleIds, ...session.guessVehicleIds])];

  const [images, vehicles] = await Promise.all([
    prisma.image.findMany({
      where: { id: { in: challenge.imageIds } },
      select: { id: true, filename: true, vehicleId: true, transformationSignature: true, cropMethod: true },
    }),
    prisma.vehicle.findMany({
      where: { id: { in: allVehicleIds } },
      select: { id: true, make: true, model: true },
    }),
  ]);

  const imageMap = new Map(images.map((img) => [img.id, img]));
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const bonusFlags = session.roundBonuses as RoundBonus[];
  const hasGuesses = session.guessVehicleIds.length > 0;

  const rounds = challenge.imageIds.map((imageId, i) => {
    const image = imageMap.get(imageId);
    const correctVehicleId = session.answerVehicleIds[i];
    const guessedVehicleId = hasGuesses ? session.guessVehicleIds[i] : null;
    const isCorrect = guessedVehicleId !== null && guessedVehicleId === correctVehicleId;
    const flags = bonusFlags[i];

    const bonuses: BonusEntry[] = [];
    if (isCorrect && flags) {
      if (flags.isHardcore) bonuses.push({ type: "hardcore", points: DAILY_HARDCORE_BONUS });
      if (flags.isCotd) bonuses.push({ type: "cotd", points: DAILY_DISCOVERY_BONUS });
      if (flags.isRareFind) bonuses.push({ type: "rareFind", points: DAILY_RARE_FIND_BONUS });
    }

    const correctVehicle = vehicleMap.get(correctVehicleId);
    const guessedVehicle = guessedVehicleId ? vehicleMap.get(guessedVehicleId) : null;

    return {
      roundIndex: i,
      imageUrl: image ? imageUrl(image.filename, image.vehicleId, image.transformationSignature, image.cropMethod) : null,
      guessedVehicleLabel: guessedVehicle ? vehicleLabel(guessedVehicle) : null,
      correctVehicleLabel: correctVehicle ? vehicleLabel(correctVehicle) : correctVehicleId,
      roundScore: session.roundScores[i] ?? 0,
      bonuses,
    };
  });

  return Response.json({ totalScore: session.totalScore, rounds });
}
