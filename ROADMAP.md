# Hangout — Enterprise Roadmap
> Compiled by the AI team: PM · Market Researcher · System Architect · UX Designer · Frontend Dev · Backend Dev · QA
> Date: 2026-03-30 | Current state: MVP deployed at https://dist-sable-pi.vercel.app

---

## Executive Summary

Hangout has a solid MVP with a genuine technical moat (AI event parsing). To go from "promising tool" to "product people can't live without," the work falls into six sequential phases:

1. **Foundation** — security, stability, dead code removal
2. **UX Polish** — delight, micro-interactions, onboarding
3. **Social Core** — activity feed, comments, reactions, notifications
4. **Viral Growth** — invite virality, sharing, co-hosting, clone events
5. **Monetization** — premium tier, cost splitting, shoppable items
6. **Scale** — async AI, Redis, offline support, observability

---

## Phase 1 — Foundation & Hardening
> Target: 1–2 weeks | Goal: production-safe, no dead code, DX improvements

### 1.1 Security (Critical)
- [ ] **Rate limiting** on all API routes (`express-rate-limit`) — prevent brute-force on invite tokens and Claude parse endpoint
- [ ] **Upgrade invite token entropy** — replace custom char-shuffle with `crypto.randomBytes(32).toString('hex')` (256-bit)
- [ ] **Helmet.js** security headers on Express
- [ ] **Remove `@anthropic-ai/sdk`** from mobile bundle — it's server-only, reduces JS bundle by ~200KB
- [ ] **SERVICE_ROLE_KEY audit** — confirm RLS is actually enforced; SERVICE_ROLE_KEY bypasses RLS, should only be used for trusted server operations

### 1.2 Observability
- [ ] **Sentry** error tracking — frontend + backend, with userId tagging
- [ ] **Winston** structured logging — replace `console.log` with structured JSON logs
- [ ] **Enhanced `/health` endpoint** — include DB ping, Claude API status, uptime
- [ ] **Prometheus metrics** — request duration histogram per route/status

### 1.3 Code Quality
- [ ] **Delete `eventStore.ts`** — dead code, React Query handles all server state
- [ ] **Extract `queryKeys.ts`** — centralize React Query key arrays: `queryKeys.events()`, `queryKeys.event(id)`, etc.
- [ ] **Extract `formatDate()` utility** — currently duplicated in `EventCard.tsx`, `index.tsx`, and `event/[id].tsx`
- [ ] **Extract `categoryEmoji()` utility** — duplicated across screens
- [ ] **Fix TypeScript** — remove `as unknown as` casts, use proper typed interfaces for joined Supabase results
- [ ] **`shared-types.ts` duplication** — `apps/api/src/shared-types.ts` duplicates `packages/shared/src/types.ts`; use monorepo import

### 1.4 Performance Quick Wins
- [ ] **Increase React Query `staleTime`** — events list from 30s → 5min (data doesn't change that fast)
- [ ] **Memoize `EventCard` and `ItemCard`** with `React.memo()` — prevents re-renders on parent state changes
- [ ] **Remove unnecessary `refetchOnWindowFocus`** — already disabled globally in QueryClient

---

## Phase 2 — UX & Polish
> Target: 1–2 weeks | Goal: delight, feel premium, fix friction

### 2.1 First-Run Experience
- [ ] **Onboarding carousel** — 3-slide modal after first sign-in: "Describe your event → AI plans it → Friends claim items". Only shown once (persisted in SecureStore)
- [ ] **Guided first-event prompt** — empty home state replaces generic CTA with pre-filled example: "Tap to plan a BBQ for 10 people"

### 2.2 Skeleton Loaders
- [ ] Replace all `ActivityIndicator` spinners with skeleton loaders:
  - Home dashboard → skeleton cards for each section
  - Event detail hero → skeleton gradient block
  - Items list → skeleton item rows
  - My Events list → skeleton event cards

### 2.3 Haptic Feedback
- [ ] **Install `expo-haptics`**
- [ ] Claim item → `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
- [ ] Unclaim → `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- [ ] Create event success → `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- [ ] Delete/destructive → `Haptics.notificationAsync(NotificationFeedbackType.Warning)`

### 2.4 Create Event Improvements
- [ ] **Inline item editing** in review step — long-press an item to edit name/quantity before confirming
- [ ] **Save as draft** button — two CTAs at bottom: "Save draft" + "Create & invite"
- [ ] **Category reordering** — drag-to-reorder categories in review
- [ ] **"Regenerate" button** — if AI output is wrong, re-parse with the same description without losing it

### 2.5 Event Detail Improvements
- [ ] **Text shadow on hero** — light-colored heroes (golden, mint) make white text hard to read; add dark overlay
- [ ] **Countdown timer** — "3 days to go" badge below event title if event date is set and in the future
- [ ] **"All items claimed!" celebration** — confetti animation + toast when 100% claimed
- [ ] **Collapsible category sections** — tap category header to collapse/expand items
- [ ] **Item swipe-to-claim** (left) + **swipe-to-delete** (right, admin only)

### 2.6 Invite Screen
- [ ] **"Invited by [Name]"** — show inviter's name/avatar on invite preview screen
- [ ] **"Maybe" option** — add second RSVP CTA on invite screen ("Maybe" alongside "I'm in!")
- [ ] **Better expired state** — friendly message + "Ask for a new link" copy when invite expired

### 2.7 Profile
- [ ] **Profile photo upload** — image picker + upload to Supabase Storage
- [ ] **Notifications toggle** — push notification preferences (per event vs global)
- [ ] **Help & feedback link** — mailto or in-app feedback form

### 2.8 Custom Toast Component
- [ ] Replace `window.alert`/`Alert.alert` shim with a real animated toast component
  - Slides in from bottom, auto-dismisses after 3s
  - Variants: success (mint), error (red), info (charcoal)
  - Stacks multiple toasts

### 2.9 Accessibility
- [ ] Add `accessibilityLabel` to all icon-only buttons
- [ ] Minimum 44×44pt touch targets on all interactive elements (RSVP buttons currently too small)
- [ ] Screen reader support for claim/unclaim state changes

---

## Phase 3 — Social Core
> Target: 2–3 weeks | Goal: retention loops, daily engagement

### 3.1 Activity Feed
- [ ] **Event activity feed** — real-time scrollable feed within each event showing:
  - "🎉 Alex claimed Beer (6-pack)"
  - "👋 Sam joined the event"
  - "📅 Ohad updated the date to April 5"
  - "✅ All items claimed!"
- [ ] **Home dashboard feed** — aggregate activity across all your events on the home tab
- [ ] New DB table: `event_activity(id, event_id, user_id, type, payload, created_at)`
- [ ] API: `GET /events/:id/activity` (paginated, newest first)
- [ ] Write activity rows on: join, claim, unclaim, item add/delete, event update

### 3.2 Comments on Items
- [ ] **Item comments** — tap an item to expand and add a comment ("I'll bring the fancy kind")
- [ ] New DB table: `item_comments(id, item_id, event_id, user_id, text, created_at)`
- [ ] API: `POST /items/:id/comments`, `GET /items/:id/comments`
- [ ] Real-time subscription: comments channel per event

### 3.3 Emoji Reactions
- [ ] **React to items** — long-press an item to react with 🎉🙏❤️👍 etc.
- [ ] New DB table: `item_reactions(id, item_id, user_id, emoji, created_at)`
- [ ] API: `POST /items/:id/reactions/:emoji`, `DELETE /items/:id/reactions/:emoji`
- [ ] Show reaction counts inline on ItemCard

### 3.4 Push Notifications
- [ ] **Wire up existing `expo_push_token` field** — store token on login via `Notifications.getExpoPushTokenAsync()`
- [ ] API: `POST /users/push-token` — save token to user record
- [ ] Notification triggers:
  - Someone joins your event
  - Someone claims an item
  - All items claimed (to admin)
  - Event starts in 24 hours
  - New comment on item you've interacted with
- [ ] API: `PATCH /users/notification-preferences` — per-type toggles
- [ ] Use Expo Push API (free tier covers up to 1M/month)

### 3.5 Event Countdown
- [ ] **Sticky countdown banner** — appears on event detail when event is < 7 days away
- [ ] Format: "🗓 3 days to go" / "🎉 Today!" / "Yesterday"
- [ ] Animate the "Today!" state with a subtle pulse

---

## Phase 4 — Viral Growth
> Target: 2–3 weeks | Goal: K-factor > 1, organic acquisition

### 4.1 Pre-auth Invite Preview
- [ ] **Show event details before sign-in** — current invite screen requires auth first; show event title, date, member count, item count in a preview card before asking to sign up
- [ ] This removes the biggest drop-off point in the invite funnel
- [ ] "Sign up to claim your items" CTA below the preview

### 4.2 Share to Stories
- [ ] **"Share event" improvements** — beyond just a link:
  - Generate an event card image (canvas/SVG with hero color + title + date)
  - "Share as image" option → native share sheet with image
  - Web: download as PNG or copy to clipboard
- [ ] Instagram/Snapchat stories deep link support

### 4.3 Open Graph Event Cards
- [ ] **Dynamic OG images** for invite links — when link is shared in iMessage/WhatsApp/Slack, shows rich preview:
  - Event title, hero color background, date, "X people going"
- [ ] API: `GET /invites/:token/og-image` — generates and returns PNG
- [ ] Use `@vercel/og` or `satori` for edge-rendered OG images

### 4.4 Co-hosting
- [ ] **Multiple admins** — event creator can promote other members to co-admin
- [ ] Co-admins can: edit event, manage items, see all features admin sees
- [ ] API: `PATCH /events/:id/members/:memberId` with `{ role: 'admin' }`
- [ ] UI: long-press member in members list → "Promote to co-host"

### 4.5 Clone / Duplicate Event
- [ ] **"Clone event"** — copy all items + settings from a past event to a new one
- [ ] API: `POST /events/:id/clone` — creates new event with same items (clears claims)
- [ ] UI: 3-dot menu on past events → "Use as template"

### 4.6 Friend Groups
- [ ] **Saved groups** — "BBQ crew", "Work team", "Family"
- [ ] New DB tables: `groups(id, name, created_by)`, `group_members(group_id, user_id)`
- [ ] One-tap invite the whole group to a new event
- [ ] "People you often invite" suggestions based on event history

### 4.7 Public Event Discovery (Optional / v2)
- [ ] Public events visible to friends-of-friends
- [ ] Browse nearby events (location-based)
- [ ] "My friend Alex is hosting a BBQ" social feed

---

## Phase 5 — Monetization
> Target: 3–4 weeks | Goal: first revenue

### 5.1 Premium Tier ("Hangout Pro")
**Suggested price: $4.99/month or $39/year**

Free tier:
- Up to 3 active events
- Up to 20 guests per event
- AI parsing (5/month)

Pro tier:
- Unlimited events and guests
- Unlimited AI parses
- Calendar sync (Google/Apple Calendar)
- Custom event branding (remove "Hangout" footer from invites)
- Guest analytics (who viewed, who claimed)
- Advanced RSVP management
- Priority support

- [ ] **Stripe integration** — `expo-stripe` SDK, webhook handler on API
- [ ] **Paywall enforcement** — middleware that checks subscription status
- [ ] **Subscription management screen** — in Profile tab

### 5.2 Expense Tracking & Cost Splitting
- [ ] **Cost per item** — admin can add a cost to any item ("Beer 6-pack — $14")
- [ ] **Event total** — running total visible on event detail
- [ ] **Who owes whom** — Splitwise-style settlement calculation
- [ ] New DB table: `item_costs(id, item_id, amount, currency, added_by, created_at)`
- [ ] API: `POST /items/:id/cost`, `GET /events/:id/expenses`, `GET /events/:id/splits`
- [ ] UI: "Expenses" tab on event detail screen

### 5.3 Shoppable Items (Affiliate)
- [ ] **"Buy on Amazon"** link next to items — pre-searches Amazon for the item name
- [ ] Use Amazon Product Advertising API for real product links
- [ ] Affiliate tag = ~4% commission on purchases
- [ ] Opt-in feature for users (respects privacy)

### 5.4 In-App Payments (v2)
- [ ] Collect event fees (parking, catering deposits) through Hangout
- [ ] Stripe Connect for hosts to receive payments
- [ ] Requires significant compliance work — save for later

---

## Phase 6 — Scale & Infrastructure
> Target: ongoing | Goal: support 100k+ users

### 6.1 Async AI Parsing
- [ ] Replace synchronous Claude call with BullMQ job queue
- [ ] `POST /events/parse` returns `{ jobId, status: 'pending' }` immediately
- [ ] Client polls `GET /events/parse/:jobId` or subscribes via Supabase Realtime
- [ ] Prevents 30s timeout on slow AI responses
- [ ] Enables retry on failure without user re-submitting

### 6.2 Caching Layer
- [ ] **Redis** (Upstash serverless for Vercel compatibility)
- [ ] Cache: user event lists (TTL 60s), parsed event results (TTL 24h)
- [ ] Semantic caching for AI parses — embed description, cache similar ones
- [ ] Reduces Claude API costs by ~40%

### 6.3 Offline Support
- [ ] **expo-sqlite** local cache for items, events, members
- [ ] Read from SQLite when offline, sync on reconnect
- [ ] Show "offline" banner when no network detected
- [ ] Mutation queue — replay failed claims when back online

### 6.4 Bundle Optimization
- [ ] **Lazy-load heavy routes** — `event/create`, `event/[id]/edit` loaded on demand
- [ ] Target: initial bundle < 1MB (currently 2.97MB)
- [ ] Tree-shake unused Ionicons (only import used icons)

### 6.5 CI/CD
- [ ] **GitHub Actions** — run TypeScript build + lint on every PR
- [ ] **Auto-deploy API to Vercel** on merge to main
- [ ] **Auto-build web** and deploy on merge to main
- [ ] **Preview deployments** for each PR branch

### 6.6 OpenAPI Docs
- [ ] `swagger-jsdoc` + `swagger-ui-express` at `/api/docs`
- [ ] Enables future SDK generation, easier onboarding for contributors

---

## Quick Reference: Feature → Phase Mapping

| Feature | Phase | Effort |
|---------|-------|--------|
| Rate limiting | 1 | S |
| Sentry + logging | 1 | S |
| Delete eventStore | 1 | S |
| Skeleton loaders | 2 | M |
| Haptic feedback | 2 | S |
| Custom toast | 2 | M |
| Onboarding carousel | 2 | M |
| Activity feed | 3 | L |
| Item comments | 3 | M |
| Emoji reactions | 3 | M |
| Push notifications | 3 | L |
| Pre-auth invite preview | 4 | M |
| OG image cards | 4 | M |
| Clone event | 4 | S |
| Co-hosting | 4 | M |
| Premium tier (Stripe) | 5 | L |
| Expense splitting | 5 | L |
| Shoppable items | 5 | M |
| Async AI (BullMQ) | 6 | L |
| Redis caching | 6 | M |
| Offline SQLite | 6 | L |
| CI/CD | 6 | M |

---

## Current Tech Debt (address across all phases)

1. `apps/api/src/shared-types.ts` duplicates `packages/shared/src/types.ts`
2. `apps/mobile/src/stores/eventStore.ts` — dead code, never read
3. `formatDate()` duplicated in 3+ files
4. `categoryEmoji()` duplicated in 2+ files
5. `apps/mobile/app/event/[id].tsx` — `HeroBadge` component defined inline, should be in `/components`
6. `BottomSheet.tsx` and `Button.tsx` — built but never used in app
7. Direct Supabase calls from mobile bypassing API (useMyEventsWithCounts)
8. No tests anywhere

---

## Competitive Positioning

**Own the angle**: "AI-first group coordination" — not just event invites, but logistics, costs, and accountability.

**Win against**:
- Partiful/Luma → They do aesthetics; Hangout does logistics
- WhatsApp/group chats → Single source of truth vs. chaos
- Splitwise → Hangout adds splitting to events natively

**Viral coefficient target**: Each event creation should invite 3–8 guests average. If 20% of guests become hosts → K-factor > 0.6. With OG cards + pre-auth preview → K-factor > 1.0.

---

*This document is the living roadmap. Update it as phases complete.*
*Session context: Hangout monorepo at /Users/ohadbar/Hangout, deployed at https://dist-sable-pi.vercel.app + https://hangout-api.vercel.app*
