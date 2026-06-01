# Caruso Tech — UX Round 1 (diseño)

Fecha: 2026-06-01
Estado: aprobado para planificación

## Objetivo

Que la app se sienta **rápida, directa y de técnico**: pocos taps, cámara
inmediata, autocompletado útil, sin romper la base de datos ni sobrearquitecturar.
El cuello de botella real **no es el OCR en sí**, sino **Render free + imágenes
gigantes + demasiadas pasadas de Tesseract**. Este round ataca eso.

## Alcance

Seis frentes, en orden de ejecución. El punto 7 (capacidad + estado iCloud)
queda **fuera de este round** porque toca el esquema de la DB y merece su propio
ciclo.

| # | Tarea | Archivos | Toca DB |
|---|-------|----------|---------|
| 1 | Cámara directa | `frontend/src/components/ImageUploader.tsx` | no |
| 2 | Downscale en cliente | `frontend/src/lib/downscaleImage.ts` (nuevo), `ImageUploader.tsx` | no |
| 3 | Nombre corto | `frontend/vite.config.ts`, `frontend/index.html` | no |
| 4 | Selector iPhone-first | `frontend/src/components/ModeloPicker.tsx` (nuevo), `frontend/src/data/appleModels.ts` (nuevo), `frontend/src/components/EquipoForm.tsx` | no |
| 5 | Icono premium (concepto D) | `frontend/public/*`, `frontend/scripts/gen-icons.mjs` (nuevo), `vite.config.ts` | no |
| 6 | OCR backend por tiers | `backend/src/services/ocr.service.ts` | no |

---

## 1 · Cámara directa

**Problema:** hoy `ImageUploader` solo expone `<input accept="image/*">`, que en
móvil abre la galería. El técnico tiene que salir a la cámara, guardar, volver y
buscar el archivo. Mata la velocidad percibida.

**Diseño:**
- Dos acciones explícitas, visibles primero en móvil:
  - **📸 Tomar foto** → `<input type="file" accept="image/*" capture="environment">`
    (`capture="environment"` fuerza cámara trasera en Android/iOS).
  - **🖼️ Subir imagen** → `<input type="file" accept="image/*">` (galería/archivos).
- El drag&drop existente se mantiene para desktop.
- Ambos inputs desembocan en el mismo `handleFile(file)` ya existente.
- Sin cambios en el flujo posterior (preview → OCR → confirm).

## 2 · Downscale en cliente

**Problema:** se suben fotos de 4000×3000 / 5-12 MB para leer 15 dígitos. Sube
lento y el backend (Render free) gasta CPU/RAM de más.

**Diseño:**
- Nuevo `frontend/src/lib/downscaleImage.ts`:
  - Entrada: `File`. Salida: `File`/`Blob` JPEG.
  - Usa **`createImageBitmap`** (respeta orientación EXIF; evita los bugs típicos
    de canvas con fotos Samsung/HEIC).
  - Lado máximo **1600px** (sin agrandar si ya es menor), calidad **JPEG 0.8**.
  - Si la imagen original ya cumple (≤1600px y peso bajo), se devuelve sin recomprimir.
- `ImageUploader.handleFile` llama al downscale **antes** de `extractImei`.
- La preview usa la versión reducida (carga más rápida, menos memoria).

**Impacto esperado:** 5-12 MB → ~200-400 KB. Mejora subida, memoria, CPU backend
y tiempo total de OCR.

## 3 · Nombre corto

- `vite.config.ts` → manifest `name: 'Caruso Tech'` (el `short_name` ya es correcto).
- Revisar `<title>` en `frontend/index.html` y dejarlo como `Caruso Tech`.

## 4 · Selector de modelo iPhone-first

**Problema:** el campo "Modelo" es texto libre con placeholder de Samsung. Los
técnicos escriben rápido y mal ("14prom", "iphone14") → datos sucios.

**Diseño:**
- Nuevo `frontend/src/data/appleModels.ts`: array de strings hardcodeado
  (mantenible, sin backend). Contenido (Opción 3):
  - **iPhone**: de iPhone SE (2016) hasta iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max,
    incluyendo líneas intermedias (11/12/13/14/15 en sus variantes, SE 2ª/3ª gen).
  - **iPad**: líneas principales (iPad, iPad Air, iPad mini, iPad Pro).
  - Entrada genérica **"Apple (otro)"**.
- Nuevo `frontend/src/components/ModeloPicker.tsx`:
  - Combobox: `<input>` con placeholder **"Buscar iPhone…"** + dropdown de
    sugerencias filtradas por lo tipeado (case-insensitive, match por substring).
  - **iPhone-first**: con el input vacío o al enfocar, las primeras sugerencias
    son iPhones recientes.
  - **Texto libre**: si lo tipeado no matchea nada, se acepta tal cual (Android
    sueltos). Sin validación bloqueante.
  - Navegable con teclado (↑/↓/Enter) y con tap.
- En `EquipoForm.tsx`, reemplaza el `<input>` de modelo por `<ModeloPicker>`.
  El estado del form **sigue siendo el string `modelo`** → cero cambios en API/DB.

## 5 · Icono premium (concepto D)

**Concepto elegido:** iPhone minimalista con lente-scanner (ojo de cámara + esquinas
de visor). Fondo grafito `#15181e`, acento azul `#3b82f6`, sin glow. Estética tipo
iOS utilities / diagnostics (no "robotito").

**Diseño:**
- SVG maestro del icono (versión normal) y una variante **maskable** con safe-zone
  (≈20% de padding) para Android adaptive icons.
- Script one-off `frontend/scripts/gen-icons.mjs` que rasteriza con **sharp**
  (ya disponible en el backend) a `frontend/public/`:
  - `pwa-192x192.png`, `pwa-512x512.png`
  - `maskable-512x512.png` (desde la variante con padding)
  - `apple-touch-icon.png` (180×180)
  - `favicon-32x32.png`
- `vite.config.ts`: `theme_color` y `background_color` → **`#15181e`** (grafito),
  para que el status bar de Android y el splash de la PWA combinen con el icono.

## 6 · OCR backend por tiers

**Problema:** `extractImeiFromImage` construye 8 variantes (4 rotaciones × 2
pipelines) y reescala a 2000-2400px. Hace early-exit a ≥2 IMEIs, pero en el peor
caso corre las 8. Las rotaciones solo aportan si la foto está acostada.

**Diseño (reestructura del orden + early-exit más inteligente):**
1. **Tier 1a** — rotación 0 + pipeline `contrast_threshold`. Si hay **≥2** IMEIs
   confiables → STOP.
2. **Tier 1b** — rotación 0 + pipeline `sharpen`. Acumulado, si hay **≥1** IMEI
   confiable → STOP. *(Razón: si la rotación 0 ya leyó un IMEI válido, la foto está
   derecha; rotarla no va a aportar más.)*
3. **Tier 2** — **solo si Tier 1 encontró CERO** → rotaciones 180 → 90 → 270, con
   ambas pipelines, early-exit a ≥2 (igual que el comportamiento actual).
4. **Fallback** — si todo lo anterior da cero, probar imagen cruda (como hoy).

- **Resize interno** baja de 2400/2000 a **1500px** (el cliente ya manda ≤1600;
  más resolución para 15 dígitos es desperdicio).
- "IMEI confiable" = la función `isTrustedImei` existente (15 dígitos, empieza en
  35, pasa Luhn). No se relaja.

**Garantía de no-regresión:** si nunca se llega a los umbrales, el flujo termina
probando todas las rotaciones igual que hoy. Peor caso = igual que ahora; caso
común (foto derecha, 1-2 IMEIs) = 1-2 pasadas en vez de hasta 8.

**Sin toggle de "modo rápido/completo":** la lógica por tiers ya da el caso rápido
por defecto sin agregar fricción al técnico.

---

## Fuera de alcance (explícito)

- **Cold-start de Render free** (15 min → primer request 30-50s): es estructural
  del plan gratuito. No se ataca acá; si más adelante molesta, sería un keepalive/
  ping aparte.
- **Capacidad (128/256GB…) + estado iCloud/Libre**: requiere columnas nuevas en la
  DB y migración → round aparte.
- **Lista de modelos editable / panel admin**: la lista hardcodeada alcanza; se
  reevalúa si alguna vez hace falta.

## Criterios de éxito

- En móvil, "Tomar foto" abre la cámara trasera directo y el resultado entra al
  flujo de OCR sin pasos intermedios.
- La imagen que viaja al backend pesa cientos de KB, no megas.
- El manifest dice "Caruso Tech"; el chrome de la PWA y el icono se ven grafito.
- "Modelo" sugiere iPhones al tipear y acepta texto libre como fallback.
- Una foto derecha con 1-2 IMEIs se resuelve en 1-2 pasadas de Tesseract.
- El peor caso de OCR no es más lento que el actual.
