import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const [vehicleRows, knownMakes] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["make"],
      _count: { id: true },
      orderBy: { make: "asc" },
    }),
    prisma.knownMake.findMany({ orderBy: { name: "asc" } }),
  ]);

  const counts = new Map(vehicleRows.map((r) => [r.make, r._count.id]));
  const allMakes = new Set([...vehicleRows.map((r) => r.make), ...knownMakes.map((k) => k.name)]);
  const rows = [...allMakes]
    .map((make) => ({ make, count: counts.get(make) ?? 0 }))
    .sort((a, b) => a.make.localeCompare(b.make));

  return Response.json(rows);
}

export async function POST(request: Request) {
  const { make } = await request.json();
  if (!make) return Response.json({ error: "make is required" }, { status: 400 });
  await prisma.knownMake.upsert({
    where: { name: make },
    create: { name: make },
    update: {},
  });
  return Response.json({ make });
}

export async function PUT(request: Request) {
  const { from, to } = await request.json();
  if (!from || !to) {
    return Response.json({ error: "from and to are required" }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { make: from }, data: { make: to } }),
    prisma.knownModel.updateMany({ where: { make: from }, data: { make: to } }),
    prisma.knownMake.upsert({ where: { name: to }, create: { name: to }, update: {} }),
    prisma.knownMake.deleteMany({ where: { name: from } }),
  ]);
  return Response.json({ updated: true });
}

export async function DELETE(request: Request) {
  const { make } = await request.json();
  if (!make) return Response.json({ error: "make is required" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    const vehicles = await tx.vehicle.findMany({
      where: { make: { equals: make, mode: "insensitive" } },
      select: { id: true, images: { select: { id: true, filename: true } } },
    });

    const vehicleIds = vehicles.map((v) => v.id);
    const images = vehicles.flatMap((v) => v.images);
    const imageIds = images.map((i) => i.id);
    const filenames = images.map((i) => i.filename);

    await tx.stagingImage.updateMany({
      where: { cloudinaryPublicId: { in: filenames } },
      data: { status: "PENDING_REVIEW" },
    });

    await tx.guess.deleteMany({ where: { round: { imageId: { in: imageIds } } } });
    await tx.round.deleteMany({ where: { imageId: { in: imageIds } } });
    await tx.imageStats.deleteMany({ where: { imageId: { in: imageIds } } });
    await tx.image.deleteMany({ where: { id: { in: imageIds } } });

    await tx.guess.updateMany({
      where: { guessedVehicleId: { in: vehicleIds } },
      data: { guessedVehicleId: null },
    });

    await tx.vehicleCategory.deleteMany({ where: { vehicleId: { in: vehicleIds } } });
    await tx.vehicleAlias.deleteMany({ where: { vehicleId: { in: vehicleIds } } });
    await tx.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });

    await tx.knownModel.deleteMany({ where: { make } });
    await tx.knownMake.deleteMany({ where: { name: make } });
  });

  return new Response(null, { status: 204 });
}
