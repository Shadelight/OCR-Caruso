import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { OcrResult } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Detección de IMEIs
// ─────────────────────────────────────────────────────────────────────────────

// Etiqueta "IMEI" / "IMEI1" / "IMEI2" / "MEID" seguida de dígitos con posibles
// separadores (iOS los muestra como "35 437977 844076 8"). Capturamos también
// la etiqueta para poder ordenar IMEI antes que IMEI2.
// OJO: NO usar `IMEI\s*\d?` porque ambiguamente consume el primer dígito del
// valor como parte de la etiqueta.
const IMEI_LABEL_REGEX = /\b(IMEI[12]?|MEID)\b\s*[:\-]?\s*([\d][\d\s\-\.]{13,30}\d)/gi;

// Secuencia de 15 dígitos con posibles separadores espacio/guion/punto.
const IMEI_SPACED_REGEX = /(?<!\d)(?:\d[\s\-\.]?){14}\d(?!\d)/g;

// Secuencia pura de 15 dígitos consecutivos.
const IMEI_PLAIN_REGEX = /(?<!\d)(\d{15})(?!\d)/g;

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Validador de IMEI según algoritmo Luhn (dígito de control).
 * Acepta solo cadenas de exactamente 15 dígitos.
 */
function luhnCheck(imei: string): boolean {
  if (imei.length !== 15) return false;
  let sum = 0;
  let alternate = false;
  for (let i = imei.length - 1; i >= 0; i--) {
    const n = parseInt(imei[i], 10);
    if (Number.isNaN(n)) return false;
    let v = n;
    if (alternate) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * ¿Es un IMEI "confiable"?
 *   - exactamente 15 dígitos
 *   - empieza con "35" (TAC más común en smartphones)
 *   - pasa el check de Luhn
 * Esto descarta basura OCR, números al azar y fragmentos del EID.
 */
function isTrustedImei(digits: string): boolean {
  return digits.length === 15 && digits.startsWith('35') && luhnCheck(digits);
}

function addCandidate(
  list: string[],
  seen: Set<string>,
  raw: string,
): void {
  const digits = onlyDigits(raw);

  const pushIfNew = (d: string) => {
    if (isTrustedImei(d) && !seen.has(d)) {
      seen.add(d);
      list.push(d);
    }
  };

  if (digits.length === 15) {
    pushIfNew(digits);
  } else if (digits.length > 15) {
    // El OCR puede juntar dígitos de otras líneas.
    // Probamos ventanas de 15 y nos quedamos con las que pasan nuestro filtro.
    for (let i = 0; i + 15 <= digits.length; i++) {
      pushIfNew(digits.slice(i, i + 15));
    }
  }
}

/**
 * Devuelve la "prioridad" de una etiqueta encontrada:
 *   0 = IMEI (sin número) → IMEI1
 *   1 = IMEI2            → IMEI2
 *   2 = MEID u otra      → después
 */
function labelPriority(label: string): number {
  const l = label.toUpperCase().replace(/\s+/g, '');
  if (l === 'IMEI' || l === 'IMEI1') return 0;
  if (l === 'IMEI2') return 1;
  return 2;
}

/**
 * Extrae IMEIs candidatos del texto OCR. El orden devuelto es:
 *   IMEI (1) → IMEI2 → otros detectados.
 * Esto hace que el primer candidato coincida con "IMEI 1" en la UI.
 */
function extractCandidates(text: string): string[] {
  // Lista con prioridad por etiqueta
  const labeled: Array<{ imei: string; prio: number; order: number }> = [];
  const seen = new Set<string>();

  let order = 0;

  // 1) Etiqueta IMEI / IMEI2 / MEID — prioridad explícita
  for (const m of text.matchAll(IMEI_LABEL_REGEX)) {
    const etiqueta = m[1];
    const valor = m[2];
    const prio = labelPriority(etiqueta);

    const tmp: string[] = [];
    const tmpSeen = new Set<string>();
    addCandidate(tmp, tmpSeen, valor);
    for (const d of tmp) {
      if (!seen.has(d)) {
        seen.add(d);
        labeled.push({ imei: d, prio, order: order++ });
      }
    }
  }

  // 2) 15 dígitos con separadores (sin etiqueta → prio 3)
  for (const m of text.matchAll(IMEI_SPACED_REGEX)) {
    const tmp: string[] = [];
    const tmpSeen = new Set<string>();
    addCandidate(tmp, tmpSeen, m[0]);
    for (const d of tmp) {
      if (!seen.has(d)) {
        seen.add(d);
        labeled.push({ imei: d, prio: 3, order: order++ });
      }
    }
  }

  // 3) 15 dígitos consecutivos (prio 4)
  for (const m of text.matchAll(IMEI_PLAIN_REGEX)) {
    const tmp: string[] = [];
    const tmpSeen = new Set<string>();
    addCandidate(tmp, tmpSeen, m[1]);
    for (const d of tmp) {
      if (!seen.has(d)) {
        seen.add(d);
        labeled.push({ imei: d, prio: 4, order: order++ });
      }
    }
  }

  labeled.sort((a, b) => a.prio - b.prio || a.order - b.order);
  return labeled.map((x) => x.imei);
}

// ─────────────────────────────────────────────────────────────────────────────
// Preprocesamiento de imagen
// ─────────────────────────────────────────────────────────────────────────────

type PreprocessVariant = {
  name: string;
  rotation: 0 | 90 | 180 | 270;
  apply: (s: sharp.Sharp) => sharp.Sharp;
};

/**
 * Generamos combinaciones de rotación + pipeline. Para fotos tomadas con
 * el teléfono acostado o al revés, la única forma de que Tesseract lea
 * correctamente es probar cada rotación.
 */
function buildVariants(): PreprocessVariant[] {
  const pipelines: Array<{ name: string; apply: PreprocessVariant['apply'] }> = [
    {
      name: 'contrast_threshold',
      apply: (s) =>
        s
          .resize({ width: 2400, withoutEnlargement: false })
          .grayscale()
          .normalize()
          .linear(1.3, -30)
          .threshold(170),
    },
    {
      name: 'gray_sharpen',
      apply: (s) =>
        s
          .resize({ width: 2000, withoutEnlargement: false })
          .grayscale()
          .normalize()
          .sharpen(),
    },
  ];

  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 270, 180];

  const variants: PreprocessVariant[] = [];
  for (const rot of rotations) {
    for (const p of pipelines) {
      variants.push({
        name: `${p.name}_r${rot}`,
        rotation: rot,
        apply: p.apply,
      });
    }
  }
  return variants;
}

async function preprocessVariant(
  imagePath: string,
  variant: PreprocessVariant,
): Promise<string> {
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath);
  const base = path.basename(imagePath, ext);
  const outPath = path.join(dir, `${base}__pp_${variant.name}.png`);

  // sharp(...).rotate() sin argumentos respeta EXIF.
  // rotate(90/180/270) aplica rotación explícita sobre la imagen.
  const base$ = sharp(imagePath).rotate(); // aplica EXIF primero
  const rotated =
    variant.rotation === 0 ? base$ : base$.rotate(variant.rotation);
  const pipeline = variant.apply(rotated);

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

// ─────────────────────────────────────────────────────────────────────────────
// Entrypoint
// ─────────────────────────────────────────────────────────────────────────────

export async function extractImeiFromImage(imagePath: string): Promise<OcrResult> {
  const variants = buildVariants();
  const archivosTmp: string[] = [];
  const textos: string[] = [];

  // PSM 6 (bloque uniforme) funciona mejor para pantallas tipo "About".
  const psms = [6];

  let detectados: string[] = [];

  outer: for (const variant of variants) {
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

    // Early exit: si ya tenemos al menos 1 IMEI confiable, seguimos probando
    // solo hasta completar 2 (IMEI + IMEI2) o agotar variantes.
    detectados = extractCandidates(textos.join('\n'));
    if (detectados.length >= 2) break outer;
  }

  // Fallback: si no encontramos nada con preprocess, probar imagen cruda
  if (detectados.length === 0) {
    try {
      textos.push(await runTesseract(imagePath, 6));
      detectados = extractCandidates(textos.join('\n'));
    } catch (err) {
      console.warn('[OCR] fallback original falló:', err);
    }
  }

  const textoCompleto = textos.join('\n');

  // Limpieza de archivos temporales
  for (const f of archivosTmp) {
    fs.unlink(f, () => {});
  }

  return { candidatos: detectados, textoCompleto };
}
