import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload.middleware';
import { extractImeiFromImage } from '../services/ocr.service';
import { saveImage } from '../services/storage.service';

const router = Router();

function publicImageUrl(req: Request, imagenRuta: string): string {
  if (/^https?:\/\//i.test(imagenRuta)) return imagenRuta;
  if (!imagenRuta.startsWith('/')) return imagenRuta;

  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get('host')}${imagenRuta}`;
}

router.post('/extract-imei', upload.single('imagen'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    return;
  }

  // Log de entrada: así se ve qué manda cámara vs galería (mime, nombre, peso).
  console.log('[OCR] recibido', JSON.stringify({
    mime: req.file.mimetype,
    name: req.file.originalname,
    sizeKB: Math.round(req.file.size / 1024),
  }));

  try {
    const result = await extractImeiFromImage(req.file.buffer);

    let imagenRuta: string;
    try {
      imagenRuta = await saveImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
    } catch (err) {
      console.error('[OCR] saveImage falló:', err);
      res.status(500).json({
        error: 'Se detectaron los IMEIs, pero no se pudo guardar la foto. Intenta de nuevo antes de registrar el equipo.',
      });
      return;
    }

    res.json({
      candidatos: result.candidatos,
      textoCompleto: result.textoCompleto,
      imagenRuta: publicImageUrl(req, imagenRuta),
      debug: result.debug,
    });
  } catch (err) {
    console.error('[OCR Error]', err);
    res.status(500).json({ error: 'Error al procesar la imagen con OCR.' });
  }
});

export default router;
