/**
 * Tag staged car images using Gemini 2.5 Flash.
 *
 * Queries StagingImage rows where aiTaggedAt IS NULL, sends each image to
 * Gemini, and writes the AI-generated tags back to the DB. Safe to re-run —
 * already-tagged images are skipped automatically.
 *
 * Usage:
 *   npx tsx scripts/tag-images.ts [--limit N]
 *
 * Flags:
 *   --limit N   Process only N images (useful for testing)
 *
 * Required env:
 *   DATABASE_URL, GEMINI_API_KEY
 *
 * Images are read from Data/Images/<filename> when present. If the local file
 * is not found, the image is fetched from Cloudinary using the public ID stored
 * on the StagingImage record. Run register-cloudinary.ts to create records for
 * images already uploaded directly to Cloudinary.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

// ── Config ────────────────────────────────────────────────────────────────────

const IMAGES_DIR = path.resolve("Data/Images");

// Free tier: 15 requests/min. 4.5s gap keeps us safely under.
const RATE_LIMIT_MS = 4500;

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : undefined;

// ── Gemini setup ──────────────────────────────────────────────────────────────

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_INSTRUCTION = `You are a car identification expert. Given a photo, identify the primary car subject and return a JSON object with exactly these fields:

{
  "make": "string — the manufacturer (e.g. Ford, Toyota, Ferrari)",
  "model": "string — the model name (e.g. Mustang, Supra, F40)",
  "year": number or null — best estimate of model year; null if you truly cannot tell,
  "trim": "string — specific trim if clearly identifiable from the image, otherwise empty string",
  "body_style": "one of: coupe, sedan, convertible, hatchback, wagon, suv, truck, van, roadster",
  "confidence": number between 0 and 1 — your confidence in the identification (0.9 = high, 0.6 = medium, 0.3 = low),
  "notes": "string — anything uncertain or worth flagging for manual review, otherwise empty string"
}

Rules:
- Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.
- If multiple cars are visible, identify the most prominent one and include "multiple cars visible" in notes.
- If you cannot identify the car at all, return the object with empty strings and null year and confidence 0.1.`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeminiTag {
  make: string;
  model: string;
  year: number | null;
  trim: string;
  body_style: string;
  confidence: number;
  notes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Image loading ─────────────────────────────────────────────────────────────

async function imageToBase64(filePath: string | null, cloudinaryPublicId: string): Promise<{ base64: string; mimeType: string } | null> {
  if (filePath && fs.existsSync(filePath)) {
    const bytes = fs.readFileSync(filePath);
    const mimeType = filePath.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return { base64: bytes.toString("base64"), mimeType };
  }

  // Fall back to Cloudinary
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn("  CLOUDINARY_CLOUD_NAME not set — cannot fetch from Cloudinary");
    return null;
  }
  const url = `https://res.cloudinary.com/${cloudName}/image/upload/${cloudinaryPublicId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  Cloudinary fetch failed: ${response.status} ${url}`);
      return null;
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const mimeType = contentType.split(";")[0].trim() as string;
    const buffer = await response.arrayBuffer();
    return { base64: Buffer.from(buffer).toString("base64"), mimeType };
  } catch (err) {
    console.warn(`  Cloudinary fetch error:`, err);
    return null;
  }
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function tagImage(filePath: string | null, cloudinaryPublicId: string): Promise<GeminiTag | null> {
  const image = await imageToBase64(filePath, cloudinaryPublicId);
  if (!image) return null;
  const { base64, mimeType } = image;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mimeType, data: base64 } },
          { text: "Identify this car." },
        ],
      },
    ],
  });

  const text = result.text ?? "";

  if (!text) {
    const reason = result.candidates?.[0]?.finishReason ?? "unknown";
    console.warn(`  Empty response (finishReason: ${reason})`);
    return null;
  }

  try {
    return JSON.parse(text) as GeminiTag;
  } catch {
    console.warn(`  Could not parse response:`, text.slice(0, 300));
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY — add it to your .env file");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const untagged = await prisma.stagingImage.findMany({
    where: { aiTaggedAt: null },
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  if (untagged.length === 0) {
    console.log("No untagged staging images found. Run stage-images.ts first, or all images are already tagged.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`Tagging ${untagged.length} image(s)...`);

  let tagged = 0;
  let failed = 0;

  for (let i = 0; i < untagged.length; i++) {
    const record = untagged[i];
    const localPath = path.join(IMAGES_DIR, record.filename);
    const filePath = fs.existsSync(localPath) ? localPath : null;
    const source = filePath ? "local" : "cloudinary";
    console.log(`[${i + 1}/${untagged.length}] ${record.filename} (${source})`);

    const tag = await tagImage(filePath, record.cloudinaryPublicId);

    if (!tag) {
      failed++;
    } else {
      await prisma.stagingImage.update({
        where: { id: record.id },
        data: {
          aiMake:       tag.make || null,
          aiModel:      tag.model || null,
          aiYear:       tag.year,
          aiBodyStyle:  tag.body_style || null,
          aiConfidence: tag.confidence,
          aiTaggedAt:   new Date(),
          // Store notes in adminNotes only if it's empty — don't overwrite human edits
          ...(record.adminNotes === null && tag.notes
            ? { adminNotes: `[AI] ${tag.notes}` }
            : {}),
        },
      });

      const yearStr = tag.year ? String(tag.year) : "?";
      console.log(`  → ${tag.make} ${tag.model} ${yearStr} (confidence: ${tag.confidence})${tag.notes ? ` — ${tag.notes}` : ""}`);
      tagged++;
    }

    if (i < untagged.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  await prisma.$disconnect();
  await pool.end();

  console.log(`\nDone.`);
  console.log(`  Tagged:  ${tagged}`);
  console.log(`  Failed:  ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
