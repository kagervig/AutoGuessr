# Database

PostgreSQL, accessed via Prisma ORM.

## Prisma setup

| Thing | Location |
|---|---|
| Schema | `prisma/schema.prisma` |
| Config | `prisma.config.ts` |
| Generated client | `app/generated/prisma/` |
| Client singleton | `app/lib/prisma.ts` |
| Migrations | `prisma/migrations/` |
| Seed | `prisma/seed.ts` |

**Driver:** Uses `@prisma/adapter-pg` (explicit `pg.Pool` + adapter) rather than Prisma's built-in driver. The pool is created in `app/lib/prisma.ts` and wrapped with `PrismaPg`.

**Config:** `prisma.config.ts` is a Prisma 6 config file. It loads `DATABASE_URL` via `dotenv` and provides it as `datasource.url`. Because Prisma detects this file it skips its own `.env` loading — the schema's `datasource` block must still declare `url = env("DATABASE_URL")` for the WASM validator.

**Client singleton:** In development, the client is cached on `global` to survive hot reloads. In production a fresh instance is created per process.

**Seed:** `npx prisma db seed` — populates categories, regions, a feature flag, and sample vehicles.

---

## Enums

| Enum | Values |
|---|---|
| `BodyStyle` | coupe, sedan, convertible, hatchback, wagon, suv, truck, pickup, van, roadster, targa, compact, special_purpose |
| `Era` | classic, retro, modern, contemporary |
| `Rarity` | common, uncommon, rare, ultra_rare |
| `GameMode` | easy, medium, hard, hardcore, competitive, practice |
| `DimensionType` | category, region, country |
| `AliasType` | make, model, full, nickname |
| `StagingStatus` | PENDING_REVIEW, COMMUNITY_REVIEW, READY, PUBLISHED, REJECTED |

---

## Models

### Vehicle data

**`Region`** — slug (@unique), label. One-to-many with `Vehicle`.

**`Vehicle`** — make, model, year, trim, countryOfOrigin, bodyStyle, era, rarity. Many-to-many with `Category` via `VehicleCategory`. One-to-many with `Image` and `VehicleAlias`.

**`Category`** — slug (@unique), label. Many-to-many with `Vehicle`.

**`VehicleCategory`** — join table. Composite PK `[vehicleId, categoryId]`.

**`VehicleAlias`** — alternative names and spellings for fuzzy matching. aliasType distinguishes make, model, full name, and nickname aliases.

---

### Images

**`Image`** — filename (@unique). Boolean flags: isCropped, isLogoVisible, isModelNameVisible, hasMultipleVehicles, isFaceVisible, isVehicleUnmodified, isActive, isHardcoreEligible.

**`ImageStats`** — correctGuesses, incorrectGuesses, skipCount, avgGuessTimeMs, difficultyScore. One-to-one with `Image` (imageId is the PK).

---

### Players

**`Player`** — username (@unique), createdAt, lastSeenAt.

**`PlayerStats`** — totalScore, gamesPlayed, roundsPlayed, correctGuesses, currentStreak, bestStreak. One-to-one with `Player` (playerId is the PK).

**`PlayerDimensionStats`** — per-category/region/country breakdown of correct, incorrect, streak. Composite PK `[playerId, dimensionType, dimensionKey]`.

---

### Gameplay

**`GameSession`** — mode, filterConfig (Json), startedAt, endedAt, finalScore, initials, sessionToken (@unique, db-generated UUID). Optional `playerId` FK for logged-in players; anonymous sessions have no player.

**`Round`** — gameId (FK → GameSession), imageId, sequenceNumber, easyChoices (String[] of vehicleIds for easy/practice mode), timeLimitMs. One-to-one with `Guess`.

**`Guess`** — rawInput, guessedVehicleId, isCorrect, partialCredit, yearDelta, timeTakenMs, zoomLevelAtGuess, makePoints, modelPoints, yearBonus, timeBonus, proBonus, modeMultiplier, pointsEarned. roundId is @unique (one guess per round).

---

### Staging & community review

Images go through a pipeline before being published to the game.

**`StagingImage`** — cloudinaryPublicId (@unique). Holds AI-generated suggestions (aiMake, aiModel, aiYear, aiConfidence, etc.), admin override fields (adminMake, adminModel, …), and confirmed consensus fields (confirmedMake, confirmedModel, …). Status tracks position in the pipeline.

**`CommunityIdentification`** — one suggestion per user per image (`@@unique([stagingImageId, username])`). Tracks upvotes and downvotes.

**`CommunityVote`** — one vote per user per suggestion (`@@unique([suggestionId, username])`). Cascade-deletes when the suggestion is deleted.

---

### Lookup & config

**`KnownMake`** — cached list of valid car makes. PK on name.

**`KnownModel`** — cached valid models per make. Composite PK `[make, name]`.

**`FeatureFlag`** — key (PK), enabled, description. Used for runtime feature toggling (e.g. `medium_year_guessing`).

---

## Key relationships

```
GameSession ──< Round ──── Guess
                  │
                  └──── Image ──── Vehicle ──>── Region
                                     │
                                     └──>── Category (via VehicleCategory)
```

- `GameSession` → `Round`: one-to-many
- `Round` → `Guess`: one-to-one (optional — no guess means timeout)
- `Round` → `Image`: many-to-one
- `Image` → `Vehicle`: many-to-one
- `Vehicle` ↔ `Category`: many-to-many via `VehicleCategory`
- `GameSession` → `Player`: many-to-one (optional)
- `Player` → `PlayerStats`: one-to-one
- `Player` → `PlayerDimensionStats`: one-to-many
