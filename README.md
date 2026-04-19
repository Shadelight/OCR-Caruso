# Caruso Tech - Sistema OCR para Taller de Reparación

Sistema local para registrar ingresos de teléfonos a reparar, con extracción automática de IMEI por OCR.

## Requisitos previos

- **Node.js** 18 o superior → https://nodejs.org
- **npm** (viene con Node.js)

Verificar instalación:
```
node --version
npm --version
```

---

## Instalación

### 1. Backend

```cmd
cd backend
npm install
```

Copiar el archivo de variables de entorno:
```cmd
copy .env.example .env
```

Editar `.env` con tus datos (el backend funciona sin Google Sheets configurado).

### 2. Frontend

```cmd
cd frontend
npm install
```

---

## Iniciar el sistema

Abrir **dos terminales** separadas:

**Terminal 1 — Backend:**
```cmd
cd backend
npm run dev
```
El servidor corre en http://localhost:3001

**Terminal 2 — Frontend:**
```cmd
cd frontend
npm run dev
```
La aplicación abre en http://localhost:5173

---

## Configurar Google Sheets (opcional)

1. Ir a https://console.cloud.google.com/
2. Crear un proyecto nuevo
3. Habilitar **Google Sheets API**
4. En "Credenciales" → Crear **Service Account**
5. Descargar el archivo JSON de la service account
6. Abrir el JSON y copiar:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` en `.env`
   - `private_key` → `GOOGLE_PRIVATE_KEY` en `.env`
7. Crear una hoja de cálculo en Google Sheets
8. **Compartir** la hoja con el email de la service account (editor)
9. Copiar el ID de la URL: `docs.google.com/spreadsheets/d/**ESTE_ID**/edit`
10. Pegarlo en `GOOGLE_SPREADSHEET_ID` en `.env`
11. Crear una pestaña llamada `Ingresos` en la hoja

El sistema agrega automáticamente las cabeceras en la primera fila si la hoja está vacía.

---

## Estructura del proyecto

```
OCR Caruso Tech/
├── backend/
│   ├── src/
│   │   ├── routes/        # Endpoints Express
│   │   ├── services/      # OCR, SQLite, Google Sheets
│   │   ├── middleware/     # Multer (upload de imágenes)
│   │   ├── db/            # Schema SQLite
│   │   ├── types/         # Tipos TypeScript
│   │   └── index.ts       # Entry point
│   ├── uploads/           # Imágenes subidas (auto-creado)
│   ├── data/              # Base de datos SQLite (auto-creado)
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/         # Home, Equipos, Tiendas
        ├── components/    # Componentes reutilizables
        ├── api/           # Llamadas al backend
        └── types/         # Tipos compartidos
```

---

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ocr/extract-imei` | Sube imagen y extrae IMEI con OCR |
| GET | `/api/equipos` | Lista equipos (con filtros opcionales) |
| POST | `/api/equipos` | Registra un equipo nuevo |
| GET | `/api/equipos/:id` | Obtiene un equipo por ID |
| PATCH | `/api/equipos/:id` | Actualiza un equipo |
| GET | `/api/tiendas` | Lista tiendas |
| POST | `/api/tiendas` | Crea una tienda |
| PATCH | `/api/tiendas/:id` | Actualiza una tienda |

### Filtros para GET /api/equipos

| Parámetro | Descripción |
|-----------|-------------|
| `imei` | Busca por IMEI (parcial) |
| `cliente` | Busca por nombre de cliente |
| `tiendaId` | Filtra por tienda |
| `estado` | RECIBIDO, EN_DIAGNOSTICO, PENDIENTE, EN_REPARACION, REPARADO, ENTREGADO |
| `servicio` | Busca por tipo de servicio |
| `fechaDesde` | Fecha mínima de ingreso |
| `fechaHasta` | Fecha máxima de ingreso |

---

## Notas sobre el OCR

- Usa **Tesseract.js** (no requiere instalación separada de binarios)
- Detecta automáticamente secuencias de 15 dígitos (formato IMEI estándar)
- Prioriza cadenas precedidas por la palabra "IMEI:"
- Aplica el algoritmo de Luhn para ordenar candidatos por probabilidad
- Si no detecta ningún IMEI, permite ingreso manual

---

## Build para producción

```cmd
cd frontend
npm run build
```

Los archivos estáticos quedan en `frontend/dist/`. Para producción, configurar Express para servirlos desde el backend.
