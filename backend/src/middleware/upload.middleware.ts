import multer from 'multer';
import path from 'path';

// Almacenamiento en memoria: el buffer se procesa con OCR y luego se sube
// al almacenamiento de imágenes (Supabase en prod, disco en dev). Así no
// dependemos del disco efímero de los hosts gratuitos.
const storage = multer.memoryStorage();

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|gif|bmp|webp|tiff/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpg, png, bmp, tiff, webp)'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
