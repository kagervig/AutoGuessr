// Shared types and pure builder for the flags report.
// Imported by both the route handler and the client panel (and tests).

export interface FlagsReport {
  total: number;
  flags: {
    hardcoreEligible:    number;
    cropped:             number;
    logoVisible:         number;
    modelNameVisible:    number;
    hasMultipleVehicles: number;
    faceVisible:         number;
    vehicleUnmodified:   number;
  };
}

export interface AggregateRow {
  total:                 bigint | number;
  hardcore_eligible:     bigint | number;
  cropped:               bigint | number;
  logo_visible:          bigint | number;
  model_name_visible:    bigint | number;
  has_multiple_vehicles: bigint | number;
  face_visible:          bigint | number;
  vehicle_unmodified:    bigint | number;
}

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
