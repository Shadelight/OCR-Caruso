import Tesseract from 'tesseract.js';
import sharp from 'sharp';
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

type Rotation = 0 | 90 | 180 | 270;

type Pipeline = {
  name: string;
  apply: (s: sharp.Sharp) => sharp.Sharp;
};

// El cliente ya manda imágenes ≤1600px; trabajar a 1500 alcanza de sobra para
// leer 15 dígitos y es mucho más barato que reescalar a 2000-2400.
const OCR_WIDTH = 1500;

// Pipeline primaria (la que mejor lee pantallas tipo "Información") y la
// secundaria (rescata casos de bajo contraste / fotos movidas).
const PIPELINE_PRIMARY: Pipeline = {
  name: 'contrast_threshold',
  apply: (s) =>
    s
      .resize({ width: OCR_WIDTH, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .linear(1.3, -30)
      .threshold(170),
};

const PIPELINE_SECONDARY: Pipeline = {
  name: 'gray_sharpen',
  apply: (s) =>
    s
      .resize({ width: OCR_WIDTH, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen(),
};

// Contraste local adaptativo (CLAHE) + threshold: rescata fotos con sombra /
// reflejo / bajo contraste donde el threshold GLOBAL borra los dígitos. CLAHE
// ecualiza el contraste por regiones antes de binarizar. Es un tier de FALLBACK
// (sólo corre si las pipelines primarias no leyeron nada): sobre fotos nítidas
// sobre-ecualiza, pero ahí ni se usa.
const PIPELINE_CLAHE: Pipeline = {
  name: 'clahe_local',
  apply: (s) =>
    s
      .resize({ width: 1800, withoutEnlargement: false })
      .grayscale()
      .clahe({ width: 80, height: 80 })
      .threshold(150),
};

async function preprocess(
  input: Buffer,
  rotation: Rotation,
  pipeline: Pipeline,
): Promise<Buffer> {
  // sharp(...).rotate() sin argumentos respeta EXIF.
  // rotate(90/180/270) aplica rotación explícita sobre la imagen.
  const base$ = sharp(input).rotate(); // aplica EXIF primero
  const rotated = rotation === 0 ? base$ : base$.rotate(rotation);
  return pipeline.apply(rotated).toFormat('png').toBuffer();
}

async function runTesseract(image: Buffer, psm: number): Promise<string> {
  const { data } = await Tesseract.recognize(image, 'eng', {
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

/**
 * OCR por tiers. Las rotaciones (90/180/270) sólo sirven si la foto está
 * acostada o al revés; si la rotación 0 ya leyó un IMEI confiable, la imagen
 * está derecha y rotarla no aporta. Esto da:
 *   - caso común (foto derecha, 1-2 IMEIs) → 1-2 pasadas de Tesseract
 *   - caso difícil (foto rotada / sin lectura) → cae a todas las rotaciones,
 *     igual que el comportamiento anterior (no-regresión).
 *
 * PSM 6 (bloque uniforme) funciona mejor para pantallas tipo "Información".
 */
// Presupuesto total de la cascada. En Render free (~0.1 vCPU) cada pasada de
// Tesseract puede tardar 10-30 s; sin tope, una foto difícil (hasta ~10
// pasadas) supera los ~100 s del proxy y el cliente recibe error aunque el
// OCR "siga trabajando". Superado el budget no se inician pasadas nuevas y se
// responde con lo acumulado hasta ahí.
const OCR_BUDGET_MS = Number(process.env.OCR_BUDGET_MS) || 60_000;

export async function extractImeiFromImage(imageBuffer: Buffer): Promise<OcrResult> {
  const t0 = Date.now();
  const textos: string[] = [];
  let detectados: string[] = [];
  let passes = 0;
  let resolved = 'ninguno';

  // Metadata de entrada (para logs/diagnóstico: formato, dims, orientación EXIF).
  let meta: { format?: string; width?: number; height?: number; orientation?: number } = {};
  try {
    const m = await sharp(imageBuffer).metadata();
    meta = { format: m.format, width: m.width, height: m.height, orientation: m.orientation };
  } catch { /* sigue igual */ }

  // Corre una variante (rotación + pipeline), acumula texto y recalcula candidatos.
  const pass = async (rotation: Rotation, pipeline: Pipeline): Promise<void> => {
    if (Date.now() - t0 > OCR_BUDGET_MS) {
      if (resolved === 'ninguno') resolved = 'budget_agotado';
      return;
    }
    passes++;
    try {
      const ppBuffer = await preprocess(imageBuffer, rotation, pipeline);
      const t = await runTesseract(ppBuffer, 6);
      if (t && t.trim().length > 0) textos.push(t);
      detectados = extractCandidates(textos.join('\n'));
      if (detectados.length > 0) resolved = `${pipeline.name}_r${rotation}`;
    } catch (err) {
      console.warn(`[OCR] falló ${pipeline.name}_r${rotation}:`, err);
    }
  };

  // ── Tier 1: rotación 0 (caso común: foto derecha) ───────────────────────
  await pass(0, PIPELINE_PRIMARY);                              // nítido / screenshot
  if (detectados.length < 2) await pass(0, PIPELINE_SECONDARY); // foto normal
  if (detectados.length < 1) await pass(0, PIPELINE_CLAHE);     // sombra / bajo contraste

  // ── Tier 2: sólo si rotación 0 no leyó NADA → la foto está rotada ───────
  if (detectados.length === 0) {
    const rotations: Rotation[] = [180, 90, 270];
    outer: for (const rot of rotations) {
      for (const pipeline of [PIPELINE_PRIMARY, PIPELINE_SECONDARY]) {
        await pass(rot, pipeline);
        if (detectados.length >= 2) break outer;
      }
    }
  }

  // ── Fallback: imagen cruda sin preprocesar ──────────────────────────────
  if (detectados.length === 0 && Date.now() - t0 <= OCR_BUDGET_MS) {
    passes++;
    try {
      textos.push(await runTesseract(imageBuffer, 6));
      detectados = extractCandidates(textos.join('\n'));
      if (detectados.length > 0) resolved = 'raw';
    } catch (err) {
      console.warn('[OCR] fallback original falló:', err);
    }
  }

  const ms = Date.now() - t0;
  const debug = {
    format: meta.format,
    width: meta.width,
    height: meta.height,
    orientation: meta.orientation,
    passes,
    resolved,
    ms,
    imeis: detectados.length,
  };
  console.log('[OCR]', JSON.stringify(debug));

  return { candidatos: detectados, textoCompleto: textos.join('\n'), debug };
}
