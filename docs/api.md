# API Endpoints

## Game

### `GET /api/game`

Start a new game session.

**Query Parameters**

| Parameter  | Required | Description |
|------------|----------|-------------|
| `mode`     | Yes      | `easy`, `medium`, `hard`, `hardcore`, `competitive`, `practice` |
| `username` | No       | Player username |
| `filter`   | No       | URL-encoded JSON with `categorySlugs`, `regionSlugs`, `countries` |
| `cf_token` | No       | Cloudflare Turnstile token (required in production) |

**Response**

```json
{
  "gameId": "string",
  "rounds": [
    { "roundId": "string", "sequenceNumber": 0, "imageId": "string", "imageUrl": "string" }
  ],
  "easyChoices": { "<roundId>": [{ "vehicleId": "string", "label": "string" }] },
  "makes": ["string"],
  "timeLimitMs": 0
}
```

- `easyChoices` — only present for `easy`/`practice` modes
- `makes` — only present for `medium`/`hard`/`hardcore`/`competitive` modes
- `timeLimitMs` — only present for `competitive` mode

**Side Effects:** Sets an HTTP-only `st_{gameId}` cookie containing the session token.

---

### `POST /api/guess`

Submit a guess for a round.

**Request Body**

```json
{
  "roundId": "string",
  "rawInput": "string",
  "guessedVehicleId": "string",
  "guessedMake": "string",
  "guessedModel": "string",
  "guessedYear": 0,
  "timeTakenMs": 0,
  "zoomLevelAtGuess": 0,
  "panelsRevealed": 0
}
```

- `guessedVehicleId` — used for `easy`/`practice` modes
- `guessedMake`/`guessedModel` — used for `medium`+
- All fields except `roundId` are optional

**Authorization:** Requires `st_{gameId}` session cookie.

**Response**

```json
{
  "guessId": "string",
  "makeMatch": true,
  "modelMatch": true,
  "partialCredit": 0,
  "yearDelta": 0,
  "vehicle": { "make": "string", "model": "string", "year": 0 },
  "makePoints": 0,
  "modelPoints": 0,
  "yearBonus": 0,
  "timeBonus": 0,
  "proBonus": 0,
  "modeMultiplier": 0,
  "pointsEarned": 0
}
```

---

### `POST /api/validate`

Validate a guess against a vehicle without recording it. Used client-side for immediate feedback.

**Request Body**

```json
{
  "vehicleId": "string",
  "guessedMake": "string",
  "guessedModel": "string",
  "guessedYear": 0
}
```

**Response**

```json
{
  "makeMatch": true,
  "modelMatch": true,
  "partialCredit": 0,
  "yearDelta": 0
}
```

---

## Session

### `GET /api/session`

Retrieve full session details with all rounds and guesses.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `gameId`  | Yes      | Game session ID |

**Response**

```json
{
  "id": "string",
  "playerId": "string",
  "mode": "string",
  "sessionToken": "string",
  "filterConfig": {},
  "startedAt": "ISO8601",
  "endedAt": "ISO8601",
  "finalScore": 0,
  "initials": "string",
  "rounds": [
    {
      "id": "string",
      "sequenceNumber": 0,
      "imageId": "string",
      "imageUrl": "string",
      "image": {
        "vehicle": { "make": "string", "model": "string", "year": 0, "countryOfOrigin": "string" }
      },
      "guess": {}
    }
  ],
  "personalBest": 0
}
```

---

### `POST /api/session/end`

End a game session and finalise the score.

**Request Body**

```json
{
  "gameId": "string",
  "finalScore": 0
}
```

**Authorization:** Requires `st_{gameId}` session cookie.

**Response**

```json
{
  "gameId": "string",
  "finalScore": 0,
  "endedAt": "ISO8601"
}
```

---

### `PATCH /api/session/initials`

Set leaderboard initials for a completed session.

**Request Body**

```json
{
  "gameId": "string",
  "initials": "ABC"
}
```

- `initials` — 1–3 uppercase letters A–Z
- Session must be ended; practice sessions are not eligible

**Authorization:** Requires `st_{gameId}` session cookie.

**Response**

```json
{ "ok": true }
```

---

## Leaderboard

### `GET /api/leaderboard`

Get the top 20 scores.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `mode`    | No       | Filter by game mode |
| `period`  | No       | `day`, `week`, `alltime` (default: `alltime`) |

**Response**

```json
[
  { "rank": 1, "initials": "ABC", "score": 0, "mode": "string", "date": "ISO8601" }
]
```

---

## Reference Data

### `GET /api/filters`

Get available filter options for game configuration.

**Response**

```json
{
  "categories": [{ "id": "string", "slug": "string", "label": "string" }],
  "regions": [{ "id": "string", "slug": "string", "label": "string" }],
  "countries": [{ "code": "string" }]
}
```

---

### `GET /api/models`

Get all models for a given make.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `make`    | Yes      | Make name |

**Response**

```json
{ "models": ["string"] }
```

---

### `GET /api/flags`

Get all feature flags as a key-value map.

**Response**

```json
{ "<flagName>": true }
```

---

## Practice

### `GET /api/practice/stats`

Get practice stats for a player.

**Query Parameters**

| Parameter  | Required | Description |
|------------|----------|-------------|
| `username` | Yes      | Player username |

**Response**

```json
[
  {
    "playerId": "string",
    "dimensionType": "category",
    "dimensionKey": "string",
    "correct": 0,
    "incorrect": 0,
    "streak": 0,
    "lastPlayedAt": "ISO8601"
  }
]
```

---

### `POST /api/practice/stats`

Record practice stats for a dimension.

**Request Body**

```json
{
  "username": "string",
  "dimensionType": "category",
  "dimensionKey": "string",
  "correct": 0,
  "incorrect": 0
}
```

- `dimensionType` — `category`, `region`, or `country`

**Response:** Returns the updated stats record (same shape as GET).

---

## Community Identification

### `GET /api/identify`

Get staging images in community review status with voting data.

**Response**

```json
[
  {
    "id": "string",
    "imageUrl": "string",
    "ai": { "make": "string", "model": "string", "year": 0 },
    "suggestions": [
      {
        "id": "string",
        "username": "string",
        "suggestedMake": "string",
        "suggestedModel": "string",
        "suggestedYear": 0,
        "suggestedTrim": "string",
        "upvotes": 0,
        "downvotes": 0,
        "netVotes": 0
      }
    ],
    "agreements": {
      "make": { "value": "string", "count": 0, "confirmed": true, "threshold": 0 },
      "model": { "value": "string", "count": 0, "confirmed": true, "threshold": 0 },
      "year": { "value": 0, "count": 0, "confirmed": true, "threshold": 0 },
      "trim": { "value": "string", "count": 0, "confirmed": true, "threshold": 0 }
    }
  }
]
```

---

### `POST /api/identify/[id]/suggest`

Submit a community identification suggestion for a staging image.

**URL Parameters:** `id` — staging image ID

**Request Body**

```json
{
  "username": "string",
  "make": "string",
  "model": "string",
  "year": 0,
  "trim": "string"
}
```

- `username` is required; at least one of `make`, `model`, `year`, `trim` is required

**Response**

```json
{
  "agreements": {
    "make": { "value": "string", "count": 0 },
    "model": { "value": "string", "count": 0 },
    "year": { "value": 0, "count": 0 },
    "trim": { "value": "string", "count": 0 }
  },
  "confirmed": {
    "confirmedMake": "string",
    "confirmedModel": "string",
    "confirmedYear": 0,
    "confirmedTrim": "string"
  }
}
```

---

### `POST /api/identify/[id]/vote`

Vote on a community suggestion.

**URL Parameters:** `id` — staging image ID

**Request Body**

```json
{
  "username": "string",
  "suggestionId": "string",
  "isUpvote": true
}
```

- Users cannot vote on their own suggestions

**Response**

```json
{
  "upvotes": 0,
  "downvotes": 0,
  "netVotes": 0
}
```

---

## Admin

> Admin routes manage the image ingestion pipeline and content library.

### `GET /api/admin/staging`

Get all staging images with metadata and agreement data.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `status`  | No       | `PENDING_REVIEW`, `COMMUNITY_REVIEW`, `READY`, `PUBLISHED`, `REJECTED` |

**Response**

```json
{
  "items": [
    {
      "id": "string",
      "imageUrl": "string",
      "filename": "string",
      "status": "string",
      "createdAt": "ISO8601",
      "ai": { "make": "string", "model": "string", "year": 0, "bodyStyle": "string", "confidence": 0 },
      "admin": {
        "make": "string", "model": "string", "year": 0, "trim": "string",
        "bodyStyle": "string", "rarity": "string", "era": "string",
        "regionSlug": "string", "countryOfOrigin": "string",
        "categories": ["string"], "isHardcoreEligible": true,
        "notes": "string", "copyrightHolder": "string",
        "isCropped": false, "isLogoVisible": false,
        "isModelNameVisible": false, "hasMultipleVehicles": false, "isFaceVisible": false
      },
      "confirmed": { "make": "string", "model": "string", "year": 0, "trim": "string" },
      "agreements": {},
      "suggestionCount": 0
    }
  ],
  "counts": {
    "PENDING_REVIEW": 0, "COMMUNITY_REVIEW": 0, "READY": 0, "PUBLISHED": 0, "REJECTED": 0
  }
}
```

---

### `PUT /api/admin/staging/[id]`

Update a staging image's admin fields and/or status.

**URL Parameters:** `id` — staging image ID

**Request Body** (all fields optional)

```json
{
  "make": "string", "model": "string", "year": 0, "trim": "string",
  "bodyStyle": "string", "rarity": "string", "era": "string",
  "regionSlug": "string", "countryOfOrigin": "string",
  "categories": ["string"], "isHardcoreEligible": true,
  "notes": "string", "copyrightHolder": "string",
  "isCropped": false, "isLogoVisible": false,
  "isModelNameVisible": false, "hasMultipleVehicles": false,
  "isFaceVisible": false, "isVehicleUnmodified": false,
  "status": "string"
}
```

**Response:** The updated staging image object.

---

### `POST /api/admin/staging/[id]/publish`

Publish a staging image, creating vehicle and image records.

**URL Parameters:** `id` — staging image ID

Requires `make`, `model`, `year`, `regionSlug`, and `countryOfOrigin` to be set on the staging record before publishing.

**Response**

```json
{
  "vehicleId": "string",
  "imageId": "string"
}
```

---

### `GET /api/admin/autocomplete`

Autocomplete for admin form fields.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `field`   | Yes      | `make`, `model`, `trim`, `country`, `make_defaults`, `copyright_holder` |
| `make`    | No       | Filter models by make |
| `model`   | No       | Filter trims by model |

**Response**

- For `make`, `model`, `trim`, `country`, `copyright_holder` — `["string"]`
- For `make_defaults` — `{ "<make>": { "country": "string", "regionSlug": "string" } }`

---

### Makes

#### `GET /api/admin/makes`

Get all makes with vehicle counts.

**Response:** `[{ "make": "string", "count": 0 }]`

#### `POST /api/admin/makes`

Create or register a known make.

**Request Body:** `{ "make": "string" }`

**Response:** `{ "make": "string" }`

#### `PUT /api/admin/makes`

Rename a make across all vehicles and models.

**Request Body:** `{ "from": "string", "to": "string" }`

**Response:** `{ "updated": true }`

#### `DELETE /api/admin/makes`

Delete a make and all associated vehicles (cascade).

**Request Body:** `{ "make": "string" }`

**Response:** `204 No Content`

---

### Models

#### `GET /api/admin/makes/[make]/models`

Get all models for a make with vehicle counts.

**URL Parameters:** `make`

**Response:** `[{ "model": "string", "count": 0 }]`

#### `POST /api/admin/makes/[make]/models`

Create or register a known model.

**URL Parameters:** `make`

**Request Body:** `{ "model": "string" }`

**Response:** `{ "make": "string", "model": "string" }`

#### `PUT /api/admin/makes/[make]/models`

Rename a model within a make.

**URL Parameters:** `make`

**Request Body:** `{ "from": "string", "to": "string" }`

**Response:** `{ "updated": true }`

#### `DELETE /api/admin/makes/[make]/models`

Delete a model and all associated vehicles (cascade).

**URL Parameters:** `make`

**Request Body:** `{ "model": "string" }`

**Response:** `204 No Content`

---

### Categories

#### `GET /api/admin/categories`

Get all categories with vehicle counts.

**Response:** `[{ "id": "string", "slug": "string", "label": "string", "vehicleCount": 0 }]`

#### `POST /api/admin/categories`

Create a new category. `slug` must be unique.

**Request Body:** `{ "slug": "string", "label": "string" }`

**Response:** `201` — `{ "id": "string", "slug": "string", "label": "string", "vehicleCount": 0 }`

#### `PUT /api/admin/categories/[id]`

Update a category's label.

**URL Parameters:** `id`

**Request Body:** `{ "label": "string" }`

**Response:** `{ "id": "string", "slug": "string", "label": "string" }`

#### `DELETE /api/admin/categories/[id]`

Delete a category. Fails with `409` if any vehicles are assigned to it.

**URL Parameters:** `id`

**Response:** `204 No Content`

---

### `GET /api/admin/stats`

Get guess statistics for all active images.

**Response**

```json
[
  {
    "id": "string",
    "filename": "string",
    "vehicle": { "make": "string", "model": "string", "year": 0 },
    "stats": { "correctGuesses": 0, "incorrectGuesses": 0, "skipCount": 0 }
  }
]
```
