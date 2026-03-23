import sql from "sql.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(import.meta.dirname, '..', 'database.db');

let db;

export async function getDb() {
  if (db) return db;

  const SQL = await sql();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  save();
  return db;
}

export function save() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}
