// In-memory store for active calls
const calls = new Map();

const DEFAULT_SYSTEM_PROMPT = `You are a helpful phone assistant. Keep your responses short and conversational — 1 to 2 sentences max. You are speaking on a phone call, so be natural and concise. Do not use markdown, lists, or special formatting.`;

export const callStore = {
  create(callSid, { systemPrompt, guardEnabled = false, userId = null, greeting = null } = {}) {
    const entry = {
      status: 'initiated',
      guardEnabled,
      userId,
      greeting, // Pre-generated greeting from Groq, used by /twiml/connect
      transcript: [],
      messages: [
        { role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
      ],
      listeners: new Set(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      addTranscript(role, text) {
        const item = { role, text, timestamp: new Date().toISOString() };
        this.transcript.push(item);

        // Also track as LLM messages (map caller→user, assistant→assistant)
        const llmRole = role === 'caller' ? 'user' : 'assistant';
        this.messages.push({ role: llmRole, content: text });

        for (const fn of this.listeners) fn(item);
      },
    };
    calls.set(callSid, entry);
    return entry;
  },

  get(callSid) {
    return calls.get(callSid);
  },

  remove(callSid) {
    calls.delete(callSid);
  },
};
