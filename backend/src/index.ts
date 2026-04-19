import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import ocrRoutes from './routes/ocr.routes';
import equiposRoutes from './routes/equipos.routes';
import tiendasRoutes from './routes/tiendas.routes';
import { ensureSheetHeaders } from './services/sheets.service';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir imágenes subidas
app.use('/uploads', express.static(path.resolve('./uploads')));

// Rutas API
app.use('/api/ocr', ocrRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/tiendas', tiendasRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Corriendo en http://localhost:${PORT}`);
  ensureSheetHeaders().catch((e) =>
    console.warn('[Sheets] No se pudo inicializar cabeceras:', e.message),
  );
});
