import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/app/lib/prisma";
import { imageUrl } from "@/app/lib/game";
import { computePhash, hammingDistance } from "@/app/lib/phash";

// Allow longer execution time for large scans on Vercel
export const maxDuration = 60;

type Algorithm = "md5" | "sha1" | "sha256" | "phash";

const VALID_ALGORITHMS: Algorithm[] = ["md5", "sha1", "sha256", "phash"];

interface ScannedImage {
  id: string;
  url: string;
  filename: string;
  source: "staging" | "published";
  label: string;
}

interface DuplicateGroup {
  hash: string;
  distance?: number;
  images: {
    id: string;
    filename: string;
    imageUrl: string;
    source: "staging" | "published";
    label: string;
  }[];
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function groupByCryptoHash(
  algorithm: "md5" | "sha1" | "sha256",
  results: PromiseSettledResult<Buffer>[],
  records: ScannedImage[],
  fetchErrors: string[]
): DuplicateGroup[] {
  const hashMap = new Map<string, ScannedImage[]>();

  for (let i = 0; i < records.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      fetchErrors.push(`${records[i].filename}: ${String(result.reason)}`);
      continue;
    }
    const hash = createHash(algorithm).update(result.value).digest("hex");
    const group = hashMap.get(hash) ?? [];
    group.push(records[i]);
    hashMap.set(hash, group);
  }

  return Array.from(hashMap.entries())
    .filter(([, imgs]) => imgs.length > 1)
    .map(([hash, imgs]) => ({
      hash,
      images: imgs.map((r) => ({
        id: r.id,
        filename: r.filename,
        imageUrl: r.url,
        source: r.source,
        label: r.label,
      })),
    }));
}

async function groupByPhash(
  threshold: number,
  results: PromiseSettledResult<Buffer>[],
  records: ScannedImage[],
  fetchErrors: string[]
): Promise<{ groups: DuplicateGroup[]; scanned: number }> {
  // Compute hashes in parallel
  const hashResults = await Promise.allSettled(
    results.map((result, i) => {
      if (result.status === "rejected") {
        fetchErrors.push(`${records[i].filename}: ${String(result.reason)}`);
        return Promise.reject(result.reason);
      }
      return computePhash(result.value);
    })
  );

  const hashes: { record: ScannedImage; hash: string }[] = [];
  for (let i = 0; i < records.length; i++) {
    const r = hashResults[i];
    if (r.status === "rejected") {
      // fetch errors already recorded above; only log pHash-specific failures
      if (results[i].status === "fulfilled") {
        fetchErrors.push(`${records[i].filename}: pHash failed — ${String(r.reason)}`);
      }
      continue;
    }
    hashes.push({ record: records[i], hash: r.value });
  }

  // Greedy clustering by Hamming distance
  const used = new Set<number>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < hashes.length; i++) {
    if (used.has(i)) continue;
    const cluster: (typeof hashes)[number][] = [hashes[i]];
    let maxDist = 0;

    for (let j = i + 1; j < hashes.length; j++) {
      if (used.has(j)) continue;
      const dist = hammingDistance(hashes[i].hash, hashes[j].hash);
      if (dist <= threshold) {
        cluster.push(hashes[j]);
        used.add(j);
        maxDist = Math.max(maxDist, dist);
      }
    }

    if (cluster.length > 1) {
      used.add(i);
      groups.push({
        hash: hashes[i].hash,
        distance: maxDist,
        images: cluster.map(({ record }) => ({
          id: record.id,
          filename: record.filename,
          imageUrl: record.url,
          source: record.source,
          label: record.label,
        })),
      });
    }
  }

  return { groups, scanned: hashes.length };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const algorithm = (searchParams.get("algorithm") ?? "sha256") as Algorithm;
  const threshold = Math.max(1, Math.min(32, parseInt(searchParams.get("threshold") ?? "10", 10)));

  if (!VALID_ALGORITHMS.includes(algorithm)) {
    return Response.json({ error: "Invalid algorithm" }, { status: 400 });
  }

  const [stagingImages, publishedImages] = await Promise.all([
    prisma.stagingImage.findMany({
      where: { status: { not: "REJECTED" } },
      select: {
        id: true,
        cloudinaryPublicId: true,
        filename: true,
        adminMake: true,
        adminModel: true,
        adminYear: true,
        aiMake: true,
        aiModel: true,
        aiYear: true,
        status: true,
      },
    }),
    prisma.image.findMany({
      select: {
        id: true,
        filename: true,
        vehicleId: true,
        vehicle: { select: { make: true, model: true, year: true } },
      },
    }),
  ]);

  const records: ScannedImage[] = [
    ...stagingImages.map((img) => {
      const make = img.adminMake ?? img.aiMake ?? "";
      const model = img.adminModel ?? img.aiModel ?? "";
      const year = img.adminYear ?? img.aiYear ?? "";
      const label = [year, make, model].filter(Boolean).join(" ") || img.filename;
      return {
        id: img.id,
        url: imageUrl(img.cloudinaryPublicId, img.id),
        filename: img.filename,
        source: "staging" as const,
        label: `[${img.status}] ${label}`,
      };
    }),
    ...publishedImages.map((img) => ({
      id: img.id,
      url: imageUrl(img.filename, img.vehicleId),
      filename: img.filename,
      source: "published" as const,
      label: `${img.vehicle.year} ${img.vehicle.make} ${img.vehicle.model}`,
    })),
  ];

  // Fetch all image bytes in parallel
  const fetchResults = await Promise.allSettled(records.map((r) => fetchBuffer(r.url)));

  const fetchErrors: string[] = [];

  if (algorithm === "phash") {
    const { groups, scanned } = await groupByPhash(threshold, fetchResults, records, fetchErrors);
    return Response.json({
      algorithm,
      threshold,
      scanned,
      total: records.length,
      duplicateGroups: groups,
      fetchErrors,
    });
  }

  const groups = groupByCryptoHash(algorithm, fetchResults, records, fetchErrors);
  const scanned = records.length - fetchErrors.length;
  return Response.json({
    algorithm,
    scanned,
    total: records.length,
    duplicateGroups: groups,
    fetchErrors,
  });
}
