# Hangout — Product Specification Document

**Version:** 1.0
**Date:** March 22, 2026
**Author:** Product Management
**Status:** Draft for Review

---

## Table of Contents

1. [Vision & Value Proposition](#1-vision--value-proposition)
2. [Target Users & Personas](#2-target-users--personas)
3. [Core Feature List (MVP)](#3-core-feature-list-mvp)
4. [Extended Feature Roadmap](#4-extended-feature-roadmap)
5. [User Stories](#5-user-stories)
6. [Key User Flows](#6-key-user-flows)
7. [Notification Strategy](#7-notification-strategy)
8. [Social & Sharing Features](#8-social--sharing-features)
9. [Gamification Ideas](#9-gamification-ideas)
10. [Monetization Strategy](#10-monetization-strategy)

---

## 1. Vision & Value Proposition

### Vision

Hangout exists to eliminate the chaos of group event coordination. Whether it's a backyard BBQ, a birthday dinner, a beach day, or a family holiday gathering, Hangout transforms a single sentence into a fully organized event — and turns passive invitees into active contributors.

### The Problem We Solve

Event planning today is fragmented across group chats, spreadsheets, and memory. The host ends up doing all the work, guests forget what they committed to, and someone always shows up with three bags of chips and no cups. The pain points are real:

- Hosts feel burdened managing logistics alone
- "Who's bringing what?" threads get buried in group chats
- Last-minute confirmations lead to duplicate or missing items
- No single source of truth for tasks, RSVPs, and supplies
- Guests want to help but don't know where to start

### The Hangout Solution

Hangout is a mobile-first event planning app powered by an LLM core. A host describes their event in plain English — "BBQ at my place Saturday for 15 people, need food, drinks, lawn games, and someone to help set up" — and Hangout instantly generates a structured, shareable checklist of tasks and items. Guests join, claim responsibilities, and everyone stays informed automatically.

### Unique Value Proposition

> **Hangout turns your event idea into a coordinated group effort in under 60 seconds — no spreadsheets, no group chat chaos, no forgotten items.**

Key differentiators:
- **LLM-powered smart parsing:** The app understands context and generates relevant, tailored suggestions (not a generic template)
- **Zero-friction guest participation:** Guests can claim items without creating an account (via magic link)
- **Live coordination layer:** Real-time visibility into who has claimed what, what's still needed
- **Admin controls with delegation:** Hosts stay in charge but can share planning responsibilities
- **Opinionated defaults, flexible overrides:** Great suggestions out of the box, fully editable

---

## 2. Target Users & Personas

### Primary Personas

---

**Persona 1: The Social Host — "Alex"**

- Age: 28–40
- Profile: Frequently organizes events for friend groups (monthly game nights, seasonal BBQs, holiday parties). Highly social, comfortable with tech.
- Motivations: Wants to host great events without carrying all the burden. Enjoys the social aspect but hates the admin.
- Pain Points: Spending hours in group chats, forgetting to buy things, guests who don't follow through on commitments.
- How they use Hangout: Creates most events. Uses the LLM input heavily. Shares invite links via iMessage and Instagram DMs.
- Key Quote: "I love hosting — I just hate organizing."

---

**Persona 2: The Frequent Guest — "Jordan"**

- Age: 22–35
- Profile: Regularly invited to friends' events. Wants to be a good guest and contribute meaningfully but often forgets what they said they'd bring.
- Motivations: Wants to feel helpful without the social awkwardness of asking "what do you need?"
- Pain Points: Forgetting commitments, not knowing if their item is still needed, showing up unprepared.
- How they use Hangout: Opens invite links. Claims items. Checks the event page before shopping. Appreciates reminders.
- Key Quote: "Just tell me what to bring and remind me the day before."

---

**Persona 3: The Family Coordinator — "Morgan"**

- Age: 35–55
- Profile: Organizes family gatherings — Thanksgiving, birthday parties, reunions. Manages a mix of tech-savvy and non-tech-savvy attendees.
- Motivations: Reduce the "reply-all" email chaos. Get actual confirmations. Distribute the cooking workload fairly.
- Pain Points: Family members who don't check apps, dietary restrictions to track, coordinating across age groups.
- How they use Hangout: Creates events with dietary flags. Shares via SMS for older relatives. Uses admin view to see gaps and manually assign people.
- Key Quote: "Every year it's the same — nobody tells me they're coming until the day before."

---

**Persona 4: The Work Events Organizer — "Sam"**

- Age: 30–45
- Profile: Office manager or team lead who plans team lunches, offsites, and holiday parties. Must be professional and organized.
- Motivations: Make the team feel appreciated. Avoid the awkward "who's handling what" ambiguity.
- Pain Points: Mixed attendance confirmations, budget tracking, making sure non-social people still contribute.
- How they use Hangout: Uses Hangout for lightweight coordination. Appreciates export/share features for Slack. May use Pro tier for larger events.
- Key Quote: "I need something I can send to 30 people and actually get responses from."

---

### Secondary Personas

- **The Casual Planner:** Someone who occasionally organizes low-stakes hangouts (movie night, potluck dinner). Values speed and simplicity above all.
- **The Reluctant Participant:** Doesn't love using new apps. Needs frictionless guest experience — ideally no signup required.

---

## 3. Core Feature List (MVP)

### 3.1 Event Creation via Free-Text Input

- A large text input field (or voice-to-text) where the host describes the event in natural language
- LLM processes the input and returns:
  - Suggested event title and emoji
  - Date/time/location (parsed from text or prompted if missing)
  - A structured list of **tasks** (e.g., "Set up chairs", "Pick up the cake")
  - A structured list of **items/food to bring** (e.g., "Chips & dip", "Paper plates", "6-pack of beer")
  - Quantities and notes where inferrable
- Host can edit, add, remove, or reorder any suggested task or item before publishing
- Items can have quantities (e.g., "2 bags of ice") and categories (Food, Drinks, Supplies, Tasks)

### 3.2 Event Dashboard (Host View)

- Overview of all created/upcoming events
- Per-event view showing:
  - Event details (title, date, time, location, description)
  - Full item/task list with claimed/unclaimed status
  - Guest list with RSVP status
  - Progress indicator (X of Y items claimed)
- Ability to add items/tasks manually after event creation
- Ability to edit event details
- Ability to mark items as "completed" or "brought" post-event

### 3.3 Guest Invitation & Access

- Host generates a unique shareable invite link
- Guests open the link in any browser (no app required for basic participation)
- If guest has the app, deep link opens the event directly
- Guest sees:
  - Event details
  - Full item/task list
  - What they have personally claimed
  - What others have claimed (names visible)
  - What is still unclaimed

### 3.4 Item & Task Claiming

- One-tap claim for any unclaimed item or task
- Optional quantity split: if an item needs 2 units and 2 people want to claim it, each can claim 1
- Ability to unclaim (with a confirmation prompt)
- Notes field on claim: e.g., "I'm making homemade guacamole" on the "Dip" item
- Claimed items show the claimant's name/avatar

### 3.5 RSVP System

- Simple Yes / No / Maybe RSVP
- RSVP count visible to the host and all guests
- Optional guest count field ("I'm bringing +1")
- RSVP reminder notification (see Notification Strategy)

### 3.6 Admin Controls

- Host (admin) can:
  - Manually assign items/tasks to specific guests
  - Reassign items if someone cancels
  - Add co-admins (e.g., co-host)
  - Remove guests
  - Lock the event (prevent new claims after a cutoff)
  - Post event-wide announcements (push notification to all guests)
  - Archive or delete the event
- Admin sees the full guest list with contact info (if shared)

### 3.7 Real-Time Sync

- Item/task claim status updates in real-time for all participants
- RSVP changes reflected immediately
- No need to refresh — live data via WebSocket or polling fallback

### 3.8 User Profiles (Basic)

- Name and profile photo
- Display name shown on claimed items
- Optional: dietary preferences / restrictions (shown to host as context)
- Event history (events attended, items brought)

### 3.9 Mobile-First UI

- Native iOS and Android apps
- Responsive web fallback for guest access (no download required for guests)
- Optimized for one-handed use
- Dark mode support

---

## 4. Extended Feature Roadmap

### V2 — Enrichment & Intelligence

| Feature | Description |
|---|---|
| Smart Quantity Scaling | LLM adjusts suggested quantities based on RSVP count automatically |
| Dietary Restriction Awareness | LLM accounts for guest dietary flags when suggesting food items |
| Shopping List Export | Compile all claimed items into a shareable shopping list per person |
| Calendar Integration | Sync event to Google Calendar, Apple Calendar, Outlook |
| Location Integration | Embed Google Maps link, show distance from each guest |
| Event Templates | Save a past event as a template (e.g., "Annual BBQ Template") |
| Recurring Events | Support weekly game nights, monthly dinners with recurring item lists |
| Group Management | Create persistent friend groups; invite the whole group with one tap |
| Budget Tracking | Assign estimated costs to items; show total estimated spend |

### V3 — Social & Community Layer

| Feature | Description |
|---|---|
| Event Feed / Discovery | Optional public events for communities (neighborhood, college dorms) |
| Post-Event Recap | Photo sharing, ratings, auto-generated "highlights" of the event |
| Guest Reviews | Anonymous host ratings to build reputation (opt-in) |
| Co-Planning Mode | Multiple admins can edit simultaneously with conflict resolution |
| Vendor Integration | Suggest and link to food delivery, party supply stores, Instacart |
| Polls & Votes | "Vote on a date", "Pick a theme", embedded lightweight polls |
| Chat / Comments | Per-event comment thread for coordination discussion |
| AI Suggestions V2 | "Based on past events, you usually need more drinks — want to add?" |

### V4 — Platform & Enterprise

| Feature | Description |
|---|---|
| Slack / Teams Integration | Create and manage events from Slack; post updates to channels |
| Web App (Full) | Full-featured web app, not just guest view |
| API Access | Let third-party apps (wedding planners, event companies) integrate Hangout |
| White-Label | Branded versions for event companies, HOAs, schools |
| Analytics Dashboard | For power users: response rates, popular items, attendance trends |

---

## 5. User Stories

### US-01: Event Creation
**As a host, I want to describe my event in plain text and have the app generate a task and item list automatically, so that I can set up an organized event in under a minute without building a spreadsheet.**

Acceptance Criteria:
- Free-text input accepts at least 500 characters
- LLM response returns within 5 seconds
- Generated list includes at least 3 items and 1 task for any reasonable event description
- Host can edit all generated content before publishing

---

### US-02: Sharing the Event
**As a host, I want to generate a shareable invite link that I can send via any messaging app, so that my guests can join the event without needing to download the Hangout app.**

Acceptance Criteria:
- One-tap link generation from the event page
- Link is accessible in a mobile browser with no login required
- Guest sees full event details and item list via the link
- Link preview (Open Graph) shows event title, date, and a visual

---

### US-03: Claiming an Item
**As a guest, I want to claim an item or task from the event list with a single tap, so that I know exactly what I'm responsible for and the host knows I've committed.**

Acceptance Criteria:
- Unclaimed items display a visible "Claim" button
- Claim is confirmed instantly with visual feedback
- My name appears on the item for all participants to see
- I receive a confirmation notification with the item details

---

### US-04: Seeing What's Left
**As a guest, I want to see which items are still unclaimed when I open the event, so that I can pick something useful rather than duplicating what others are already bringing.**

Acceptance Criteria:
- Unclaimed items are visually distinct from claimed items
- Claimed items show the claimant's name
- List is sorted or filtered to show unclaimed items first (configurable)
- Real-time updates if another guest claims something while I'm viewing

---

### US-05: Admin Reassignment
**As an event admin, I want to reassign an item from a guest who cancelled to another guest, so that nothing falls through the cracks when plans change.**

Acceptance Criteria:
- Admin can tap any claimed item and reassign it
- The original claimant receives a notification that their item was reassigned
- The new claimant receives a notification and assignment
- The reassignment is logged in the event history

---

### US-06: RSVP Management
**As a host, I want guests to RSVP and for my item quantity suggestions to update based on headcount, so that I don't over-buy or under-prepare.**

Acceptance Criteria:
- RSVP options: Yes, No, Maybe
- RSVP count is visible to all participants
- LLM-suggested quantities adjust when RSVP count changes significantly (V2)
- Host receives a push notification when guests RSVP

---

### US-07: Pre-Event Reminder
**As a guest, I want to receive a reminder before the event with my claimed items listed, so that I don't forget to buy or prepare what I committed to.**

Acceptance Criteria:
- Reminder sent 24 hours before the event
- Reminder includes event name, time, location, and my specific claimed items
- Reminder is sent via push notification and optionally via SMS
- Guest can opt out of reminders per-event

---

### US-08: Adding Items Post-Creation
**As a host, I want to add new items or tasks to the event after it has been published, so that I can handle things I forgot or that come up later.**

Acceptance Criteria:
- Admin can add items at any time before the event
- All guests receive a notification when a new item is added
- New items are clearly marked as "newly added" for 24 hours
- Added items are immediately available for claiming

---

### US-09: No-Account Guest Access
**As a guest who doesn't want to create an account, I want to claim items and RSVP using just my name, so that I can participate without friction.**

Acceptance Criteria:
- Guest can enter just a name to participate via invite link
- Claim is tied to a device-local session (no account required)
- Guest receives a magic link via SMS/email to return to the event later
- Host sees the guest's name, not "Anonymous"

---

### US-10: Event Archive & History
**As a returning user, I want to view my past events and what was brought, so that I can reuse a successful event setup or remember who contributed last time.**

Acceptance Criteria:
- All past events are accessible from the "Past Events" tab
- Each archived event shows the full item list, claimants, and RSVP data
- Host can clone a past event to create a new one with the same structure
- Past events cannot be edited (read-only archive)

---

## 6. Key User Flows

### Flow A: Creating an Event

```
1. Host opens Hangout app
   → Lands on Home screen showing upcoming events (empty state on first launch)

2. Taps "New Hangout" (prominent CTA button)
   → Opens the Event Creation screen

3. Event Creation screen presents a large text input:
   Prompt: "Describe your hangout — what, when, where, and who?"
   Example hint: "Birthday BBQ at my place on Saturday at 4pm for about 20 people.
   Need burgers, buns, drinks, lawn games, and help setting up."

4. Host types or dictates their description
   → Taps "Generate Plan" (or submits via keyboard)

5. App shows a loading state: "Planning your hangout..."
   → LLM processes the input (target: < 5 seconds)

6. Results screen appears with:
   - Suggested event title + emoji (editable)
   - Parsed date/time/location (editable; prompted if missing)
   - "Bring / Food" section: list of suggested items with quantities
   - "Tasks" section: list of suggested tasks
   - Each item/task has an edit icon, delete icon, and quantity control

7. Host reviews and adjusts the generated list:
   - Swipe left to delete an item
   - Tap to rename or adjust quantity
   - "Add item" button at the bottom of each section
   - "Regenerate suggestions" option if they want different ideas

8. Host taps "Set Details" to confirm:
   - Event name (pre-filled)
   - Date & time (date picker)
   - Location (text field + map search)
   - Description/notes (optional)
   - Guest limit (optional)
   - Event visibility: Private (invite-only) or Shareable Link

9. Host taps "Create Hangout"
   → Event is created and saved
   → Host lands on the Event Dashboard page

10. Event Dashboard shows:
    - Event header (title, date, location)
    - Progress bar: "0 of 12 items claimed"
    - Full item/task list
    - "Invite Friends" button

11. Host taps "Invite Friends"
    → Share sheet opens with a pre-composed message:
      "Hey! I'm using Hangout to organize [Event Name]. Tap here to RSVP
      and grab something to bring: [link]"
    → Host shares via iMessage, WhatsApp, Instagram, copy link, etc.

12. Host returns to Event Dashboard
    → Can monitor in real-time as guests join and claim items
```

---

### Flow B: Joining an Event and Claiming an Item (Guest)

```
1. Guest receives invite link via iMessage, WhatsApp, or SMS
   → Taps the link

2. Link opens in browser (or Hangout app if installed)
   → Guest sees an event preview card:
      - Event name, emoji, host name
      - Date, time, location
      - "X people are coming · Y items still available"

3. Guest is prompted to identify themselves:
   Option A (has the app): "Open in Hangout" → taps, logs in, sees event
   Option B (no app): Enter your name + optionally phone/email for reminders
   → Guest taps "Join This Hangout"

4. Guest lands on the Event Page:
   - Header: event details, host name
   - RSVP bar: "Are you coming?" → Yes / No / Maybe
   - Below: full item/task list

5. Guest taps "Yes" to RSVP
   → Confirmation animation
   → Host receives a push notification: "Jordan RSVP'd yes to [Event Name]"

6. Guest scrolls through the item list
   - Unclaimed items: white/neutral background, "Claim" button visible
   - Claimed items: colored/checked, shows claimant name

7. Guest finds something they want to bring:
   → Taps "Claim" on "Bag of Ice (2 needed)"

8. Quantity selector appears if item has remaining quantity > 1:
   "How many can you bring? [1] [2]"
   → Guest selects 1

9. Guest taps "Confirm Claim"
   → Item updates to show "Jordan — 1 bag of ice"
   → All other participants see the update in real-time
   → Guest receives confirmation notification:
     "You've claimed: 1 bag of ice for [Event Name] on Saturday"

10. Guest optionally adds a note:
    Tap item → "Add a note" → "I'll bring the big 10lb bags from Costco"

11. Guest can view "My Items" tab to see everything they've claimed

12. Guest receives a reminder 24h before event:
    "Don't forget! [Event Name] is tomorrow at 4pm.
    You're bringing: 1 bag of ice, Paper plates (x20)"
```

---

### Flow C: Admin Managing Assignments

```
1. Admin opens the Event Dashboard for an upcoming event

2. Admin sees progress overview:
   - "8 of 14 items claimed"
   - Visual progress bar
   - Items highlighted in red: "Still Needed" section at top

3. Admin views the full item list:
   - Each item shows: name, quantity needed, quantity claimed, claimant names
   - Unclaimed items have an "Assign" button
   - Claimed items have a "Reassign" or "Edit" option

--- Scenario A: Assigning an unclaimed item ---

4. Admin taps "Assign" on "Veggie Tray (1 needed)"
   → Guest picker modal opens
   → Shows guest list with RSVP status: "Attending (8), Maybe (3), No (2)"

5. Admin selects "Casey (Attending)"
   → Confirmation: "Assign Veggie Tray to Casey?"
   → Admin taps "Assign"

6. Casey receives a push notification:
   "Alex has assigned you: Veggie Tray for [Event Name] on Saturday.
   Tap to view the event."

7. Item now shows "Casey (assigned by host)" in the list
   — visually distinct from self-claimed items

--- Scenario B: Reassigning after a cancellation ---

8. Jordan sends a message that they can't come
   → Admin opens Event Dashboard
   → Jordan's claimed items are flagged: "Jordan cancelled — 2 items need coverage"

9. Admin taps the flagged item "1 bag of ice"
   → "Reassign" modal opens
   → Admin can reassign to another guest or mark as "Unassign" (put back to unclaimed)

10. Admin selects "Reassign to Riley"
    → Riley gets a notification: "Alex has assigned you: 1 bag of ice for [Event Name]"
    → Jordan gets a notification (if still in the event): "Your bag of ice assignment was removed"

--- Scenario C: Posting an Announcement ---

11. Admin taps the megaphone icon on the Event Dashboard
    → "Send Announcement" modal opens
    → Text field: "Change of plans — event starts at 5pm now, not 4pm. Sorry for the late notice!"
    → Admin taps "Send to All Guests"

12. All guests who have RSVP'd receive a push notification with the announcement
    → Announcement also appears as a banner at the top of the Event Page

--- Scenario D: Locking the Event ---

13. Night before the event, admin taps "Lock Event"
    → Confirmation: "Locking will prevent guests from claiming new items.
       Existing claims remain. Continue?"
    → Admin confirms

14. Event is now locked:
    → All "Claim" buttons are replaced with a lock icon and "Event locked by host"
    → Admin can still reassign items and post announcements
    → Admin can unlock at any time
```

---

## 7. Notification Strategy

### Principles

- Notifications should feel helpful, not spammy
- Every notification should be actionable (deep link to the relevant screen)
- Guests can manage per-event notification preferences
- Critical notifications (direct assignments) should not be suppressible by default

---

### Notification Types & Triggers

#### For Hosts / Admins

| Notification | Trigger | Channel | Timing |
|---|---|---|---|
| Guest RSVP'd | Guest submits RSVP | Push | Immediate |
| Item Claimed | Guest claims an item | Push (batched) | Every 30 min digest, or immediate if enabled |
| Item Unclaimed | Guest releases a claim | Push | Immediate |
| All Items Claimed | Last unclaimed item is claimed | Push | Immediate |
| Guest Joined (no RSVP yet) | Guest opens link and sets a name | Push | Immediate |
| Event Reminder — 3 days out | 3 days before event | Push | 3 days prior at 9am |
| Event Reminder — Day before | 24 hours before event | Push + optional SMS | 24h prior at 9am |
| Event Reminder — Day of | Morning of event | Push | Day-of at 8am |
| Unclaimed Items Alert | 48h before event with unclaimed items | Push | 48h prior |

#### For Guests

| Notification | Trigger | Channel | Timing |
|---|---|---|---|
| Claim Confirmation | Guest claims an item | Push | Immediate |
| Assignment Notification | Host assigns an item to guest | Push | Immediate |
| Reassignment Notification | Host reassigns guest's item | Push | Immediate |
| New Item Added | Admin adds a new item to the event | Push | Immediate |
| Event Updated | Admin changes date/time/location | Push | Immediate |
| Host Announcement | Admin sends an announcement | Push | Immediate |
| Event Reminder — 24h | 24 hours before event | Push + optional SMS | 24h prior at 9am |
| Event Reminder — 2h | 2 hours before event | Push | 2h prior |
| Another Guest Unclaimed | A popular unclaimed item becomes available | Push (optional) | Immediate |

---

### Notification Preferences

- Users can configure per-channel preferences: Push, SMS, Email
- Guests can set per-event preferences from the event page
- "Quiet mode" option: batch all non-critical notifications into a daily digest
- Opt-out of all non-assignment notifications (guests only)

---

### Smart Notification Rules

- If a guest RSVPs "No," suppress all future event notifications except announcements
- Do not send "item claimed" digests after midnight — hold until 8am
- If an event is 4+ weeks away, limit pre-event reminders to once per week
- If a guest has already opened the event in the last 30 minutes, suppress redundant "item claimed" push

---

## 8. Social & Sharing Features

### Invite Mechanics

**Primary: Shareable Link**
- Every event gets a unique, human-readable slug (e.g., `hangout.app/e/alexs-bbq-july4`)
- Link generates a rich preview card (Open Graph) with event title, date, host avatar, and cover image
- One tap to copy, or opens native share sheet

**Secondary: Direct Invite (In-App)**
- Host can search contacts from their phone
- In-app send to Hangout users shows as a direct notification
- For non-users: sends an SMS with the invite link

**QR Code**
- Every event has a QR code for in-person sharing (e.g., at the beginning of a recurring event: "Scan to claim items for next week's game night")

---

### Social Signals & Visibility

- Guest sees who else is coming (name + avatar) — building social proof and excitement
- "X of your friends are going" (if linked contacts have Hangout accounts)
- Claimed items show real names, making contributions visible and creating soft accountability
- Host can toggle: show claimants publicly vs. only to admin

---

### Post-Event Sharing (V2)

- Auto-generated "Event Recap" card:
  - "Alex hosted a BBQ for 18 people. 14 items coordinated. 0 duplicates. 🎉"
  - Shareable to Instagram Stories, Twitter/X
- Hosts earn a "Great Host" badge if all items were claimed and event went smoothly
- Guests can leave a public thank-you note to the host (shown on host profile)

---

### Friend Graph & Discovery

- Users can follow friends on Hangout to see their public events
- Opt-in "Nearby Events" feed for community use cases (neighborhood apps, clubs)
- "Invite all from [past event]" — reuse a previous guest list with one tap

---

## 9. Gamification Ideas

### Philosophy

Gamification in Hangout should reward helpfulness and participation — not create anxiety. Badges and points should feel like fun acknowledgment, not pressure.

---

### Badges

| Badge | Criteria | Display |
|---|---|---|
| First Claim | Claimed your first item | Profile, event page |
| Quick Draw | First person to claim an item at a new event | Event page (temporary) |
| The Provider | Brought an item to 10+ events | Profile |
| Team Player | Claimed 3+ items at a single event | Profile |
| Never Miss | RSVP'd and attended 5 events in a row | Profile |
| Great Host | Hosted an event where 100% of items were claimed | Profile |
| Party Starter | Created 5+ events | Profile |
| Loyalist | Attended 3+ events by the same host | Profile (visible to that host) |
| The Closer | Claimed the last unclaimed item at 3+ events | Profile |
| Sous Chef | Claimed a cooking task at 5+ events | Profile |

---

### Streaks

- **Attendance Streak:** Attended consecutive events (weekly game nights, etc.)
- **Hosting Streak:** Hosted at least one event per month for N consecutive months
- Streaks are shown on the profile and subtly visible to friends

---

### Leaderboards (Optional, V2)

- Within a friend group: "Most events attended this year"
- "Most items brought" leaderboard for a recurring event series
- Leaderboards are opt-in and always friend-group scoped (never strangers)

---

### Points & Levels (V2)

| Action | Points |
|---|---|
| RSVP'd to an event | +5 |
| Claimed an item | +10 |
| Brought a claimed item (confirmed) | +20 |
| Hosted an event | +25 |
| First to claim at an event | +15 (bonus) |
| Claimed the last unclaimed item | +20 (bonus) |

Levels: Social Seedling → Regular → Reliable → Legend → Hangout MVP

---

### Personality Insights (V3)

- Based on what you typically claim: "You tend to bring drinks — The Bartender"
- Based on task types: "You always volunteer to set up — The Organizer"
- Shown as a fun persona card on profile, shareable to Instagram Stories

---

## 10. Monetization Strategy

### Guiding Principles

- The core product (creating events, claiming items, inviting friends) must remain free forever
- Monetization should add value, not gate essential functionality
- Focus on power users and organizations who get the most from the product

---

### Tier 1: Free (Always Free)

- Up to 3 active events at a time
- Up to 25 guests per event
- LLM event generation (standard speed)
- Core item/task claiming
- Basic notifications
- Shareable invite link

---

### Tier 2: Hangout Plus — $4.99/month or $39.99/year

Target: Frequent hosts (Alex persona), power users

Features:
- Unlimited active events
- Up to 100 guests per event
- Priority LLM generation (faster responses)
- Smart quantity scaling with RSVP count
- Budget tracking per event
- Calendar sync (Google, Apple)
- Event templates (save & reuse)
- Recurring events support
- Custom event cover images & themes
- SMS reminders for guests (not just push)
- "Unclaimed Items Alert" 48h before event with one-tap reassignment
- Shopping list export per guest
- Premium badges and profile customization

---

### Tier 3: Hangout Pro — $14.99/month or $99.99/year

Target: Professional organizers, team admins, HOAs, frequent large-event hosts (Sam persona)

Features (all of Plus, plus):
- Up to 500 guests per event
- Multiple co-admins per event
- Event analytics dashboard (response rates, attendance trends)
- Bulk import guest list (CSV)
- Slack and Microsoft Teams integration
- White-label event page with custom branding/logo
- Priority customer support
- API access (beta)
- Vendor recommendations with affiliate links

---

### Tier 4: Hangout for Teams — $29.99/month per workspace

Target: Companies, nonprofits, schools, clubs, HOAs

Features:
- Workspace with multiple admins
- Team member directory
- Shared event templates library
- Organization-branded event pages
- Monthly usage reports
- SSO support (Google Workspace, Okta)
- Dedicated account manager (enterprise add-on)

---

### Additional Revenue Streams

**In-App Affiliate / Commerce (V2)**
- "Need supplies? Order from Instacart" — affiliate commission on cart conversions
- Suggested vendor links for catering, party supplies, etc.
- Guest-facing shopping integrations: "Add your claimed items to your Amazon cart"

**Featured Event Promotions (V3)**
- Local businesses can promote events on a community discovery feed
- Restaurants, escape rooms, sports facilities can create promotional events
- CPM-based promoted placements, locally targeted

**Hangout Credits**
- A virtual currency for one-time purchases (e.g., "Buy 3 event unlocks" instead of subscribing)
- Useful for infrequent but high-volume event organizers (wedding planners, reunion organizers)

---

### Growth Strategy Notes

- Free tier is the growth engine — frictionless guest experience (no account required) means every event is a marketing touchpoint
- Every guest who joins via invite link is a potential future host — conversion funnel from guest → free host → Plus subscriber
- Referral program: "Give a friend a free month of Plus, get a free month yourself"
- B2B sales motion for Teams tier: target office managers, event coordinators, HOA boards directly

---

## Appendix: Open Questions for V1 Scoping

1. **Account requirement for guests:** Should we require even a minimal account (just phone number) to reduce abuse, or prioritize zero-friction? Recommend: phone number + OTP as the minimum for claimants, with device-session fallback.

2. **LLM model choice:** GPT-4o vs. Claude Sonnet vs. Gemini — evaluate for cost/latency/quality tradeoff. Target: < $0.005 per event generation at scale.

3. **Real-time infrastructure:** WebSockets (Socket.io) vs. server-sent events vs. polling. Recommend: SSE for simplicity at MVP, migrate to WebSockets at scale.

4. **Moderation:** How do we handle inappropriate event content? Lightweight LLM content filter on event creation.

5. **Offline support:** Should the app work offline? Recommend: read-only offline mode for MVP (view your claimed items without connectivity).

6. **Internationalization:** English-only for launch. Plan for i18n-ready architecture from day one.

---

*Document prepared by Hangout Product Management*
*Next review: Sprint Planning — April 2026*
