# Hangout — Full Deployment Plan for Claude Opus

You are picking up an in-progress React Native + Node.js app called **Hangout** — an AI-powered event planning app. The repo is at `https://github.com/ohadbarr1/Hangout` and the local working directory is `/Users/ohadbar/Hangout`.

Your job: bring this app to full deployment. API → Vercel. Mobile → Expo Go (immediate) + EAS Build (production).

---

## Codebase Overview

**Monorepo structure:**
```
apps/
  mobile/    — React Native + Expo (TypeScript, Expo Router)
  api/       — Node.js + Express (TypeScript)
packages/
  shared/    — Shared TypeScript types
```

**Tech stack:**
- Mobile: React Native + Expo SDK 51, Expo Router, NativeWind, Zustand, React Query, Supabase Realtime
- API: Express, TypeScript, Supabase, Claude API (`claude-haiku-4-5-20251001`), built with tsup
- DB: PostgreSQL via Supabase (auth + realtime + RLS)
- Package manager: Yarn 4.2.2 with `nodeLinker: node-modules`
- Node path: `~/.nvm/versions/node/v20.20.0/bin` — prefix all `node`/`yarn`/`npx` commands with `export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH" &&`

**What's already done:**
- Full scaffold: all screens, API routes, DB schema, components, stores, hooks
- Dependencies installed
- TypeScript: 0 errors, builds in 35ms with tsup
- Redis installed and running locally (`brew services start redis`)
- `.gitignore` in place

**What still needs to be done (your job):**
1. Collect credentials from the user
2. Apply DB schema to Supabase
3. Make 3 small code changes for Vercel compatibility
4. Deploy API to Vercel
5. Configure and run mobile app (Expo Go + EAS)

---

## PHASE 0 — Collect Credentials (ask the user for these)

Ask the user to provide:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJh...          ← "anon public" key in Project Settings → API
SUPABASE_SERVICE_ROLE_KEY=eyJh...  ← "service_role" key in Project Settings → API
SUPABASE_JWT_SECRET=...            ← Project Settings → API → JWT Settings (scroll down)
ANTHROPIC_API_KEY=sk-ant-...       ← console.anthropic.com → API Keys
```

Also ask: **Do you have an Expo account?** (needed for EAS Build later — free at expo.dev)

---

## PHASE 1 — Apply Database Schema to Supabase

Once you have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:

1. Log in to Supabase CLI:
```bash
export SUPABASE_ACCESS_TOKEN=<ask user to get from supabase.com/dashboard/account/tokens>
```

2. Apply the schema. The easiest method is via the Supabase dashboard SQL editor:
   - Navigate the user's browser to: `{SUPABASE_URL}/dashboard` → SQL Editor → New Query
   - Paste the full contents of `/Users/ohadbar/Hangout/apps/api/src/db/schema.sql`
   - Click Run

3. Enable Realtime on the required tables. In the Supabase dashboard:
   - Go to Database → Replication (or Table Editor → Realtime)
   - Enable Realtime for: `events`, `items`, `assignments`, `event_members`

---

## PHASE 2 — Code Changes for Vercel

Make these 3 changes before deploying:

### Change 1: Update `apps/api/src/index.ts`

Change the `dotenv` import and `app.listen()` call so they're skipped in Vercel's serverless environment:

**Current top of file:**
```typescript
import 'dotenv/config';
import express from 'express';
```

**Replace with:**
```typescript
import express from 'express';
// Only load .env file locally — Vercel injects env vars directly
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
```

**Current bottom of file:**
```typescript
app.listen(PORT, () => {
  console.log(`Hangout API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
```

**Replace with:**
```typescript
// Only start the HTTP server when running locally (not in Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Hangout API running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

export default app;
```

### Change 2: Create `vercel.json` at the repo root

Create `/Users/ohadbar/Hangout/vercel.json`:

```json
{
  "version": 2,
  "installCommand": "yarn install",
  "builds": [
    {
      "src": "apps/api/src/index.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["packages/shared/**/*"]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/apps/api/src/index.ts"
    }
  ]
}
```

### Change 3: Create mobile env file

Create `/Users/ohadbar/Hangout/apps/mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJh...
EXPO_PUBLIC_API_URL=https://hangout-api.vercel.app
```

(Fill in the real Supabase values now. Update `EXPO_PUBLIC_API_URL` after Vercel deployment.)

Also create `/Users/ohadbar/Hangout/apps/api/.env`:
```
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SUPABASE_JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:8081
```

---

## PHASE 3 — Deploy API to Vercel

### Step 1: Install Vercel CLI
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH" && npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
(Opens browser — user clicks to authenticate)

### Step 3: Deploy
```bash
cd /Users/ohadbar/Hangout && vercel
```

When prompted:
- **Set up and deploy**: Y
- **Which scope**: user's account
- **Link to existing project**: N
- **Project name**: `hangout-api`
- **In which directory is your code located**: `.` (current dir)
- **Want to modify settings**: N (our `vercel.json` handles everything)

### Step 4: Set environment variables in Vercel

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_JWT_SECRET production
vercel env add ANTHROPIC_API_KEY production
vercel env add JWT_SECRET production
vercel env add NODE_ENV production <<< "production"
vercel env add CORS_ORIGIN production
```

For `CORS_ORIGIN`, set it to the Expo web origin + any mobile origins (or `*` for MVP).

### Step 5: Deploy to production
```bash
vercel --prod
```

**Note the production URL** (e.g., `https://hangout-api.vercel.app`) — you'll need it for the mobile `.env`.

### Step 6: Update mobile `.env` with real API URL
Update `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` with the Vercel production URL.

### Step 7: Verify deployment
```bash
curl https://hangout-api.vercel.app/health
```
Should return: `{"status":"ok","timestamp":"..."}`

---

## PHASE 4 — Mobile: Expo Go (Immediate Testing)

This gets the app running on a real phone within minutes — no build or store submission needed.

### Prerequisites
- User installs **Expo Go** on their iOS or Android phone (free, from App Store / Play Store)

### Run the dev server
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH" && yarn workspace @hangout/mobile start
```

This outputs a QR code. User scans it with:
- **iOS**: Camera app
- **Android**: Expo Go app

The full app loads on their phone instantly. Any code changes hot-reload in real time.

**Troubleshooting:**
- If fonts fail to load (PlusJakartaSans/Inter), the assets aren't bundled yet. Create placeholder font files or temporarily remove font loading from `apps/mobile/app/_layout.tsx`
- If Supabase auth fails, verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the mobile `.env`

---

## PHASE 5 — Mobile: EAS Build (Production App Store Distribution)

This creates real `.ipa` (iOS) and `.apk`/`.aab` (Android) binaries.

### Prerequisites
- Expo account (free at expo.dev)
- For iOS App Store: Apple Developer Program ($99/yr) — for TestFlight (beta), also needed
- For Google Play: Google Play Developer account ($25 one-time)

### Step 1: Install EAS CLI
```bash
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH" && npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Configure EAS
```bash
cd /Users/ohadbar/Hangout/apps/mobile && eas build:configure
```

This creates `apps/mobile/eas.json`. Accept defaults.

### Step 4: Get and set the EAS Project ID
After `eas build:configure`, EAS prints a project ID. Update `apps/mobile/app.json`:
```json
"extra": {
  "eas": {
    "projectId": "YOUR-ACTUAL-EAS-PROJECT-ID"
  }
}
```

### Step 5: Set EAS secrets (env vars for builds)
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJh..."
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://hangout-api.vercel.app"
```

### Step 6: Build
```bash
# Build for both platforms (takes 15-30 min on EAS servers)
eas build --platform all --profile preview

# Or build just iOS for TestFlight:
eas build --platform ios --profile preview

# Or just Android for Play Store internal testing:
eas build --platform android --profile preview
```

### Step 7: Submit to stores (when ready for public release)
```bash
eas submit --platform ios      # Submits to App Store Connect / TestFlight
eas submit --platform android  # Submits to Google Play
```

---

## PHASE 6 — Git: Commit and Push Everything

```bash
cd /Users/ohadbar/Hangout
git add vercel.json apps/api/src/index.ts apps/mobile/app.json apps/mobile/eas.json
git commit -m "Add Vercel deployment config and EAS build setup"
git push
```

Vercel will auto-deploy on every push to `main` going forward.

---

## Environment Variable Reference

### Supabase (where to find them)
- Go to your Supabase project dashboard
- **Project Settings → API**:
  - `SUPABASE_URL` = "Project URL" (e.g., `https://abcdef.supabase.co`)
  - `SUPABASE_ANON_KEY` = "anon public" key
  - `SUPABASE_SERVICE_ROLE_KEY` = "service_role" key (keep secret — server only)
  - `SUPABASE_JWT_SECRET` = scroll down to "JWT Settings" → "JWT Secret"

### Anthropic
- Go to `console.anthropic.com` → **API Keys** → Create key
- Copy the `sk-ant-...` value

### Summary table

| Variable | Used by | Where |
|---|---|---|
| `SUPABASE_URL` | API + Mobile | Supabase Project Settings → API |
| `SUPABASE_ANON_KEY` | Mobile only | Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | API only (server-side) | Supabase Project Settings → API |
| `SUPABASE_JWT_SECRET` | API only | Supabase Project Settings → API → JWT Settings |
| `JWT_SECRET` | API only | Same as SUPABASE_JWT_SECRET |
| `ANTHROPIC_API_KEY` | API only | console.anthropic.com |
| `EXPO_PUBLIC_API_URL` | Mobile only | Your Vercel deployment URL |

---

## Troubleshooting

**Vercel build fails: "Cannot find module '@hangout/shared'"**
→ The `includeFiles` in `vercel.json` should handle this. If it still fails, copy the contents of `packages/shared/src/types.ts` directly into `apps/api/src/shared-types.ts` and update the import in `routes/events.ts`, `routes/items.ts`, `services/claudeService.ts`, and `workers/parseEventWorker.ts`.

**Vercel build fails: TypeScript errors**
→ Run `yarn workspace @hangout/api typecheck` locally first to confirm 0 errors. The current codebase is clean.

**Mobile: "Network request failed" when calling API**
→ Check `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` — it must point to the live Vercel URL, not `localhost`.

**Supabase auth not working on mobile**
→ Go to Supabase Dashboard → Authentication → URL Configuration → add your Expo Go URL and Vercel URL to the allowed redirect URLs.

**EAS build fails on iOS (code signing)**
→ EAS handles code signing automatically if you have an Apple Developer account linked. Run `eas credentials` to configure.

---

## Quick Checklist

- [ ] Supabase project created and provisioned
- [ ] Schema SQL run in Supabase SQL editor
- [ ] Realtime enabled for `events`, `items`, `assignments`, `event_members` tables
- [ ] `apps/api/.env` filled with real values
- [ ] `apps/mobile/.env` created with Supabase anon key
- [ ] `apps/api/src/index.ts` updated (dotenv + listen conditions)
- [ ] `vercel.json` created at repo root
- [ ] API deployed to Vercel (`vercel --prod`)
- [ ] Vercel env vars set
- [ ] `/health` endpoint returns 200
- [ ] `apps/mobile/.env` updated with real Vercel API URL
- [ ] Mobile running in Expo Go (QR scan)
- [ ] EAS project configured (`eas build:configure`)
- [ ] EAS secrets set
- [ ] EAS build triggered
- [ ] Everything committed and pushed to GitHub
