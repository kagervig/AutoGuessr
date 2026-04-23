// Seeds VehicleTrivia from vehicle_trivia_master.json without touching staging or image data.
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { seedTrivia } from "../prisma/seed-trivia";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

seedTrivia(prisma)
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
