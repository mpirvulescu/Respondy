import express from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDb, saveDb } from "../db.js";
import { authMiddleware, JWT_SECRET } from "../middleware/auth.js";
import { sendMail } from "../mail.js";

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
  const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  saveDb();
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

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const db = await getDb();
  const result = db.exec("SELECT * FROM users WHERE email = ?", [email]);

  // Always return success to prevent email enumeration
  if (!result.length) {
    return res.json({ message: "If that email exists, a reset link has been sent." });
  }

  const row = result[0].values[0];
  const userId = row[0];

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  db.run(
    "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt]
  );
  saveDb();

  const resetUrl = `${process.env.CLIENT_ORIGIN || process.env.BASE_URL}/reset-password?token=${token}`;

  try {
    await sendMail({
      to: email,
      subject: "Password Reset — Respondy",
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      html: [
        `<p>Click the link below to reset your password:</p>`,
        `<p><a href="${resetUrl}">${resetUrl}</a></p>`,
        `<p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      ].join(""),
    });
  } catch (err) {
    console.error("Failed to send reset email:", err.message);
  }

  res.json({ message: "If that email exists, a reset link has been sent." });
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required" });
  }

  const db = await getDb();
  const result = db.exec(
    "SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime('now')",
    [token]
  );

  if (!result.length) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  const resetRow = result[0].values[0];
  const userId = resetRow[1]; // user_id column

  const hash = await bcrypt.hash(password, 10);
  db.run("UPDATE users SET password = ? WHERE id = ?", [hash, userId]);

  // Delete all reset tokens for this user
  db.run("DELETE FROM password_resets WHERE user_id = ?", [userId]);
  saveDb();

  res.json({ message: "Password has been reset. You can now log in." });
});

export default router;
