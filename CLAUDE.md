# CLAUDE.md — Mapa del proyecto (Caruso Tech OCR)

App de taller: se sube una foto del IMEI, OCR lo detecta, se confirma y se
registra el equipo/servicio. Frontend React+Vite (PWA), backend Express+OCR.

## Stack y dónde corre

| Pieza | Tech | Local | Producción |
|-------|------|-------|------------|
| Frontend | React 18 + Vite + TS (PWA) | `vite` :5173 | **Vercel** → https://ocr-caruso.vercel.app |
| Backend | Express + TS | `:3001` | **Render** → https://ocr-caruso-backend.onrender.com |
| Base de datos | libSQL (`@libsql/client`) | archivo SQLite `backend/data/caruso.db` | **Turso** (`libsql://ocr-caruso-shadelight...`) |
| Imágenes | — | disco `backend/uploads/` | **Supabase Storage** bucket `ocr-imagenes` (público) |
| Sheets (opcional) | googleapis | desactivado si faltan vars | Google Sheets vía service account |

Regla de oro: **si las env vars de Turso/Supabase están vacías → modo local**
(SQLite + disco). Si están seteadas → modo producción. Ver `schema.ts` y
`storage.service.ts`.

## Estructura

```
backend/
  src/
    index.ts                 # entrypoint: CORS (FRONTEND_ORIGIN), monta rutas, /api/health, initDb()
    db/schema.ts             # crea cliente libSQL (Turso o file local) + initDb() (tablas + migración imei2)
    routes/
      ocr.routes.ts          # POST /api/ocr/extract-imei (multipart imagen)
      equipos.routes.ts      # CRUD /api/equipos
      tiendas.routes.ts      # CRUD /api/tiendas
    services/
      ocr.service.ts         # tesseract.js + @zxing + sharp → extrae IMEI(s)
      storage.service.ts     # saveImage(): Supabase si hay creds, si no ./uploads
      sqlite.service.ts      # acceso a datos (libSQL)
      sheets.service.ts      # sync opcional a Google Sheets
    middleware/upload.middleware.ts  # multer (memoria)
    types/index.ts
  data/caruso.db             # SQLite local (GITIGNORED) — modo WAL, ojo al consolidar
  uploads/                   # imágenes locales (GITIGNORED salvo .gitkeep)
  .env                       # credenciales (GITIGNORED) — ver .env.example

frontend/
  src/
    main.tsx                 # bootstrap React
    App.tsx                  # layout + router + nav (bottom-nav mobile-first) + emojis
    App.css                  # TODO el estilo (mobile-first, sin media queries)
    api/client.ts            # axios, baseURL = VITE_API_URL || '/api'; getHealth/getEquipos/...
    pages/
      Home.tsx               # flujo principal: upload → confirm → form → done; hero con stats vivos
      Equipos.tsx            # historial + filtros
      Tiendas.tsx            # gestión de tiendas
    components/
      ImageUploader.tsx      # dropzone, llama extractImei
      ImeiConfirm.tsx        # confirma IMEI1/IMEI2 detectados
      EquipoForm.tsx         # alta de equipo
      EquipoTable.tsx / TiendaTable.tsx / TiendaForm.tsx
      InstallPrompt.tsx      # prompt PWA
    types/index.ts
  vite.config.ts             # define __APP_VERSION__ (de package.json), PWA, proxy /api→:3001
  index.html

render.yaml                  # Blueprint de Render (backend). NODE_VERSION=22.11.0 (ver gotcha)
DEPLOY.md                    # guía paso a paso del deploy cloud
docs/superpowers/specs/      # specs de diseño
```

## Variables de entorno

**Backend** (Render / `backend/.env`): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` (=`ocr-imagenes`),
`FRONTEND_ORIGIN` (URL Vercel sin barra, para CORS), `GOOGLE_*` (opcional).
Plantilla: `backend/.env.example`.

**Frontend** (Vercel / `frontend/.env`): `VITE_API_URL` = `<backend>/api` (con `/api`).
En local no hace falta: usa el proxy de Vite.

## Comandos

```
# backend
cd backend && npm install && npm run dev      # ts-node-dev :3001
cd backend && npm run build                   # tsc → dist/
# frontend
cd frontend && npm install && npm run dev     # vite :5173
cd frontend && npm run build                  # tsc && vite build → dist/
```

## Deploy

Repo: `github.com/Shadelight/OCR-Caruso` (privado, único pusher). **Cada push a
`main`** redeploya solo en Vercel (frontend) y Render (backend). Render free
**duerme tras ~15 min** (primer request ~30-50 s).

## Gotchas (aprendidos a los golpes)

- **Node 22 obligatorio en backend.** `@supabase/supabase-js` v2.106 crashea en
  Node 20 ("Node.js 20 detected without native WebSocket support"). `render.yaml`
  fija `NODE_VERSION=22.11.0`. No bajar.
- **`caruso.db` usa WAL.** El archivo principal puede verse casi vacío con los
  datos en `.db-wal`. Hacer `PRAGMA wal_checkpoint(TRUNCATE)` (o cerrar el
  backend) antes de exportar/migrar.
- **CORS:** sin `FRONTEND_ORIGIN`, el backend permite cualquier origen (`*`).
  En prod setear la URL de Vercel sin barra final.
- **Versión de la app:** se muestra en UI desde `frontend/package.json` →
  `__APP_VERSION__`. Para bumpearla, editar ese `version`.
- **CSS mobile-first sin media queries:** `App.css` es la base mobile (bottom
  nav). Los "iconos" de nav son emojis/texto, no librería.

## Estado del deploy (al 2026-05-31)

Turso ✅, Supabase ✅, Render backend ✅ (live, /api/health OK), Vercel ✅.
Pendiente: setear `FRONTEND_ORIGIN` en Render para cerrar CORS.
