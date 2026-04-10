import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const regions = await prisma.region.findMany({
    include: { _count: { select: { vehicles: true } } },
    orderBy: { slug: "asc" },
  });
  return Response.json(
    regions.map((r) => ({
      id: r.id,
      slug: r.slug,
      label: r.label,
      vehicleCount: r._count.vehicles,
    }))
  );
}

export async function POST(request: Request) {
  const { slug, label } = await request.json();
  if (!slug || !label) {
    return Response.json({ error: "slug and label are required" }, { status: 400 });
  }
  const existing = await prisma.region.findUnique({ where: { slug } });
  if (existing) {
    return Response.json({ error: "A region with that slug already exists" }, { status: 409 });
  }
  const region = await prisma.region.create({ data: { slug, label } });
  return Response.json({ ...region, vehicleCount: 0 }, { status: 201 });
}
