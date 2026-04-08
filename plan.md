# Plan: Image Problem Reporting Feature

## Overview

Users can flag a problem with an image during gameplay. They land on a dedicated report page with:
- All vehicle detail fields (pre-filled with current values), all optional
- A plain-text comment field
- A certainty slider (0–100%)

On submit:
- The image is flagged (`needsReview = true`) in all cases
- If certainty ≥ 75%: image is deactivated (`isActive = false`), removing it from gameplay
- An email is sent to kpallin90@gmail.com with the full report

Admin panel gets a new "Reported" tab showing all images where `needsReview = true`.

---

## Architecture Decisions

- **Email**: Resend (no email provider currently exists; Resend is idiomatic for Next.js)
- **Data model**: Add `needsReview` flag to `Image`; new `ImageReport` model for the report data
- **Image deactivation**: Set `Image.isActive = false` (simplest; takes it out of game rotation without touching the staging pipeline)
- **Report page**: Separate route `/report/[imageId]` (spec says "takes them to a page")
- **Admin panel**: New "Reported" tab alongside staging/makes-models/categories; fetches published images with `needsReview = true` via a new API route

---

## Step-by-Step Blueprint

### Phase 1 — Data layer
1. Extend Prisma schema: add `needsReview` to `Image`, add `ImageReport` model
2. Run migration

### Phase 2 — Email infrastructure
3. Install Resend, create email utility (`app/lib/email.ts`)

### Phase 3 — API routes
4. `GET /api/images/[id]` — fetch image + vehicle details (needed to pre-fill form)
5. `POST /api/report` — create `ImageReport`, set flags, conditionally deactivate, send email
6. `GET /api/admin/reported` — fetch images with `needsReview = true` for admin panel

### Phase 4 — UI
7. Report page: `/app/report/[imageId]/page.tsx` + `ReportForm` client component
8. "Report a problem" link in `GameScreen`
9. "Reported" tab + image list in `AdminPanel`

---

## Prompts

---

### Prompt 1 — Schema changes and migration

```
We're adding an image reporting feature to AutoGuessr (Next.js, Prisma, PostgreSQL).

Make the following changes to `prisma/schema.prisma`:

1. Add `needsReview Boolean @default(false)` to the `Image` model (after `isActive`).

2. Add a new `ImageReport` model after the `Image` model:

model ImageReport {
  id                    String     @id @default(cuid())
  imageId               String
  certainty             Int        // 0–100
  comment               String?
  suggestedMake         String?
  suggestedModel        String?
  suggestedYear         Int?
  suggestedTrim         String?
  suggestedCountryOfOrigin String?
  suggestedBodyStyle    BodyStyle?
  suggestedEra          Era?
  suggestedRarity       Rarity?
  createdAt             DateTime   @default(now())
  image                 Image      @relation(fields: [imageId], references: [id])
}

3. Add `reports ImageReport[]` to the `Image` model relations.

After editing the schema, run:
  npx prisma migrate dev --name add_image_reports

Do not change anything else.
```

---

### Prompt 2 — Resend email utility

```
We're adding email reporting to AutoGuessr. There is no email provider configured yet.

1. Install the Resend package:
   npm install resend

2. Add the following to `.env.local` (just the key name — leave value blank for the user to fill in):
   RESEND_API_KEY=

3. Create `app/lib/email.ts` with a single exported function `sendImageReport`.

The function signature:
  export async function sendImageReport(report: {
    imageId: string;
    imageUrl: string;
    currentVehicle: {
      make: string;
      model: string;
      year: number;
      trim: string | null;
      countryOfOrigin: string;
      bodyStyle: string;
      era: string;
      rarity: string;
    };
    certainty: number;
    comment: string | null;
    suggestedMake: string | null;
    suggestedModel: string | null;
    suggestedYear: number | null;
    suggestedTrim: string | null;
    suggestedCountryOfOrigin: string | null;
    suggestedBodyStyle: string | null;
    suggestedEra: string | null;
    suggestedRarity: string | null;
    deactivated: boolean;
  }): Promise<void>

The email should:
- Be sent from "AutoGuessr <noreply@autoguessr.com>" to kpallin90@gmail.com
- Subject: `Image Report: [make] [model] [year] — [certainty]% certain`
- HTML body with:
  - A section "Image" showing the imageId and imageUrl as a clickable link
  - A section "Certainty" showing the percentage and whether the image was deactivated
  - A section "Current Vehicle" with all current vehicle fields in a definition list
  - A section "Suggested Changes" showing only the fields where a suggestion differs from the current value (skip fields where the suggestion is null or matches current)
  - A section "Comment" (only if comment is non-null and non-empty)

Use `new Resend(process.env.RESEND_API_KEY)` to send. If `RESEND_API_KEY` is not set, log a warning and return without throwing.

Do not export the Resend client itself.
```

---

### Prompt 3 — Image details API route

```
In AutoGuessr, create a new API route at `app/api/images/[id]/route.ts`.

GET handler:
- Accept an `id` path param (the Image id)
- Query the database via Prisma for the image, including its vehicle relation:
    prisma.image.findUnique({
      where: { id },
      include: { vehicle: true },
    })
- If not found, return 404 `{ error: "not found" }`
- Return:
    {
      id: string,
      filename: string,
      vehicleId: string,
      vehicle: {
        make, model, year, trim, countryOfOrigin, bodyStyle, era, rarity
      }
    }

Use the existing Prisma client from `@/app/lib/prisma`.
Follow the same request/response pattern as the other API routes in `app/api/`.
No auth required — this is a read-only, public route.
```

---

### Prompt 4 — Report submission API route

```
In AutoGuessr, create `app/api/report/route.ts`.

POST handler — accepts a JSON body:
  {
    imageId: string,
    certainty: number,           // 0–100 integer
    comment?: string,
    suggestedMake?: string,
    suggestedModel?: string,
    suggestedYear?: number,
    suggestedTrim?: string,
    suggestedCountryOfOrigin?: string,
    suggestedBodyStyle?: string, // must be a valid BodyStyle enum value
    suggestedEra?: string,       // must be a valid Era enum value
    suggestedRarity?: string,    // must be a valid Rarity enum value
  }

Validation:
- `imageId` must be present
- `certainty` must be an integer 0–100
- At least one of: comment (non-empty) or any suggested field (non-null) must be provided
- Return 400 with `{ error: "..." }` for any validation failure

On valid input, do the following in a Prisma transaction:
1. Fetch the image with its vehicle (return 404 if not found)
2. Create an `ImageReport` record with all provided fields
3. Set `Image.needsReview = true`
4. If `certainty >= 75`, also set `Image.isActive = false`

After the transaction, call `sendImageReport` from `app/lib/email.ts` with the full report data.
Build the `imageUrl` using the `imageUrl()` function from `app/lib/game.ts`.

Return `{ success: true, deactivated: boolean }` on success.

Use the Prisma client from `@/app/lib/prisma`.
Follow the same error-handling pattern as the other routes in `app/api/`.
```

---

### Prompt 5 — Report page and form

```
In AutoGuessr, create a report page at `app/report/[imageId]/page.tsx` and its client component `app/report/[imageId]/ReportForm.tsx`.

**`page.tsx`** (server component):
- Export metadata: `{ title: "Report an Image — Autoguessr" }`
- Pass `params.imageId` to `<ReportForm imageId={imageId} />`

**`ReportForm.tsx`** ("use client"):

State:
- Fetches `GET /api/images/[imageId]` on mount to get current vehicle details
- Loading and error states for the fetch
- Form fields (all optional strings/numbers, pre-filled from fetched vehicle data):
  - make, model, year, trim, countryOfOrigin, bodyStyle, era, rarity
- comment: string (textarea)
- certainty: number (0–100, default 50)
- submitting: boolean
- submitted: boolean
- submitError: string | null

UI layout (match the dark Tailwind theme from globals.css — bg dark, text white, red primary `hsl(350 89% 55%)`):

1. Header: "Report a Problem" title, small subtitle "Help us keep AutoGuessr accurate."
2. The current image (use the Cloudinary URL from the API response — the `filename` and `vehicleId` are returned, but for the form we just need `vehicle` data for pre-filling; the imageId from the URL is enough to submit)
3. **Vehicle Details section**: label + input for each field. Show the current value as placeholder. Fields:
   - Make (text), Model (text), Year (number), Trim (text), Country of Origin (text)
   - Body Style (select: coupe, sedan, convertible, hatchback, wagon, suv, truck, pickup, van, roadster, targa, compact, special_purpose)
   - Era (select: classic, retro, modern, contemporary)
   - Rarity (select: common, uncommon, rare, ultra_rare)
   All fields are optional. Only include fields in the submission where the user has changed the value from the pre-filled one.
4. **Comment section**: a textarea labelled "Additional comments (optional)"
5. **Certainty section**:
   - Label: "How certain are you that something is wrong?"
   - Range input: 0–100, step 1, default 50
   - Display current value as a percentage label beside the slider
   - Below the slider: show a note if certainty >= 75: "⚠ Because you're highly certain, this image will be removed from gameplay pending review." Otherwise show: "The image will remain active but will be flagged for review."
6. Submit button ("Submit Report") — disabled while submitting or if both comment is empty and no vehicle fields were changed
7. On success: replace form with a thank-you message: "Thank you — your report has been submitted."
8. On error: show `submitError` below the submit button

On submit, POST to `/api/report` with:
  {
    imageId,
    certainty,
    comment: comment || undefined,
    // only include suggested fields that differ from original fetched values
    suggestedMake: make !== originalMake ? make : undefined,
    // ... same pattern for all fields
  }

Follow the component patterns in `app/_components/` (useState, fetch, no form library).
Use `lucide-react` for any icons (e.g. AlertTriangle for the warning note).
Use the `cn()` utility from `app/lib/utils` for className merging if it exists, otherwise use clsx directly.
```

---

### Prompt 6 — Wire "Report" link into GameScreen

```
In AutoGuessr, modify `app/_components/GameScreen.tsx` to add a "Report a problem" link for the current image.

Context:
- Each round has an `imageId` (available as `round.imageId` on the current round object — see existing code)
- The report page is at `/report/[imageId]`

Changes to make:
1. Find where the image is displayed during gameplay (the `<img>` or image container)
2. Add a small, unobtrusive "Report a problem" link below or overlaid on the image
   - Style it subtly (small text, muted colour, e.g. `text-xs text-white/40 hover:text-white/70`)
   - Use a Lucide `Flag` icon (16px) beside the text
   - It should be a Next.js `<Link>` pointing to `/report/${currentRound.imageId}`
   - Opens in the same tab (no target="_blank")
3. The link should be visible at all times during a round (not just after reveal)

Do not change any other game logic. Import `Link` from `next/link` and `Flag` from `lucide-react`.
Read the file fully before making changes to understand the render structure.
```

---

### Prompt 7 — Admin panel: Reported tab

```
In AutoGuessr, add a "Reported" tab to the admin panel.

**Step 1 — New API route `app/api/admin/reported/route.ts`**:
- GET handler, protected with the same HTTP Basic Auth check used in other admin routes
- Query:
    prisma.image.findMany({
      where: { needsReview: true },
      include: {
        vehicle: true,
        reports: { orderBy: { createdAt: "desc" } },
        stats: true,
      },
      orderBy: { uploadedAt: "desc" },
    })
- Return an array of items, each with:
    {
      id, filename, isActive, needsReview, uploadedAt,
      vehicle: { make, model, year, trim, bodyStyle, era, rarity, countryOfOrigin },
      reportCount: number,
      latestReport: {
        certainty, comment, createdAt,
        suggestedMake, suggestedModel, suggestedYear, suggestedTrim,
        suggestedCountryOfOrigin, suggestedBodyStyle, suggestedEra, suggestedRarity
      } | null
    }
- Build the imageUrl using `imageUrl()` from `app/lib/game.ts` and include it in each item

**Step 2 — Update `AdminPanel.tsx`**:

1. Add `"reported"` to the `AdminPage` type.
2. Add a "Reported" nav tab button alongside the existing tabs (use the same tab button pattern).
3. Add state: `reportedImages`, `reportedLoading` for the reported tab's data.
4. Add a `fetchReported` callback (similar to `fetchImages`) that calls `GET /api/admin/reported` and sets state.
5. Trigger `fetchReported` in a `useEffect` when `activePage === "reported"`.
6. Render a simple reported images panel when `activePage === "reported"`:
   - A table or card list showing: image thumbnail, vehicle label (make model year), report count, latest report certainty, whether image is active, and the latest comment
   - Each row should show a badge "Deactivated" (in red) if `isActive === false`, or "Active" (in grey) if still active
   - No editing needed in this first pass — read-only display
   - Show "No reported images" if the list is empty

Read `AdminPanel.tsx` fully before editing — it is large and the tab pattern must be matched exactly.
```

---

## Integration Notes

- All prompts build sequentially. Prompt 1 must be applied before Prompts 3/4 (schema).
- Prompts 2 and 3 are independent of each other; they can be applied in any order relative to each other, but both must be done before Prompt 4.
- Prompt 5 depends on Prompts 3 and 4 (the API routes it calls).
- Prompt 6 depends on Prompt 5 (the page must exist before linking to it).
- Prompt 7 depends on Prompt 1 (the `needsReview` field and `ImageReport` model).
