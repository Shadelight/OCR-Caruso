# Mobile-first frontend — OCR-Caruso

**Fecha:** 2026-05-30
**Objetivo:** Que toda la interfaz se vea y funcione bien tanto en teléfono como en PC, con enfoque *mobile-first*.

## Estado actual

- React 18 + TypeScript + Vite, CSS plano en `frontend/src/App.css`.
- Diseño **desktop-only**: sidebar fijo de 220px (`margin-left` fijo en `.main-content`), tabla de 10 columnas, `.field-row` en 2 columnas fijas, stepper horizontal. **Sin ningún media query.**
- `index.html` ya incluye `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.

## Estrategia

Reescribir `App.css` en orden *mobile-first*: los estilos base son para teléfono y un único breakpoint `@media (min-width: 768px)` reactiva el layout de escritorio. Sin dependencias nuevas.

## Decisiones (confirmadas con el usuario)

1. **Navegación móvil:** barra inferior fija (bottom nav). En PC vuelve el sidebar lateral.
2. **Tabla en móvil:** tarjetas (cards). En PC sigue siendo tabla.

## Cambios por componente

### 1. Navegación — `App.tsx` + `App.css`
- Un solo `<nav>` con los 3 `NavLink` existentes.
- Móvil (<768px): `position: fixed; bottom: 0`, fila horizontal de 3 ítems con ícono + texto corto, ítem activo resaltado. `.main-content` con `padding-bottom` para no quedar tapado por la barra.
- PC (≥768px): sidebar lateral oscuro como hoy (`position: fixed; left: 0`, ancho 220px, `.main-content` con `margin-left`).
- Añadir íconos cortos a cada link para la barra inferior.

### 2. Historial tabla→cards — `EquipoTable.tsx` + `App.css`
- Agregar `data-label="..."` a cada `<td>`.
- Móvil: `.table`, `thead`, `tr`, `td` pasan a `display: block`; `thead` oculto; cada `tr` se renderiza como tarjeta con borde/padding; cada `td` muestra su etiqueta vía `::before { content: attr(data-label) }`.
- La lógica de edición de estado (select + botones Guardar/Cancelar) no cambia.
- PC: tabla normal.

### 3. Formularios — `App.css`
- `.field-row`: 1 columna en móvil, `grid-template-columns: 1fr 1fr` en ≥768px.
- `.filter-grid`: ajustar `minmax` para no desbordar en pantallas chicas (p. ej. `minmax(140px, 1fr)`).

### 4. Stepper — `App.css`
- Móvil compacto: número del paso siempre visible, etiqueta más chica; los 3 pasos entran en el ancho sin desbordar.

### 5. Detalles táctiles / legibilidad — `App.css`
- Inputs a `font-size: 16px` en móvil (evita zoom automático de iOS).
- Botones y zonas táctiles con buen tamaño (mín ~44px de alto en controles principales).
- `.page-header` apilado en móvil (columna), en fila en PC.
- Paddings de `.main-content` y `.card` reducidos en móvil.

## Archivos afectados
- `frontend/src/App.css` — grueso del trabajo.
- `frontend/src/App.tsx` — estructura de navegación + íconos.
- `frontend/src/components/EquipoTable.tsx` — atributos `data-label`.

Sin dependencias nuevas.

## Verificación
- Levantar `npm run dev` y revisar en ancho móvil (~375px) y desktop (~1280px): navegación, historial (cards/tabla), formularios, filtros, stepper.
- `npm run build` (tsc) sin errores.
