import { getDb } from "../db.js";
import jwt from "jsonwebtoken";

let JWT_SECRET = process.env.JWT_SECRET;
if(JWT_SECRET === undefined) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("JWT_SECRET environment variable is required in production");
  } else {
    console.warn("Warning: JWT_SECRET is not set. Using default secret for development.");
    JWT_SECRET = "dev_secret";
  }
}

export async function authMiddleware(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }
  // Strip "Bearer " from auth to get token
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const result = db.exec("SELECT * FROM users WHERE id = ?", [payload.id]);
    if (!result.length) return res.status(401).json({ message: "User not found" });
    const row = result[0].values[0];
    const user = { id: row[0], name: row[1], email: row[2], quota: row[4] };
    if (user.quota <= 0) {
      return res.status(429).json({ message: "API quota exceeded. Please contact support or wait for quota reset." });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export { JWT_SECRET };
