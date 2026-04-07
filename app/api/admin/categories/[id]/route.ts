import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { label } = await request.json();
  if (!label) {
    return Response.json({ error: "label is required" }, { status: 400 });
  }
  const category = await prisma.category.update({ where: { id }, data: { label } });
  return Response.json(category);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true } } },
  });
  if (!category) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }
  if (category._count.vehicles > 0) {
    return Response.json(
      { error: `Cannot delete: ${category._count.vehicles} vehicle(s) use this category` },
      { status: 409 }
    );
  }
  await prisma.category.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
