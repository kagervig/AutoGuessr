// Seeds VehicleTrivia from vehicle_trivia_master.json. Matches vehicles by
// case-insensitive normalised make+model; attaches the same trivia to all
// year rows of the same nameplate. Unmatched rows are logged to tmp/.
import * as fs from "fs";
import * as path from "path";
import type { PrismaClient } from "../app/generated/prisma/client";

interface TriviaRow {
  make: string;
  model: string;
  productionYears: string;
  engine: string | null;
  layout: string | null;
  regionalNames: string | null;
  funFacts: string[];
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function seedTrivia(prisma: PrismaClient) {
  const jsonPath = path.join(process.cwd(), "vehicle_trivia_master.json");
  const rows: TriviaRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  const triviaIndex = new Map<string, TriviaRow>();
  for (const row of rows) {
    triviaIndex.set(`${normalise(row.make)}|${normalise(row.model)}`, row);
  }

  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, make: true, model: true },
  });

  const unmatched: { make: string; model: string }[] = [];
  const toInsert: Parameters<typeof prisma.vehicleTrivia.createMany>[0]["data"] = [];

  for (const vehicle of vehicles) {
    const key = `${normalise(vehicle.make)}|${normalise(vehicle.model)}`;
    const trivia = triviaIndex.get(key);
    if (!trivia) {
      unmatched.push({ make: vehicle.make, model: vehicle.model });
      continue;
    }
    toInsert.push({
      vehicleId: vehicle.id,
      productionYears: trivia.productionYears,
      engine: trivia.engine,
      layout: trivia.layout,
      regionalNames: trivia.regionalNames,
      funFacts: trivia.funFacts,
      sourceModel: "seed-json-v1",
    });
  }

  const { count: upserted } = await prisma.vehicleTrivia.createMany({
    data: toInsert,
    skipDuplicates: true,
  });

  if (unmatched.length > 0) {
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const seen = new Set<string>();
    const deduped = unmatched.filter(({ make, model }) => {
      const k = `${make}|${model}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    fs.writeFileSync(
      path.join(tmpDir, "trivia-unmatched.json"),
      JSON.stringify(deduped, null, 2)
    );
    console.log(`  ⚠  ${deduped.length} unique nameplates unmatched → tmp/trivia-unmatched.json`);
  }

  console.log(`  ✓  VehicleTrivia: ${upserted} rows upserted`);
}
