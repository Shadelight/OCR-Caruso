import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload.middleware';
import { extractImeiFromImage } from '../services/ocr.service';
import { saveImage } from '../services/storage.service';

const router = Router();

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
    // Si falla el guardado (Supabase caído/pausado), el OCR ya se hizo:
    // se responde sin imagen en vez de tirar todo el request a 500.
    let imagenRuta = '';
    try {
      imagenRuta = await saveImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );
    } catch (err) {
      console.warn('[OCR] saveImage falló (se responde sin imagen):', err);
    }
    res.json({
      candidatos: result.candidatos,
      textoCompleto: result.textoCompleto,
      imagenRuta,
      debug: result.debug,
    });
  } catch (err) {
    console.error('[OCR Error]', err);
    res.status(500).json({ error: 'Error al procesar la imagen con OCR.' });
  }
});

export default router;
