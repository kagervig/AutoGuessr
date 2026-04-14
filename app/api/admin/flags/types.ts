// Shared types for the flags report — imported by both the route handler and the client panel.
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
