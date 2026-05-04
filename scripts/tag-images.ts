/**
 * Tag staged car images using Gemini 2.5 Flash.
 *
 * Queries StagingImage rows where aiTaggedAt IS NULL, sends each image to
 * Gemini, and writes the AI-generated tags back to the DB. Safe to re-run —
 * already-tagged images are skipped automatically.
 *
 * Multiple API keys are supported via GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
 * When a key's daily quota is exceeded the script automatically switches to the
 * next available key. Key usage is tracked in .gemini-key-state.json (per-day).
 *
 * Usage:
 *   npx tsx scripts/tag-images.ts [--limit N] [--skip M] [--review] [--min-confidence X] [--status S]
 *
 * Flags:
 *   --limit N          Process only N images (useful for testing)
 *   --skip M           Skip the first M images (useful for resuming)
 *   --review           Review already-tagged images (where aiTaggedAt is set)
 *   --min-confidence X Only process images where current AI confidence is < X
 *   --status S         Filter by status (e.g. PENDING_REVIEW, READY)
 *   --force            Re-tag even if already tagged (normally skipped)
 *   --pro              Use Gemini 1.5 Pro instead of Flash
 *   --reset-keys       Clear the key usage state file
 *
 * Required env:
 *   DATABASE_URL, CLOUDINARY_CLOUD_NAME
 *   GEMINI_API_KEY_1 (plus optionally GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma, StagingStatus } from "../app/generated/prisma/client";
import { lookupMakeOrigin } from "./lib/make-origins";

// ── Config ────────────────────────────────────────────────────────────────────

// Free tier: 15 requests/min. 4.5s gap keeps us safely under.
const RATE_LIMIT_MS = 4500;
const STATE_FILE = path.join(process.cwd(), ".gemini-key-state.json");

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : 10;

const skipArg = args.indexOf("--skip");
const skip = skipArg !== -1 ? parseInt(args[skipArg + 1], 10) : 0;

const force = args.includes("--force");
const review = args.includes("--review");
const usePro = args.includes("--pro");
const resetKeys = args.includes("--reset-keys");
const minConfidenceArg = args.indexOf("--min-confidence");
const minConfidence = minConfidenceArg !== -1 ? parseFloat(args[minConfidenceArg + 1]) : undefined;
const statusArg = args.indexOf("--status");
const status = statusArg !== -1 ? args[statusArg + 1] : undefined;

// Flash: 15 RPM (4.5s), Pro: 2 RPM (30.5s)
const effectiveRateLimit = usePro ? 30500 : RATE_LIMIT_MS;

// ── API key management ────────────────────────────────────────────────────────

interface KeyEntry {
  id: number;
  key: string;
}

interface KeyState {
  date: string;
  usedKeyIds: number[];
}

function loadKeys(): KeyEntry[] {
  const keys: KeyEntry[] = [];
  let i = 1;
  while (true) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (!key) break;
    keys.push({ id: i, key });
    i++;
  }
  return keys;
}

function loadKeyState(): KeyState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as KeyState;
  } catch {
    return { date: "", usedKeyIds: [] };
  }
}

function saveKeyState(state: KeyState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getAvailableKeys(keys: KeyEntry[]): KeyEntry[] {
  const state = loadKeyState();
  const today = todayString();
  const usedToday = state.date === today ? new Set(state.usedKeyIds) : new Set<number>();
  return keys.filter((k) => !usedToday.has(k.id));
}

function markKeyUsed(id: number): void {
  const state = loadKeyState();
  const today = todayString();
  if (state.date !== today) {
    saveKeyState({ date: today, usedKeyIds: [id] });
  } else if (!state.usedKeyIds.includes(id)) {
    state.usedKeyIds.push(id);
    saveKeyState(state);
  }
}

// ── Quota error ───────────────────────────────────────────────────────────────

class QuotaExceededError extends Error {
  constructor() {
    super("Gemini daily quota exceeded");
    this.name = "QuotaExceededError";
  }
}

function shouldRotateKey(err: unknown): boolean {
  if (!err) return false;

  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  const errorObj = err as { status?: number | string; code?: number | string };
  const status = errorObj.status || errorObj.code;

  // 429: Quota exceeded
  // 503: High demand / Service Unavailable
  const isRetryableStatus = status === 429 || status === 503 || status === "RESOURCE_EXHAUSTED" || status === "UNAVAILABLE";
  const isRetryableMessage = msg.includes("429") || msg.includes("503") || msg.includes("quota") || msg.includes("high demand") || msg.includes("resource_exhausted") || msg.includes("unavailable");

  return isRetryableStatus || isRetryableMessage;
}

// ── Gemini prompt ─────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are a car identification expert. Given a photo, identify the primary car subject and return a JSON object with exactly these fields:

{
  "make": "string — the manufacturer (e.g. Ford, Toyota, Ferrari)",
  "model": "string — the model name (e.g. Mustang, Supra, F40)",
  "year": number or null — best estimate of model year; null if you truly cannot tell,
  "trim": "string — specific trim if clearly identifiable from the image, otherwise empty string",
  "body_style": "one of: coupe, sedan, convertible, hatchback, wagon, suv, truck, van, roadster",
  "confidence": number between 0 and 1 — your confidence in the identification (0.9 = high, 0.6 = medium, 0.3 = low),
  "is_logo_visible": boolean — true if the manufacturer badge or logo is clearly visible on the car,
  "is_model_name_visible": boolean — true if the model name text is clearly legible on the car body,
  "has_multiple_vehicles": boolean — true if two or more distinct vehicles appear in the image,
  "is_face_visible": boolean — true if any human face is visible in the image,
  "is_vehicle_unmodified": boolean — true if the vehicle appears to be stock/unmodified; false if clearly modified (body kit, custom paint, aftermarket wheels, roll cage, racing livery, etc.),
  "categories": ["array of applicable slugs from: classic, muscle, supercar, exotic, rare, sports, european, family, compact, race, rally, jdm, luxury, electric, concept, sea, china — pick all that apply, or empty array if none fit"],
  "notes": "string — anything uncertain or worth flagging for manual review, otherwise empty string"
}

Rules:
- Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.
- If multiple cars are visible, identify the most prominent one.
- If you cannot identify the car at all, return the object with empty strings and null year and confidence 0.1.
- Use the full 0.0–1.0 confidence range honestly. Reserve 0.85–1.0 for cases where make, model, AND year are all clearly identifiable. Use 0.5–0.84 for partial identification (e.g. make is clear but year range is wide). Use 0.2–0.49 when the identification is a plausible guess. Use below 0.2 when you are largely uncertain.
- If less than 40% of the car body is visible in the frame (e.g. heavily cropped, partially obscured, or a very distant shot), reduce your confidence by at least 0.2 from what you would otherwise assign.
- Cars manufactured before 1960 are rare and easy to misidentify. If the car appears to be from before 1960, reduce your confidence by at least 0.15 from what you would otherwise assign.`;

const REVIEW_INSTRUCTION = `${SYSTEM_INSTRUCTION}

IMPORTANT: This is a SECOND OPINION review. A previous AI scan may have misidentified this car. 
Be extremely careful. Pay close attention to:
- Distinctive badges, emblems, or text on the body.
- Headlight and taillight shapes.
- Wheel designs (if they look like stock wheels).
- The overall silhouette and proportions.
- Any details mentioned in the 'notes' field of the previous scan if provided.
If you are unsure, provide a low confidence score. If you are certain it is different from a common misidentification, explain why in the 'notes'.`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeminiTag {
  make: string;
  model: string;
  year: number | null;
  trim: string;
  body_style: string;
  confidence: number;
  is_logo_visible: boolean;
  is_model_name_visible: boolean;
  has_multiple_vehicles: boolean;
  is_face_visible: boolean;
  is_vehicle_unmodified: boolean;
  categories: string[];
  notes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Image loading ─────────────────────────────────────────────────────────────

async function imageToBase64(cloudinaryPublicId: string): Promise<{ base64: string; mimeType: string } | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn("  CLOUDINARY_CLOUD_NAME not set");
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

async function tagImage(ai: GoogleGenAI, cloudinaryPublicId: string, isReview: boolean = false): Promise<GeminiTag | null> {
  const image = await imageToBase64(cloudinaryPublicId);
  if (!image) return null;
  const { base64, mimeType } = image;

  let result;
  try {
    const modelName = usePro ? "gemini-2.5-pro" : "gemini-2.5-flash";
    result = await ai.models.generateContent({
      model: modelName,
      config: {
        systemInstruction: isReview ? REVIEW_INSTRUCTION : SYSTEM_INSTRUCTION,
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
  } catch (err) {
    if (shouldRotateKey(err)) throw new QuotaExceededError();
    console.error(`  Error calling Gemini for ${cloudinaryPublicId}:`, err);
    return null;
  }

  const text = result.text ?? "";

  if (!text) {
    const reason = result.candidates?.[0]?.finishReason ?? "unknown";
    console.warn(`  Empty response (finishReason: ${reason}) for ${cloudinaryPublicId}`);
    return null;
  }

  try {
    return JSON.parse(text) as GeminiTag;
  } catch {
    console.warn(`  Could not parse response for ${cloudinaryPublicId}:`, text.slice(0, 300));
    return null;
  }
}

// ── Autopublish ───────────────────────────────────────────────────────────────

const AUTOPUBLISH_CONFIDENCE_THRESHOLD = 0.95;

const VALID_BODY_STYLES = [
  "coupe", "sedan", "convertible", "hatchback", "wagon",
  "suv", "truck", "pickup", "van", "roadster", "targa", "compact", "special_purpose",
];

async function autopublish(prisma: PrismaClient, stagingId: string, tag: GeminiTag): Promise<boolean> {
  if (!tag.make || !tag.model || !tag.year) return false;

  const origin = lookupMakeOrigin(tag.make);
  if (!origin) {
    console.log(`    ↳ Autopublish skipped — unknown make origin for "${tag.make}"`);
    return false;
  }

  const region = await prisma.region.findUnique({ where: { slug: origin.regionSlug } });
  if (!region) {
    console.log(`    ↳ Autopublish skipped — region not found: "${origin.regionSlug}"`);
    return false;
  }

  const staging = await prisma.stagingImage.findUnique({ where: { id: stagingId } });
  if (!staging || staging.status === "PUBLISHED") return false;

  const bodyStyle = tag.body_style && VALID_BODY_STYLES.includes(tag.body_style)
    ? tag.body_style
    : "sedan";

  const vehicle = await prisma.vehicle.create({
    data: {
      make: tag.make,
      model: tag.model,
      year: tag.year,
      trim: tag.trim || null,
      countryOfOrigin: origin.countryOfOrigin,
      regionId: region.id,
      bodyStyle: bodyStyle as never,
      era: "modern",
      rarity: "common",
    },
  });

  if (tag.categories?.length) {
    const matchedCategories = await prisma.category.findMany({
      where: { slug: { in: tag.categories } },
    });
    if (matchedCategories.length > 0) {
      await prisma.vehicleCategory.createMany({
        data: matchedCategories.map((c) => ({ vehicleId: vehicle.id, categoryId: c.id })),
      });
    }
  }

  const image = await prisma.image.create({
    data: {
      vehicleId: vehicle.id,
      filename: staging.cloudinaryPublicId,
      sourceUrl: staging.sourceUrl,
      attribution: staging.attribution,
      copyrightHolder: staging.adminCopyrightHolder ?? null,
      isCropped: staging.adminIsCropped ?? false,
      isLogoVisible: staging.adminIsLogoVisible ?? tag.is_logo_visible,
      isModelNameVisible: staging.adminIsModelNameVisible ?? tag.is_model_name_visible,
      hasMultipleVehicles: staging.adminHasMultipleVehicles ?? tag.has_multiple_vehicles,
      isFaceVisible: staging.adminIsFaceVisible ?? tag.is_face_visible,
      isVehicleUnmodified: staging.adminIsVehicleUnmodified ?? tag.is_vehicle_unmodified,
      isActive: true,
      isHardcoreEligible: false,
    },
  });

  await prisma.imageStats.create({ data: { imageId: image.id } });

  await prisma.stagingImage.update({
    where: { id: stagingId },
    data: {
      adminMake: tag.make,
      adminModel: tag.model,
      adminYear: tag.year,
      adminRegionSlug: origin.regionSlug,
      adminCountryOfOrigin: origin.countryOfOrigin,
      status: "PUBLISHED",
      reviewedAt: new Date(),
    },
  });

  await prisma.knownMake.upsert({
    where: { name: tag.make },
    create: { name: tag.make },
    update: {},
  });
  await prisma.knownModel.upsert({
    where: { make_name: { make: tag.make, name: tag.model } },
    create: { make: tag.make, name: tag.model },
    update: {},
  });

  console.log(`    ↳ Autopublished → vehicleId: ${vehicle.id}, imageId: ${image.id}`);
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (resetKeys) {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log("Key state reset. All keys are now available.");
    }
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("Missing CLOUDINARY_CLOUD_NAME — add it to your .env file");
    process.exit(1);
  }

  const allKeys = loadKeys();
  if (allKeys.length === 0) {
    console.error("No Gemini API keys found — set GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... in your .env file");
    process.exit(1);
  }

  const availableKeys = getAvailableKeys(allKeys);
  if (availableKeys.length === 0) {
    console.log(`All ${allKeys.length} API key(s) have already been used today. Try again tomorrow.`);
    process.exit(0);
  }

  console.log(`Found ${allKeys.length} key(s), ${availableKeys.length} available today.`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const queryWhere: Prisma.StagingImageWhereInput = {
    status: status ? (status as StagingStatus) : { in: ["PENDING_REVIEW", "COMMUNITY_REVIEW", "READY"] }
  };

  if (review) {
    // Review mode: target images that ARE already tagged
    // and haven't been manually reviewed yet by an admin
    queryWhere.aiTaggedAt = { not: null };
    queryWhere.reviewedAt = null;
    queryWhere.adminMake = null;
    
    if (minConfidence !== undefined) {
      queryWhere.aiConfidence = { lt: minConfidence };
      console.log(`Review mode: getting a second opinion for images with AI confidence < ${minConfidence}...`);
    } else {
      console.log("Review mode: getting a second opinion for already-tagged images...");
    }
  } else if (!force) {
    queryWhere.aiTaggedAt = null;
  } else if (minConfidence !== undefined) {
    queryWhere.OR = [
      { aiTaggedAt: null },
      { aiConfidence: { lt: minConfidence } }
    ];
  }

  const untagged = await prisma.stagingImage.findMany({
    where: queryWhere,
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
    ...(skip ? { skip: skip } : {}),
  });

  if (untagged.length === 0) {
    console.log(review 
      ? "No images found for review." 
      : "No untagged staging images found. Run stage-images.ts first, or all images are already tagged.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`Tagging up to ${untagged.length} image(s)${skip ? ` (skipping first ${skip})` : ""}...`);

  let keyIndex = 0;
  let ai = new GoogleGenAI({ apiKey: availableKeys[keyIndex].key });
  console.log(`Using key GEMINI_API_KEY_${availableKeys[keyIndex].id}`);

  let tagged = 0;
  let failed = 0;

  for (let i = 0; i < untagged.length; i++) {
    const record = untagged[i];
    console.log(`[${i + 1}/${untagged.length}] Processing ${record.filename} (${record.cloudinaryPublicId})`);

    let tag: GeminiTag | null = null;

    try {
      tag = await tagImage(ai, record.cloudinaryPublicId, review);
    } catch (err) {
      if (!(err instanceof QuotaExceededError)) {
        console.error(`  Unexpected error processing ${record.filename}:`, err);
        failed++;
        continue;
      }

      markKeyUsed(availableKeys[keyIndex].id);
      console.warn(`  Key GEMINI_API_KEY_${availableKeys[keyIndex].id} quota exceeded.`);
      keyIndex++;

      if (keyIndex >= availableKeys.length) {
        console.log("All available API keys exhausted for today. Stopping.");
        failed += untagged.length - i;
        break;
      }

      ai = new GoogleGenAI({ apiKey: availableKeys[keyIndex].key });
      console.log(`  Switched to key GEMINI_API_KEY_${availableKeys[keyIndex].id} — retrying image.`);
      
      // Retry this same image with the new key
      i--;
      continue;
    }

    if (!tag) {
      console.warn(`  Failed to tag image ${record.filename}`);
      failed++;
    } else {
      try {
        const isDifferent = record.aiMake !== tag.make || record.aiModel !== tag.model || record.aiYear !== tag.year;
        
        if (review) {
          if (isDifferent) {
            console.log(`  [CHANGE] Previously: ${record.aiMake} ${record.aiModel} ${record.aiYear || "?"} (conf: ${record.aiConfidence})`);
            console.log(`           Now:        ${tag.make} ${tag.model} ${tag.year || "?"} (conf: ${tag.confidence})`);
          } else {
            console.log(`  [SAME] Confirmed as ${tag.make} ${tag.model} ${tag.year || "?"} (old conf: ${record.aiConfidence}, new conf: ${tag.confidence})`);
          }
        }

        let newAdminNotes = record.adminNotes;
        if (review && isDifferent) {
          const changeNote = `[AI Review] Changed from ${record.aiMake} ${record.aiModel} (${record.aiYear}) to ${tag.make} ${tag.model} (${tag.year}). Previous confidence: ${record.aiConfidence}`;
          newAdminNotes = record.adminNotes ? `${record.adminNotes}\n${changeNote}` : changeNote;
        } else if (!review && record.adminNotes === null && tag.notes) {
          newAdminNotes = `[AI] ${tag.notes}`;
        }

        await prisma.stagingImage.update({
          where: { id: record.id },
          data: {
            aiMake:       tag.make || null,
            aiModel:      tag.model || null,
            aiYear:       tag.year,
            aiBodyStyle:  tag.body_style || null,
            aiConfidence: tag.confidence,
            aiTaggedAt:   new Date(),
            // Boolean flags: only set when admin hasn't already reviewed them
            ...(record.adminIsLogoVisible        === null ? { adminIsLogoVisible:        tag.is_logo_visible        } : {}),
            ...(record.adminIsModelNameVisible   === null ? { adminIsModelNameVisible:   tag.is_model_name_visible  } : {}),
            ...(record.adminHasMultipleVehicles  === null ? { adminHasMultipleVehicles:  tag.has_multiple_vehicles  } : {}),
            ...(record.adminIsFaceVisible        === null ? { adminIsFaceVisible:        tag.is_face_visible        } : {}),
            ...(record.adminIsVehicleUnmodified  === null ? { adminIsVehicleUnmodified:  tag.is_vehicle_unmodified  } : {}),
            // Don't overwrite human edits on categories or notes
            ...(record.adminCategories.length === 0 && tag.categories?.length
              ? { adminCategories: tag.categories }
              : {}),
            adminNotes: newAdminNotes,
          },
        });

        const yearStr = tag.year ? String(tag.year) : "?";
        if (!review) {
          console.log(`  → ${tag.make} ${tag.model} ${yearStr} (confidence: ${tag.confidence})${tag.notes ? ` — ${tag.notes}` : ""}`);
        }
        console.log(`  Tagged image: ${record.filename}`); // Keyword for GA summary
        tagged++;

        if (tag.confidence >= AUTOPUBLISH_CONFIDENCE_THRESHOLD) {
          await autopublish(prisma, record.id, tag);
        }
      } catch (dbErr) {
        console.error(`  Database error updating ${record.filename}:`, dbErr);
        failed++;
      }
    }

    if (i < untagged.length - 1) {
      await sleep(effectiveRateLimit);
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
