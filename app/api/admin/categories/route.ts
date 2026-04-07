import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { vehicles: true } } },
    orderBy: { slug: "asc" },
  });
  return Response.json(
    categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      vehicleCount: c._count.vehicles,
    }))
  );
}

export async function POST(request: Request) {
  const { slug, label } = await request.json();
  if (!slug || !label) {
    return Response.json({ error: "slug and label are required" }, { status: 400 });
  }
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return Response.json({ error: "A category with that slug already exists" }, { status: 409 });
  }
  const category = await prisma.category.create({ data: { slug, label } });
  return Response.json({ ...category, vehicleCount: 0 }, { status: 201 });
}
