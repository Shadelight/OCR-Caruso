import { Equipo, ESTADO_LABELS, Tienda } from '../types';

// Ganancia = total cobrado − (costo pieza + otros costos). Mano de obra no resta.
function ganancia(e: Equipo): number {
  return (e.precio ?? 0) - (e.costoPieza ?? 0) - (e.otrosCostos ?? 0);
}

const HEADERS = [
  'Fecha', 'IMEI 1', 'IMEI 2', 'Modelo', 'Cliente', 'Telefono', 'Tienda',
  'Servicio', 'Estado', 'Total cobrado', 'Costo pieza', 'Mano de obra',
  'Otros costos', 'Ganancia',
] as const;

function toRow(e: Equipo, tiendaMap: Record<number, string>): (string | number)[] {
  return [
    new Date(e.fechaIngreso).toLocaleString('es-BO'),
    e.imei,
    e.imei2 ?? '',
    e.modelo,
    e.clienteNombre,
    e.clienteTelefono ?? '',
    e.tiendaId ? tiendaMap[e.tiendaId] ?? '' : '',
    ESTADO_LABELS[e.estado] ?? e.estado,
    e.precio ?? 0,
    e.costoPieza ?? 0,
    e.manoDeObra ?? 0,
    e.otrosCostos ?? 0,
    ganancia(e),
  ];
}

function tiendaMapOf(tiendas: Tienda[]): Record<number, string> {
  return Object.fromEntries(tiendas.map((t) => [t.id, t.nombre]));
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(equipos: Equipo[], tiendas: Tienda[]): void {
  const map = tiendaMapOf(tiendas);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    HEADERS.join(','),
    ...equipos.map((e) => toRow(e, map).map(esc).join(',')),
  ];
  // BOM UTF-8 para que Excel abra acentos correctamente.
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  download(blob, `caruso-equipos-${stamp()}.csv`);
}

// xlsx (SheetJS) pesa bastante; lo cargamos sólo cuando se exporta a Excel
// para no inflar el bundle inicial de la PWA.
export async function exportXlsx(equipos: Equipo[], tiendas: Tienda[]): Promise<void> {
  const XLSX = await import('xlsx');
  const map = tiendaMapOf(tiendas);
  const data = [HEADERS as unknown as string[], ...equipos.map((e) => toRow(e, map))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
  XLSX.writeFile(wb, `caruso-equipos-${stamp()}.xlsx`);
}
