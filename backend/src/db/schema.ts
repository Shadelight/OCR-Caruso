import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/caruso.db';
const resolvedPath = path.resolve(dbPath);
const dir = path.dirname(resolvedPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(resolvedPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tiendas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    telefono    TEXT,
    observaciones TEXT,
    createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
    updatedAt   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS equipos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fechaIngreso    TEXT    NOT NULL,
    imei            TEXT    NOT NULL,
    imei2           TEXT,
    modelo          TEXT    NOT NULL,
    clienteNombre   TEXT    NOT NULL,
    clienteTelefono TEXT,
    tiendaId        INTEGER REFERENCES tiendas(id) ON DELETE SET NULL,
    servicio        TEXT    NOT NULL,
    precio          REAL    NOT NULL DEFAULT 0,
    observaciones   TEXT,
    estado          TEXT    NOT NULL DEFAULT 'RECIBIDO',
    imagenRuta      TEXT,
    createdAt       TEXT    NOT NULL DEFAULT (datetime('now')),
    updatedAt       TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Migraciones suaves para bases ya existentes ─────────────────────────────
// Agregar columna imei2 si la base venía de la versión anterior.
try {
  const cols = db
    .prepare(`PRAGMA table_info(equipos)`)
    .all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'imei2')) {
    db.exec(`ALTER TABLE equipos ADD COLUMN imei2 TEXT`);
    console.log('[DB] Migración aplicada: equipos.imei2');
  }
} catch (err) {
  console.warn('[DB] Error en migración imei2:', err);
}

export default db;
