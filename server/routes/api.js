import express from "express";
import { getDb, save } from "../db.js";
import { promptGuard } from "../middleware/promptGuard.js";

export const router = express.Router();

// GET all items
router.get('/items', async (req, res) => {
  const db = await getDb();
  const results = db.exec('SELECT * FROM items ORDER BY created_at DESC');
  const items = results.length
    ? results[0].values.map(row => ({ id: row[0], name: row[1], created_at: row[2] }))
    : [];
  res.json(items);
});

// GET single item
router.get('/items/:id', async (req, res) => {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
  stmt.bind([Number(req.params.id)]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    res.json({ id: row[0], name: row[1], created_at: row[2] });
  } else {
    stmt.free();
    res.status(404).json({ error: 'Item not found' });
  }
});

// POST new item
router.post('/items', promptGuard(['name']), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = await getDb();
  db.run('INSERT INTO items (name) VALUES (?)', [name]);
  save();

  const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  const result = db.exec('SELECT * FROM items WHERE id = ?', [id]);
  const row = result[0].values[0];
  res.status(201).json({ id: row[0], name: row[1], created_at: row[2] });
});

// PUT update item
router.put('/items/:id', promptGuard(['name']), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const db = await getDb();
  const check = db.exec('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!check.length) return res.status(404).json({ error: 'Item not found' });

  db.run('UPDATE items SET name = ? WHERE id = ?', [name, Number(req.params.id)]);
  save();

  const result = db.exec('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  const row = result[0].values[0];
  res.json({ id: row[0], name: row[1], created_at: row[2] });
});

// DELETE item
router.delete('/items/:id', async (req, res) => {
  const db = await getDb();
  const check = db.exec('SELECT * FROM items WHERE id = ?', [Number(req.params.id)]);
  if (!check.length) return res.status(404).json({ error: 'Item not found' });

  db.run('DELETE FROM items WHERE id = ?', [Number(req.params.id)]);
  save();
  res.json({ message: 'Item deleted' });
});
