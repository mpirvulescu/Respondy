import express from 'express';
import twilio from 'twilio';
import { callStore } from '../callStore.js';
import { authMiddleware } from "../middleware/auth.js"

const router = express.Router();

function decrementQuota(db, userId) {
  db.run('UPDATE users SET quota = quota - 1 WHERE id = ?', [userId]);
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// POST /api/calls - Start an outbound call
router.post('/', authMiddleware, async (req, res) => {
  const { to, greeting } = req.body;
  if (!to) return res.status(400).json({ error: '"to" phone number is required' });

  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) return res.status(500).json({ error: 'BASE_URL not configured' });

  try {
    const call = await client.calls.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${baseUrl}/api/calls/twiml/connect?greeting=${encodeURIComponent(greeting || 'Hello! How can I help you today?')}`,
      statusCallback: `${baseUrl}/api/calls/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    callStore.create(call.sid);

    const db = await getDb();
    decrementQuota(db, req.user.id);
    saveDb();

    res.status(201).json({ callSid: call.sid, status: 'initiated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calls/twiml/connect - TwiML: greet then listen
router.post('/twiml/connect', authMiddleware, (req, res) => {
  const baseUrl = process.env.BASE_URL;
  const greeting = req.query.greeting || req.body.greeting || 'Hello!';
  const callSid = req.body.CallSid;

  // Log greeting as assistant transcript
  const entry = callStore.get(callSid);
  if (entry) entry.addTranscript('assistant', greeting);

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ voice: 'Polly.Amy' }, greeting);

  // Listen for caller speech via <Gather>
  const gather = twiml.gather({
    input: 'speech',
    action: `${baseUrl}/api/calls/gather`,
    speechTimeout: 'auto',
    language: 'en-US',
  });

  // If no speech detected, keep the call alive and listen again
  twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

  res.type('text/xml');
  res.send(twiml.toString());
});

// POST /api/calls/twiml/listen - TwiML: just listen (no greeting)
router.post('/twiml/listen', authMiddleware, (req, res) => {
  const baseUrl = process.env.BASE_URL;
  const twiml = new twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    input: 'speech',
    action: `${baseUrl}/api/calls/gather`,
    speechTimeout: 'auto',
    language: 'en-US',
  });

  // If no speech, loop back and keep listening
  twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

  res.type('text/xml');
  res.send(twiml.toString());
});

// POST /api/calls/gather - Twilio sends caller's speech here
router.post('/gather', authMiddleware, (req, res) => {
  const { CallSid, SpeechResult, Confidence } = req.body;
  const baseUrl = process.env.BASE_URL;

  const entry = callStore.get(CallSid);
  if (entry && SpeechResult) {
    entry.addTranscript('caller', SpeechResult);
    console.log(`[transcript] caller: "${SpeechResult}" (confidence: ${Confidence})`);
  }

  // After capturing speech, keep listening
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.redirect(`${baseUrl}/api/calls/twiml/listen`);

  res.type('text/xml');
  res.send(twiml.toString());
});

// POST /api/calls/status - Twilio status callback
router.post('/status', authMiddleware, (req, res) => {
  const { CallSid, CallStatus } = req.body;
  const entry = callStore.get(CallSid);
  if (entry) {
    entry.status = CallStatus;
    if (['completed', 'failed', 'canceled', 'no-answer', 'busy'].includes(CallStatus)) {
      entry.endedAt = new Date().toISOString();
    }
  }
  res.sendStatus(200);
});

// GET /api/calls/:callSid - Get call state and transcript
router.get('/:callSid', authMiddleware, (req, res) => {
  const entry = callStore.get(req.params.callSid);
  if (!entry) return res.status(404).json({ error: 'Call not found' });

  res.json({
    callSid: req.params.callSid,
    status: entry.status,
    transcript: entry.transcript,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
  });
});

// POST /api/calls/:callSid/say - Speak words to the caller
router.post('/:callSid/say', authMiddleware, async (req, res) => {
  const { text, voice } = req.body;
  if (!text) return res.status(400).json({ error: '"text" is required' });

  const entry = callStore.get(req.params.callSid);
  if (!entry) return res.status(404).json({ error: 'Call not found' });

  try {
    const baseUrl = process.env.BASE_URL;

    // Update the call: say the text, then go back to listening
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: voice || 'Polly.Amy' }, text);

    const gather = twiml.gather({
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

    res.json({ status: 'speaking', text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calls/:callSid/hangup - End the call
router.post('/:callSid/hangup', authMiddleware, async (req, res) => {
  try {
    await client.calls(req.params.callSid).update({ status: 'completed' });
    res.json({ status: 'ended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
