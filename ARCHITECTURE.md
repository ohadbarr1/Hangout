# Hangout — Complete Technical Architecture

> Mobile-first event planning app. Users describe an event in free text; Claude API parses it into tasks and items; friends claim assignments in real time.

---

## 1. Tech Stack Recommendation

### Frontend — React Native + Expo (SDK 51+)
- **Why Expo**: Managed workflow covers push notifications (Expo Push), deep links, OTA updates, and EAS Build for both iOS and Android from a single codebase. No native module ejection needed for this feature set.
- **State management**: Zustand (lightweight, works well offline) + TanStack Query (server state, cache, optimistic updates)
- **Navigation**: Expo Router (file-based routing, deep-link friendly)
- **Real-time client**: Supabase Realtime (built-in with the JS client)
- **Offline**: MMKV for fast local storage + TanStack Query's `persistQueryClient` plugin

### Backend — Node.js + Express
- **Why**: Familiar ecosystem, fast to iterate, excellent Supabase and Anthropic SDK support
- **Runtime**: Node 20 LTS
- **Key libraries**: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `zod` (validation), `bull` (job queues for notifications)
- **Deployment**: Railway or Render (simple, affordable, auto-scaling)

### Database — PostgreSQL via Supabase
- **Why Supabase**: Managed Postgres + built-in Auth (JWT, OAuth, magic links) + built-in Realtime (Postgres logical replication → WebSocket channels) + Row Level Security (RLS) = four infrastructure pieces in one service
- **Supabase Realtime** replaces the need for a separate WebSocket server

### Auth — Supabase Auth
- Email/password, magic link, Google OAuth, Apple Sign-In (required for App Store)
- JWT tokens; mobile client uses `@supabase/supabase-js` session management
- RLS policies enforce that users only see events they belong to

### LLM — Anthropic Claude API
- Model: `claude-3-5-haiku-20241022` for speed and cost on the parsing step
- Called server-side only (API key never exposed to mobile client)
- Structured output via tool-use / forced JSON mode

### Push Notifications — Expo Push Notification Service (EPNS)
- Expo abstracts APNs (iOS) and FCM (Android)
- Backend stores `expo_push_token` per user device
- Bull queue workers send notifications asynchronously so API responses stay fast

### Hosting / Infrastructure
| Concern | Service |
|---|---|
| API server | Railway (Node container, auto-deploy from GitHub) |
| Database + Auth + Realtime | Supabase (managed Postgres) |
| File storage (avatars, event images) | Supabase Storage |
| Job queue | Redis on Railway + BullMQ |
| LLM calls | Anthropic API (US region) |
| Mobile builds | Expo EAS Build |
| OTA updates | Expo EAS Update |

---

## 2. Database Schema

All tables live in a single Supabase PostgreSQL project. Row Level Security is enabled on every table.

```sql
-- ================================================================
-- USERS
-- Supabase Auth manages auth.users; this is the public profile.
-- ================================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- PUSH TOKENS
-- One user may have multiple devices.
-- ================================================================
CREATE TABLE public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,          -- Expo push token
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- EVENTS
-- ================================================================
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES public.profiles(id),
  title           TEXT NOT NULL,
  description     TEXT,                       -- raw free-text from user
  location        TEXT,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  cover_image_url TEXT,
  invite_code     TEXT NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
  llm_parsed_at   TIMESTAMPTZ,               -- null until Claude has processed it
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_admin_id_idx ON public.events(admin_id);
CREATE INDEX events_invite_code_idx ON public.events(invite_code);

-- ================================================================
-- EVENT MEMBERS
-- Junction: who has joined an event (admin is also a member).
-- ================================================================
CREATE TABLE public.event_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX event_members_event_id_idx ON public.event_members(event_id);
CREATE INDEX event_members_user_id_idx  ON public.event_members(user_id);

-- ================================================================
-- ITEMS / TASKS
-- Both "bring a dish" items and "set up chairs" tasks live here.
-- ================================================================
CREATE TABLE public.event_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('item', 'task')),
  title         TEXT NOT NULL,
  description   TEXT,
  quantity      INTEGER DEFAULT 1,           -- for items (e.g. "2 bottles of wine")
  category      TEXT,                        -- e.g. "food", "drinks", "equipment", "logistics"
  is_required   BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  source        TEXT NOT NULL DEFAULT 'llm' CHECK (source IN ('llm', 'manual')),
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_items_event_id_idx ON public.event_items(event_id);

-- ================================================================
-- ASSIGNMENTS
-- A member claims an item or task.
-- ================================================================
CREATE TABLE public.assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES public.event_items(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,  -- denormalized for RLS
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note        TEXT,                          -- "I'll bring the vegan version"
  status      TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'completed', 'dropped')),
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)                  -- one person can't claim the same item twice
);

CREATE INDEX assignments_item_id_idx  ON public.assignments(item_id);
CREATE INDEX assignments_event_id_idx ON public.assignments(event_id);
CREATE INDEX assignments_user_id_idx  ON public.assignments(user_id);

-- ================================================================
-- INVITATIONS
-- Tracks invite links sent to specific email addresses.
-- ================================================================
CREATE TABLE public.invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES public.profiles(id),
  email       TEXT,                          -- null if invite-code share (not targeted)
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX invitations_event_id_idx ON public.invitations(event_id);
CREATE INDEX invitations_token_idx    ON public.invitations(token);

-- ================================================================
-- NOTIFICATIONS  (stored for in-app notification center)
-- ================================================================
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,                 -- 'assignment_claimed', 'event_updated', 'invite_accepted', etc.
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,                         -- arbitrary payload for deep link routing
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx    ON public.notifications(user_id);
CREATE INDEX notifications_user_read_idx  ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
```

### Row Level Security Policies (representative)

```sql
-- Profiles: visible to everyone authenticated; editable only by owner
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Events: visible only to members
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON public.events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_members WHERE event_id = id AND user_id = auth.uid())
);
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (admin_id = auth.uid());
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (admin_id = auth.uid());

-- Items: visible to event members; writable by admin
ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON public.event_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_members WHERE event_id = event_items.event_id AND user_id = auth.uid())
);

-- Assignments: members can claim; owner can drop their own
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.event_members WHERE event_id = assignments.event_id AND user_id = auth.uid())
);
CREATE POLICY "assignments_insert" ON public.assignments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "assignments_update" ON public.assignments FOR UPDATE USING (user_id = auth.uid());
```

---

## 3. API Design

Base URL: `https://api.hangout.app/v1`

All endpoints (except auth and invite acceptance) require `Authorization: Bearer <supabase_jwt>`.

### Auth Endpoints
These are handled by Supabase Auth directly from the mobile client (no custom backend needed). The backend validates JWTs using Supabase's JWKS endpoint.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Supabase Auth (email + password) |
| POST | `/auth/login` | Supabase Auth |
| POST | `/auth/logout` | Supabase Auth |
| POST | `/auth/magic-link` | Supabase Auth passwordless |
| POST | `/auth/oauth/google` | Supabase Auth OAuth |
| POST | `/auth/oauth/apple` | Supabase Auth OAuth |

### Profile Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/profile/me` | Get current user's profile |
| PATCH | `/profile/me` | Update display name, avatar |
| POST | `/profile/push-token` | Register/update device push token |
| DELETE | `/profile/push-token/:token` | Deregister push token on logout |

### Event Endpoints

| Method | Path | Body / Params | Description |
|---|---|---|---|
| GET | `/events` | — | List events the user belongs to |
| POST | `/events` | `{ title, description, location, starts_at, ends_at }` | Create event; auto-triggers LLM parse |
| GET | `/events/:eventId` | — | Get event detail (members, items, assignments) |
| PATCH | `/events/:eventId` | partial event fields | Admin only |
| DELETE | `/events/:eventId` | — | Admin only; soft-delete (status = cancelled) |
| POST | `/events/:eventId/parse` | — | Re-trigger LLM parse (admin only) |

### Item / Task Endpoints

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/events/:eventId/items` | — | List all items and tasks |
| POST | `/events/:eventId/items` | `{ type, title, description, quantity, category }` | Add manual item/task |
| PATCH | `/events/:eventId/items/:itemId` | partial item fields | Admin or item creator |
| DELETE | `/events/:eventId/items/:itemId` | — | Admin only |

### Assignment Endpoints

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/events/:eventId/assignments` | — | List all assignments for event |
| POST | `/events/:eventId/items/:itemId/assign` | `{ note? }` | Claim an item (authenticated user) |
| PATCH | `/events/:eventId/items/:itemId/assign` | `{ status, note }` | Update assignment (drop, complete) |
| DELETE | `/events/:eventId/items/:itemId/assign` | — | Drop claimed item |

### Invitation Endpoints

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/events/:eventId/invitations` | `{ emails?: string[] }` | Create targeted invites OR generate share link |
| GET | `/events/:eventId/invitations` | — | List invites (admin only) |
| DELETE | `/events/:eventId/invitations/:inviteId` | — | Revoke invite (admin only) |
| GET | `/invitations/:token` | — | Resolve invite token → event preview (unauthenticated) |
| POST | `/invitations/:token/accept` | — | Accept invite; adds user to event_members |
| GET | `/events/:eventId/invite-code` | — | Get or regenerate the event's short invite code |

### Notification Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List in-app notifications (paginated) |
| POST | `/notifications/read` | `{ ids: string[] }` Mark as read |
| POST | `/notifications/read-all` | Mark all read |

### LLM Parse Endpoint (internal — called by event creation flow)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/internal/parse-event` | `{ eventId, description }` | Triggers Claude API, writes items to DB |

---

## 4. Real-time Architecture

### Mechanism: Supabase Realtime (Postgres CDC → WebSocket)

Supabase Realtime uses PostgreSQL logical replication to stream row-level changes to subscribed clients over a persistent WebSocket connection. No separate WebSocket server is needed.

### Subscribed Channels

The mobile client opens one channel per event the user is viewing:

```
Channel: event:{eventId}
Subscribed tables:
  - event_items      (INSERT, UPDATE, DELETE)
  - assignments      (INSERT, UPDATE, DELETE)
  - event_members    (INSERT, DELETE)
  - events           (UPDATE)             -- catches title/time changes
```

RLS is enforced on Realtime subscriptions — users only receive rows they are permitted to read.

### Client-Side Subscription (React Native)

```typescript
// hooks/useEventRealtime.ts
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export function useEventRealtime(eventId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`event:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_items',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['items', eventId] })
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignments',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['assignments', eventId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])
}
```

### Optimistic Updates

When a user claims an item, the UI updates instantly (optimistic update via TanStack Query `useMutation`). If the server returns a conflict (someone else just claimed it), the optimistic update is rolled back and the user sees a toast: "Someone just grabbed that one — pick another!"

### Offline Behavior

- TanStack Query `persistQueryClient` + MMKV adapter stores the last-known query cache on device.
- When offline, the app renders stale cached data with a visible "Offline — showing last saved data" banner.
- Write operations (claim, drop) are queued with a BullMQ-style local queue (using `react-native-mmkv` as a simple queue) and retried on reconnect.
- Supabase Realtime auto-reconnects; on reconnect, all subscribed queries are invalidated to pull fresh data.

---

## 5. LLM Integration Design

### Architecture

1. User creates event with a free-text `description`.
2. `POST /events` API creates the event row immediately (status: `draft`) and returns to the client fast.
3. A BullMQ job is enqueued: `parse-event` with `{ eventId, description }`.
4. The worker calls Claude API with a structured prompt.
5. Claude returns JSON; the worker validates it with Zod and bulk-inserts rows into `event_items`.
6. Event status updates to `active`; Supabase Realtime pushes the new items to all connected clients.
7. If Claude fails or returns invalid JSON, the job retries up to 3 times with exponential backoff. After exhaustion, admin is notified and can manually add items.

### Model Choice

`claude-3-5-haiku-20241022` — best latency/cost for structured extraction. Falls back to `claude-3-5-sonnet-20241022` if the event description is unusually long (>2000 chars) or the haiku response fails validation twice.

### Prompt Design

```typescript
// server/services/llm/parseEvent.ts

const SYSTEM_PROMPT = `You are an event planning assistant. Your job is to read a description of a social event and extract a structured list of items to bring and tasks to complete.

Rules:
- Identify ITEMS (physical things someone should bring: food, drinks, equipment, supplies).
- Identify TASKS (actions someone needs to do: setup, cleanup, coordination, booking).
- Be specific: "drinks" → "Soda / soft drinks", "Beer or wine", "Water bottles".
- Assign a category to each entry: food | drinks | equipment | logistics | entertainment | other.
- Estimate quantity where implied by context (e.g. "party of 10" → suggest quantities accordingly).
- Mark items as required: true if clearly needed, false if optional/nice-to-have.
- Do NOT invent items not implied by the description.
- Respond ONLY with valid JSON matching the schema. No prose.`;

const USER_PROMPT = (description: string, guestCount?: number) => `
Event description:
"""
${description}
"""
${guestCount ? `Approximate guest count: ${guestCount}` : ''}

Extract all items and tasks. Return JSON in this exact shape:
{
  "items": [
    {
      "type": "item" | "task",
      "title": string,
      "description": string | null,
      "quantity": number,
      "category": "food" | "drinks" | "equipment" | "logistics" | "entertainment" | "other",
      "is_required": boolean
    }
  ]
}`;
```

### Example Input / Output

**Input description:**
> "BBQ at my place Saturday afternoon. About 15 people coming. We'll need burgers and hot dogs, buns, condiments. Someone should bring a veggie option. Need plates, napkins, cups. I have the grill but need charcoal. Music would be great — someone with a Bluetooth speaker? Need someone to help with setup an hour before and cleanup after."

**Claude API call:**
```json
{
  "model": "claude-3-5-haiku-20241022",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "<user prompt above>" }
  ],
  "system": "<system prompt above>"
}
```

**Claude JSON output:**
```json
{
  "items": [
    {
      "type": "item",
      "title": "Beef burgers",
      "description": "Raw burger patties for grilling",
      "quantity": 20,
      "category": "food",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Hot dogs",
      "description": "Hot dog sausages for grilling",
      "quantity": 15,
      "category": "food",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Burger and hot dog buns",
      "description": null,
      "quantity": 30,
      "category": "food",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Condiments",
      "description": "Ketchup, mustard, mayo",
      "quantity": 1,
      "category": "food",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Veggie option",
      "description": "Veggie burgers or grilled vegetables for non-meat eaters",
      "quantity": 5,
      "category": "food",
      "is_required": false
    },
    {
      "type": "item",
      "title": "Paper plates",
      "description": null,
      "quantity": 20,
      "category": "equipment",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Napkins",
      "description": null,
      "quantity": 2,
      "category": "equipment",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Cups",
      "description": "Plastic or paper cups",
      "quantity": 20,
      "category": "equipment",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Charcoal",
      "description": "Charcoal for the grill",
      "quantity": 1,
      "category": "equipment",
      "is_required": true
    },
    {
      "type": "item",
      "title": "Bluetooth speaker",
      "description": "For background music",
      "quantity": 1,
      "category": "entertainment",
      "is_required": false
    },
    {
      "type": "task",
      "title": "Setup crew",
      "description": "Help set up tables, chairs, and grill area 1 hour before the event starts",
      "quantity": 2,
      "category": "logistics",
      "is_required": true
    },
    {
      "type": "task",
      "title": "Cleanup crew",
      "description": "Help clean up after the event ends",
      "quantity": 2,
      "category": "logistics",
      "is_required": true
    }
  ]
}
```

### Validation (Zod schema)

```typescript
import { z } from 'zod'

const LLMItemSchema = z.object({
  type: z.enum(['item', 'task']),
  title: z.string().min(1).max(120),
  description: z.string().max(300).nullable(),
  quantity: z.number().int().min(1).max(1000).default(1),
  category: z.enum(['food', 'drinks', 'equipment', 'logistics', 'entertainment', 'other']),
  is_required: z.boolean(),
})

const LLMResponseSchema = z.object({
  items: z.array(LLMItemSchema).min(1).max(50),
})
```

---

## 6. File / Folder Structure

Turborepo monorepo. A single `git` repo, multiple packages sharing types and config.

```
hangout/
├── package.json                    # turborepo root
├── turbo.json
├── .env.example
│
├── apps/
│   ├── mobile/                     # React Native + Expo app
│   │   ├── app/                    # Expo Router (file-based routes)
│   │   │   ├── (auth)/
│   │   │   │   ├── login.tsx
│   │   │   │   ├── signup.tsx
│   │   │   │   └── magic-link.tsx
│   │   │   ├── (app)/
│   │   │   │   ├── _layout.tsx     # tab navigator
│   │   │   │   ├── index.tsx       # home: list of events
│   │   │   │   ├── events/
│   │   │   │   │   ├── new.tsx     # create event + free-text input
│   │   │   │   │   └── [eventId]/
│   │   │   │   │       ├── index.tsx        # event detail
│   │   │   │   │       ├── items.tsx        # items/tasks list
│   │   │   │   │       ├── members.tsx      # who's coming
│   │   │   │   │       └── invite.tsx       # share / invite UI
│   │   │   │   ├── notifications.tsx
│   │   │   │   └── profile.tsx
│   │   │   └── invitation/
│   │   │       └── [token].tsx     # deep link landing: accept invite
│   │   ├── components/
│   │   │   ├── events/
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── EventHeader.tsx
│   │   │   │   └── EventStatusBadge.tsx
│   │   │   ├── items/
│   │   │   │   ├── ItemCard.tsx
│   │   │   │   ├── ItemList.tsx
│   │   │   │   └── ClaimButton.tsx
│   │   │   ├── invitations/
│   │   │   │   ├── ShareSheet.tsx
│   │   │   │   └── InviteCodeDisplay.tsx
│   │   │   └── ui/                 # design system primitives
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Toast.tsx
│   │   ├── hooks/
│   │   │   ├── useEventRealtime.ts
│   │   │   ├── useOptimisticClaim.ts
│   │   │   ├── useOfflineQueue.ts
│   │   │   └── usePushNotifications.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts         # Supabase client singleton
│   │   │   ├── api.ts              # typed API client (wraps fetch)
│   │   │   ├── queryClient.ts      # TanStack Query + MMKV persistence
│   │   │   └── deepLinks.ts        # Expo Linking helpers
│   │   ├── store/
│   │   │   └── authStore.ts        # Zustand: session, user profile
│   │   ├── assets/
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   │
│   └── api/                        # Node.js + Express server
│       ├── src/
│       │   ├── index.ts            # Express app bootstrap
│       │   ├── routes/
│       │   │   ├── events.ts
│       │   │   ├── items.ts
│       │   │   ├── assignments.ts
│       │   │   ├── invitations.ts
│       │   │   ├── notifications.ts
│       │   │   └── profile.ts
│       │   ├── services/
│       │   │   ├── llm/
│       │   │   │   ├── parseEvent.ts       # Claude API call + Zod validation
│       │   │   │   └── prompts.ts          # system + user prompts
│       │   │   ├── notifications/
│       │   │   │   ├── pushService.ts      # Expo Push API calls
│       │   │   │   └── notificationTypes.ts
│       │   │   └── invitations/
│       │   │       └── deepLinkService.ts
│       │   ├── workers/
│       │   │   ├── parseEventWorker.ts     # BullMQ worker for LLM jobs
│       │   │   └── pushWorker.ts           # BullMQ worker for push jobs
│       │   ├── queues/
│       │   │   └── index.ts                # BullMQ queue definitions
│       │   ├── middleware/
│       │   │   ├── auth.ts                 # JWT verification via Supabase
│       │   │   ├── errorHandler.ts
│       │   │   └── rateLimit.ts
│       │   ├── lib/
│       │   │   ├── supabase.ts             # service-role Supabase client
│       │   │   └── anthropic.ts            # Anthropic client singleton
│       │   └── types/
│       │       └── index.ts                # re-exports from @hangout/types
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── types/                      # Shared TypeScript types (DB rows, API shapes)
│   │   ├── src/
│   │   │   ├── database.ts         # Generated from Supabase (supabase gen types)
│   │   │   ├── api.ts              # Request/response interfaces
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                     # Shared ESLint, TypeScript, Prettier configs
│       ├── eslint-base.js
│       ├── tsconfig.base.json
│       └── package.json
│
├── supabase/                       # Supabase local dev + migrations
│   ├── migrations/
│   │   └── 20260101000000_initial_schema.sql
│   ├── seed.sql
│   └── config.toml
│
└── docs/
    └── ARCHITECTURE.md             # this file
```

---

## 7. Key Technical Challenges & Solutions

### Challenge 1: LLM Response Latency on Event Creation

**Problem**: Claude can take 2–5 seconds to parse an event. Blocking the `POST /events` response on LLM completion makes the app feel slow.

**Solution**: Decouple creation from parsing. `POST /events` returns immediately with the new event (status `draft`). A BullMQ job runs the LLM call in the background. When items are written, Supabase Realtime pushes them to the client automatically. The UI shows a "Generating your list..." skeleton while waiting — transitions smoothly to the real items with no user action required.

---

### Challenge 2: Simultaneous Item Claims (Race Condition)

**Problem**: Two users tap "Claim" on the same item at the same millisecond. Both see the optimistic UI update. One must lose.

**Solution**:
- The `assignments` table has a `UNIQUE (item_id, user_id)` constraint.
- For items where only one person can claim (quantity = 1), add a partial unique index: `CREATE UNIQUE INDEX one_claim_per_item ON assignments(item_id) WHERE status = 'claimed';` — this makes the DB the source of truth.
- The losing client gets a Postgres unique violation error → API returns HTTP 409 → TanStack Query rolls back the optimistic update → toast: "Someone just grabbed that — pick another!"
- Supabase Realtime delivers the winner's assignment to all clients within ~200ms.

---

### Challenge 3: Deep Links + Invite Flow for Unauthenticated Users

**Problem**: A user receives a share link, taps it, has no account. They must sign up, land back on the event, not lose context.

**Solution**:
- Universal Links (iOS) / App Links (Android) route `https://hangout.app/invitation/:token` to the app.
- If the app has no session, the deep link token is stored in MMKV before navigating to auth screens.
- After sign-up/login completes, the app checks MMKV for a pending invitation token and auto-calls `POST /invitations/:token/accept`.
- Expo Router's `useLocalSearchParams` and a root-level `useEffect` watching auth state handles this without a complex redirect chain.

---

### Challenge 4: Offline Write Queue

**Problem**: User is on spotty mobile data, drops an item, goes offline mid-request. The drop is lost.

**Solution**:
- A lightweight write queue in MMKV stores failed mutations (`{ endpoint, method, body, timestamp }`).
- A `NetInfo` listener (via `@react-native-community/netinfo`) triggers queue flush on reconnect.
- Each queued operation is retried with idempotency: assignments use `upsert` semantics on the server so replaying the same claim twice is safe.
- Operations older than 24 hours are discarded (staleness guard).

---

### Challenge 5: Push Notification Reliability

**Problem**: Expo push tokens expire or become invalid (user reinstalls app). Sending to a dead token wastes quota and can throttle the account.

**Solution**:
- BullMQ push worker processes the Expo Push API receipt endpoint 30 minutes after sending.
- If receipt status is `DeviceNotRegistered`, the token is deleted from `push_tokens` automatically.
- Each user can have multiple tokens (multiple devices); notifications fan-out to all active tokens.
- Notification deduplication: before inserting into `notifications` table, check if an identical `(user_id, type, event_id)` row exists in the last 60 seconds.

---

### Challenge 6: Claude API Cost Control

**Problem**: Claude API calls have a per-token cost. A badly written event description or a retry storm could inflate costs.

**Solution**:
- Cap `description` field at 2000 characters server-side (validated in the Express route before enqueuing).
- BullMQ job has a maximum of 3 retries with exponential backoff (1s → 4s → 16s); after exhaustion, the event is marked `parse_failed` and the admin gets a push notification.
- Use `claude-3-5-haiku` (cheapest, fastest) as the default; only escalate to Sonnet if haiku fails Zod validation twice.
- Log every Claude API call (tokens in/out, latency, success/fail) to a `llm_audit_log` table for cost monitoring.

---

### Challenge 7: Supabase Realtime Subscription Limits

**Problem**: Supabase free/pro tiers have limits on concurrent realtime connections. A large event with many active users could approach limits.

**Solution**:
- Subscribe only when the event detail screen is in the foreground (unsubscribe on blur/background via `AppState` listener).
- Use a single channel per event (already designed this way) rather than per-table channels.
- For events with >100 concurrent users (unlikely for a friends app but planned for), fall back to polling every 10s via TanStack Query `refetchInterval` and disable Realtime to conserve connections.

---

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone https://github.com/your-org/hangout
cd hangout
npm install                          # installs all workspaces via turborepo

# 2. Start local Supabase
npx supabase start                   # requires Docker
npx supabase db reset                # applies migrations + seed

# 3. Configure environment
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#          ANTHROPIC_API_KEY, REDIS_URL, EXPO_ACCESS_TOKEN

# 4. Start API server + workers
cd apps/api && npm run dev

# 5. Start mobile app
cd apps/mobile && npx expo start
```

---

*Architecture version: 1.0 | Designed for Hangout v1 MVP | March 2026*
