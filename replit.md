# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native app — **MotoGuard – Ride Safe**. Production-ready motorcycle safety companion with:

**Core Features:**
- Accident detection dashboard (3-level: warning/alert/emergency) with animated pulse indicator
- Emergency contacts + SOS with 112 countdown modal
- Turn-by-turn map navigation with voice (react-native-maps + expo-speech)
- Ride history logging with GPS track, distance, duration, max speed
- AI Voice Agent (wake-word "Hey MotoGuard", ambient noise detection, 10 km/h auto-enable)
- Subscription paywall (Free / Basic $2.99 / Pro $5.99 / Pro+Drone $9.99 / Lifetime $39.99)
- RevenueCat integration (live product offerings; Test/App Store/Play Store keys)
- 6-language support (EN, HU, DE, ES, IT, PT) via `STRINGS` in AppContext
- Dark / Light / Auto display mode (user preference saved in AsyncStorage)
- 3-step onboarding (welcome, voice calibration, location permission)
- DJI Drone Coming Soon card (Pro+Drone and Lifetime tiers)

**Subscription tiers (TIER_FEATURES):**
- Free $0: 1 contact, 5 rides, map live tracking (no nav)
- Basic $2.99/mo: 2 contacts, 30 rides, 112 call, turn-by-turn nav, 6 languages
- Pro $5.99/mo: unlimited contacts/rides, voice agent, GPX/CSV export, detailed stats
- Pro+Drone $9.99/mo: + priority support, early access, DJI Drone (coming soon)
- Lifetime $39.99 (BEST VALUE): all features + all future features forever

**Key files:**
- `context/AppContext.tsx` — global state, STRINGS, TIER_FEATURES, persistence (AsyncStorage)
- `hooks/useTheme.ts` — returns `{ c, colors, isDark, Colors }`. `c.tint` is always MotoGuard orange #E8701A
- `constants/colors.ts` — dark/light color tokens (updated per new design spec)
- `app/(tabs)/_layout.tsx` — NativeTabs (iOS 26+) + ClassicTabs fallback
- `app/onboarding.tsx` — 3-step onboarding (welcome/voice/location)
- `app/(tabs)/index.tsx` — dashboard with speed display, voice agent, accident detection, drone card
- `app/(tabs)/map.tsx` — full-screen map with turn-by-turn navigation HUD
- `app/(tabs)/emergency.tsx` — SOS + emergency contacts management
- `app/(tabs)/rides.tsx` — ride history list with stats
- `app/(tabs)/profile.tsx` — appearance (Light/Dark/Auto picker), subscription, language, features
- `hooks/useVoiceAgent.ts` — wake word detection, ambient noise metering, status FSM
- `hooks/useRideTracking.ts` — GPS tracking, speed, distance, elapsed time
- `hooks/useMapNavigation.ts` — route planning, turn-by-turn voice instructions
- `components/VoiceAgentCard.tsx` — wake word UI, waveform animation, noise filter selector
- `components/VoiceStatusBadge.tsx` — header badge (OFF/READY/ACTIVE/SPEAK)
- `components/DroneComingSoonCard.tsx` — drone integration preview card
- `components/ui/PaywallModal.tsx` — Lifetime card (BEST VALUE gold) + monthly plans + drone Coming Soon banner
- `lib/revenuecat.tsx` — RevenueCat initialization + SubscriptionProvider + useSubscription
- `components/map/MapViewNative.native.tsx` / `.web.tsx` — platform-split map (web fallback)

**Theme system:** `useTheme()` returns `{ c, colors, isDark, Colors }`.
- `c.tint` = always MotoGuard orange #E8701A (no bike brand dynamic coloring)
- Never use hardcoded color values — always use `c.tint`, `c.danger`, `c.success`, etc. from `useTheme()`
- Bike brand themes have been fully removed

**Onboarding:** shown on first launch (`settings.onboardingComplete === false`). Steps: welcome → voice calibration (5s ambient noise) → location permission.
