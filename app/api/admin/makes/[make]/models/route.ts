import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ make: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { make } = await params;
  const decodedMake = decodeURIComponent(make);
  const rows = await prisma.vehicle.groupBy({
    by: ["model"],
    where: { make: { equals: decodedMake, mode: "insensitive" } },
    _count: { id: true },
    orderBy: { model: "asc" },
  });
  return Response.json(rows.map((r) => ({ model: r.model, count: r._count.id })));
}

export async function PUT(request: Request, { params }: Params) {
  const { make } = await params;
  const decodedMake = decodeURIComponent(make);
  const { from, to } = await request.json();
  if (!from || !to) {
    return Response.json({ error: "from and to are required" }, { status: 400 });
  }
  const result = await prisma.vehicle.updateMany({
    where: { make: { equals: decodedMake, mode: "insensitive" }, model: from },
    data: { model: to },
  });
  return Response.json({ updated: result.count });
}
