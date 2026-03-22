import Anthropic from '@anthropic-ai/sdk';
import type { ParsedEventResponse } from '@hangout/shared';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an event planning assistant. Parse the user's event description and return a JSON object with categorized items and tasks needed for the event.

Return ONLY valid JSON in this exact format:
{
  "eventName": "string (inferred event name)",
  "suggestedDate": "string or null",
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

export const claudeService = {
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
