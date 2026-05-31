import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import ocrRoutes from './routes/ocr.routes';
import equiposRoutes from './routes/equipos.routes';
import tiendasRoutes from './routes/tiendas.routes';
import { ensureSheetHeaders } from './services/sheets.service';
import { initDb } from './db/schema';
import { usingCloudStorage } from './services/storage.service';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// CORS: en producción se limita a los orígenes de FRONTEND_ORIGIN
// (separados por coma). Sin la variable (dev), se permite cualquier origen.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length > 0
      ? { origin: allowedOrigins }
      : {},
  ),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes solo cuando se guardan en disco local (dev sin Supabase).
if (!usingCloudStorage) {
  app.use('/uploads', express.static(path.resolve('./uploads')));
}

// Rutas API
app.use('/api/ocr', ocrRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/tiendas', tiendasRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[Server] Corriendo en http://localhost:${PORT}`);
    console.log(
      `[Storage] Imágenes en ${usingCloudStorage ? 'Supabase Storage' : 'disco local (/uploads)'}`,
    );
    ensureSheetHeaders().catch((e) =>
      console.warn('[Sheets] No se pudo inicializar cabeceras:', e.message),
    );
  });
}

start().catch((err) => {
  console.error('[Server] Error al iniciar:', err);
  process.exit(1);
});
