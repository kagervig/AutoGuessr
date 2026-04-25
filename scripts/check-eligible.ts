// One-off diagnostic: count vehicles meeting CotD eligibility criteria
import { prisma } from '@/app/lib/prisma';

async function main() {
  const [total, trivia, activeImg, eligible] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicleTrivia.count(),
    prisma.vehicle.count({ where: { images: { some: { isActive: true } } } }),
    prisma.vehicle.count({ where: { trivia: { isNot: null }, images: { some: { isActive: true } } } }),
  ]);
  console.log({ total, trivia, activeImg, eligible });
  await prisma.$disconnect();
}
main();
