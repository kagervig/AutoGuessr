// Dumps the contents of the VehicleAlias table into a CSV file.
//
// Usage:
//   npx tsx scripts/dump-vehicle-aliases.ts [--output FILE]
//
// Flags:
//   --output FILE  Path to the output CSV file (default: vehicle_aliases.csv)
//
// Required env:
//   DATABASE_URL

import "dotenv/config";
import fs from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const outputArg = args.indexOf("--output");
const outputFile = outputArg !== -1 ? args[outputArg + 1] : "vehicle_aliases.csv";

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  try {
    console.error("Fetching vehicle aliases...");
    const aliases = await db.vehicleAlias.findMany({
      orderBy: { id: "asc" },
    });

    if (aliases.length === 0) {
      console.error("No aliases found in the database.");
      return;
    }

    const header = ["id", "vehicleId", "alias", "aliasType"];
    const rows = aliases.map((a) => [
      a.id,
      a.vehicleId,
      a.alias,
      a.aliasType,
    ]);

    const csvContent = [
      header.join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    fs.writeFileSync(outputFile, csvContent + "\n", "utf-8");
    console.error(`Successfully dumped ${aliases.length} aliases to ${outputFile}`);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error dumping vehicle aliases:", err);
  process.exit(1);
});
