import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const rows = await prisma.vehicle.groupBy({
    by: ["make"],
    _count: { id: true },
    orderBy: { make: "asc" },
  });
  return Response.json(rows.map((r) => ({ make: r.make, count: r._count.id })));
}

export async function PUT(request: Request) {
  const { from, to } = await request.json();
  if (!from || !to) {
    return Response.json({ error: "from and to are required" }, { status: 400 });
  }
  const result = await prisma.vehicle.updateMany({
    where: { make: from },
    data: { make: to },
  });
  return Response.json({ updated: result.count });
}
