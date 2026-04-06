import express from 'express';
import twilio from 'twilio';
import {callStore} from '../callStore.js';
import {authMiddleware} from '../middleware/auth.js';
import {chatCompletion} from '../llm.js';
import {checkInjection} from '../middleware/promptGuard.js';
import {getDb, saveDb} from '../db.js';

const router = express.Router();

const client = twilio(
   process.env.TWILIO_ACCOUNT_SID,
   process.env.TWILIO_AUTH_TOKEN,
);

function decrementQuota(db, userId) {
   db.run('UPDATE users SET quota = quota - 1 WHERE id = ?', [
      userId,
   ]);
}

// POST /api/calls - Start an outbound call (no guard, no Groq greeting)
router.post('/', authMiddleware, async (req, res) => {
   const {to, greeting, systemPrompt} = req.body;
   if (!to)
      return res.status(400).json({error: '"to" phone number is required'});

   const baseUrl = process.env.BASE_URL;
   if (!baseUrl)
      return res.status(500).json({error: 'BASE_URL not configured'});

   try {
      const call = await client.calls.create({
         to,
         from: process.env.TWILIO_PHONE_NUMBER,
         url: `${baseUrl}/api/calls/twiml/connect`,
         statusCallback: `${baseUrl}/api/calls/status`,
         statusCallbackEvent: [
            'initiated',
            'ringing',
            'answered',
            'completed',
         ],
      });

      callStore.create(call.sid, {
         systemPrompt,
         greeting: greeting || 'Hello! How can I help you today?',
         userId: req.user.id,
         phoneNumber: to,
      });

      const db = await getDb();
      decrementQuota(db, req.user.id);
      saveDb();

      res.status(201).json({callSid: call.sid, status: 'initiated'});
   } catch (err) {
      res.status(500).json({error: err.message});
   }
});

// --- Twilio webhooks (NO auth — called by Twilio servers) ---

// POST /api/calls/twiml/connect - TwiML: greet then listen
router.post('/twiml/connect', (req, res) => {
   const baseUrl = process.env.BASE_URL;
   const callSid = req.body.CallSid;

   // Use stored greeting from callStore (set by /api/calls or /api/user/calls)
   const entry = callStore.get(callSid);
   const greeting = entry?.greeting || req.query.greeting || 'Hello!';

   if (entry) entry.addTranscript('assistant', greeting);

   const twiml = new twilio.twiml.VoiceResponse();
   twiml.say({voice: 'Polly.Amy'}, greeting);
   twiml.gather({
      input: 'speech',
      action: `${baseUrl}/api/calls/gather`,
      speechTimeout: 'auto',
      language: 'en-US',
   });
   twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

   res.type('text/xml');
   res.send(twiml.toString());
});

// POST /api/calls/twiml/listen - TwiML: just listen (no greeting)
router.post('/twiml/listen', (req, res) => {
   const baseUrl = process.env.BASE_URL;
   const twiml = new twilio.twiml.VoiceResponse();
   twiml.gather({
      input: 'speech',
      action: `${baseUrl}/api/calls/gather`,
      speechTimeout: 'auto',
      language: 'en-US',
   });
   twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

   res.type('text/xml');
   res.send(twiml.toString());
});

// POST /api/calls/gather - Twilio sends caller's speech
// Flow: transcript → promptGuard → Groq → speak → listen
router.post('/gather', async (req, res) => {
   const {CallSid, SpeechResult, Confidence} = req.body;
   const baseUrl = process.env.BASE_URL;

   const entry = callStore.get(CallSid);

   if (entry && SpeechResult) {
      // Step 4: Read answerer transcript
      entry.addTranscript('caller', SpeechResult);
      console.log(`[caller] "${SpeechResult}" (confidence: ${Confidence})`);

      // Step 5: Send to promptGuard
      if (entry.guardEnabled) {
         const check = await checkInjection(SpeechResult);
         console.log(`[guard] label=${check.label} score=${check.score}`);

         // Step 6-1: Injection detected — log, warn, and hang up
         if (check.injection) {
            try {
               const db = await getDb();
               db.run(
                  'INSERT INTO injection_logs (user_id, input_text, classification, score) VALUES (?, ?, ?, ?)',
                  [
                     entry.userId || null,
                     SpeechResult,
                     check.label,
                     check.score,
                  ],
               );
               saveDb();
            } catch (logErr) {
               console.error('Failed to log injection:', logErr.message);
            }
            entry.addTranscript(
               'assistant',
               'Prompt injection detected. Ending call.',
            );
            console.log('[guard] INJECTION DETECTED — ending call');

            const twiml = new twilio.twiml.VoiceResponse();
            twiml.say(
               {voice: 'Polly.Amy'},
               'I have detected a prompt injection attempt. This call will now end. Goodbye.',
            );
            twiml.hangup();

            res.type('text/xml');
            return res.send(twiml.toString());
         }
      }

      // Step 6-2: Clean — send to Groq (same session via entry.messages)
      try {
         const reply = await chatCompletion(entry.messages);

         // Step 3 (loop): Send Groq response to answerer, then listen again
         entry.addTranscript('assistant', reply);
         console.log(`[assistant] "${reply}"`);

         const twiml = new twilio.twiml.VoiceResponse();
         twiml.say({voice: 'Polly.Amy'}, reply);
         twiml.gather({
            input: 'speech',
            action: `${baseUrl}/api/calls/gather`,
            speechTimeout: 'auto',
            language: 'en-US',
         });
         twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

         res.type('text/xml');
         return res.send(twiml.toString());
      } catch (err) {
         console.error('[llm error]', err.message);
      }
   }

   // Fallback: keep listening
   const twiml = new twilio.twiml.VoiceResponse();
   twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

   res.type('text/xml');
   res.send(twiml.toString());
});

// POST /api/calls/status - Twilio status callback
router.post('/status', (req, res) => {
   const {CallSid, CallStatus} = req.body;
   callStore.updateStatus(CallSid, CallStatus);
   res.sendStatus(200);
});

// --- Authenticated endpoints ---

// GET /api/calls/:callSid - Get call state and transcript
router.get('/:callSid', authMiddleware, async (req, res) => {
   const entry = callStore.get(req.params.callSid);
   if (entry) {
      return res.json({
         callSid: req.params.callSid,
         status: entry.status,
         transcript: entry.transcript,
         startedAt: entry.startedAt,
         endedAt: entry.endedAt,
      });
   }

   // Fall back to DB for ended/past calls
   const dbEntry = await callStore.getFromDb(req.params.callSid);
   if (!dbEntry) return res.status(404).json({error: 'Call not found'});

   res.json(dbEntry);
});

// POST /api/calls/:callSid/say - Manually speak words (overrides LLM)
router.post('/:callSid/say', authMiddleware, async (req, res) => {
   const {text, voice} = req.body;
   if (!text) return res.status(400).json({error: '"text" is required'});

   const entry = callStore.get(req.params.callSid);
   if (!entry) return res.status(404).json({error: 'Call not found'});

   try {
      const baseUrl = process.env.BASE_URL;

      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({voice: voice || 'Polly.Amy'}, text);
      twiml.gather({
         input: 'speech',
         action: `${baseUrl}/api/calls/gather`,
         speechTimeout: 'auto',
         language: 'en-US',
      });
      twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

      await client.calls(req.params.callSid).update({
         twiml: twiml.toString(),
      });

      entry.addTranscript('assistant', text);

      res.json({status: 'speaking', text});
   } catch (err) {
      res.status(500).json({error: err.message});
   }
});

// POST /api/calls/:callSid/hangup - End the call
router.post('/:callSid/hangup', authMiddleware, async (req, res) => {
   try {
      await client.calls(req.params.callSid).update({status: 'completed'});
      res.json({status: 'ended'});
   } catch (err) {
      res.status(500).json({error: err.message});
   }
});

export default router;
