// Generador de iconos PWA (concepto D: iPhone con lente-scanner).
// Fuente única = el SVG de abajo. Rasteriza a los PNG que usa el manifest.
//
// Requiere `sharp`. Como el frontend no lo trae como dependencia, reusamos el
// que ya está instalado en el backend. Corré:  npm run gen-icons

import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);

function loadSharp() {
  try {
    return require('sharp');
  } catch {
    // Fallback: el sharp del backend.
    const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend', 'node_modules', 'sharp');
    return require(backend);
  }
}
const sharp = loadSharp();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');

const BG = '#15181e';
const STROKE = '#cbd5e1';
const ACCENT = '#3b82f6';

// Dibuja el símbolo (teléfono + lente + esquinas de visor) centrado en un
// lienzo de 512, escalado por `s` (1 = full bleed, <1 = safe-zone maskable).
function symbol(s) {
  const cx = 256;
  const cy = 256;
  // Teléfono
  const pw = 196 * s;
  const ph = 360 * s;
  const px = cx - pw / 2;
  const py = cy - ph / 2;
  const prx = 42 * s;
  const sw = 15 * s;
  // Lente
  const r = 62 * s;
  const rInner = 22 * s;
  const lensSw = 17 * s;
  // Esquinas de visor (brackets) cerca de las esquinas del teléfono
  const m = 30 * s; // separación desde el borde del teléfono
  const len = 26 * s;
  const cSw = 13 * s;
  const lx = px + m;
  const rx = px + pw - m;
  const ty = py + m;
  const by = py + ph - m;
  const bracket = (x, y, dx, dy) =>
    `<path d="M ${x + dx * len} ${y} L ${x} ${y} L ${x} ${y + dy * len}" fill="none" stroke="${ACCENT}" stroke-width="${cSw}" stroke-linecap="round"/>`;

  return `
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${prx}" fill="none" stroke="${STROKE}" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ACCENT}" stroke-width="${lensSw}"/>
    <circle cx="${cx}" cy="${cy}" r="${rInner}" fill="${ACCENT}"/>
    ${bracket(lx, ty, 1, 1)}
    ${bracket(rx, ty, -1, 1)}
    ${bracket(lx, by, 1, -1)}
    ${bracket(rx, by, -1, -1)}
  `;
}

function svg({ maskable = false } = {}) {
  // En maskable el contenido va dentro del ~80% central (safe-zone).
  const s = maskable ? 0.72 : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${BG}"/>
  ${symbol(s)}
</svg>`;
}

const base = Buffer.from(svg());
const maskable = Buffer.from(svg({ maskable: true }));

const targets = [
  { buf: base, size: 192, out: 'pwa-192x192.png' },
  { buf: base, size: 512, out: 'pwa-512x512.png' },
  { buf: maskable, size: 512, out: 'maskable-512x512.png' },
  { buf: base, size: 180, out: 'apple-touch-icon.png' },
  { buf: base, size: 32, out: 'favicon-32x32.png' },
];

// Dejamos también el SVG fuente en public/ como referencia.
writeFileSync(resolve(PUBLIC, 'icon.svg'), svg());

await Promise.all(
  targets.map(({ buf, size, out }) =>
    sharp(buf).resize(size, size).png().toFile(resolve(PUBLIC, out)),
  ),
);

console.log('Iconos generados en', PUBLIC);
