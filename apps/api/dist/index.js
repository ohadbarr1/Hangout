"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_config = require("dotenv/config");
var import_express6 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));

// src/routes/events.ts
var import_express = require("express");
var import_zod = require("zod");
var import_supabase_js2 = require("@supabase/supabase-js");

// src/middleware/auth.ts
var import_supabase_js = require("@supabase/supabase-js");
var supabaseAdmin = (0, import_supabase_js.createClient)(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      data: null,
      error: { message: "Missing or invalid Authorization header", code: "UNAUTHORIZED" }
    });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({
        data: null,
        error: { message: "Invalid or expired token", code: "UNAUTHORIZED" }
      });
      return;
    }
    req.userId = data.user.id;
    req.userEmail = data.user.email ?? "";
    next();
  } catch (err) {
    console.error("[auth] Token verification failed:", err);
    res.status(401).json({
      data: null,
      error: { message: "Token verification failed", code: "UNAUTHORIZED" }
    });
  }
}

// src/middleware/validate.ts
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }));
      res.status(400).json({
        data: null,
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          issues
        }
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// src/routes/events.ts
var router = (0, import_express.Router)();
var supabase = (0, import_supabase_js2.createClient)(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
var createEventSchema = import_zod.z.object({
  title: import_zod.z.string().min(1).max(200),
  description: import_zod.z.string().optional(),
  event_date: import_zod.z.string().datetime({ offset: true }).optional(),
  location: import_zod.z.string().max(300).optional(),
  hero_color: import_zod.z.enum(["coral", "violet", "mint", "golden", "charcoal"]).optional().default("coral"),
  // Present when creating from AI-parsed data
  parsed_categories: import_zod.z.array(import_zod.z.any()).optional(),
  estimated_guests: import_zod.z.number().int().positive().optional()
});
var updateEventSchema = import_zod.z.object({
  title: import_zod.z.string().min(1).max(200).optional(),
  description: import_zod.z.string().optional(),
  event_date: import_zod.z.string().datetime({ offset: true }).nullable().optional(),
  location: import_zod.z.string().max(300).nullable().optional(),
  status: import_zod.z.enum(["draft", "active", "completed", "cancelled"]).optional(),
  hero_color: import_zod.z.enum(["coral", "violet", "mint", "golden", "charcoal"]).optional()
});
router.get("/", requireAuth, async (req, res) => {
  const { userId } = req;
  const { data, error } = await supabase.from("event_members").select("events(*)").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  const events = (data ?? []).map((row) => row.events).filter((e) => e != null);
  res.json({ data: events, error: null });
});
router.post("/", requireAuth, validateBody(createEventSchema), async (req, res) => {
  const { userId } = req;
  const { parsed_categories, estimated_guests, ...eventData } = req.body;
  const invite_code = generateInviteCode();
  const { data: event, error: eventError } = await supabase.from("events").insert({
    ...eventData,
    admin_id: userId,
    invite_code,
    status: "active"
  }).select().single();
  if (eventError || !event) {
    res.status(500).json({ data: null, error: { message: eventError?.message ?? "Failed to create event" } });
    return;
  }
  await supabase.from("event_members").insert({
    event_id: event.id,
    user_id: userId,
    role: "admin",
    rsvp_status: "going"
  });
  if (parsed_categories && Array.isArray(parsed_categories)) {
    const items = parsed_categories.flatMap(
      (cat) => cat.items.map((item) => ({
        event_id: event.id,
        category: cat.name,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        is_ai_generated: true
      }))
    );
    if (items.length > 0) {
      await supabase.from("items").insert(items);
    }
  }
  res.status(201).json({ data: event, error: null });
});
router.get("/:id", requireAuth, async (req, res) => {
  const { userId } = req;
  const { id } = req.params;
  const { data: event, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error || !event) {
    res.status(404).json({ data: null, error: { message: "Event not found", code: "NOT_FOUND" } });
    return;
  }
  const { data: membership } = await supabase.from("event_members").select("id").eq("event_id", id).eq("user_id", userId).maybeSingle();
  if (!membership) {
    res.status(403).json({ data: null, error: { message: "Access denied", code: "FORBIDDEN" } });
    return;
  }
  res.json({ data: event, error: null });
});
router.get("/:id/members", requireAuth, async (req, res) => {
  const { userId } = req;
  const { id } = req.params;
  const { data: membership } = await supabase.from("event_members").select("id").eq("event_id", id).eq("user_id", userId).maybeSingle();
  if (!membership) {
    res.status(403).json({ data: null, error: { message: "Access denied", code: "FORBIDDEN" } });
    return;
  }
  const { data, error } = await supabase.from("event_members").select("*, user:users(id, name, avatar_url)").eq("event_id", id);
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.json({ data: data ?? [], error: null });
});
router.patch("/:id", requireAuth, validateBody(updateEventSchema), async (req, res) => {
  const { userId } = req;
  const { id } = req.params;
  const { data: event } = await supabase.from("events").select("admin_id").eq("id", id).single();
  if (!event) {
    res.status(404).json({ data: null, error: { message: "Event not found", code: "NOT_FOUND" } });
    return;
  }
  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: "Only the event admin can update it", code: "FORBIDDEN" } });
    return;
  }
  const { data: updated, error } = await supabase.from("events").update(req.body).eq("id", id).select().single();
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.json({ data: updated, error: null });
});
router.delete("/:id", requireAuth, async (req, res) => {
  const { userId } = req;
  const { id } = req.params;
  const { data: event } = await supabase.from("events").select("admin_id").eq("id", id).single();
  if (!event) {
    res.status(404).json({ data: null, error: { message: "Event not found", code: "NOT_FOUND" } });
    return;
  }
  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: "Only the event admin can delete it", code: "FORBIDDEN" } });
    return;
  }
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.json({ data: { id }, error: null });
});
function generateInviteCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// src/routes/items.ts
var import_express2 = require("express");
var import_zod2 = require("zod");
var import_supabase_js3 = require("@supabase/supabase-js");
var import_shared = require("@hangout/shared");
var router2 = (0, import_express2.Router)();
var supabase2 = (0, import_supabase_js3.createClient)(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
var createItemSchema = import_zod2.z.object({
  category: import_zod2.z.nativeEnum(import_shared.Category),
  name: import_zod2.z.string().min(1).max(200),
  quantity: import_zod2.z.number().int().positive().nullable().optional(),
  unit: import_zod2.z.string().max(50).nullable().optional(),
  notes: import_zod2.z.string().max(500).nullable().optional(),
  is_ai_generated: import_zod2.z.boolean().optional().default(false)
});
var updateItemSchema = import_zod2.z.object({
  category: import_zod2.z.nativeEnum(import_shared.Category).optional(),
  name: import_zod2.z.string().min(1).max(200).optional(),
  quantity: import_zod2.z.number().int().positive().nullable().optional(),
  unit: import_zod2.z.string().max(50).nullable().optional(),
  notes: import_zod2.z.string().max(500).nullable().optional()
});
async function getMembership(eventId, userId) {
  const { data } = await supabase2.from("event_members").select("role").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  return data;
}
router2.get("/events/:eventId/items", requireAuth, async (req, res) => {
  const { userId } = req;
  const { eventId } = req.params;
  const membership = await getMembership(eventId, userId);
  if (!membership) {
    res.status(403).json({ data: null, error: { message: "Access denied", code: "FORBIDDEN" } });
    return;
  }
  const { data, error } = await supabase2.from("items").select("*, assignment:assignments(id, item_id, user_id, note, created_at, user:users(id, name, avatar_url))").eq("event_id", eventId).order("created_at", { ascending: true });
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  const items = (data ?? []).map((item) => ({
    ...item,
    assignment: Array.isArray(item.assignment) ? item.assignment[0] ?? null : item.assignment
  }));
  res.json({ data: items, error: null });
});
router2.post("/events/:eventId/items", requireAuth, validateBody(createItemSchema), async (req, res) => {
  const { userId } = req;
  const { eventId } = req.params;
  const membership = await getMembership(eventId, userId);
  if (!membership) {
    res.status(403).json({ data: null, error: { message: "Access denied", code: "FORBIDDEN" } });
    return;
  }
  const { data, error } = await supabase2.from("items").insert({ ...req.body, event_id: eventId }).select().single();
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.status(201).json({ data, error: null });
});
router2.patch("/:id", requireAuth, validateBody(updateItemSchema), async (req, res) => {
  const { userId } = req;
  const { id } = req.params;
  const { data: item } = await supabase2.from("items").select("event_id, events(admin_id)").eq("id", id).single();
  if (!item) {
    res.status(404).json({ data: null, error: { message: "Item not found", code: "NOT_FOUND" } });
    return;
  }
  const adminId = item.events?.admin_id;
  if (adminId !== userId) {
    res.status(403).json({ data: null, error: { message: "Only the event admin can update items", code: "FORBIDDEN" } });
    return;
  }
  const { data, error } = await supabase2.from("items").update(req.body).eq("id", id).select().single();
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.json({ data, error: null });
});
router2.delete("/:id", requireAuth, async (req, res) => {
  const { userId } = req;
  const { id } = req.params;
  const { data: item } = await supabase2.from("items").select("event_id, events(admin_id)").eq("id", id).single();
  if (!item) {
    res.status(404).json({ data: null, error: { message: "Item not found", code: "NOT_FOUND" } });
    return;
  }
  const adminId = item.events?.admin_id;
  if (adminId !== userId) {
    res.status(403).json({ data: null, error: { message: "Only the event admin can delete items", code: "FORBIDDEN" } });
    return;
  }
  const { error } = await supabase2.from("items").delete().eq("id", id);
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.json({ data: { id }, error: null });
});

// src/routes/assignments.ts
var import_express3 = require("express");
var import_zod3 = require("zod");
var import_supabase_js4 = require("@supabase/supabase-js");

// src/services/notificationService.ts
var EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
var notificationService = {
  /**
   * Send a push notification to a single Expo push token.
   */
  async sendPush(message) {
    const payload = {
      to: message.to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: message.sound ?? "default",
      ...message.badge !== void 0 ? { badge: message.badge } : {},
      ...message.channelId ? { channelId: message.channelId } : {}
    };
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Expo Push API error ${response.status}: ${text}`);
    }
    const result = await response.json();
    const firstResult = result.data[0];
    if (firstResult?.status === "error") {
      console.warn("[notifications] Push delivery error:", firstResult.message, firstResult.details);
    }
  },
  /**
   * Send push notifications to multiple tokens in a single batch request.
   * Expo supports up to 100 messages per request.
   */
  async sendBatch(messages) {
    if (messages.length === 0) return;
    const BATCH_SIZE = 100;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE).map((msg) => ({
        to: msg.to,
        title: msg.title,
        body: msg.body,
        data: msg.data ?? {},
        sound: msg.sound ?? "default"
      }));
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate"
        },
        body: JSON.stringify(batch)
      });
      if (!response.ok) {
        console.error(`[notifications] Batch push failed: ${response.status}`);
      }
    }
  }
};

// src/routes/assignments.ts
var router3 = (0, import_express3.Router)();
var supabase3 = (0, import_supabase_js4.createClient)(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
var claimSchema = import_zod3.z.object({
  note: import_zod3.z.string().max(300).optional()
});
router3.post("/:id/claim", requireAuth, validateBody(claimSchema), async (req, res) => {
  const { userId } = req;
  const { id: itemId } = req.params;
  const { data: item } = await supabase3.from("items").select("id, name, event_id, events(admin_id, title)").eq("id", itemId).single();
  if (!item) {
    res.status(404).json({ data: null, error: { message: "Item not found", code: "NOT_FOUND" } });
    return;
  }
  const { data: membership } = await supabase3.from("event_members").select("id").eq("event_id", item.event_id).eq("user_id", userId).maybeSingle();
  if (!membership) {
    res.status(403).json({ data: null, error: { message: "You are not a member of this event", code: "FORBIDDEN" } });
    return;
  }
  const { data: existing } = await supabase3.from("assignments").select("id, user_id").eq("item_id", itemId).maybeSingle();
  if (existing) {
    res.status(409).json({ data: null, error: { message: "Item is already claimed", code: "CONFLICT" } });
    return;
  }
  const { data: assignment, error } = await supabase3.from("assignments").insert({
    item_id: itemId,
    user_id: userId,
    note: req.body.note ?? null
  }).select("*, user:users(id, name, avatar_url)").single();
  if (error || !assignment) {
    res.status(500).json({ data: null, error: { message: error?.message ?? "Failed to claim item" } });
    return;
  }
  void notifyAdminOnClaim(item, userId, assignment.user).catch(console.error);
  res.status(201).json({ data: assignment, error: null });
});
router3.delete("/:id/unclaim", requireAuth, async (req, res) => {
  const { userId } = req;
  const { id: itemId } = req.params;
  const { data: assignment } = await supabase3.from("assignments").select("id, user_id").eq("item_id", itemId).maybeSingle();
  if (!assignment) {
    res.status(404).json({ data: null, error: { message: "No assignment found for this item", code: "NOT_FOUND" } });
    return;
  }
  if (assignment.user_id !== userId) {
    res.status(403).json({ data: null, error: { message: "You can only unclaim your own assignments", code: "FORBIDDEN" } });
    return;
  }
  const { error } = await supabase3.from("assignments").delete().eq("id", assignment.id);
  if (error) {
    res.status(500).json({ data: null, error: { message: error.message } });
    return;
  }
  res.json({ data: { item_id: itemId }, error: null });
});
async function notifyAdminOnClaim(item, claimerUserId, claimerUser) {
  const eventData = item.events;
  if (!eventData || eventData.admin_id === claimerUserId) return;
  const { data: admin } = await supabase3.from("users").select("expo_push_token").eq("id", eventData.admin_id).single();
  if (admin?.expo_push_token) {
    await notificationService.sendPush({
      to: admin.expo_push_token,
      title: eventData.title,
      body: `${claimerUser?.name ?? "Someone"} claimed "${item.name}"`,
      data: { eventId: item.event_id }
    });
  }
}

// src/routes/invites.ts
var import_express4 = require("express");
var import_zod4 = require("zod");
var import_supabase_js5 = require("@supabase/supabase-js");
var router4 = (0, import_express4.Router)();
var supabase4 = (0, import_supabase_js5.createClient)(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
var acceptInviteSchema = import_zod4.z.object({
  rsvp_status: import_zod4.z.enum(["going", "maybe", "not_going", "pending"]).optional().default("going")
});
router4.post("/events/:eventId/invites", requireAuth, async (req, res) => {
  const { userId } = req;
  const { eventId } = req.params;
  const { data: event } = await supabase4.from("events").select("admin_id, invite_code").eq("id", eventId).single();
  if (!event) {
    res.status(404).json({ data: null, error: { message: "Event not found", code: "NOT_FOUND" } });
    return;
  }
  if (event.admin_id !== userId) {
    res.status(403).json({ data: null, error: { message: "Only the event admin can create invites", code: "FORBIDDEN" } });
    return;
  }
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
  const { data: invite, error } = await supabase4.from("invites").insert({
    event_id: eventId,
    token,
    created_by: userId,
    expires_at: expiresAt
  }).select("*, event:events(id, title, event_date, location, status)").single();
  if (error || !invite) {
    res.status(500).json({ data: null, error: { message: error?.message ?? "Failed to create invite" } });
    return;
  }
  res.status(201).json({ data: invite, error: null });
});
router4.get("/invites/:token", async (req, res) => {
  const { token } = req.params;
  const { data: invite, error } = await supabase4.from("invites").select("*, event:events(id, title, event_date, location, status)").eq("token", token).maybeSingle();
  if (error || !invite) {
    res.status(404).json({ data: null, error: { message: "Invite not found or expired", code: "NOT_FOUND" } });
    return;
  }
  if (invite.expires_at && new Date(invite.expires_at) < /* @__PURE__ */ new Date()) {
    res.status(410).json({ data: null, error: { message: "This invite link has expired", code: "EXPIRED" } });
    return;
  }
  if (invite.used_by) {
    res.status(410).json({ data: null, error: { message: "This invite link has already been used", code: "USED" } });
    return;
  }
  res.json({ data: invite, error: null });
});
router4.post("/invites/:token/accept", requireAuth, validateBody(acceptInviteSchema), async (req, res) => {
  const { userId } = req;
  const { token } = req.params;
  const { data: invite } = await supabase4.from("invites").select("*, event:events(id, title, status)").eq("token", token).maybeSingle();
  if (!invite) {
    res.status(404).json({ data: null, error: { message: "Invite not found", code: "NOT_FOUND" } });
    return;
  }
  if (invite.expires_at && new Date(invite.expires_at) < /* @__PURE__ */ new Date()) {
    res.status(410).json({ data: null, error: { message: "Invite expired", code: "EXPIRED" } });
    return;
  }
  if (invite.used_by) {
    res.status(410).json({ data: null, error: { message: "Invite already used", code: "USED" } });
    return;
  }
  const eventData = invite.event;
  if (!eventData || eventData.status === "cancelled") {
    res.status(400).json({ data: null, error: { message: "This event is no longer available", code: "EVENT_UNAVAILABLE" } });
    return;
  }
  const { data: membership, error: memberError } = await supabase4.from("event_members").upsert({
    event_id: invite.event_id,
    user_id: userId,
    role: "guest",
    rsvp_status: req.body.rsvp_status
  }, { onConflict: "event_id,user_id" }).select().single();
  if (memberError || !membership) {
    res.status(500).json({ data: null, error: { message: memberError?.message ?? "Failed to join event" } });
    return;
  }
  await supabase4.from("invites").update({ used_by: userId, used_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", invite.id);
  res.json({ data: membership, error: null });
});
function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// src/routes/parse.ts
var import_express5 = require("express");
var import_zod5 = require("zod");

// src/services/claudeService.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"));
var client = new import_sdk.default({
  apiKey: process.env.ANTHROPIC_API_KEY
});
var SYSTEM_PROMPT = `You are an event planning assistant. Parse the user's event description and return a JSON object with categorized items and tasks needed for the event.

Return ONLY valid JSON in this exact format:
{
  "eventName": "string (inferred event name)",
  "suggestedDate": "string or null",
  "estimatedGuests": number or null,
  "categories": [
    {
      "name": "Food",
      "emoji": "\u{1F355}",
      "items": [
        { "name": "string", "quantity": number or null, "unit": "string or null", "notes": "string or null" }
      ]
    }
  ]
}

Categories should include relevant ones from: Food, Drinks, Equipment, Decorations, Games, Transport, Logistics, Tasks.
Scale quantities to the number of guests if mentioned. Be specific and helpful.`;
var claudeService = {
  /**
   * Parse a free-text event description into structured categories + items.
   * Uses claude-haiku-4-5 for low latency and cost.
   */
  async parseEventDescription(description) {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: description
        }
      ]
    });
    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== "text") {
      throw new Error("Unexpected response format from Claude");
    }
    const raw = firstContent.text.trim();
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(`Claude returned non-JSON response: ${raw.slice(0, 200)}`);
    }
    return validateParsedResponse(parsed);
  }
};
function validateParsedResponse(raw) {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Claude response is not an object");
  }
  const obj = raw;
  if (typeof obj.eventName !== "string" || obj.eventName.length === 0) {
    throw new Error("Missing eventName in Claude response");
  }
  if (!Array.isArray(obj.categories)) {
    throw new Error("Missing categories array in Claude response");
  }
  const categories = obj.categories.map((cat) => {
    if (typeof cat !== "object" || cat === null) throw new Error("Invalid category");
    const c = cat;
    return {
      name: String(c.name ?? ""),
      emoji: String(c.emoji ?? "\u{1F4E6}"),
      items: Array.isArray(c.items) ? c.items.map((item) => {
        if (typeof item !== "object" || item === null) throw new Error("Invalid item");
        const i = item;
        return {
          name: String(i.name ?? ""),
          quantity: typeof i.quantity === "number" ? i.quantity : null,
          unit: typeof i.unit === "string" ? i.unit : null,
          notes: typeof i.notes === "string" ? i.notes : null
        };
      }) : []
    };
  });
  return {
    eventName: obj.eventName,
    suggestedDate: typeof obj.suggestedDate === "string" ? obj.suggestedDate : null,
    estimatedGuests: typeof obj.estimatedGuests === "number" ? obj.estimatedGuests : null,
    categories
  };
}

// src/routes/parse.ts
var router5 = (0, import_express5.Router)();
var parseSchema = import_zod5.z.object({
  description: import_zod5.z.string().min(10, "Please describe your event in at least 10 characters.").max(2e3, "Description must be under 2000 characters.")
});
router5.post("/parse", requireAuth, validateBody(parseSchema), async (req, res) => {
  const { description } = req.body;
  try {
    const parsed = await claudeService.parseEventDescription(description);
    res.json({ data: parsed, error: null });
  } catch (err) {
    console.error("[parse] Claude error:", err);
    res.status(502).json({
      data: null,
      error: {
        message: "AI parsing failed. Please try again.",
        code: "AI_ERROR"
      }
    });
  }
});

// src/index.ts
var app = (0, import_express6.default)();
var PORT = parseInt(process.env.PORT ?? "3000", 10);
app.use((0, import_cors.default)({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) : true,
  credentials: true
}));
app.use(import_express6.default.json({ limit: "1mb" }));
app.use(import_express6.default.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/events", router5);
app.use("/events", router);
app.use("/items", router2);
app.use("/items", router3);
app.use("/", router4);
app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { message: "Route not found", code: "NOT_FOUND" }
  });
});
app.use((err, _req, res, _next) => {
  console.error("[Error]", err.message, err.stack);
  res.status(500).json({
    data: null,
    error: { message: "Internal server error", code: "INTERNAL_ERROR" }
  });
});
app.listen(PORT, () => {
  console.log(`Hangout API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
});
var index_default = app;
