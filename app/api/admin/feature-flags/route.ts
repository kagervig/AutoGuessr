// Admin API for reading and updating feature flags.
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { FEATURE_FLAGS, isKnownFeatureFlagKey } from "@/app/lib/feature-flags";
import { getFeatureFlagMap } from "@/app/lib/feature-flags-server";

export async function GET() {
  const map = await getFeatureFlagMap();
  return Response.json({
    flags: FEATURE_FLAGS.map((def) => ({
      key: def.key,
      label: def.label,
      description: def.description,
      group: def.group,
      enabled: map[def.key],
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { key?: unknown; enabled?: unknown } | null;
  if (!body || typeof body.key !== "string" || typeof body.enabled !== "boolean") {
    return Response.json({ error: "Expected { key: string, enabled: boolean }" }, { status: 400 });
  }
  if (!isKnownFeatureFlagKey(body.key)) {
    return Response.json({ error: `Unknown feature flag: ${body.key}` }, { status: 400 });
  }

  const def = FEATURE_FLAGS.find((f) => f.key === body.key)!;
  const updated = await prisma.featureFlag.upsert({
    where: { key: body.key },
    create: { key: body.key, enabled: body.enabled, description: def.description },
    update: { enabled: body.enabled },
  });

  return Response.json({ key: updated.key, enabled: updated.enabled });
}
