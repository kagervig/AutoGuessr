# AutoGuessr

A car identification game. Players are shown a photo of a car and must identify the make, model, and year.

## Prerequisites

- Node.js 20+
- A PostgreSQL database (e.g. [Neon](https://neon.tech))
- A Cloudinary account — only required if you want to load real car images

## Local setup

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

Copy `.env` to `.env.local` and fill in your values:

```bash
cp .env .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Yes | Password for the `/admin` panel |
| `CLOUDINARY_CLOUD_NAME` | No | Omit to use placeholder images locally (see below) |
| `CLOUDINARY_API_KEY` | No | Required only if uploading images |
| `CLOUDINARY_API_SECRET` | No | Required only if uploading images |

**3. Generate the Prisma client**

```bash
npx prisma generate
```

**4. Apply the schema**

```bash
npx prisma db push
```

**5. Seed the database**

```bash
npx prisma db seed
```

This creates categories, regions, feature flags, and ~20 sample vehicles.

**6. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Images in local development

If `CLOUDINARY_CLOUD_NAME` is not set, the game uses [Lorem Picsum](https://picsum.photos) placeholder images — one stable image per vehicle. This is sufficient to play through all game modes locally.

If `CLOUDINARY_CLOUD_NAME` is set, the game will try to load images from Cloudinary. The seed data creates placeholder filename records that don't exist in Cloudinary, so images will fail to load. Either omit the variable for local testing, or import real images first (see below).

## Importing real images

Once you have car images and Cloudinary credentials configured, use the import script:

```bash
npx tsx scripts/import-cars.ts --file ./path/to/cars.csv
```

The CSV must include a header row with these columns:

```
make, model, year, trim, country_of_origin, region_slug, body_style, era, rarity,
categories, source_url, attribution, is_hardcore_eligible, image_path
```

See `scripts/import-cars.ts` for the full column spec and available flags (`--dry-run`, `--skip-existing`).

## Admin panel

The admin panel is available at [http://localhost:3000/admin](http://localhost:3000/admin). Use HTTP Basic Auth with the username `admin` and the `ADMIN_PASSWORD` you configured.
