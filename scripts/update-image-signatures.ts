import { prisma } from "../app/lib/prisma";
import { cloudinary } from "../app/lib/cloudinary";

/**
 * Script to pre-calculate and store Cloudinary signatures for the 
 * primary game transformation logic.
 */
async function updateSignatures() {
  console.log("Fetching images...");
  const images = await prisma.image.findMany({
    where: { isActive: true },
    select: { id: true, filename: true }
  });

  console.log(`Found ${images.length} images. Generating signatures...`);

  // Our chosen "Standard" game transformation
  const transformation = "if_ar_lt_1.0/c_fill,g_auto:coco_v2_car,ar_16:9,w_1280/if_end/f_auto,q_auto";

  let updatedCount = 0;

  for (const image of images) {
    // cloudinary.utils.api_sign_request generates the hash for the signature component
    // We need to pass the transformation and public_id
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Cloudinary signatures for URLs are specifically 's--' + 8 chars + '--'
    // The SDK's sign_url logic produces the full URL, from which we can extract the signature.
    const signedUrl = cloudinary.url(image.filename, {
      sign_url: true,
      raw_transformation: transformation,
      secure: true
    });

    // Extract the signature part: /s--[SIGNATURE]--/
    const sigMatch = signedUrl.match(/\/s--([^/]+)--\//);
    const signature = sigMatch ? sigMatch[1] : null;

    if (signature) {
      await prisma.image.update({
        where: { id: image.id },
        data: { transformationSignature: `s--${signature}--` }
      });
      updatedCount++;
    }

    if (updatedCount % 50 === 0) {
      console.log(`Progress: ${updatedCount}/${images.length}...`);
    }
  }

  console.log(`Finished! Updated ${updatedCount} image signatures.`);
}

updateSignatures()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
