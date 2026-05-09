# AutoGuessr Project Instructions

This document provides foundational mandates, architectural patterns, and engineering standards for the AutoGuessr project. Adhere to these guidelines rigorously.

## 1. Code Quality & Principles

- **Functions do one thing.** If it needs a section comment, extract that section.
- **No magic values.** Extract numbers, strings, and config to named constants.
- **Handle errors at the boundary.** Don't catch and re-throw without adding context.
- **No premature abstractions.** Three similar lines > a helper used once.
- **Don't add features or "improve" things beyond what was asked.**
- **No dead code or commented-out blocks.** Git has history.
- **Composition over inheritance.**

### Code Markers
| Marker | Use |
|---|---|
| `TODO(author): desc (#issue)` | Planned work |
| `FIXME(author): desc (#issue)` | Known bugs |
| `HACK(author): desc (#issue)` | Ugly workarounds (explain the proper fix) |
| `NOTE: desc` | Non-obvious context for future readers |
Must have an owner + issue link. Don't commit TODOs you can do now.

## 2. Naming Conventions

- **Files**: PascalCase for components/classes (`UserProfile.tsx`), kebab-case for utilities/directories (`date-utils.ts`)
- **Booleans**: `is`, `has`, `should`, `can` prefix — `isLoading`, `hasPermission`
- **Functions**: verb-first — `getUser`, `validateEmail`, `handleSubmit`
- **Handlers/callbacks**: `handle*` internally, `on*` as props — `handleClick` / `onClick`
- **Factories**: `create*` — `createUser`. **Converters**: `to*` — `toJSON`. **Predicates**: `is*`/`has*`
- **Constants**: `SCREAMING_SNAKE` — `MAX_RETRIES`, `API_BASE_URL`
- **Enums**: PascalCase members — `Status.Active`
- **Acronyms**: Use as words (e.g., `userId` not `userID`).

## 3. Frontend Design & Principles

### Design Tokens
Every color, spacing value, radius, shadow, font, z-index, and transition must come from tokens. Never hardcode raw values in components.
- **Colors**: Semantic names with dark mode variants.
- **Spacing**: Consistent scale (4, 8, 16, 24, 32, 48, 64, 96).
- **Typography**: Assign fonts to variables (`font-display`, `font-body`, `font-mono`). **Avoid generic fonts** like Inter, Roboto, Arial for display.

### Design Principles
Pick one primary principle for each feature/UI:
- **Glassmorphism**, **Neumorphism**, **Brutalism**, **Minimalism**, **Maximalism**, **Claymorphism**, **Bento Grid**, **Aurora / Mesh Gradients**, **Editorial**, **Material Elevation**.

### Layout & Atmosphere
- Use **CSS Grid** for 2D, **Flexbox** for 1D. Use `gap`, not margin hacks.
- Create depth with noise textures, gradients, or layered transparencies. Avoid flat solid colors.
- **Mobile-first** (design at 320px). Touch targets: minimum 44x44px.

### Accessibility (Non-negotiable)
- All interactive elements keyboard-accessible.
- Meaningful `alt` text. Decorative: `alt=""`.
- Visible focus indicators.
- Contrast: 4.5:1 (normal text).

## 4. Database & Migrations

- **Never modify an existing migration.** Always create a new one.
- Every migration must be **reversible** (up/down).
- Never seed production data in migration files.
- Add indexes in their own migration.

## 5. Error Handling

- Use **typed/custom error classes** with error codes.
- Never swallow errors silently. Log or rethrow with context.
- Handle every rejected promise.
- HTTP error responses: consistent shape `{ error: { code, message } }`.

## 6. Security

- **Validate all user input** at the system boundary.
- Use **parameterized queries** — never concatenate user input into SQL or shell commands.
- **Sanitize output** to prevent XSS.
- **Never log secrets**, tokens, passwords, or PII.

## 7. Testing

- Verify **behavior**, not implementation details.
- Run the specific test file after changes.
- Prefer real implementations over mocks (mock only at system boundaries).
- One assertion per test. Use Arrange-Act-Assert.

## 8. File Organization

- **Imports**: builtins → external → internal → relative → types. Blank line between groups.
- **Exports**: named over default. Export at declaration site.
- **Functions**: public first, then private helpers in call order.
