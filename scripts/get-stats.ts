import { PrismaClient } from "./app/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const [
    regionCount,
    vehicleCount,
    categoryCount,
    activeImageCount,
    inactiveImageCount,
    playerCount,
    sessionCount,
    stagingPending,
    stagingReady,
    stagingPublished,
    stagingRejected,
    totalGuesses,
    correctGuesses,
  ] = await Promise.all([
    prisma.region.count(),
    prisma.vehicle.count(),
    prisma.category.count(),
    prisma.image.count({ where: { isActive: true } }),
    prisma.image.count({ where: { isActive: false } }),
    prisma.player.count(),
    prisma.gameSession.count(),
    prisma.stagingImage.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.stagingImage.count({ where: { status: "READY" } }),
    prisma.stagingImage.count({ where: { status: "PUBLISHED" } }),
    prisma.stagingImage.count({ where: { status: "REJECTED" } }),
    prisma.imageStats.aggregate({ _sum: { correctGuesses: true, incorrectGuesses: true } }),
    prisma.imageStats.aggregate({ _sum: { correctGuesses: true } }),
  ]);

  console.log("--- AutoGuessr Project Stats ---");
  console.log(`Regions:          ${regionCount}`);
  console.log(`Vehicles:         ${vehicleCount}`);
  console.log(`Categories:       ${categoryCount}`);
  console.log(`Images (Active):  ${activeImageCount}`);
  console.log(`Images (Inactive):${inactiveImageCount}`);
  console.log(`Players:          ${playerCount}`);
  console.log(`Game Sessions:    ${sessionCount}`);
  console.log("");
  console.log("--- Staging Stats ---");
  console.log(`Pending Review:   ${stagingPending}`);
  console.log(`Ready:            ${stagingReady}`);
  console.log(`Published:        ${stagingPublished}`);
  console.log(`Rejected:         ${stagingRejected}`);
  console.log("");
  console.log("--- Engagement Stats ---");
  const total = (totalGuesses._sum.correctGuesses || 0) + (totalGuesses._sum.incorrectGuesses || 0);
  const correct = correctGuesses._sum.correctGuesses || 0;
  console.log(`Total Guesses:    ${total}`);
  console.log(`Correct Guesses:  ${correct} (${total > 0 ? ((correct / total) * 100).toFixed(1) : 0}%)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
