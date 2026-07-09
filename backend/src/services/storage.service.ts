import path from 'path';
import fs from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// Almacenamiento de imágenes
//   - PROD: Supabase Storage (bucket público) si hay credenciales.
//   - DEV:  disco local en ./uploads (servido por Express en /uploads).
// `saveImage` devuelve la "imagenRuta" a guardar en la DB:
//   - URL pública completa (Supabase), o
//   - ruta relativa "/uploads/archivo.png" (disco local).
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'ocr-imagenes';

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

export const usingCloudStorage = supabase !== null;

function buildFilename(originalName: string): string {
  const ext = path.extname(originalName) || '.png';
  return `ocr_${Date.now()}${ext}`;
}

async function saveLocalImage(filename: string, buffer: Buffer): Promise<string> {
  const uploadsDir = path.resolve('./uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function saveImage(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
): Promise<string> {
  const filename = buildFilename(originalName);

  if (supabase) {
    try {
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filename, buffer, { contentType: mimetype, upsert: false });
      if (error) {
        throw new Error(error.message);
      }
      const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename);
      return data.publicUrl;
    } catch (err) {
      console.warn('[Storage] Supabase falló; usando disco local:', err);
      return saveLocalImage(filename, buffer);
    }
  }

  // Fallback local (desarrollo)
  return saveLocalImage(filename, buffer);
}
