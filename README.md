# AutoGuessr

A car identification game. Players are shown a photo of a car and must identify the make, model, and year.

## Architecture

- **Next.js** (app router) — frontend and all API routes, deployed to Vercel
- **PostgreSQL** (e.g. [Neon](https://neon.tech)) — game state, vehicles, staging images
- **Cloudinary** — image storage and delivery
- **Gemini** — AI tagging of staged images

## Prerequisites

- Node.js 20+
- A PostgreSQL database
- A Cloudinary account
- A Gemini API key (for AI tagging)

## Local setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

Copy `.env.example` to `.env` and fill in your values:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Password for the `/admin` panel |
| `CLOUDINARY_CLOUD_NAME` | No | Omit to use placeholder images locally |
| `CLOUDINARY_API_KEY` | No | Required only when uploading images |
| `CLOUDINARY_API_SECRET` | No | Required only when uploading images |
| `GEMINI_API_KEY` | No | Required only for AI tagging |

**3. Apply the schema and seed**

```bash
npx prisma db push
npx prisma db seed
```

The seed creates categories, regions, feature flags, and ~20 sample vehicles.

**4. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Images in local development

If `CLOUDINARY_CLOUD_NAME` is not set, the game uses [Lorem Picsum](https://picsum.photos) placeholder images — one stable image per vehicle. This is sufficient to play through all game modes locally.

## Image ingestion pipeline

The full pipeline for getting real images into the game:

### Step 1 — Prepare local images

Rename all files to random 8-digit names and compress to under 1 MB:

```bash
python3 Data/rename_images.py
```

Converts HEIC and PNG to JPEG. Skips MOV files. Requires `sips` (macOS built-in).

### Step 2 — Upload to staging

```bash
npx tsx scripts/stage-images.ts --folder ./Data/Images
```

Uploads every image to Cloudinary under `autoguessr/staging/` and creates a `StagingImage` record for each one. Skips files that already have a DB record. Use `--dry-run` to preview without writing anything.

> **Note:** The script must be run against the same `DATABASE_URL` that your deployment uses. If images appear in Cloudinary but not in the admin panel, the DB URL in `.env` likely points to a different database than the one Vercel is using.

### Step 3 — AI tagging

```bash
npx tsx scripts/tag-images.ts [--limit N]
```

Sends untagged staging images to Gemini 2.5 Flash and writes `aiMake`, `aiModel`, `aiYear`, `aiBodyStyle`, and `aiConfidence` back to the DB. Safe to re-run — already-tagged images are skipped.

- If the image exists in `Data/Images/`, it is read from disk. Otherwise the script fetches it from Cloudinary.
- To force Cloudinary fetching (e.g. after deleting local files), remove or rename `Data/Images/`.
- Requires `GEMINI_API_KEY` in `.env`.

### Step 4 — Review in the admin panel

Go to `/admin`. Each staged image shows its AI-suggested tags and any community suggestions. From here you can edit the vehicle details, send images to community review, or publish directly.

Publishing creates the `Vehicle` and `Image` DB records that make the image available in the game.

### Alternative: import from CSV

If you have a CSV with vehicle metadata already prepared, you can skip staging and import directly:

```bash
npx tsx scripts/import-cars.ts --file ./path/to/cars.csv [--dry-run] [--skip-existing]
```

CSV columns: `make, model, year, trim, country_of_origin, region_slug, body_style, era, rarity, categories, source_url, attribution, is_hardcore_eligible, image_path`

## Database maintenance

### Find and merge duplicate vehicles

The game displays answer choices as `make model` (e.g. "Ford Mustang") with no year, so two Vehicle records with the same make+model will appear as identical choices. Run this periodically, or any time you suspect duplicates:

```bash
# Preview what would be merged (no changes written)
npx tsx scripts/dedupe-vehicles.ts

# Apply the merges
npx tsx scripts/dedupe-vehicles.ts --apply
```

For each group of duplicates, the vehicle with the most images is kept as the primary. All images, categories, aliases, and guesses from the other records are reassigned to it, then the duplicates are deleted.

The answer-choice selection logic also deduplicates by `make+model` at query time, so even if duplicates exist in the DB they will not appear as two identical choices in the same question. Running the dedupe script is still recommended to keep the vehicle table clean.

## Admin panel

Available at `/admin`. HTTP Basic Auth — username `admin`, password is `ADMIN_PASSWORD` from your environment.
