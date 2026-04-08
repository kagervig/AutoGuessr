import { prisma } from "@/app/lib/prisma";

interface Params {
  params: Promise<{ make: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { make } = await params;
  const decodedMake = decodeURIComponent(make);

  const [vehicleRows, knownModels] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["model"],
      where: { make: { equals: decodedMake, mode: "insensitive" } },
      _count: { id: true },
      orderBy: { model: "asc" },
    }),
    prisma.knownModel.findMany({
      where: { make: { equals: decodedMake, mode: "insensitive" } },
      orderBy: { name: "asc" },
    }),
  ]);

  const counts = new Map(vehicleRows.map((r) => [r.model, r._count.id]));
  const allModels = new Set([...vehicleRows.map((r) => r.model), ...knownModels.map((k) => k.name)]);
  const rows = [...allModels]
    .map((model) => ({ model, count: counts.get(model) ?? 0 }))
    .sort((a, b) => a.model.localeCompare(b.model));

  return Response.json(rows);
}

export async function POST(request: Request, { params }: Params) {
  const { make } = await params;
  const decodedMake = decodeURIComponent(make);
  const { model } = await request.json();
  if (!model) return Response.json({ error: "model is required" }, { status: 400 });

  await prisma.$transaction([
    prisma.knownMake.upsert({
      where: { name: decodedMake },
      create: { name: decodedMake },
      update: {},
    }),
    prisma.knownModel.upsert({
      where: { make_name: { make: decodedMake, name: model } },
      create: { make: decodedMake, name: model },
      update: {},
    }),
  ]);

  return Response.json({ make: decodedMake, model });
}

export async function PUT(request: Request, { params }: Params) {
  const { make } = await params;
  const decodedMake = decodeURIComponent(make);
  const { from, to } = await request.json();
  if (!from || !to) {
    return Response.json({ error: "from and to are required" }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.vehicle.updateMany({
      where: { make: { equals: decodedMake, mode: "insensitive" }, model: from },
      data: { model: to },
    }),
    prisma.knownModel.upsert({
      where: { make_name: { make: decodedMake, name: to } },
      create: { make: decodedMake, name: to },
      update: {},
    }),
    prisma.knownModel.deleteMany({ where: { make: decodedMake, name: from } }),
  ]);
  return Response.json({ updated: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const { make } = await params;
  const decodedMake = decodeURIComponent(make);
  const { model } = await request.json();
  if (!model) return Response.json({ error: "model is required" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    const vehicles = await tx.vehicle.findMany({
      where: {
        make: { equals: decodedMake, mode: "insensitive" },
        model: { equals: model, mode: "insensitive" },
      },
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

    await tx.knownModel.deleteMany({ where: { make: decodedMake, name: model } });
  });

  return new Response(null, { status: 204 });
}
