// In-memory store for active calls
const calls = new Map();

export const callStore = {
  create(callSid) {
    const entry = {
      status: 'initiated',
      transcript: [],
      listeners: new Set(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      addTranscript(role, text) {
        const item = { role, text, timestamp: new Date().toISOString() };
        this.transcript.push(item);
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
