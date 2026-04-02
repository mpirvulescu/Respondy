import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDb, saveDb } from "../db.js";
import { authMiddleware, JWT_SECRET } from "../middleware/auth.js"

const router = express.Router();

const INITIAL_QUOTA = 20;

// POST /api/auth/register
router.post("/register", async (req, res) => {
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

// POST /api/auth/login
router.post("/login", async (req, res) => {
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

// POST /api/auth/logout
// JWT is annoying to revoke, but we don't need to
router.post("/logout", authMiddleware, (req, res) => {
  res.json({ message: "Logged out" });
});

export default router;
