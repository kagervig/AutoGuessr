# AutoGuessr

A car identification game. Players are shown a photo of a car and must identify the make, model, and year.

## Architecture

- **Next.js** (app router) — frontend and all API routes, deployed to Vercel
- **PostgreSQL** (e.g. [Neon](https://neon.tech)) — game state, vehicles, staging images
- **Cloudinary** — image storage and delivery
- **Gemini** — AI tagging of staged images

## Prerequisites

- Node.js 20+
- Docker (for the local database)
- A Cloudinary account
- A Gemini API key (for AI tagging)

## Running locally

After initial setup, start the database and dev server:

```bash
npm run db:up
npm run dev
```

## Initial setup

**1. Install Docker**

Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/), then start it.

**2. Install dependencies**

```bash
npm install
```

> runs `prisma generate` to regenerate the Prisma client.

**3. Configure environment**

Copy `.env.local.example` to `.env.local` and fill in your values:

**4. Start the local database**

```bash
npm run db:up
npx prisma migrate deploy
```

**5. Populate with data**

To populate with a subset of real production data (includes real Cloudinary image filenames):

```bash
PROD_DATABASE_URL="<prod connection string>" npm run db:dump
```

The number controls how many vehicles to pull (defaults to 200). Vehicles are selected by most active images first.

**6. Seed the staging table**

```bash
npm run db:seed
```

Populates `StagingImage` with all images from the database. All images default to `PUBLISHED`; a random sample of 4 per status is assigned to each of the other statuses (`PENDING_REVIEW`, `COMMUNITY_REVIEW`, `READY`, `REJECTED`) and removed from the `Image` table to simulate the pre-publish pipeline state.

**7. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running locally

After initial setup, start the database and dev server:

```bash
npm run db:up
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running tests locally

The local database must be running with the schema applied:

```bash
npm run db:up
npx prisma migrate deploy
```

Copy `.env.test.example` to `.env.test` and set `DATABASE_URL` to the same value as in `.env.local`.

Run the full suite:

```bash
npm test
```

Run a single file:

```bash
npx vitest run __tests__/api/game.test.ts
```

Run tests with coverage:

```bash
npm test -- --coverage
```

Coverage is reported for `app/lib/` and `app/api/`. The HTML report is written to `coverage/index.html`.

To reset to a clean state and repopulate:

```bash
npm run db:reset
PROD_DATABASE_URL="<prod connection string>" npm run db:dump
```

## Database migrations

Migrations run automatically on Vercel deploy via `prisma migrate deploy`.

To run migrations manually against production from your local machine, explicitly pass the prod connection string to avoid `.env.local` taking precedence:

```bash
DATABASE_URL="<prod connection string>" npx prisma migrate deploy
```

## Images in local development

If `CLOUDINARY_CLOUD_NAME` is not set, the game uses [Lorem Picsum](https://picsum.photos) placeholder images — one stable image per vehicle. This is sufficient to play through all game modes locally.

### Admin panel local dev

The seed script (`npx prisma db seed`) creates staging fixtures in every status — `PENDING_REVIEW`, `READY`, `PUBLISHED`, and `REJECTED` — so all admin workflows (publish, reject, reactivate) can be tested without running the full image ingestion pipeline. The staging images display Lorem Picsum placeholders via the same fallback.

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

## Cloudinary Image Delivery & Signing

The game uses a **Conditional AI-Cropping** strategy to ensure all images (landscape or portrait) fit the 16:9 game viewer without cutting off the car.

### Transformation Logic
We use the `coco_v2_car` model, but only trigger it for "tall" (portrait) images to save AI credits:
`if_ar_lt_1.0/c_fill,g_auto:coco_v2_car,ar_16:9,w_1280/if_end/f_auto,q_auto`

- **Landscape images:** Served via standard optimization (0 AI credits).
- **Portrait images:** AI identifies the car and re-crops to 16:9 (1 AI credit per image).

### Signed URLs
To bypass Cloudinary security restrictions and allow access to AI add-ons without opening your account to unsigned transformations, all game images use **Signed URLs**.

**1. Generate/Refresh Signatures**
Signatures are pre-calculated and stored in the database. If you rotate your Cloudinary API Secret, you must re-run this script:
```bash
npx tsx scripts/update-image-signatures.ts
```

**2. Frontend Usage**
The `imageUrl` helper in `app/lib/game.ts` automatically handles the construction of the signed URL if a `transformationSignature` is provided from the database:
```typescript
const url = imageUrl(image.filename, image.vehicleId, image.transformationSignature);
```

### Testing Transformations
A dedicated test page is available at `/test-cropping`. It allows you to compare 5 different cropping modes side-by-side, including the "Conditional COCO v2" mode used in the game. It generates signatures on-the-fly for the test set using server-side credentials.

### Crop Review Tool
Located in the Admin Panel under the **Crop Review** tab. This tool is used to audit published images to ensure they crop correctly for the 16:9 game viewer.

- **Purpose:** Specifically identifies "problem" images (usually portraits) where the car is cropped out of frame.
- **Features:**
  - **Comparison View:** Compare the original frame against three cropping methods: Standard (Center), AI-Subject, and Conditional COCO-v2.
  - **Selection:** Admins can select the optimal `cropMethod` for each image, which is saved to the database.
  - **Rejection:** Images that cannot be cropped effectively can be deactivated/rejected directly from the tool.
  - **Persistence:** Progress is saved in `localStorage`, allowing admins to resume where they left off.
- **Conditional COCO-v2:** Note that the COCO-v2 AI model is only triggered for portrait images (AR < 1) in production to conserve AI credits.
