import {getDb, saveDb} from './db.js';

// In-memory store for active calls
const calls = new Map();

const DEFAULT_SYSTEM_PROMPT = `You are a helpful phone assistant. Keep your responses short and conversational — 1 to 2 sentences max. You are speaking on a phone call, so be natural and concise. Do not use markdown, lists, or special formatting.`;

export const callStore = {
   create(
      callSid,
      {
         systemPrompt,
         guardEnabled = false,
         userId = null,
         greeting = null,
         phoneNumber = null,
         goal = null,
      } = {},
   ) {
      const entry = {
         status: 'initiated',
         guardEnabled,
         userId,
         greeting,
         transcript: [],
         messages: [
            {role: 'system', content: systemPrompt || DEFAULT_SYSTEM_PROMPT},
         ],
         listeners: new Set(),
         startedAt: new Date().toISOString(),
         endedAt: null,
         addTranscript(role, text) {
            const item = {role, text, timestamp: new Date().toISOString()};
            this.transcript.push(item);

            const llmRole = role === 'caller' ? 'user' : 'assistant';
            this.messages.push({role: llmRole, content: text});

            for (const fn of this.listeners) fn(item);

            // Persist transcript to DB
            getDb()
               .then((db) => {
                  db.run(
                     'INSERT INTO transcripts (call_sid, role, text) VALUES (?, ?, ?)',
                     [
                        callSid,
                        role,
                        text,
                     ],
                  );
                  saveDb();
               })
               .catch((err) =>
                  console.error('Failed to save transcript:', err.message),
               );
         },
      };
      calls.set(callSid, entry);

      // Persist call to DB
      getDb()
         .then((db) => {
            db.run(
               'INSERT INTO calls (call_sid, user_id, phone_number, goal, status, guard_enabled) VALUES (?, ?, ?, ?, ?, ?)',
               [
                  callSid,
                  userId,
                  phoneNumber,
                  goal,
                  'initiated',
                  guardEnabled ? 1 : 0,
               ],
            );
            saveDb();
         })
         .catch((err) => console.error('Failed to save call:', err.message));

      return entry;
   },

   get(callSid) {
      return calls.get(callSid);
   },

   updateStatus(callSid, status) {
      const entry = calls.get(callSid);
      if (entry) {
         entry.status = status;
         const terminal = [
            'completed',
            'failed',
            'canceled',
            'no-answer',
            'busy',
         ];
         if (terminal.includes(status)) {
            entry.endedAt = new Date().toISOString();
         }
      }

      // Persist to DB
      getDb()
         .then((db) => {
            const terminal = [
               'completed',
               'failed',
               'canceled',
               'no-answer',
               'busy',
            ];
            if (terminal.includes(status)) {
               db.run(
                  'UPDATE calls SET status = ?, ended_at = datetime(?) WHERE call_sid = ?',
                  [
                     status,
                     new Date().toISOString(),
                     callSid,
                  ],
               );
            } else {
               db.run('UPDATE calls SET status = ? WHERE call_sid = ?', [
                  status,
                  callSid,
               ]);
            }
            saveDb();
         })
         .catch((err) =>
            console.error('Failed to update call status:', err.message),
         );
   },

   // Load a call from DB (for when in-memory entry is gone, e.g. server restart)
   async getFromDb(callSid) {
      const db = await getDb();
      const callResult = db.exec('SELECT * FROM calls WHERE call_sid = ?', [
         callSid,
      ]);
      if (!callResult.length) return null;

      const row = callResult[0].values[0];
      const transcriptResult = db.exec(
         'SELECT role, text, created_at FROM transcripts WHERE call_sid = ? ORDER BY id ASC',
         [
            callSid,
         ],
      );
      const transcript = (transcriptResult[0]?.values || []).map((r) => ({
         role: r[0],
         text: r[1],
         timestamp: r[2],
      }));

      return {
         callSid: row[1],
         userId: row[2],
         phoneNumber: row[3],
         goal: row[4],
         status: row[5],
         guardEnabled: !!row[6],
         startedAt: row[7],
         endedAt: row[8],
         transcript,
      };
   },

   // List calls from DB for a user (matches frontend field names)
   async listByUser(userId) {
      const db = await getDb();
      const result = db.exec(
         'SELECT id, call_sid, phone_number, goal, status, guard_enabled, started_at, ended_at FROM calls WHERE user_id = ? ORDER BY id DESC',
         [
            userId,
         ],
      );
      const calls = (result[0]?.values || []).map((row) => ({
         id: row[0],
         callSid: row[1],
         phone_number: row[2],
         goal: row[3],
         status: row[4],
         guard_enabled: !!row[5],
         created_at: row[6],
         ended_at: row[7],
      }));

      // Attach transcript to each call
      for (const call of calls) {
         const tResult = db.exec(
            'SELECT role, text FROM transcripts WHERE call_sid = ? ORDER BY id ASC',
            [
               call.callSid,
            ],
         );
         const lines = (tResult[0]?.values || []).map(
            (r) => `${r[0]}: ${r[1]}`,
         );
         call.transcript = lines.join('\n');
      }

      return calls;
   },

   // List all calls from DB (admin)
   async listAll() {
      const db = await getDb();
      const result = db.exec(
         'SELECT id, call_sid, user_id, phone_number, goal, status, guard_enabled, started_at, ended_at FROM calls ORDER BY id DESC',
      );
      const calls = (result[0]?.values || []).map((row) => ({
         id: row[0],
         callSid: row[1],
         user_id: row[2],
         phone_number: row[3],
         goal: row[4],
         status: row[5],
         guard_enabled: !!row[6],
         created_at: row[7],
         ended_at: row[8],
      }));

      for (const call of calls) {
         const tResult = db.exec(
            'SELECT role, text FROM transcripts WHERE call_sid = ? ORDER BY id ASC',
            [
               call.callSid,
            ],
         );
         const lines = (tResult[0]?.values || []).map(
            (r) => `${r[0]}: ${r[1]}`,
         );
         call.transcript = lines.join('\n');
      }

      return calls;
   },

   remove(callSid) {
      calls.delete(callSid);
   },
};
