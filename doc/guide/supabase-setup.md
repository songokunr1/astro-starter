# Supabase setup & environment switching

This guide explains how to run the Astro project against Supabase Cloud, how to switch between the regular dev server (`npm run dev`) and the E2E server (`npm run dev:e2e`), and how to manage database migrations.

---

## 1. Prerequisites

- Node.js `22.14.0` (see `.nvmrc`)
- npm (or pnpm/yarn)
- Supabase CLI `>= 2.0`
- Access to two Supabase Cloud projects (recommended):
  - **Development** – daily work
  - **Test/E2E** – disposable data for automated tests

```bash
npm install            # installs project deps
npm exec supabase -v   # verifies CLI is available
```

---

## 2. Environment files

Astro automatically loads `.env` in default mode and `.env.<mode>` when you pass `--mode <mode>`.  
We rely on that to connect to two different Supabase Cloud projects:

```
.env        -> used by `npm run dev`          -> points to dev Supabase project
.env.test   -> used by `npm run dev:e2e`      -> points to test Supabase project
```

### Sample `.env`

```env
# Server-side (Astro middleware, API routes)
SUPABASE_URL=https://<dev-project>.supabase.co
SUPABASE_KEY=<dev-service-role-or-anon-key>

# Client-side (React forms call Supabase REST directly)
PUBLIC_SUPABASE_URL=https://<dev-project>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<dev-anon-key>

OPENROUTER_API_KEY=<your-key>
```

### Sample `.env.test`

```env
SUPABASE_URL=https://<test-project>.supabase.co
SUPABASE_KEY=<test-service-role-or-anon-key>

PUBLIC_SUPABASE_URL=https://<test-project>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<test-anon-key>

OPENROUTER_API_KEY=<your-key-or-mock>
```

> **Why both private & public vars?**  
> Astro exposes only `PUBLIC_*` variables to the browser bundles. Our login, register and reset forms fetch Supabase REST endpoints directly from the client, so they need the public URL/key. Server-only code (middleware, API routes) reads the private versions. Always keep the public values equal to the ones above, otherwise `/login` will not know which Supabase instance to call.

---

## 3. Linking the Supabase Cloud project

Link each environment once so the CLI knows where to push migrations:

```bash
# 1) Sign in (opens browser)
npm exec supabase login

# 2) Link dev project
npm exec supabase link --project-ref <dev-project-ref>

# (optional) Link test project in a separate clone or with `--project-ref`
# You can also run commands with `--project-ref <test-project-ref>` ad hoc.
```

You can check which project is linked with:

```bash
npm exec supabase projects list
```

---

## 4. Running the local Astro server

| Command          | Loads env file | Supabase target              | Typical usage                |
| ---------------- | -------------- | ---------------------------- | ---------------------------- |
| `npm run dev`    | `.env`         | Dev Supabase Cloud project   | Day-to-day development       |
| `npm run dev:e2e`| `.env.test`    | Test Supabase Cloud project  | Running local E2E test suite |

Both commands start Astro at `http://localhost:4321`, but each injects a different Supabase URL/key pair so you can switch databases just by restarting with the appropriate script.

To make sure you are on the right environment, log in via Supabase Studio and confirm your changes appear in the expected project.

---

## 5. Applying migrations

After implementing features or running E2E tests you usually need to sync schema changes.

### Push migrations without data loss

```bash
npm exec supabase db push
```

Use this when you want to apply the SQL files in `supabase/migrations` to the currently linked project without dropping data. Run it separately for dev/test projects if needed.

### Reset + seed (clean slate for tests)

```bash
npm exec supabase db reset --linked
```

- Drops the linked database, reapplies every migration, and runs `supabase/seed.sql`.
- **Only** run this against disposable environments (e.g., the test project referenced by `.env.test`).
- Perfect right before `npm run dev:e2e` to guarantee predictable test data.

---

## 6. Optional: run the full Supabase stack locally

If you prefer local Postgres instead of the cloud:

```bash
npm exec supabase start        # spins up local stack (API, DB, Studio, etc.)
npm exec supabase db reset     # reapplies migrations + seeds locally
```

Then point `.env.local` (or temporarily override `.env`) to:

```
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your-local-anon-key
```

Switch back to the cloud simply by restoring the original `.env` / `.env.test` files.

---

## 7. Recommended workflow summary

1. **Install & configure**: `npm install`, create `.env`, `.env.test`, run `supabase login` + `supabase link`.
2. **Daily dev**:
   - `npm run dev` (uses cloud dev database)
   - Write code, run migrations with `supabase db push`.
3. **Before/after E2E**:
   - `npm exec supabase db reset --project-ref <test-project-ref>`
   - `npm run dev:e2e` (loads `.env.test`)
   - Execute your Playwright/Cypress suite against the clean test database.
4. **Optional local stack**: `supabase start` when you want everything offline.

This setup ensures the frontend and Astro server always talk to Supabase Cloud, while you can hop between dev and test databases simply by choosing the appropriate npm script (and thus `.env` file).

