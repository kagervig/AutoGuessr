import { prisma } from "@/app/lib/prisma";
import { cloudinary } from "@/app/lib/cloudinary";
import TestCroppingClient from "./TestCroppingClient";

export const metadata = {
  title: "Cloudinary AI Cropping Test",
};

export default async function TestCroppingPage() {
  const images = await prisma.image.findMany({
    take: 100,
    include: {
      vehicle: true,
    },
    where: {
      isActive: true,
    },
    orderBy: {
      uploadedAt: "desc",
    },
  });

  const transformation = "if_ar_lt_1.0/c_fill,ar_16:9,g_auto:coco_v2_car,w_1280/if_end/f_auto,q_auto";

  // Generate signatures for all images on the fly (Server Side)
  const serializedImages = images.map((img: any) => {
    const signedUrl = cloudinary.url(img.filename, {
      sign_url: true,
      raw_transformation: transformation,
      secure: true
    });

    // Extract the signature: /s--[SIG]--/
    const sigMatch = signedUrl.match(/\/s--([^/]+)--\//);
    const signature = sigMatch ? `s--${sigMatch[1]}--` : null;

    return {
      id: img.id,
      filename: img.filename,
      vehicleLabel: `${img.vehicle.make} ${img.vehicle.model} (${img.vehicle.year})`,
      signature: signature
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Cloudinary AI Cropping Test</h1>
        <TestCroppingClient images={serializedImages} />
      </div>
    </div>
  );
}
