import express from 'express';
import {authMiddleware} from '../middleware/auth.js';
import {getDb} from '../db.js';
import {callStore} from '../callStore.js';
import {getSystemPrompt, setSystemPrompt} from '../systemPrompt.js';

const router = express.Router();

function adminOnly(req, res, next) {
   if (req.user.role !== 'admin') {
      return res.status(403).json({message: 'Admin access required'});
   }
   next();
}

// GET /api/admin/stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
   const db = await getDb();

   const usersResult = db.exec(
      'SELECT id, name, email, role, quota, 20 - quota AS api_calls_used FROM users',
   );
   const users = (usersResult[0]?.values || []).map((row) => ({
      id: row[0],
      name: row[1],
      email: row[2],
      role: row[3],
      quota: row[4],
      api_calls_used: row[5],
   }));

   // Attach calls per user
   for (const u of users) {
      u.calls = await callStore.listByUser(u.id);
   }

   const allCalls = await callStore.listAll();
   const totalUsers = users.length;
   const totalCalls = allCalls.length;

   res.json({totalUsers, totalCalls, callsByUser: users});
});

// GET /api/admin/calls - All calls with transcripts
router.get('/calls', authMiddleware, adminOnly, async (req, res) => {
   const calls = await callStore.listAll();
   res.json({calls});
});

// GET /api/admin/injections
router.get('/injections', authMiddleware, adminOnly, async (req, res) => {
   const db = await getDb();
   const result = db.exec(
      'SELECT id, user_id, input_text, classification, score, created_at FROM injection_logs ORDER BY created_at DESC',
   );
   const logs = (result[0]?.values || []).map((row) => ({
      id: row[0],
      user_id: row[1],
      input_text: row[2],
      classification: row[3],
      score: row[4],
      created_at: row[5],
   }));

   res.json({logs});
});

// GET /api/admin/system-prompt
router.get('/system-prompt', authMiddleware, adminOnly, (req, res) => {
   res.json({systemPrompt: getSystemPrompt()});
});

// PUT /api/admin/system-prompt
router.put('/system-prompt', authMiddleware, adminOnly, (req, res) => {
   const {systemPrompt} = req.body;
   if (typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
      return res.status(400).json({message: 'systemPrompt is required'});
   }
   setSystemPrompt(systemPrompt.trim());
   res.json({systemPrompt: getSystemPrompt()});
});

export default router;
