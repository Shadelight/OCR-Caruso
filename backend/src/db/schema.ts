import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// En producción se usa Turso (libSQL remoto). En desarrollo, si no hay
// TURSO_DATABASE_URL, caemos a un archivo SQLite local (compatible con libSQL).
const remoteUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

let url: string;
if (remoteUrl) {
  url = remoteUrl;
} else {
  const localPath = process.env.DB_PATH || './data/caruso.db';
  const resolved = path.resolve(localPath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  url = `file:${resolved}`;
}

const db: Client = createClient(
  authToken ? { url, authToken } : { url },
);

/**
 * Crea las tablas si no existen y aplica migraciones suaves.
 * Debe llamarse (y esperarse) antes de levantar el servidor.
 */
export async function initDb(): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS tiendas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre        TEXT    NOT NULL,
      telefono      TEXT,
      observaciones TEXT,
      createdAt     TEXT    NOT NULL DEFAULT (datetime('now')),
      updatedAt     TEXT    NOT NULL DEFAULT (datetime('now'))
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
      costoPieza      REAL    NOT NULL DEFAULT 0,
      manoDeObra      REAL    NOT NULL DEFAULT 0,
      otrosCostos     REAL    NOT NULL DEFAULT 0,
      observaciones   TEXT,
      estado          TEXT    NOT NULL DEFAULT 'RECIBIDO',
      imagenRuta      TEXT,
      createdAt       TEXT    NOT NULL DEFAULT (datetime('now')),
      updatedAt       TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ─── Migración suave: agregar columnas nuevas a bases preexistentes ──────────
  try {
    const cols = await db.execute(`PRAGMA table_info(equipos)`);
    const existentes = new Set(cols.rows.map((c) => (c as any).name as string));

    const nuevas: Array<{ name: string; ddl: string }> = [
      { name: 'imei2', ddl: 'ADD COLUMN imei2 TEXT' },
      { name: 'costoPieza', ddl: 'ADD COLUMN costoPieza REAL NOT NULL DEFAULT 0' },
      { name: 'manoDeObra', ddl: 'ADD COLUMN manoDeObra REAL NOT NULL DEFAULT 0' },
      { name: 'otrosCostos', ddl: 'ADD COLUMN otrosCostos REAL NOT NULL DEFAULT 0' },
    ];

    for (const col of nuevas) {
      if (!existentes.has(col.name)) {
        await db.execute(`ALTER TABLE equipos ${col.ddl}`);
        console.log(`[DB] Migración aplicada: equipos.${col.name}`);
      }
    }
  } catch (err) {
    console.warn('[DB] Error en migración de columnas:', err);
  }
}

export default db;
