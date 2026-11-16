# Renovation Estimator

A 3D kitchen you can redesign in the browser. Click any part (cabinets, counters, backsplash, island, lighting,
flooring, appliances, hardware, walls), pick a finish, and a live price range updates as you choose. It's built as
a website feature for renovation companies: visitors see a realistic range before they book a consultation.

**Live:** https://renovation-estimator-orpin.vercel.app

![The kitchen estimator](docs/screenshot.jpg)

## How it's built

- **Next.js App Router** in `apps/web`, with server-rendered studio markup and a client lifecycle boundary for the existing controls.
- **Plain three.js** in `packages/engine`, with the kitchen built in code, procedural textures, day and evening lighting, named camera shots and click-to-select. The engine loads separately after the page renders.
- **Strict TypeScript** throughout, with shared TypeScript and ESLint configuration in `packages/`.
- **One business configuration** in `apps/web/lib/business.config.ts`: branding, metric dimensions, parts, options and provisional AUD allowances. Look shapes are checked against the engine's contracts.
- **pnpm workspaces and Turborepo** orchestrate development, linting, type-checking, tests and production builds.

Prices are indicative planning allowances, not a quote. Incredible Kitchens must confirm final scope, GST treatment and pricing. Kitchen size scales allowances, not the illustrative 3D layout. Online consultation bookings remain unavailable and no request is sent.

## Development

Requires Node.js 22.18 or later and the pnpm version pinned in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Vercel

The deployable application is `apps/web`. Set the Vercel project's Root Directory to `apps/web`, use the Next.js framework preset, and enable access to workspace files outside the Root Directory. Keep the repository root as the pnpm workspace root. These settings do not deploy the app by themselves; production deployment requires approval.
