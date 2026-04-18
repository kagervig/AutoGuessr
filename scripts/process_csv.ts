import "dotenv/config";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { GoogleGenAI } from "@google/genai";
import { lookupMakeOrigin } from "./lib/make-origins";

const CSV_PATH = "/Users/kristianallin/Downloads/images_to_process.csv";
const LIMIT = 2;
const RATE_LIMIT_MS = 4500;

const SYSTEM_INSTRUCTION = `You are a car identification expert. Given a photo, identify the primary car subject and return a JSON object with exactly these fields:

{
  "make": "string — the manufacturer (e.g. Ford, Toyota, Ferrari)",
  "model": "string — the model name (e.g. Mustang, Supra, F40)",
  "year": number or null — best estimate of model year; null if you truly cannot tell,
  "body_style": "one of: coupe, sedan, convertible, hatchback, wagon, suv, truck, van, roadster",
  "rarity": "one of: common, uncommon, rare, ultra_rare",
  "is_logo_visible": boolean,
  "is_model_name_visible": boolean,
  "has_multiple_vehicles": boolean,
  "is_face_visible": boolean,
  "is_cropped": boolean,
  "notes": "string"
}

Rules:
- Return ONLY valid JSON.
- For rarity, use your best judgment based on global production numbers and presence in common traffic.
- is_cropped: true if the vehicle is significantly cut off or it is a detail shot.
`;

interface GeminiTag {
  make: string;
  model: string;
  year: number | null;
  body_style: string;
  rarity: string;
  is_logo_visible: boolean;
  is_model_name_visible: boolean;
  has_multiple_vehicles: boolean;
  is_face_visible: boolean;
  is_cropped: boolean;
}

function loadKeys() {
  const keys = [];
  let i = 1;
  while (process.env[`GEMINI_API_KEY_${i}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${i}`]);
    i++;
  }
  return keys;
}

const keys = loadKeys();
let keyIndex = 0;
let ai = new GoogleGenAI({ apiKey: keys[keyIndex] });

async function tagImage(imageUrl: string): Promise<GeminiTag | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = response.headers.get("content-type") || "image/jpeg";

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Use 2.0 flash as it's generally available and fast
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: "Identify this car." },
          ],
        },
      ],
    });

    return JSON.parse(result.text || "{}") as GeminiTag;
  } catch (err) {
    const error = err as Error;
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      keyIndex++;
      if (keyIndex < keys.length) {
        console.log(`Switching to key ${keyIndex + 1}`);
        ai = new GoogleGenAI({ apiKey: keys[keyIndex] });
        return tagImage(imageUrl);
      }
    }
    console.error(`Error tagging image: ${error.message}`);
    return null;
  }
}

function getEra(year: number | null): string {
  if (!year) return "";
  if (year < 1975) return "classic";
  if (year <= 1999) return "retro";
  if (year <= 2015) return "modern";
  return "contemporary";
}

function mapRegion(slug: string): string {
  const mapping: Record<string, string> = {
    "north_america": "north_america",
    "europe": "europe",
    "jdm": "jdm",
    "uk": "uk",
    "east_asia": "east_asia",
    "australia": "aus-nz",
    "south_america": "south_asia", // Best guess for mapping if not found
  };
  return mapping[slug] || slug;
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parse(content, { columns: false, skip_empty_lines: true, relax_column_count: true });
  const header = rows[0];
  const data = rows.slice(1);

  let processedCount = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < data.length && processedCount < LIMIT; i++) {
    const row = data[i];
    if (row[6]) continue; // aiMake is at index 6
    if (row[23] === "REJECTED" || row[23] === "PUBLISHED") continue;

    const imageUrl = row[2]; // Image URL is at index 2
    console.log(`[${processedCount + 1}/${LIMIT}] Processing ${imageUrl}...`);

    const tag = await tagImage(imageUrl);
    if (tag && tag.make) {
      row[6] = tag.make;
      row[7] = tag.model;
      row[8] = tag.year?.toString() || "";
      row[9] = tag.body_style;
      row[10] = "0.98";
      row[11] = now;

      row[27] = getEra(tag.year); // adminEra
      row[28] = "f"; // adminIsHardcoreEligible
      row[29] = tag.rarity || "common";
      
      const origin = lookupMakeOrigin(tag.make);
      if (origin) {
        row[30] = mapRegion(origin.regionSlug);
        row[31] = origin.countryOfOrigin;
      }

      row[32] = "Pexels"; // adminCopyrightHolder
      row[33] = tag.is_cropped ? "t" : "f";
      row[34] = tag.is_logo_visible ? "t" : "f";
      row[35] = tag.is_model_name_visible ? "t" : "f";
      row[36] = tag.has_multiple_vehicles ? "t" : "f";
      row[37] = tag.is_face_visible ? "t" : "f";
      row[38] = "t"; // adminIsVehicleUnmodified

      processedCount++;
      console.log(`  -> Identified as ${tag.make} ${tag.model} (${tag.year})`);

      // Write back periodically to avoid losing progress
      if (processedCount % 10 === 0) {
        const output = [header, ...data].map(r => r.map((cell: string) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
        fs.writeFileSync(CSV_PATH, output);
      }

      if (processedCount < LIMIT) {
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
      }
    } else {
      console.log(`  -> Failed to identify image.`);
    }
  }

  const finalOutput = [header, ...data].map(r => r.map((cell: string) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
  fs.writeFileSync(CSV_PATH, finalOutput);
  console.log(`\nFinished. Processed ${processedCount} images.`);
}

main().catch(console.error);
