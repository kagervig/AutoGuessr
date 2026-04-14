// Returns a count of active images with each boolean flag set, in a single aggregate query.
import { prisma } from "@/app/lib/prisma";
import type { FlagsReport } from "./types";
export type { FlagsReport } from "./types";

interface AggregateRow {
  total:                 bigint | number;
  hardcore_eligible:     bigint | number;
  cropped:               bigint | number;
  logo_visible:          bigint | number;
  model_name_visible:    bigint | number;
  has_multiple_vehicles: bigint | number;
  face_visible:          bigint | number;
  vehicle_unmodified:    bigint | number;
}


// Converts the single aggregate row into the FlagsReport shape.
// Exported for unit testing without a DB connection.
export function buildFlagsReport(row: AggregateRow): FlagsReport {
  return {
    total: Number(row.total),
    flags: {
      hardcoreEligible:    Number(row.hardcore_eligible),
      cropped:             Number(row.cropped),
      logoVisible:         Number(row.logo_visible),
      modelNameVisible:    Number(row.model_name_visible),
      hasMultipleVehicles: Number(row.has_multiple_vehicles),
      faceVisible:         Number(row.face_visible),
      vehicleUnmodified:   Number(row.vehicle_unmodified),
    },
  };
}

export async function GET() {
  const [row] = await prisma.$queryRaw<AggregateRow[]>`
    SELECT
      COUNT(*)                                          AS total,
      COUNT(*) FILTER (WHERE "isHardcoreEligible")      AS hardcore_eligible,
      COUNT(*) FILTER (WHERE "isCropped")               AS cropped,
      COUNT(*) FILTER (WHERE "isLogoVisible")           AS logo_visible,
      COUNT(*) FILTER (WHERE "isModelNameVisible")      AS model_name_visible,
      COUNT(*) FILTER (WHERE "hasMultipleVehicles")     AS has_multiple_vehicles,
      COUNT(*) FILTER (WHERE "isFaceVisible")           AS face_visible,
      COUNT(*) FILTER (WHERE "isVehicleUnmodified")     AS vehicle_unmodified
    FROM "Image"
    WHERE "isActive" = true
  `;

  return Response.json(buildFlagsReport(row));
}
