import { prisma } from '../app/lib/prisma';
async function main() {
  const challenges = await prisma.dailyChallenge.findMany({ select: { challengeNumber: true, imageIds: true }, orderBy: { challengeNumber: 'asc' } });
  if (challenges.length === 0) { console.log('No daily challenges in DB'); return; }
  for (const c of challenges) console.log('#' + c.challengeNumber + ': ' + c.imageIds.length + ' images');
  await prisma.$disconnect();
}
main().catch(console.error);
