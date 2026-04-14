// Returns active image counts grouped by vehicle, make, and make+model.
import { prisma } from "@/app/lib/prisma";
import { buildCoverageReport, type VehicleRow, type MakeRow, type ModelRow } from "./types";
export type { CoverageReport } from "./types";

export async function GET() {
  const [vehicleRows, makeRows, modelRows] = await Promise.all([
    prisma.$queryRaw<VehicleRow[]>`
      SELECT v.id AS vehicle_id, v.make, v.model, v.year, v.trim, COUNT(i.id) AS count
      FROM "Vehicle" v
      JOIN "Image" i ON i."vehicleId" = v.id
      WHERE i."isActive" = true
      GROUP BY v.id, v.make, v.model, v.year, v.trim
      ORDER BY count DESC, v.make, v.model, v.year
    `,
    prisma.$queryRaw<MakeRow[]>`
      SELECT v.make, COUNT(i.id) AS count
      FROM "Vehicle" v
      JOIN "Image" i ON i."vehicleId" = v.id
      WHERE i."isActive" = true
      GROUP BY v.make
      ORDER BY count DESC, v.make
    `,
    prisma.$queryRaw<ModelRow[]>`
      SELECT v.make, v.model, COUNT(i.id) AS count
      FROM "Vehicle" v
      JOIN "Image" i ON i."vehicleId" = v.id
      WHERE i."isActive" = true
      GROUP BY v.make, v.model
      ORDER BY count DESC, v.make, v.model
    `,
  ]);

  return Response.json(buildCoverageReport(vehicleRows, makeRows, modelRows));
}
