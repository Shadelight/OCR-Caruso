# Guía de deploy — Caruso Tech OCR

Stack gratuito:

| Pieza | Servicio | Plan |
|-------|----------|------|
| Frontend (React/Vite) | **Vercel** | Free |
| Backend (Express + OCR) | **Render** | Free |
| Base de datos | **Turso** (libSQL) | Free |
| Imágenes | **Supabase Storage** | Free |

> El código sigue funcionando en local sin ninguna de estas cuentas: la base usa
> un archivo SQLite local y las imágenes se guardan en `backend/uploads/`.
> Solo en producción (cuando las variables de entorno están seteadas) usa Turso y Supabase.

Hay un **orden** porque unas piezas necesitan la URL de otras. Seguilo de arriba a abajo.

---

## 1. Turso — base de datos

1. Crear cuenta en https://turso.tech e instalar el CLI:
    - Windows (PowerShell): `powershell -ExecutionPolicy Bypass -c "irm https://github.com/tursodatabase/turso/releases/download/v0.6.1/turso_cli-installer.ps1 | iex"`
    - `turso auth login`
2. Crear la base. Para **arrancar con tus datos locales actuales** (tiendas/equipos ya cargados):
   ```
   turso db create ocr-caruso --from-file backend/data/caruso.db
   ```
   Si preferís una base vacía: `turso db create ocr-caruso`
   (el backend crea las tablas solo al arrancar).
3. Obtener las credenciales (las vas a pegar en Render):
   ```
   turso db show ocr-caruso --url        # → TURSO_DATABASE_URL  (libsql://...)
   turso db tokens create ocr-caruso     # → TURSO_AUTH_TOKEN
   ```

---

## 2. Supabase — imágenes

1. Crear cuenta y un proyecto en https://supabase.com
2. En **Storage** → crear un **bucket público** llamado `ocr-imagenes`
   (Create bucket → marcar "Public bucket").
3. En **Project Settings → API**, copiar:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (la secreta, no la `anon`) → `SUPABASE_SERVICE_KEY`

---

## 3. Render — backend

1. Crear cuenta en https://render.com y conectar tu GitHub.
2. **New → Blueprint** y elegir este repo. Render detecta `render.yaml`.
3. Completar las variables marcadas como secretas en el dashboard:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (paso 1)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (paso 2)
   - `FRONTEND_ORIGIN` → dejalo vacío por ahora; lo completás en el paso 4.
   - (Opcional) las `GOOGLE_*` si querés Google Sheets.
4. Deploy. Cuando termine, copiá la URL del servicio, ej:
   `https://ocr-caruso-backend.onrender.com`
5. Probar: abrir `https://ocr-caruso-backend.onrender.com/api/health` → debe responder `{"status":"ok"}`.

> ⚠️ En plan free el backend **se duerme tras ~15 min sin uso**; el primer
> request después tarda ~30-50 s en despertar. Es normal.

---

## 4. Vercel — frontend

1. Crear cuenta en https://vercel.com y conectar GitHub.
2. **Add New → Project** → elegir este repo.
3. Configuración:
   - **Root Directory**: `frontend`
   - Framework: Vite (lo detecta solo). Build: `npm run build`. Output: `dist`.
   - **Environment Variable**:
     `VITE_API_URL = https://ocr-caruso-backend.onrender.com/api`
     (la URL del paso 3 **con `/api` al final**)
4. Deploy. Copiá la URL final, ej: `https://ocr-caruso.vercel.app`

---

## 5. Cerrar el círculo (CORS)

1. Volvé a Render → variable `FRONTEND_ORIGIN` = la URL de Vercel **sin barra final**
   (ej: `https://ocr-caruso.vercel.app`). Guardá → Render redeploya solo.
2. Abrí la URL de Vercel y probá subir una imagen de IMEI de punta a punta.

---

## Cómo se hacen los deploys (solo vos)

- Es tu repo privado en GitHub y sos el único que pushea.
- **Cada `git push` a `main`** dispara el redeploy automático en **Vercel** (frontend)
  y en **Render** (backend). No hay deploy manual ni nadie más con acceso.
- Si querés deploys 100% manuales, en cada plataforma podés desactivar el
  auto-deploy y usar el botón "Deploy" del dashboard.

## Variables de entorno — resumen

**Render (backend):** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`, `FRONTEND_ORIGIN` (+ `GOOGLE_*` opcional).

**Vercel (frontend):** `VITE_API_URL`.
