import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { OcrResult } from '../types';

// Busca una etiqueta "IMEI" / "IMEI2" / "MEID" seguida de dígitos que pueden tener
// espacios, guiones o puntos entre grupos (como los muestra iOS: "35 437977 844076 8").
// Capturamos hasta ~25 caracteres después de la etiqueta y luego limpiamos.
const IMEI_LABEL_REGEX = /\b(?:IMEI\s*\d?|MEID)\s*[:\-]?\s*([\d][\d\s\-\.]{13,30}\d)/gi;

// Secuencia de 15 dígitos que pueden estar separados por espacios/guiones/puntos.
// Requiere entre 12 y 20 caracteres totales para dar margen a los separadores.
const IMEI_SPACED_REGEX = /(?:(?<!\d)(?:\d[\s\-\.]?){14}\d(?!\d))/g;

// Secuencia pura de 15 dígitos consecutivos (fallback)
const IMEI_PLAIN_REGEX = /(?<!\d)(\d{15})(?!\d)/g;

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function luhnCheck(imei: string): boolean {
  if (imei.length !== 15) return false;
  let sum = 0;
  let alternate = false;
  for (let i = imei.length - 1; i >= 0; i--) {
    let n = parseInt(imei[i], 10);
    if (Number.isNaN(n)) return false;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function addCandidate(set: Set<string>, raw: string) {
  const digits = onlyDigits(raw);
  if (digits.length === 15) {
    set.add(digits);
  } else if (digits.length > 15) {
    // A veces OCR junta dígitos de otras líneas; probar ventanas de 15
    for (let i = 0; i + 15 <= digits.length; i++) {
      const slice = digits.slice(i, i + 15);
      if (luhnCheck(slice)) set.add(slice);
    }
  }
}

function extractCandidates(text: string): string[] {
  const candidates = new Set<string>();

  // 1) Buscar con etiqueta IMEI / IMEI2 / MEID (mayor prioridad)
  for (const match of text.matchAll(IMEI_LABEL_REGEX)) {
    addCandidate(candidates, match[1]);
  }

  // 2) Buscar secuencias de 15 dígitos con posibles separadores
  for (const match of text.matchAll(IMEI_SPACED_REGEX)) {
    addCandidate(candidates, match[0]);
  }

  // 3) Fallback: 15 dígitos consecutivos
  for (const match of text.matchAll(IMEI_PLAIN_REGEX)) {
    addCandidate(candidates, match[1]);
  }

  // Ordenar: primero los que pasan Luhn (más probables de ser IMEI reales)
  const arr = Array.from(candidates);
  arr.sort((a, b) => {
    const aValid = luhnCheck(a) ? 0 : 1;
    const bValid = luhnCheck(b) ? 0 : 1;
    return aValid - bValid;
  });

  return arr;
}

type PreprocessVariant = {
  name: string;
  /**
   * Devuelve un pipeline sharp ya configurado.
   * Se usa sharp(ruta).rotate() como base (respeta EXIF) antes de aplicar pasos.
   */
  apply: (s: sharp.Sharp) => sharp.Sharp;
};

const VARIANTS: PreprocessVariant[] = [
  // Esta variante es la que mejor detecta IMEIs en capturas/fotos de pantalla
  // tipo "About" de iOS/Android, donde los dígitos son chicos y de bajo contraste.
  {
    name: 'contrast_threshold',
    apply: (s) =>
      s
        .resize({ width: 2400, withoutEnlargement: false })
        .grayscale()
        .normalize()
        .linear(1.3, -30) // sube contraste
        .threshold(170),
  },
  // Variante más suave para capturas de pantalla "limpias" (screenshots directos)
  {
    name: 'gray_sharpen',
    apply: (s) =>
      s
        .resize({ width: 2000, withoutEnlargement: false })
        .grayscale()
        .normalize()
        .sharpen(),
  },
  // Threshold alternativo
  {
    name: 'threshold_soft',
    apply: (s) =>
      s
        .resize({ width: 2400, withoutEnlargement: false })
        .grayscale()
        .normalize()
        .threshold(150),
  },
];

async function preprocessVariant(
  imagePath: string,
  variant: PreprocessVariant
): Promise<string> {
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath);
  const base = path.basename(imagePath, ext);
  const outPath = path.join(dir, `${base}__pp_${variant.name}.png`);

  const pipeline = variant.apply(sharp(imagePath).rotate());
  await pipeline.toFormat('png').toFile(outPath);
  return outPath;
}

async function runTesseract(imagePath: string, psm: number): Promise<string> {
  const { data } = await Tesseract.recognize(imagePath, 'eng', {
    logger: () => {},
    // @ts-ignore - estos params son válidos en runtime
    tessedit_pageseg_mode: String(psm),
    preserve_interword_spaces: '1',
  } as any);
  return data.text || '';
}

export async function extractImeiFromImage(imagePath: string): Promise<OcrResult> {
  const textos: string[] = [];
  const archivosTmp: string[] = [];

  // PSM 6 (bloque uniforme de texto) es el que mejor anda para pantallas de "About"
  const psms = [6, 4];

  for (const variant of VARIANTS) {
    let ppPath: string | null = null;
    try {
      ppPath = await preprocessVariant(imagePath, variant);
      archivosTmp.push(ppPath);
    } catch (err) {
      console.warn(`[OCR] preprocess "${variant.name}" falló:`, err);
      continue;
    }

    for (const psm of psms) {
      try {
        const t = await runTesseract(ppPath, psm);
        if (t && t.trim().length > 0) textos.push(t);
      } catch (err) {
        console.warn(`[OCR] fallo con PSM ${psm} en ${variant.name}:`, err);
      }
    }

    // Early exit: si ya encontramos candidatos válidos, no seguimos probando
    const parcial = extractCandidates(textos.join('\n'));
    if (parcial.length > 0 && luhnCheck(parcial[0])) {
      break;
    }
  }

  // Fallback: si todo lo anterior falló, probar con la imagen original
  if (textos.length === 0) {
    try {
      textos.push(await runTesseract(imagePath, 6));
    } catch (err) {
      console.warn('[OCR] fallback original falló:', err);
    }
  }

  const texto = textos.join('\n');
  const candidatos = extractCandidates(texto);

  // Limpieza de archivos temporales
  for (const f of archivosTmp) {
    fs.unlink(f, () => {});
  }

  return { candidatos, textoCompleto: texto };
}
