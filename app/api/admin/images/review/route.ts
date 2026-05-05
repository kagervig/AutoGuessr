import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { cloudinary } from "@/app/lib/cloudinary";

const CONDITIONAL_TRANSFORMATION = "if_ar_lt_1.0/c_fill,ar_16:9,g_auto:coco_v2_car,w_1280/if_end/f_auto,q_auto";

// Returns a single active image by offset index, plus the total count.
export async function GET(request: NextRequest) {
  const index = parseInt(request.nextUrl.searchParams.get("index") ?? "0", 10);
  const t0 = Date.now();

  const [total, images] = await Promise.all([
    prisma.image.count({ where: { isActive: true } }),
    prisma.image.findMany({
      where: { isActive: true },
      orderBy: { uploadedAt: "desc" },
      skip: index,
      take: 1,
      include: { vehicle: true },
    }),
  ]);
  console.log(`[review] db query: ${Date.now() - t0}ms`);

  const img = images[0];
  if (!img) return Response.json({ item: null, total });

  const item = {
    id: img.id,
    filename: img.filename,
    cropMethod: img.cropMethod,
    vehicleLabel: `${img.vehicle.make} ${img.vehicle.model} (${img.vehicle.year})`,
    urls: {
      standard: imageUrl(img.filename, img.vehicle.id, null, "standard"),
      subject: imageUrl(img.filename, img.vehicle.id, null, "subject"),
      conditional: cloudinary.url(img.filename, { sign_url: true, raw_transformation: CONDITIONAL_TRANSFORMATION, secure: true }),
      original: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${img.filename}`,
    },
  };

  return Response.json({ item, total });
}

// Update an image's crop method or deactivate it.
export async function POST(request: Request) {
  const { id, cropMethod, isActive } = await request.json();

  if (!id) {
    return Response.json({ error: "Image ID required" }, { status: 400 });
  }

  const updated = await prisma.image.update({
    where: { id },
    data: {
      ...(cropMethod && { cropMethod }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return Response.json({ success: true, item: updated });
}
