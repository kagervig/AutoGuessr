import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { slug, label } = await request.json();
  if (!slug && !label) {
    return Response.json({ error: "slug or label is required" }, { status: 400 });
  }
  const data: { slug?: string; label?: string } = {};
  if (slug) data.slug = slug;
  if (label) data.label = label;

  if (slug) {
    const conflict = await prisma.region.findFirst({ where: { slug, NOT: { id } } });
    if (conflict) {
      return Response.json({ error: "A region with that slug already exists" }, { status: 409 });
    }
  }

  const region = await prisma.region.update({ where: { id }, data });
  return Response.json({ ...region });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const region = await prisma.region.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true } } },
  });
  if (!region) {
    return Response.json({ error: "Region not found" }, { status: 404 });
  }
  if (region._count.vehicles > 0) {
    return Response.json(
      { error: `Cannot delete: ${region._count.vehicles} vehicle(s) use this region` },
      { status: 409 }
    );
  }
  await prisma.region.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
