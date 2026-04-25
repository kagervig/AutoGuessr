// Reports all vehicles that have no active images.
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const vehicles = await prisma.vehicle.findMany({
    where: { images: { none: { isActive: true } } },
    select: { make: true, model: true, year: true },
    orderBy: [{ make: "asc" }, { model: "asc" }, { year: "asc" }],
  });

  vehicles.forEach((v) => console.log(`${v.year} ${v.make} ${v.model}`));
  console.log("---");
  console.log(`${vehicles.length} vehicles with no active images`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
