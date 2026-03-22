# Hangout

> Describe your event. AI handles the rest.

Hangout is a mobile-first AI-powered event planning app. Users describe an event in natural language, Claude AI breaks it into tasks and items to bring, and friends join via invite link to claim responsibilities.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo (TypeScript) |
| Backend | Node.js + Express (TypeScript) |
| Database | PostgreSQL via Supabase |
| Real-time | Supabase Realtime |
| Auth | Supabase Auth (Google + Apple OAuth) |
| LLM | Claude API (claude-haiku-4-5) |
| Push | Expo Push Notifications |

## Monorepo Structure

```
Hangout/
├── apps/
│   ├── mobile/        # React Native + Expo app (Expo Router)
│   └── api/           # Node.js + Express REST API
├── packages/
│   └── shared/        # Shared TypeScript types
├── PRODUCT_SPEC.md
└── ARCHITECTURE.md
```

## Getting Started

### Prerequisites

- Node.js >= 20
- Yarn 4
- Expo CLI: `npm install -g expo-cli`
- A Supabase project
- An Anthropic API key

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
# Fill in your Supabase URL, service role key, Anthropic API key, etc.
```

### 3. Set up the database

Run the SQL schema against your Supabase project:

```bash
# In the Supabase SQL editor, paste and run:
cat apps/api/src/db/schema.sql
```

### 4. Configure the mobile app

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 5. Run in development

```bash
# Terminal 1 — API
yarn api

# Terminal 2 — Mobile (opens Expo dev server)
yarn mobile
```

## Architecture Overview

### Event Flow

1. User types a free-text event description (e.g. "Beach BBQ for 20 people next Saturday")
2. Mobile app sends description to `POST /events/parse`
3. API calls Claude with a structured prompt
4. Claude returns categorized items + metadata as JSON
5. Items are saved to Supabase and broadcast via Realtime
6. Admin shares invite link (`hangout://invite/<token>`)
7. Friends open the deep link, join the event, and claim items
8. Real-time updates keep everyone in sync

### Key Design Decisions

- **Optimistic updates**: Claim actions update the UI immediately before server confirmation
- **BullMQ queue**: LLM parsing is offloaded to a background worker to keep the API responsive
- **Row Level Security**: All Supabase tables are protected — users can only access events they belong to
- **Expo Router**: File-based routing mirrors Next.js conventions for familiarity

## Design System

| Token | Value |
|---|---|
| Primary | `#FF6B4A` (Coral-orange) |
| Accent | `#FFD166` (Golden yellow) |
| Violet | `#7B61FF` (Electric violet) |
| Background | `#FFF8F3` (Warm off-white) |
| Foreground | `#1A1A2E` (Deep charcoal) |
| Success | `#06D6A0` (Mint green) |

Fonts: **Plus Jakarta Sans** (headings), **Inter** (body)
