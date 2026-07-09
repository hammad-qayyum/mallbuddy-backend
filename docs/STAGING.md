# Staging Environment Setup (GAP-014)

The BRD/PRD (§11) require a separate staging environment so testing never
touches live data. This runbook creates one on the existing VPS
(203.161.60.191) alongside production. Everything is additive — production
is untouched.

## Architecture

| | Production | Staging |
|---|---|---|
| URL | `https://backend.mallbuddy.net` | `https://staging-backend.mallbuddy.net` |
| Directory | `/root/mallbuddy-app/mallbuddy-backend` | `/root/mallbuddy-app/mallbuddy-backend-staging` |
| Port | 5000 | 5001 |
| PM2 app | `mallbuddy-backend` | `mallbuddy-backend-staging` |
| Database | Neon (prod) | **Neon branch or separate project — never the prod DB** |
| Git branch | `main` | `main` (or a `staging` branch if you adopt one) |
| Admin web | `mallbuddy-web-app.vercel.app` | separate Vercel project, `REACT_APP_BACKEND_URL` set to staging |
| Mobile apps | default build (prod URL baked in) | `eas build --profile staging` (staging URL injected via `EXPO_PUBLIC_API_URL`) |

## 1. Staging database (Neon) — prefer a BRANCH

In the Neon console, create a **branch** of the production database (instant,
copy-on-write — realistic data for QA). A branch also copies the
`_prisma_migrations` table, so all migrations already show as applied and
`prisma migrate deploy` is a clean no-op. Copy its connection string.

> ⚠️ **Do not use `prisma migrate deploy` on an EMPTY database.** The
> migration history contains a `20260509000000_baseline_after_drift`
> re-baseline that recreates objects `20251212070808_init` already created,
> so a from-scratch `migrate deploy` fails with `type "Role" already exists`.
> The migration files can't be edited (Prisma checksums them; changing them
> would break production's `migrate status`). A Neon **branch** avoids this
> entirely. If you genuinely need an empty DB, use the baselining path in
> step 2b instead.

## 2. Backend clone on the VPS

```bash
ssh root@203.161.60.191
cd /root/mallbuddy-app
git clone https://github.com/hammad-qayyum/mallbuddy-backend mallbuddy-backend-staging
cd mallbuddy-backend-staging
cp .env.staging.example .env
nano .env        # fill in: staging DATABASE_URL, a NEW BETTER_AUTH_SECRET,
                 # Resend/Twilio/Amwal values (copy from prod .env where shared)
npm install
npm run build
```

### 2a. If staging DB is a Neon BRANCH (recommended)
```bash
npx prisma migrate deploy       # no-op: migrations already applied on the branch
```

### 2b. If staging DB is EMPTY (fresh Neon project)
`migrate deploy` would collide (see the warning above). Materialize the
schema directly from `schema.prisma`, then baseline the migration table so
future deploys work normally:
```bash
npx prisma db push              # builds the full schema (source of truth)
# Mark every existing migration as already-applied so `migrate deploy`
# is consistent from here on:
for m in prisma/migrations/*/; do
  npx prisma migrate resolve --applied "$(basename "$m")"
done
```

## 3. PM2

```bash
# ecosystem.config.js ships in the repo with both app definitions
pm2 start ecosystem.config.js --only mallbuddy-backend-staging
pm2 save
```

## 4. DNS + reverse proxy

1. DNS (Namecheap): add an A record `staging-backend.mallbuddy.net` → `203.161.60.191`.
2. Add a server block for it in whatever terminates TLS for
   `backend.mallbuddy.net` (nginx/caddy on the VPS), proxying to
   `http://127.0.0.1:5001`, and issue a certificate (e.g.
   `certbot --nginx -d staging-backend.mallbuddy.net`). Mirror the existing
   `backend.mallbuddy.net` block, changing only `server_name` and the port.

## 5. Verify

```bash
curl -s https://staging-backend.mallbuddy.net/api/health          # → {"status":"ok"}
curl -s https://staging-backend.mallbuddy.net/api/restaurants/all # → staging data
```

## 6. Staging admin web (Vercel)

Create a second Vercel project from the same `mallbuddy-web-app` repo:
- Set env var `REACT_APP_BACKEND_URL=https://staging-backend.mallbuddy.net`
  (with this set, the app calls staging directly and ignores the
  `vercel.json` rewrites that point at production).
- Add the resulting `*.vercel.app` origin to `ALLOWED_ORIGINS` in the
  staging backend `.env` and restart `mallbuddy-backend-staging`.

## 7. Staging mobile builds

Both apps read `EXPO_PUBLIC_API_URL` (falling back to the production URL —
see `env.js`). The `staging` EAS profile in each app's `eas.json` injects
the staging URL:

```bash
# Local dev against staging (Expo Go):
EXPO_PUBLIC_API_URL=https://staging-backend.mallbuddy.net/api npx expo start

# Installable staging build:
eas build --profile staging --platform android
```

Regular `production` builds are unaffected (no env var → production URL).

## 8. Day-to-day

- Deploy to staging first: `cd mallbuddy-backend-staging && git pull &&
  npm install && npm run build && npx prisma migrate deploy &&
  pm2 restart mallbuddy-backend-staging`
- QA runs against `staging-backend.mallbuddy.net` — orders, signups, blocks
  never touch live data.
- Promote by repeating the same steps in the production directory.
