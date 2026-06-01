import multer from 'multer';

// Almacenamiento en memoria: el buffer se procesa con OCR y luego se sube
// al almacenamiento de imágenes (Supabase en prod, disco en dev). Así no
// dependemos del disco efímero de los hosts gratuitos.
const storage = multer.memoryStorage();

// Extensiones de imagen conocidas (incluye HEIC/HEIF/AVIF que mandan los móviles).
const KNOWN_EXT = /\.(jpe?g|png|gif|bmp|webp|tiff?|heic|heif|avif)$/i;

// La cámara de Android/iOS a veces manda:
//   - mimetype "image/heic" / "image/heif"
//   - originalname genérico o SIN extensión (ej. "image", "blob")
// El filtro anterior exigía extensión Y mime del allowlist y rechazaba esos
// casos → 500 "Error al procesar la imagen". Ahora aceptamos si CUALQUIERA
// indica imagen; sharp (con libheif) decodifica HEIC sin problema.
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mime = (file.mimetype || '').toLowerCase();
  const name = file.originalname || '';
  const ok = mime.startsWith('image/') || KNOWN_EXT.test(name);
  if (ok) cb(null, true);
  else cb(new Error('El archivo no parece una imagen.'));
};

export const upload = multer({
  storage,
  fileFilter,
  // Fotos de cámara de gama alta (48-108 MP) pueden superar 10 MB si el
  // cliente no alcanzó a reducirlas. Subimos el techo para no rechazarlas.
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});
