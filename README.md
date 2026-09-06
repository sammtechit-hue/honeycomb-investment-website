# Investment Platform

Monorepo for the Honeycomb investment platform, managed with [Turborepo](https://turborepo.dev/) and [pnpm workspaces](https://pnpm.io/workspaces).

## Project structure

```
apps/
  api/           NestJS backend API
  public-web/    Next.js app — public-facing site
  secure-web/    Next.js app — authenticated/investor-facing site
packages/
  db/            Shared Prisma schema + client (@investment-platform/db)
```

| Package | Stack | Notes |
| --- | --- | --- |
| `apps/api` | NestJS | REST API, consumes `@investment-platform/db` |
| `apps/public-web` | Next.js 16 (App Router) + Tailwind v4 | Public marketing/investor-facing pages |
| `apps/secure-web` | Next.js 16 (App Router) + Tailwind v4 | Authenticated investor dashboard |
| `packages/db` | Prisma 5 + PostgreSQL | Shared schema/migrations/generated client used by other packages |

## Prerequisites

- **Node.js 24+** (`node -v` should print `v24.x`). If you use `nvm`/`nvm-windows`: `nvm install 24 && nvm use 24`.
- **pnpm 12.3.4** — this repo pins its package manager version in `package.json` (`packageManager` field). Enable Corepack so the pinned version is used automatically:

  ```sh
  corepack enable
  ```

  If you don't use Corepack, install pnpm globally to match: `npm install -g pnpm@12.3.4`.
- **PostgreSQL** — a running instance (local install, Docker, or a hosted database) for `packages/db`.

## Getting started

1. **Clone and install dependencies.** The GitHub repo root *is* the monorepo root — `apps/`, `packages/`, `package.json`, etc. live directly at the top level, there's no nested `investment-platform/` folder inside it:

   ```sh
   git clone https://github.com/sammtechit-hue/honeycomb-investment-website.git
   cd honeycomb-investment-website
   pnpm install
   ```

2. **Approve native build scripts.** pnpm blocks postinstall scripts for dependencies (like Prisma's engines) until you approve them. The first `pnpm install` will print `ERR_PNPM_IGNORED_BUILDS` — run:

   ```sh
   pnpm approve-builds
   ```

   Select all listed packages (`@parcel/watcher`, `@prisma/client`, `@prisma/engines`, `prisma`, `unrs-resolver`) and approve. This choice is saved to `pnpm-workspace.yaml` (`allowBuilds`) and committed, so you should only need to do this once per machine unless new packages with install scripts are added.

3. **Configure the database.** Copy the example env file and fill in your connection string:

   ```sh
   cp packages/db/.env.example packages/db/.env
   ```

   Edit `packages/db/.env` and set `DATABASE_URL` to point at your Postgres instance. This file is git-ignored — never commit real credentials.

4. **Generate the Prisma client and apply migrations:**

   ```sh
   pnpm --filter @investment-platform/db generate
   pnpm --filter @investment-platform/db migrate
   ```

5. **Run the apps:**

   ```sh
   pnpm dev            # runs `dev` in every app via Turborepo
   pnpm dev --filter=api           # just the API
   pnpm dev --filter=public-web    # just the public site
   pnpm dev --filter=secure-web    # just the secure site
   ```

## Common commands

Run from the repo root unless noted otherwise.

| Command | Description |
| --- | --- |
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Run all apps in dev mode (Turborepo) |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |
| `pnpm check-types` | Type-check all apps and packages |
| `pnpm format` | Format the repo with Prettier |
| `pnpm --filter <name> <script>` | Run a script in one workspace package only (e.g. `pnpm --filter api start:dev`) |
| `pnpm --filter @investment-platform/db studio` | Open Prisma Studio against your local database |

## Working with the database package (`packages/db`)

- Schema lives at `packages/db/prisma/schema.prisma`.
- After editing the schema, run `pnpm --filter @investment-platform/db migrate` to create a migration and regenerate the client.
- Other packages/apps depend on it via `"@investment-platform/db": "workspace:*"` and import the generated Prisma client from it — do not duplicate schema or client setup elsewhere.

## Windows notes

This project is developed on Windows in addition to macOS/Linux. A few gotchas:

- Use PowerShell or Git Bash; native `cmd.exe` batch commands (`del`, `rmdir`) work but aren't required for anything documented here.
- If `pnpm install` fails with a `JSON_PARSE` error, make sure every `package.json` in the workspace is valid (non-empty) JSON — an empty file from a half-finished `mkdir`/scaffold step is a common cause.
- Corepack may warn about npm's `install-scripts` policy when installing pnpm globally; that's about npm's own global installs and is unrelated to the `pnpm approve-builds` step above.

## Contributing

- Create a feature branch off `main`, open a PR, and keep changes scoped per app/package where possible.
- Run `pnpm lint` and `pnpm check-types` before pushing.
- Do not commit `.env` files or any real database/API credentials — use the `.env.example` files as the template for what needs to be set locally.
