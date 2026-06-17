# Deploy CrypticAI on Railway

This app needs **persistent disk** (SQLite), **long request timeouts** (clue generation up to ~3 minutes), and **Node 22+** (`node:sqlite`).

## 1. Push to GitHub

Railway deploys from a Git repository. Push this project to GitHub if it is not there already.

## 2. Create the Railway project

1. Open [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub repo** → select `crypticAI`.
3. Railway detects Next.js via Nixpacks and uses `railway.toml` for build/start.

## 3. Add a persistent volume (required)

User accounts, credits, and the clue archive live in one SQLite file. Without a volume, data is lost on every deploy.

1. In your Railway service, open **Volumes**.
2. **Add Volume** → mount path: `/data`
3. In **Variables**, set:

   ```
   DATABASE_PATH=/data/clues.db
   ```

The app creates the file and tables on first request.

## 4. Set environment variables

In Railway → **Variables** (production service):

| Variable | Required | Notes |
|----------|----------|--------|
| `ANTHROPIC_API_KEY` | Yes | [Anthropic console](https://console.anthropic.com/) — set a spend limit |
| `SESSION_SECRET` | Yes | Long random string, e.g. `openssl rand -base64 32` |
| `DATABASE_PATH` | Yes | `/data/clues.db` (with volume mounted at `/data`) |
| `APP_URL` | Recommended | `https://www.crypticai.uk` — used in verification email links |
| `RESEND_API_KEY` | Yes (signup) | [Resend](https://resend.com/) — sends verification emails |
| `EMAIL_FROM` | Recommended | e.g. `CrypticAI <onboarding@crypticai.uk>` (domain verified in Resend) |
| `STRIPE_SECRET_KEY` | For payments | Use `sk_live_…` when going live |
| `STRIPE_WEBHOOK_SECRET` | Recommended | From Stripe webhook (step 6) |
| `STRIPE_PRICE_ID_6` | Optional | Run `npm run setup:stripe` — $3 for 6 credits |
| `STRIPE_PRICE_ID_12` | Optional | Run `npm run setup:stripe` — $5 for 12 credits |
| `STRIPE_CURRENCY` | Optional | Default `usd` |

Do **not** commit `.env.local`. Set secrets only in Railway.

Optional model overrides (defaults to Opus 4.8):

- `ANTHROPIC_SETTER_MODEL`
- `ANTHROPIC_CRITIC_MODEL`
- `ANTHROPIC_REPAIR_MODEL`
- `ANTHROPIC_EXPLAIN_MODEL`

## 5. Custom domain

1. Railway service → **Settings** → **Networking** → **Generate Domain** (Railway URL for testing).
2. **Custom Domain** → add e.g. `crypticai.example.com`.
3. At your registrar, add the CNAME record Railway shows.
4. Wait for TLS (usually a few minutes).

## 6. Stripe (production)

1. Complete Stripe account activation (business details, bank).
2. Switch to **Live** mode in the Stripe dashboard.
3. Create a live price (local one-off):

   ```bash
   STRIPE_SECRET_KEY=sk_live_... npm run setup:stripe
   ```

   Add the printed `STRIPE_PRICE_ID` to Railway variables.

4. **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Event: `checkout.session.completed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET` on Railway.

5. Test checkout on the Railway URL before switching DNS, or use Stripe test keys on a staging service first.

## 7. Deploy and verify

**Live app:** https://crypticai-production.up.railway.app

After the first deploy:

1. Open `https://your-domain.com/api/health` → `{ "ok": true }`
2. Sign up and log in (session cookie requires HTTPS).
3. Generate a clue (may take 1–3 minutes).
4. Archive a clue and search the archive.
5. Buy credits and confirm balance updates (webhook + success redirect).

## 8. Backups

Download or snapshot `/data/clues.db` regularly. Railway volumes persist across deploys but are not a substitute for off-site backups.

Options:

- Periodic `railway run` + copy (if using Railway CLI)
- A small cron job that uploads the file to S3/R2
- Migrate to Turso/Postgres later if you need multi-instance scaling

## 9. Costs to monitor

- **Railway**: usage-based (compute + volume)
- **Anthropic**: ~$0.05–$0.10 per successful clue generation (Opus)
- **Stripe**: per-transaction fees

Set Anthropic billing alerts before opening to many users.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login works locally, not on Railway | Missing HTTPS or `SESSION_SECRET` |
| “Dictionary not found” on generate | Redeploy after `next.config.ts` tracing fix |
| Credits not added after payment | Webhook URL/secret wrong, or not live mode |
| Data lost after deploy | No volume or wrong `DATABASE_PATH` |
| Generate times out | Client/proxy timeout; Railway allows long requests — check browser/network |

## CLI helpers (optional)

After `railway login` and `railway link`:

```bash
npm run railway:env
railway up --detach
npm run setup:stripe:webhook -- https://your-app.up.railway.app/api/webhooks/stripe
railway domain
```

## Local production smoke test

```bash
npm run build
SESSION_SECRET=test-secret DATABASE_PATH=./data/clues.db npm start
```
