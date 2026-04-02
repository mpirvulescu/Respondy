import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDb, saveDb } from "../db.js";
import { promptGuard } from "../middleware/promptGuard.js";
import { authMiddleware, JWT_SECRET } from "../middleware/auth.js"

export const router = express.Router();

function decrementQuota(db, userId) {
  db.run('UPDATE users SET quota = quota - 1 WHERE id = ?', [userId]);
}

const INITIAL_QUOTA = 20;

// --- Auth Routes ---
// Register
router.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  const db = await getDb();
  const exists = db.exec("SELECT * FROM users WHERE email = ?", [email]);
  if (exists.length) {
    return res.status(400).json({ message: "Email already registered" });
  }
  const hash = await bcrypt.hash(password, 10);
  db.run(
    "INSERT INTO users (name, email, password, quota) VALUES (?, ?, ?, ?)",
    [name, email, hash, INITIAL_QUOTA]
  );
  saveDb();
  const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  const user = { id, name, email };
  const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({ user, token });
});

// Login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const db = await getDb();
  const result = db.exec("SELECT * FROM users WHERE email = ?", [email]);
  if (!result.length) {
    return res.status(400).json({ message: "Incorrect email or password" });
  }
  const row = result[0].values[0];
  const valid = await bcrypt.compare(password, row[3]);
  if (!valid) {
    return res.status(400).json({ message: "Incorrect email or password" });
  }
  const user = { id: row[0], name: row[1], email: row[2] };
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ user, token });
});

// Logout
// JWT is annoying to revoke, so we don't
router.post("/auth/logout", authMiddleware, (req, res) => {
  res.json({ message: "Logged out" });
});

// GET all items (auth required)
router.get('/items', authMiddleware, async (req, res) => {
  const db = await getDb();
  const results = db.exec('SELECT * FROM items ORDER BY created_at DESC');
  const items = results.length
    ? results[0].values.map(row => ({ id: row[0], name: row[1], created_at: row[2] }))
    : [];
  res.json(items);
});

// GET single item (auth required)
router.get('/items/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
  stmt.bind([Number(req.params.id)]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    saveDb();
    res.json({ id: row[0], name: row[1], created_at: row[2] });
  } else {
    stmt.free();
    res.status(404).json({ error: 'Item not found' });
  }
});

// POST new item (auth required, decrements quota)
router.post('/items', authMiddleware, promptGuard(['name']), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = await getDb();
  db.run('INSERT INTO items (name) VALUES (?)', [name]);
  decrementQuota(db, req.user.id);
  saveDb();

  const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  const result = db.exec('SELECT * FROM items WHERE id = ?', [id]);
  const row = result[0].values[0];
  res.status(201).json({ id: row[0], name: row[1], created_at: row[2] });
});

// PUT update item (auth required, decrements quota)
router.put('/items/:id', authMiddleware, promptGuard(['name']), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = await getDb();
  const check = db.exec('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!check.length) return res.status(404).json({ error: 'Item not found' });

  db.run('UPDATE items SET name = ? WHERE id = ?', [name, Number(req.params.id)]);
  decrementQuota(db, req.user.id);
  saveDb();

  const result = db.exec('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  const row = result[0].values[0];
  res.json({ id: row[0], name: row[1], created_at: row[2] });
});

// DELETE item (auth required, decrements quota)
router.delete('/items/:id', authMiddleware, async (req, res) => {
  const db = await getDb();
  const check = db.exec('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!check.length) return res.status(404).json({ error: 'Item not found' });

  db.run('DELETE FROM items WHERE id = ?', [Number(req.params.id)]);
  decrementQuota(db, req.user.id);
  saveDb();

  res.json({ message: 'Item deleted' });
});
