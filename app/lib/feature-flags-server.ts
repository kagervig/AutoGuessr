// Server-only feature flag helpers. Missing rows default to enabled (kill-switch semantics).
import { prisma } from "@/app/lib/prisma";
import {
  FEATURE_FLAGS,
  type FeatureFlagKey,
  type FeatureFlagMap,
} from "@/app/lib/feature-flags";

const KNOWN_KEYS = FEATURE_FLAGS.map((f) => f.key);

export async function getFeatureFlagMap(): Promise<FeatureFlagMap> {
  const rows = await prisma.featureFlag.findMany({
    where: { key: { in: KNOWN_KEYS } },
    select: { key: true, enabled: true },
  });
  const stored = new Map(rows.map((r) => [r.key, r.enabled]));
  const result = {} as FeatureFlagMap;
  for (const def of FEATURE_FLAGS) {
    result[def.key] = stored.get(def.key) ?? true;
  }
  return result;
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const row = await prisma.featureFlag.findUnique({
    where: { key },
    select: { enabled: true },
  });
  return row?.enabled ?? true;
}
