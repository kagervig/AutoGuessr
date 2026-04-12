@AGENTS.md

## Commands

```bash
# Dev
npm run dev

# Typecheck / lint
npm run lint

# Prisma
npx prisma migrate dev --name <migration-name>  # create and apply a migration (ALWAYS use for schema changes)
npx prisma db push       # local prototyping only — never use for production schema changes
npx prisma db seed       # seed categories, regions, flags, sample vehicles
npx prisma studio        # open DB browser

# Image ingestion scripts
npx tsx scripts/stage-images.ts --folder ./Data/Images   # upload to Cloudinary staging
npx tsx scripts/tag-images.ts [--limit N]                # AI-tag staged images via Gemini
npx tsx scripts/dedupe-vehicles.ts [--apply]             # find/merge duplicate vehicles
npx tsx scripts/import-cars.ts --file ./path/to/cars.csv # import directly from CSV
```

## Architecture

- `app/` — Next.js App Router
  - `api/` — API routes: `game`, `guess`, `session`, `leaderboard`, `admin`, `identify`, etc.
  - `components/` — shared UI components (`layout/`, `ui/`)
  - `_components/` — page-level private components
  - `lib/` — server utilities: Prisma client, game logic, constants, staging helpers
  - `generated/prisma/` — generated Prisma client (do not edit)
  - `game/`, `identify/`, `leaderboard/`, `results/`, `admin/` — page routes
- `prisma/` — schema, migrations, seed script
- `public/` — static assets
- `scripts/` — CLI scripts for the image ingestion pipeline

## Workflow

- Run typecheck after making a series of code changes
- Prefer fixing the root cause over adding workarounds
- When unsure about approach, use plan mode (`Shift+Tab`) before coding
- ALWAYS create a migration file with `prisma migrate dev` when modifying `schema.prisma` — never rely on `db push` for schema changes, as it bypasses migration tracking and changes won't be applied on deploy

## Don'ts

- Don't modify generated files (`*.gen.ts`, `*.generated.*`)

## Tests

- Write tests before implementation (TDD)
- Never mock what you're testing; never write tests that only test mocks
- Test output must be pristine; assert expected errors, don't ignore them

## Style

- Canadian spelling in docs/commits; American in code
- Every new file must have a one-line comment at the top (after any directives like `"use client"` or `// @vitest-environment`) describing its purpose

## Planning

- Never create `todo.md` files — use the TodoWrite tool for progress tracking instead
- Store plan documents in `.claude/claude-plan/` with descriptive names (e.g., `auth-plan.md`, not `plan.md`)
- Plans should include implementation steps, prompts for LLMs, and context for future reference

