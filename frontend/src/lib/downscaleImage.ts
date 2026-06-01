// Reduce una foto del cliente ANTES de subirla al backend.
// El backend solo necesita leer 15 dígitos del IMEI; mandar una foto de
// 4000x3000 / 5-12 MB es desperdicio de subida, RAM y CPU (Render free).
//
// Robustez mobile-first (causa de fallos de cámara en Android):
//   1. Decodifica con createImageBitmap (respeta EXIF). Si falla (HEIC, imagen
//      enorme, WebView viejo) cae a HTMLImageElement, que en navegadores
//      modernos también aplica la orientación EXIF al dibujar.
//   2. Si NADA decodifica (ej. HEIC en Chrome Android), devuelve el original:
//      el backend ahora lo acepta y sharp/libheif lo decodifica.
//   3. Guard anti-"imagen negra": si el canvas sale en blanco/negro (límite de
//      tamaño de canvas en móviles), NO la mandamos rota; devolvemos el original.
//   4. Loguea el camino tomado para diagnóstico real desde el dispositivo.

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
const SKIP_BYTES = 600 * 1024; // 600 KB
const IMG_EXT = /\.(jpe?g|png|webp|heic|heif|avif|bmp|tiff?|gif)$/i;

type Decoded = { draw: CanvasImageSource; w: number; h: number; path: string };

async function decode(file: File): Promise<Decoded | null> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { draw: bmp, w: bmp.width, h: bmp.height, path: 'bitmap' };
  } catch {
    // Fallback: <img> (Chrome 81+/Safari aplican EXIF al dibujar por defecto).
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('img decode failed'));
        el.src = url;
      });
      URL.revokeObjectURL(url);
      return { draw: img, w: img.naturalWidth, h: img.naturalHeight, path: 'img' };
    } catch {
      return null;
    }
  }
}

// ¿El canvas salió esencialmente negro/vacío? (típico cuando el navegador no
// pudo rasterizar una imagen gigante). Lo chequeamos en un 16x16 barato.
function isBlank(source: CanvasImageSource, sw: number, sh: number): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const cx = c.getContext('2d');
    if (!cx) return false;
    cx.drawImage(source, 0, 0, sw, sh, 0, 0, 16, 16);
    const { data } = cx.getImageData(0, 0, 16, 16);
    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
      max = Math.max(max, data[i], data[i + 1], data[i + 2]);
    }
    return max < 8; // todo prácticamente negro
  } catch {
    return false; // ante la duda, no bloquear
  }
}

export async function downscaleImage(file: File): Promise<File> {
  const log = (extra: Record<string, unknown>) =>
    console.info('[downscale]', JSON.stringify({ inType: file.type || '?', inKB: Math.round(file.size / 1024), name: file.name, ...extra }));

  if (!file.type.startsWith('image/') && !IMG_EXT.test(file.name)) {
    log({ path: 'not-image-skip' });
    return file;
  }

  const dec = await decode(file);
  if (!dec) {
    log({ path: 'decode-failed-keep-original' });
    return file; // backend lo decodifica (HEIC vía sharp/libheif)
  }

  const longest = Math.max(dec.w, dec.h);

  if (longest <= MAX_SIDE && file.size <= SKIP_BYTES) {
    if (dec.draw instanceof ImageBitmap) dec.draw.close();
    log({ path: `${dec.path}-skip-small`, w: dec.w, h: dec.h });
    return file;
  }

  if (isBlank(dec.draw, dec.w, dec.h)) {
    if (dec.draw instanceof ImageBitmap) dec.draw.close();
    log({ path: `${dec.path}-blank-keep-original`, w: dec.w, h: dec.h });
    return file; // no mandar imagen negra
  }

  const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
  const targetW = Math.round(dec.w * scale);
  const targetH = Math.round(dec.h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (dec.draw instanceof ImageBitmap) dec.draw.close();
    log({ path: 'no-ctx-keep-original' });
    return file;
  }
  ctx.drawImage(dec.draw, 0, 0, targetW, targetH);
  if (dec.draw instanceof ImageBitmap) dec.draw.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob || blob.size >= file.size) {
    log({ path: `${dec.path}-no-gain-keep-original`, w: dec.w, h: dec.h, outKB: blob ? Math.round(blob.size / 1024) : null });
    return file;
  }

  log({ path: dec.path, w: dec.w, h: dec.h, outW: targetW, outH: targetH, outKB: Math.round(blob.size / 1024) });
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name || 'foto.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}
