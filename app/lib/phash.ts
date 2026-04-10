// Perceptual hashing (pHash) using the DCT method.
//
// Algorithm:
//   1. Resize image to 32x32 grayscale (via sharp)
//   2. Apply 2D DCT over the pixel grid
//   3. Extract the top-left 8x8 DCT coefficients
//   4. Compute median of the 63 non-DC coefficients
//   5. Build a 64-bit hash: 1 if coefficient > median, else 0
//
// Two hashes are "similar" when their Hamming distance is below a threshold
// (typically 10 out of 64 bits).

const RESIZE_SIZE = 32;
const HASH_BLOCK = 8;

// 1D Type-II DCT (orthonormal form).
// Exported for unit testing.
export function dct1d(signal: number[]): number[] {
  const N = signal.length;
  return Array.from({ length: N }, (_, k) => {
    const scale = k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
    const sum = signal.reduce(
      (acc, s, n) => acc + s * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N)),
      0
    );
    return scale * sum;
  });
}

// 2D DCT via row/column separability.
function dct2d(pixels: number[], size: number): number[][] {
  const rowDct = Array.from({ length: size }, (_, r) =>
    dct1d(Array.from({ length: size }, (_, c) => pixels[r * size + c]))
  );
  const result: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  for (let c = 0; c < size; c++) {
    const colDct = dct1d(rowDct.map((row) => row[c]));
    for (let r = 0; r < size; r++) {
      result[r][c] = colDct[r];
    }
  }
  return result;
}

// Count the number of bit positions where a and b differ.
// Exported for unit testing.
export function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

// Compute the perceptual hash of an image buffer.
// Returns a 64-bit hash as a bigint.
export async function computePhash(buffer: Buffer): Promise<bigint> {
  const sharp = (await import("sharp")).default;

  const raw = await sharp(buffer)
    .resize(RESIZE_SIZE, RESIZE_SIZE)
    .grayscale()
    .raw()
    .toBuffer();

  const pixels = Array.from(raw);
  const dct = dct2d(pixels, RESIZE_SIZE);

  // Flatten the top-left HASH_BLOCK x HASH_BLOCK DCT coefficients
  const values: number[] = [];
  for (let r = 0; r < HASH_BLOCK; r++) {
    for (let c = 0; c < HASH_BLOCK; c++) {
      values.push(dct[r][c]);
    }
  }

  // Median excludes the DC component (index 0) since it represents average brightness
  const nonDc = values.slice(1);
  const sorted = [...nonDc].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Build 64-bit hash
  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    if (values[i] > median) {
      hash |= 1n << BigInt(63 - i);
    }
  }

  return hash;
}
