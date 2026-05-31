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

  try {
    const result = await extractImeiFromImage(req.file.buffer);
    const imagenRuta = await saveImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );
    res.json({
      candidatos: result.candidatos,
      textoCompleto: result.textoCompleto,
      imagenRuta,
    });
  } catch (err) {
    console.error('[OCR Error]', err);
    res.status(500).json({ error: 'Error al procesar la imagen con OCR.' });
  }
});

export default router;
