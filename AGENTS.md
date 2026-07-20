# AGENTS.md

## Cursor Cloud specific instructions

CrypticAI is a **single Next.js 15 (App Router) app** — there are no other services. Everything (web UI + all `/api/*` routes) runs in one Node process, and persistence is an embedded **SQLite** file (`node:sqlite`), not a separate database server. Node 22+ is required (`node:sqlite`); the VM already has a compatible Node.

### Running / building / testing
- Dev server: `npm run dev` → http://localhost:3000 (see `package.json` scripts). It pins `--port 3000`; if 3000 is busy Next.js falls back to 3001.
- Build: `npm run build`. This is the real quality gate (TypeScript type-check + compile). It runs `node:sqlite` and prints a harmless `ExperimentalWarning: SQLite is an experimental feature`.
- Tests are standalone `tsx` scripts, not a single runner. There is **no** `npm test`. The pure-programmatic engine tests (e.g. `npm run test:phrase`, `npm run test:homophones`) run without any API key and are the fastest way to sanity-check the anagram/homophone engines.
- Lint (`npm run lint`) is **not configured** in this repo: there is no ESLint config, and `next lint` is deprecated + prompts interactively (it will hang in a non-interactive shell). Do not run it non-interactively; rely on `npm run build` for type/compile checking instead.

### Environment / secrets
- Local env goes in `.env.local` (git-ignored; copy from `.env.example`). The health check (`GET /api/health`) requires `ANTHROPIC_API_KEY`, `SESSION_SECRET`, `APP_URL`.
- `ANTHROPIC_API_KEY` is **mandatory for clue generation**: `POST /api/anagram` and `POST /api/homophone` return HTTP 401 without it. All other subsystems (auth, credits, archive, homophone tables) work without it.
- `SESSION_SECRET` and `APP_URL` (e.g. `http://localhost:3000`) are needed for auth/session and verification links.
- Set `ADMIN_EMAILS` to your test account's email for local dev: admin accounts get **unlimited generations**, skip rate limits, and are **auto-verified on read** (so you can log in without an email step). Note the local fallback admin `dev-admin@localhost` is not usable for signup because it fails email validation (no dot in the domain) — use a valid address like `demo@crypticai.test` and put it in `ADMIN_EMAILS`.
- Without `RESEND_API_KEY`, verification emails are **not** printed with their link in dev (only a generic `[dev] Email to ...` line via `lib/email/resend.ts`). To verify a non-admin account locally, either use an admin email (auto-verified) or set `email_verified_at` directly in the SQLite DB.

### Data / gotchas
- SQLite file defaults to `./data/clues.db` (`DATABASE_PATH`); tables auto-create/migrate on first access. On startup, `instrumentation.ts` warms the homophone tables (logs `Homophone database ready: N pairs`).
- Archive behavior differs by auth state: `GET /api/archive` returns a curated **guest preview** (ids like `-1`) when logged out, but searches the **real (initially empty) DB** when logged in — so a fresh logged-in archive shows "No archived clues" until you save one via `POST /api/archive`.
- Stripe/Resend/Sentry are all optional locally; the app runs fine without them.
