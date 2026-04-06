import express from 'express';
import twilio from 'twilio';
import {callStore} from '../callStore.js';
import {authMiddleware} from '../middleware/auth.js';
import {chatCompletion} from '../llm.js';
import {getDb, saveDb} from '../db.js';
import {getSystemPrompt} from '../systemPrompt.js';

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

// POST /api/user/calls - Start a guarded outbound call with a goal
router.post('/', authMiddleware, async (req, res) => {
   const {to, goal} = req.body;
   if (!to)
      return res.status(400).json({error: '"to" phone number is required'});
   if (!goal) return res.status(400).json({error: '"goal" is required'});

   const baseUrl = process.env.BASE_URL;
   if (!baseUrl)
      return res.status(500).json({error: 'BASE_URL not configured'});

   const systemPrompt = getSystemPrompt() + `\n\nGOAL: ${goal}`;

   try {
      // Step 1 & 2 in parallel: get Groq greeting + initiate Twilio call
      const [
         greeting,
         call,
      ] = await Promise.all([
         chatCompletion([
            {role: 'system', content: systemPrompt},
            {
               role: 'user',
               content:
                  'The call is starting. Introduce yourself and state your purpose briefly.',
            },
         ]),
         client.calls.create({
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
         }),
      ]);

      // Create call entry with the Groq-generated greeting stored for the TwiML webhook to use
      callStore.create(call.sid, {
         systemPrompt,
         guardEnabled: true,
         userId: req.user.id,
         greeting,
         phoneNumber: to,
         goal,
      });

      const db = await getDb();
      decrementQuota(db, req.user.id);
      saveDb();

      res.status(201).json({
         callSid: call.sid,
         status: 'initiated',
         goal,
         greeting,
         guardEnabled: true,
      });
   } catch (err) {
      res.status(500).json({error: err.message});
   }
});

// GET /api/user/calls/:callSid - Get call state (auth required, owner only)
router.get('/:callSid', authMiddleware, async (req, res) => {
   const entry = callStore.get(req.params.callSid);
   if (entry) {
      if (entry.userId !== req.user.id)
         return res.status(403).json({error: 'Forbidden'});
      return res.json({
         callSid: req.params.callSid,
         status: entry.status,
         transcript: entry.transcript,
         guardEnabled: entry.guardEnabled,
         startedAt: entry.startedAt,
         endedAt: entry.endedAt,
      });
   }

   const dbEntry = await callStore.getFromDb(req.params.callSid);
   if (!dbEntry) return res.status(404).json({error: 'Call not found'});
   if (dbEntry.userId !== req.user.id)
      return res.status(403).json({error: 'Forbidden'});

   res.json(dbEntry);
});

// POST /api/user/calls/:callSid/hangup - End the call (auth required, owner only)
router.post('/:callSid/hangup', authMiddleware, async (req, res) => {
   const entry = callStore.get(req.params.callSid);
   if (!entry) return res.status(404).json({error: 'Call not found'});
   if (entry.userId !== req.user.id)
      return res.status(403).json({error: 'Forbidden'});

   try {
      await client.calls(req.params.callSid).update({status: 'completed'});
      res.json({status: 'ended'});
   } catch (err) {
      res.status(500).json({error: err.message});
   }
});

export default router;
