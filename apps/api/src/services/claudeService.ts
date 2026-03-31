import Anthropic from '@anthropic-ai/sdk';
import type { ParsedEventResponse } from '../shared-types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an event planning assistant. Parse the user's event description and return a JSON object with categorized items and tasks needed for the event.

Return ONLY valid JSON in this exact format:
{
  "eventName": "string (inferred event name)",
  "suggestedDate": "ISO 8601 date string (e.g. '2025-03-29') or null if date is unclear",
  "estimatedGuests": number or null,
  "categories": [
    {
      "name": "Food",
      "emoji": "🍕",
      "items": [
        { "name": "string", "quantity": number or null, "unit": "string or null", "notes": "string or null" }
      ]
    }
  ]
}

Categories should include relevant ones from: Food, Drinks, Equipment, Decorations, Games, Transport, Logistics, Tasks.
Scale quantities to the number of guests if mentioned. Be specific and helpful.`;

export interface SuggestedItem {
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  reason: string;
}

export const claudeService = {
  /**
   * Suggest missing items for an event given the current item list.
   * Returns up to 5 quick suggestions.
   */
  async suggestItems(
    eventTitle: string,
    existingItems: string[],
  ): Promise<SuggestedItem[]> {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: `You are a helpful event planning assistant. Given an event and its current item list, suggest up to 5 items that are commonly forgotten or would improve the event. Return ONLY valid JSON array:
[{ "name": "string", "category": "Food|Drinks|Equipment|Decorations|Games|Transport|Logistics|Tasks", "quantity": number|null, "unit": "string|null", "reason": "one short sentence why" }]`,
      messages: [
        {
          role: 'user',
          content: `Event: "${eventTitle}"\nExisting items: ${existingItems.length > 0 ? existingItems.join(', ') : 'none yet'}\n\nSuggest up to 5 missing items.`,
        },
      ],
    });

    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== 'text') return [];

    const raw = firstContent.text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.slice(0, 5).map((s: Record<string, unknown>) => ({
        name: String(s.name ?? ''),
        category: String(s.category ?? 'Tasks'),
        quantity: typeof s.quantity === 'number' ? s.quantity : null,
        unit: typeof s.unit === 'string' ? s.unit : null,
        reason: String(s.reason ?? ''),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Parse a free-text quick-add string into one or more items.
   * E.g. "2 bottles of wine and some chips" → [{name: "Wine", quantity: 2, unit: "bottle"}, ...]
   */
  async parseQuickAdd(text: string): Promise<Array<{ name: string; category: string; quantity: number | null; unit: string | null }>> {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: `Parse the user's quick-add text into structured items. Return ONLY valid JSON array:
[{ "name": "string", "category": "Food|Drinks|Equipment|Decorations|Games|Transport|Logistics|Tasks", "quantity": number|null, "unit": "string|null" }]`,
      messages: [{ role: 'user', content: text }],
    });

    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== 'text') return [];

    const raw = firstContent.text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map((i: Record<string, unknown>) => ({
        name: String(i.name ?? ''),
        category: String(i.category ?? 'Tasks'),
        quantity: typeof i.quantity === 'number' ? i.quantity : null,
        unit: typeof i.unit === 'string' ? i.unit : null,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Generate a fun one-liner recap for a completed event.
   */
  async generateRecap(
    eventTitle: string,
    attendeeCount: number,
    claimedCount: number,
    totalItems: number,
    topContributors: string[],
  ): Promise<string> {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      system: 'You write fun, warm, 1-sentence event recaps for a social planning app. Keep it under 25 words. Be specific and celebratory. No quotes around the output.',
      messages: [{
        role: 'user',
        content: `Event: "${eventTitle}", ${attendeeCount} people, ${claimedCount}/${totalItems} items claimed, top contributors: ${topContributors.join(', ') || 'everyone'}`,
      }],
    });
    const c = message.content[0];
    return c?.type === 'text' ? c.text.trim() : `${eventTitle} was a blast!`;
  },

  /**
   * Parse a free-text event description into structured categories + items.
   * Uses claude-haiku-4-5 for low latency and cost.
   */
  async parseEventDescription(description: string): Promise<ParsedEventResponse> {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: description,
        },
      ],
    });

    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    const raw = firstContent.text.trim();

    // Strip markdown code fences if present
    const jsonText = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(`Claude returned non-JSON response: ${raw.slice(0, 200)}`);
    }

    return validateParsedResponse(parsed);
  },
};

function validateParsedResponse(raw: unknown): ParsedEventResponse {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Claude response is not an object');
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.eventName !== 'string' || obj.eventName.length === 0) {
    throw new Error('Missing eventName in Claude response');
  }

  if (!Array.isArray(obj.categories)) {
    throw new Error('Missing categories array in Claude response');
  }

  const categories = obj.categories.map((cat: unknown) => {
    if (typeof cat !== 'object' || cat === null) throw new Error('Invalid category');
    const c = cat as Record<string, unknown>;

    return {
      name: String(c.name ?? ''),
      emoji: String(c.emoji ?? '📦'),
      items: Array.isArray(c.items)
        ? c.items.map((item: unknown) => {
            if (typeof item !== 'object' || item === null) throw new Error('Invalid item');
            const i = item as Record<string, unknown>;
            return {
              name: String(i.name ?? ''),
              quantity: typeof i.quantity === 'number' ? i.quantity : null,
              unit: typeof i.unit === 'string' ? i.unit : null,
              notes: typeof i.notes === 'string' ? i.notes : null,
            };
          })
        : [],
    };
  });

  return {
    eventName: obj.eventName,
    suggestedDate: typeof obj.suggestedDate === 'string' ? obj.suggestedDate : null,
    estimatedGuests: typeof obj.estimatedGuests === 'number' ? obj.estimatedGuests : null,
    categories,
  };
}
