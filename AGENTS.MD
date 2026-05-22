# AnimoRank — Agent Guide

## Project Overview

AnimoRank is a web-based C programming education platform built with **SvelteKit 2**, **Svelte 5**, and **TypeScript**. Teachers create problem sets with test cases; students solve them in-browser using an integrated Monaco code editor. Student submissions are compiled and tested against teacher-defined test cases via the [Piston API](https://github.com/engineer-man/piston).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 (adapter-node, Node.js server) |
| UI Runtime | Svelte 5 (runes API) |
| Language | TypeScript (strict mode, `moduleResolution: "bundler"`) |
| Styling | Tailwind CSS 4 + DaisyUI + `@tailwindcss/typography` |
| ORM / Data Layer | ZenStack (schema → codegen) + Prisma migrations |
| Database | PostgreSQL (Supabase managed) |
| Auth | Google OAuth2 via `@auth/sveltekit` + `@auth/prisma-adapter` |
| Code Editor | Monaco Editor (ESM via Vite plugin) |
| Markdown / Docs | Diplodoc Transform + highlight.js + KaTeX + Mermaid |
| Unit Testing | Vitest |
| Integration Testing | Playwright |
| Linting / Formatting | ESLint 10 + Prettier 3 + knip (dead code) |
| Container | Docker (Node 24 on Debian trixie) |

---

## Directory Structure

```
animorank/
├── src/
│   ├── lib/                          # Shared library code (imported via $lib alias)
│   │   ├── components/               # Reusable Svelte components
│   │   │   ├── problemEditor/        # Problem editor sub-components
│   │   │   └── ...                   # UI primitives (Button, Modal, etc.)
│   │   ├── services/                 # Service provider pattern + registries
│   │   │   ├── serviceProvider.ts    # DI container
│   │   │   ├── clientServiceProvider.ts
│   │   │   ├── serverServiceProvider.ts
│   │   │   └── registry.ts
│   │   ├── testCase/                 # Test case system
│   │   │   ├── codeGenerator/        # Code generation for test harnesses
│   │   │   ├── executor/             # Execution backends (judge0/Piston)
│   │   │   ├── testCase/             # Test case type implementations
│   │   │   └── type/                 # Type definitions (int, float, string, etc.)
│   │   ├── telemetry/                # Analytics / event tracking
│   │   │   ├── hooks/                # Hook implementations
│   │   │   └── ...                   # Services and registry
│   │   ├── logging/                  # Multi-output logging (console, file)
│   │   ├── utils/                    # Utility functions
│   │   ├── types/                    # Shared type definitions
│   │   ├── zenstack/                 # Auto-generated ZenStack schema/models
│   │   ├── monaco.ts                 # Monaco loader configuration
│   │   ├── response.ts               # Standard API response helpers
│   │   └── index.ts                  # Public $lib exports
│   │
│   ├── routes/                       # SvelteKit file-based routing
│   │   ├── +layout.svelte            # Root layout
│   │   ├── +layout.server.ts         # Root layout data loader
│   │   ├── +page.svelte              # Homepage
│   │   ├── +page.server.ts           # Homepage loader
│   │   ├── about/                    # About page
│   │   ├── edit/[slug]/              # Problem editor (teachers)
│   │   ├── problem/[problem_id]/     # Problem viewing
│   │   │   └── [session_id]/         # Student practice session
│   │   ├── problemSets/              # Problem set browser
│   │   │   ├── [id]/                 # Individual problem set
│   │   │   ├── api.ts                # Shared API client
│   │   │   ├── bookmark.ts           # Bookmark utilities
│   │   │   └── ...components
│   │   ├── tos/                      # Terms of Service
│   │   └── api/                      # API endpoints (+server.ts files)
│   │       ├── practice-session/     # Practice session CRUD + run
│   │       ├── problem/              # Problem CRUD
│   │       ├── problem-set/          # Problem set CRUD + bookmark
│   │       ├── test-case/            # Test case CRUD
│   │       ├── test/                 # Test execution
│   │       └── updateHistory/        # Practice history update
│   │
│   └── zenstack/                     # ZenStack schema source (zmodel)
│
├── prisma/
│   └── migrations/                   # Prisma migration SQL files
│
├── static/                           # Static assets (images, etc.)
├── scripts/                          # Utility scripts (e.g., addDefaultTags.ts)
├── tests/                            # Playwright integration tests
├── supabase/                         # Supabase setup SQL
├── build/                            # Build output (gitignored)
├── .svelte-kit/                      # SvelteKit generated types (gitignored)
├── .github/                          # GitHub templates
├── package.json                      # Dependencies + scripts
├── svelte.config.js                  # SvelteKit config
├── vite.config.ts                    # Vite + Vitest config
├── tsconfig.json                     # TypeScript config (extends .svelte-kit/tsconfig)
├── tailwind.config.js                # Tailwind + DaisyUI config
├── eslint.config.js                  # ESLint 10 flat config
├── .prettierrc                       # Prettier config
├── playwright.config.ts              # Playwright config
├── knip.json                         # Dead code detection
├── Dockerfile                        # Production container
├── docker-entrypoint.sh              # Container entrypoint
└── .env                              # Environment variables
```

---

## Routing Conventions

- **Pages**: `src/routes/<route>/+page.svelte` — the Svelte component
- **Page data**: `src/routes/<route>/+page.server.ts` — `load` function returning data
- **API endpoints**: `src/routes/api/<endpoint>/+server.ts` — `GET`/`POST` handlers
- **Layouts**: `+layout.svelte` and `+layout.server.ts` for shared structure
- **Dynamic routes**: `[param]` directories (e.g., `[problem_id]`, `[session_id]`, `[slug]`)
- **Nested layouts**: Each route segment can have its own `+layout.*` files
- **Types**: `$lib/$types` provides auto-generated `PageProps` types

### API Endpoint Pattern

```ts
// src/routes/api/<entity>/+server.ts
import { json } from '@sveltejs/kit';  // or use src/lib/response.ts helpers
import { error, successObject } from '$lib/response';

export async function POST({ request, locals }) {
  const body = await request.json();
  // ... validation, auth check, DB operations
  return successObject(data);
}
```

---

## Svelte 5 Component Conventions

Svelte 5 uses the **runes** API. All components use `<script lang="ts">`.

### Props

```svelte
<!-- ✅ Use $props() and destructure -->
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let props = $props();
  let { class: className, children, ...rest } = $derived(props);
</script>

<button class="btn bg-primary text-primary-content px-4 py-3 {className}" {...rest}>
  {@render children?.()}
</button>
```

- Use `class` (aliased from `className`) to avoid conflicts with the CSS class property
- Destructure props using `$derived`
- Use `@render` for children rendering

### State

```ts
// ✅ Reactive state
let count = $state(0);

// ✅ Derived values
let doubled = $derived(count * 2);

// ✅ Props
let { title, children } = $props();
```

### File Naming

- Components: `PascalCase.svelte` (e.g., `Button.svelte`, `ProblemEditor.svelte`)
- Non-component `.ts`/`.js` files: `camelCase.ts` (e.g., `testCaseRegistry.ts`)
- Test files: `*.test.ts` or `*.spec.ts`

---

## TypeScript Conventions

- **Strict mode enabled** — no implicit any, no unchecked assignments
- **Module resolution**: `"bundler"` — import paths resolve relative to file location
- **JSX**: `"react"` — needed for React-based dependencies (Monaco, Tiptap, etc.)
- **ESM**: `"type": "module"` — all JS/TS files are ES modules
- **Extensions**: `allowImportingTsExtensions` — import `.ts` files directly from `.ts`
- **Check JS**: `checkJs: true` — JavaScript files are also type-checked

### Import Aliases (SvelteKit defaults)

- `$lib` → `src/lib/` — shared library code
- `$lib/components/...` → reusable UI components
- `$lib/services/...` → service layer
- `$lib/testCase/...` → test case system
- `$lib/zenstack/...` → generated ORM types (read-only)
- `$app/types` → auto-generated SvelteKit types (e.g., `PageProps`)

---

## Database & ORM

### ZenStack (Primary ORM)

The schema is defined in `.zmodel` files. ZenStack CLI generates TypeScript types into `src/lib/zenstack/`.

**Important**: Files in `src/lib/zenstack/` are **auto-generated and must NOT be manually edited**.

```bash
# Regenerate after schema changes
npx zenstack generate
```

### Prisma Migrations

Database migrations live in `prisma/migrations/`. Each migration is a SQL file.

```bash
# Create a new migration
npx zen migrate dev --name description_of_change
```

### Key Entities

| Entity | Purpose |
|--------|---------|
| `User` | Auth account (Google OAuth2) |
| `Student` | Student role (linked to User) |
| `Teacher` | Teacher role (linked to User) |
| `Problem` | A programming problem |
| `ProblemSet` | A collection of problems |
| `ProblemTestCase` | Test case (polymorphic: FunctionOutput, ProgramIO, Custom) |
| `PracticeSession` | Student's active work on a problem |
| `PracticeHistoryEntry` | History of changes during a session |
| `Subscription` | Student enrollment in a problem set |
| `TopicTag` / `DifficultyTag` / `SubjectTag` | Classification tags |

---

## Styling Conventions

### Tailwind CSS

- Use utility classes directly in Svelte templates
- Dark mode uses the `selector` strategy (toggle via class on `<html>`)
- Font families: `DM Sans` (sans), `DM Mono` (mono)

### DaisyUI

- Components use DaisyUI classes (e.g., `btn`, `modal`, `card`)
- Primary color tokens: `bg-primary`, `text-primary-content`, etc.

### Component CSS

- No separate `.css` files — styles are inline via Tailwind classes
- No `style` tags unless dynamically computed styles are needed

---

## Service Layer Pattern

The app uses a **service provider** pattern for dependency injection:

```
ServiceProvider (DI container)
  ├── ServiceRegistry (maps service constructors → instances)
  ├── ClientServiceProvider (browser-side services)
  └── ServerServiceProvider (server-side services)
```

Key files:
- `src/lib/services/serviceProvider.ts` — main DI container
- `src/lib/services/registry.ts` — singleton registry abstraction
- `src/lib/services/clientServiceProvider.ts` — client-side registrations
- `src/lib/services/serverServiceProvider.ts` — server-side registrations

This pattern abstracts service instantiation. When adding new services:
1. Define the service interface
2. Implement client and server versions
3. Register both in their respective `*ServiceProvider` files
4. Use the registry's `add()` method

---

## Testing

### Unit Tests (Vitest)

- Location: `src/**/*.{test,spec}.{js,ts}`
- Run: `npm run test:unit` or `npm run test:unit -- --watch`
- Configured in `vite.config.ts`

### Integration Tests (Playwright)

- Location: `tests/` directory
- Run: `npm run test:integration`
- Starts the full build + preview server on port 4173
- Test match pattern: `/(.+\.)?(test|spec)\.[jt]s/`

---

## Code Quality Tools

### ESLint

Flat config (`eslint.config.js`). Key rules:
- TypeScript ESLint recommended
- Svelte ESLint recommended
- `no-unused-vars` with `argsIgnorePattern: '^_'`
- `no-undef` disabled (TS handles this)
- `svelte/no-navigation-without-resolve` disabled

### Prettier

Settings (from `.prettierrc`):
- **2 spaces** indentation (no tabs)
- **Single quotes** for strings
- **No trailing commas**
- **Print width**: 100 characters
- **Single attribute per line** in Svelte/HTML
- Trailing newline at end of file

### Knip

Dead code detection. Run: `npm run knip`

Tags can be used to exclude files: `@knipignore`

---

## Environment & Configuration

Do not touch the `.env` file.

### Environment Loading

Vite loads all env vars via `loadEnv(mode, process.cwd(), '')` in `vite.config.ts`.

---

## Build & Deployment

### Development

```bash
npm run dev          # Start Vite dev server on localhost:5173
```

### Production Build

```bash
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally
```

### Docker

```bash
docker build -t animorank .
docker run -p 3000:3000 animorank
```

- Base image: `node:24-trixie` (Debian, glibc-based)
- Exposes port **3000**
- ZenStack CLI installed globally for schema generation at runtime
- Build output in `/app/build/`

---

## External Service Integrations

### Piston API

Code execution is handled by the Piston API (engineer-man/piston). Student C code is:
1. Compiled
2. Executed with provided input
3. Result compared against expected output

### Google OAuth2

- Redirect URI: `/oauth` (check `src/routes/oath/+server.js` and `src/routes/+page.server.js`)
- Teacher role: email must be in the `Teacher_list` table
- All other logged-in users are students

---

## Adding New Code: Quick Checklist

1. **New component?** → Add to `src/lib/components/` if it will be globally used or in the route directory if its only for one page, use Svelte 5 runes, follow prop destructuring pattern
2. **New page?** → Add `+page.svelte` + `+page.server.ts` under `src/routes/<route>/`. When accessing data, use a service instead of directly accessing the database.
3. **New API endpoint?** → Add `+server.ts` under `src/routes/api/<route>/`, use `$lib/response` helpers. When accessing data, use a service instead of directly accessing the database.
4. **New database entity?** → Update ZenStack schema → `npx zenstack generate` → create Prisma migration. Always create a service for it for access by other parts of the page
5. **New utility?** → Add to `src/lib/utils/`
6. **New service?** → Implement client + server versions, register in both `*ServiceProvider` files
7. **Always run** `npm run lint` and `npm run check` before committing
8. **Never edit** files in `src/lib/zenstack/` or `.svelte-kit/` directly
