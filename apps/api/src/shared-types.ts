// ─── Enums ────────────────────────────────────────────────────────────────────

export enum EventStatus {
  Draft = 'draft',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum ItemStatus {
  Unclaimed = 'unclaimed',
  Claimed = 'claimed',
}

export enum Category {
  Food = 'Food',
  Drinks = 'Drinks',
  Equipment = 'Equipment',
  Decorations = 'Decorations',
  Games = 'Games',
  Transport = 'Transport',
  Logistics = 'Logistics',
  Tasks = 'Tasks',
}

export enum RsvpStatus {
  Going = 'going',
  Maybe = 'maybe',
  NotGoing = 'not_going',
  Pending = 'pending',
}

export enum MemberRole {
  Admin = 'admin',
  Guest = 'guest',
}

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  expo_push_token: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  admin_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  status: EventStatus;
  invite_code: string;
  hero_color: string;
  created_at: string;
  // Optional item progress counts — populated by GET /events list endpoint
  total_items?: number;
  claimed_items?: number;
}

export interface Item {
  id: string;
  event_id: string;
  category: Category;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  is_ai_generated: boolean;
  created_at: string;
  // Joined fields (optional, when fetched with relations)
  assignment?: Assignment | null;
}

export interface Assignment {
  id: string;
  item_id: string;
  user_id: string;
  note: string | null;
  created_at: string;
  // Joined
  user?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  role: MemberRole;
  rsvp_status: RsvpStatus;
  joined_at: string;
  // Joined
  user?: Pick<User, 'id' | 'name' | 'avatar_url'>;
}

export interface Invite {
  id: string;
  event_id: string;
  token: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  // Joined
  event?: Event;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateEventPayload {
  title: string;
  description?: string;
  event_date?: string;
  location?: string;
  hero_color?: string;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  event_date?: string;
  location?: string;
  status?: EventStatus;
  hero_color?: string;
}

export interface CreateItemPayload {
  category: Category;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  is_ai_generated?: boolean;
}

export interface UpdateItemPayload {
  category?: Category;
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
}

export interface ClaimItemPayload {
  note?: string;
}

export interface ParseEventPayload {
  description: string;
}

export interface AcceptInvitePayload {
  rsvp_status?: RsvpStatus;
}

// ─── LLM Response ─────────────────────────────────────────────────────────────

export interface ParsedItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
}

export interface ParsedCategory {
  name: string;
  emoji: string;
  items: ParsedItem[];
}

export interface ParsedEventResponse {
  eventName: string;
  suggestedDate: string | null;
  estimatedGuests: number | null;
  categories: ParsedCategory[];
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Realtime Payloads ────────────────────────────────────────────────────────

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T> {
  eventType: RealtimeEventType;
  new: T;
  old: Partial<T>;
  schema: string;
  table: string;
  commit_timestamp: string;
}
