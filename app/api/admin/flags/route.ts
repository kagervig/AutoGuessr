// Returns a count of active images with each boolean flag set, in a single aggregate query.
import { prisma } from "@/app/lib/prisma";
import { buildFlagsReport, type AggregateRow } from "./types";
export type { FlagsReport } from "./types";

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
