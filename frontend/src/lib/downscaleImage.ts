// Reduce una foto del cliente ANTES de subirla al backend.
// El backend solo necesita leer 15 dígitos del IMEI; mandar una foto de
// 4000x3000 / 5-12 MB es desperdicio de subida, RAM y CPU (Render free).
//
// Estrategia: lado máximo 1600px, JPEG calidad 0.8. Usa createImageBitmap
// con imageOrientation:'from-image' para respetar la orientación EXIF (evita
// fotos giradas de Samsung / capturas HEIC ya decodificadas).

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
// Si la imagen ya es chica y liviana, no vale la pena recomprimir.
const SKIP_BYTES = 600 * 1024; // 600 KB

export async function downscaleImage(file: File): Promise<File> {
  // Solo procesamos imágenes raster. Cualquier otra cosa se devuelve igual.
  if (!file.type.startsWith('image/')) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Si el navegador no puede decodificarla (formato raro), que la maneje el backend.
    return file;
  }

  const { width, height } = bitmap;
  const longest = Math.max(width, height);

  // Ya está dentro de límites y pesa poco → no tocar.
  if (longest <= MAX_SIDE && file.size <= SKIP_BYTES) {
    bitmap.close();
    return file;
  }

  const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) return file;

  // Si por alguna razón quedó más pesada que el original, nos quedamos con el original.
  if (blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}
