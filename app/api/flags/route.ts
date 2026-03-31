import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const flags = await prisma.featureFlag.findMany();
  const map = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));
  return Response.json(map);
}
