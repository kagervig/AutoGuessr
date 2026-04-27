import { prisma } from "../app/lib/prisma";

async function main() {
  console.log("Fetching all daily challenges...");
  const challenges = await prisma.dailyChallenge.findMany({
    orderBy: { date: "asc" },
  });

  if (challenges.length === 0) {
    console.log("No daily challenges found.");
    return;
  }

  console.log(`Found ${challenges.length} challenges. Re-sequencing...`);

  // 1. Move all to a high temporary range to avoid unique constraint collisions
  // We do this outside the transaction to minimize transaction time
  await prisma.dailyChallenge.updateMany({
    data: {
      challengeNumber: { increment: 1000000 }
    }
  });

  await prisma.$transaction(async (tx) => {
    // 2. Set the final sequential numbers
    for (let i = 0; i < challenges.length; i++) {
      const challenge = challenges[i];
      const newNumber = i + 1;
      await tx.dailyChallenge.update({
        where: { id: challenge.id },
        data: { challengeNumber: newNumber },
      });
      console.log(`Challenge ${challenge.id} (${challenge.date.toISOString().split('T')[0]}): ID #${challenge.id} -> #${newNumber}`);
    }
  }, {
    timeout: 30000 // 30 seconds
  });

  console.log("Done. All daily challenges have been re-sequenced starting from #1.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
