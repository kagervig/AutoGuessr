import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";

// Returns all active images for the review tool
export async function GET() {
  const images = await prisma.image.findMany({
    where: { isActive: true },
    orderBy: { uploadedAt: "asc" }, // Review from oldest to newest
    include: {
      vehicle: true,
    },
  });

  const items = images.map((img) => ({
    id: img.id,
    filename: img.filename,
    transformationSignature: img.transformationSignature,
    cropMethod: img.cropMethod,
    vehicleLabel: `${img.vehicle.make} ${img.vehicle.model} (${img.vehicle.year})`,
    // We include standard, subject, and conditional URLs for previewing in the tool
    urls: {
      standard: imageUrl(img.filename, img.vehicle.id, null, "standard"),
      subject: imageUrl(img.filename, img.vehicle.id, null, "subject"),
      conditional: imageUrl(img.filename, img.vehicle.id, img.transformationSignature, "conditional"),
      original: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${img.filename}`
    }
  }));

  return Response.json({ items });
}

// Update an image's crop method or deactivate it
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
