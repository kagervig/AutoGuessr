// Shared types and pure builder for the coverage report.
// Imported by both the route handler and the client panel (and tests).

export interface CoverageReport {
  byVehicle: { vehicleId: string; make: string; model: string; year: number; trim: string | null; count: number }[];
  byMake:    { make: string; count: number }[];
  byModel:   { make: string; model: string; count: number }[];
}

export interface VehicleRow {
  vehicle_id: string;
  make: string;
  model: string;
  year: bigint | number;
  trim: string | null;
  count: bigint | number;
}

export interface MakeRow {
  make: string;
  count: bigint | number;
}

export interface ModelRow {
  make: string;
  model: string;
  count: bigint | number;
}

export function buildCoverageReport(
  vehicleRows: VehicleRow[],
  makeRows: MakeRow[],
  modelRows: ModelRow[],
): CoverageReport {
  return {
    byVehicle: vehicleRows.map((r) => ({
      vehicleId: r.vehicle_id,
      make:      r.make,
      model:     r.model,
      year:      Number(r.year),
      trim:      r.trim,
      count:     Number(r.count),
    })),
    byMake: makeRows.map((r) => ({
      make:  r.make,
      count: Number(r.count),
    })),
    byModel: modelRows.map((r) => ({
      make:  r.make,
      model: r.model,
      count: Number(r.count),
    })),
  };
}
