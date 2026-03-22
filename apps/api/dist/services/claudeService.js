"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeService = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client = new sdk_1.default({
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
exports.claudeService = {
    /**
     * Parse a free-text event description into structured categories + items.
     * Uses claude-haiku-4-5 for low latency and cost.
     */
    async parseEventDescription(description) {
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
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        }
        catch {
            throw new Error(`Claude returned non-JSON response: ${raw.slice(0, 200)}`);
        }
        return validateParsedResponse(parsed);
    },
};
function validateParsedResponse(raw) {
    if (typeof raw !== 'object' || raw === null) {
        throw new Error('Claude response is not an object');
    }
    const obj = raw;
    if (typeof obj.eventName !== 'string' || obj.eventName.length === 0) {
        throw new Error('Missing eventName in Claude response');
    }
    if (!Array.isArray(obj.categories)) {
        throw new Error('Missing categories array in Claude response');
    }
    const categories = obj.categories.map((cat) => {
        if (typeof cat !== 'object' || cat === null)
            throw new Error('Invalid category');
        const c = cat;
        return {
            name: String(c.name ?? ''),
            emoji: String(c.emoji ?? '📦'),
            items: Array.isArray(c.items)
                ? c.items.map((item) => {
                    if (typeof item !== 'object' || item === null)
                        throw new Error('Invalid item');
                    const i = item;
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
