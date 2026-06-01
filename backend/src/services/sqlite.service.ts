import db from '../db/schema';
import type { ResultSet, Row, InValue } from '@libsql/client';
import {
  Tienda,
  CreateTiendaDto,
  UpdateTiendaDto,
  Equipo,
  CreateEquipoDto,
  UpdateEquipoDto,
  EquipoFilters,
} from '../types';

// libSQL devuelve filas tipo Row (array + acceso por nombre). Las convertimos
// a objetos planos para que Express las serialice con sus claves.
function mapRows<T>(rs: ResultSet): T[] {
  return rs.rows.map((row) => rowToObject<T>(row, rs.columns));
}

function rowToObject<T>(row: Row, columns: string[]): T {
  const obj: Record<string, unknown> = {};
  for (const col of columns) obj[col] = (row as any)[col];
  return obj as T;
}

function firstRow<T>(rs: ResultSet): T | undefined {
  if (rs.rows.length === 0) return undefined;
  return rowToObject<T>(rs.rows[0], rs.columns);
}

// ─── Tiendas ────────────────────────────────────────────────────────────────

export async function getAllTiendas(): Promise<Tienda[]> {
  const rs = await db.execute('SELECT * FROM tiendas ORDER BY nombre ASC');
  return mapRows<Tienda>(rs);
}

export async function getTiendaById(id: number): Promise<Tienda | undefined> {
  const rs = await db.execute({
    sql: 'SELECT * FROM tiendas WHERE id = ?',
    args: [id],
  });
  return firstRow<Tienda>(rs);
}

export async function createTienda(dto: CreateTiendaDto): Promise<Tienda> {
  const rs = await db.execute({
    sql: `INSERT INTO tiendas (nombre, telefono, observaciones)
          VALUES (?, ?, ?)`,
    args: [dto.nombre, dto.telefono ?? null, dto.observaciones ?? null],
  });
  return (await getTiendaById(Number(rs.lastInsertRowid)))!;
}

export async function updateTienda(
  id: number,
  dto: UpdateTiendaDto,
): Promise<Tienda | undefined> {
  const existing = await getTiendaById(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...dto, updatedAt: new Date().toISOString() };
  await db.execute({
    sql: `UPDATE tiendas
          SET nombre = ?, telefono = ?, observaciones = ?, updatedAt = ?
          WHERE id = ?`,
    args: [
      updated.nombre,
      updated.telefono ?? null,
      updated.observaciones ?? null,
      updated.updatedAt,
      id,
    ],
  });

  return getTiendaById(id);
}

// ─── Equipos ────────────────────────────────────────────────────────────────

export async function getAllEquipos(
  filters: EquipoFilters = {},
): Promise<Equipo[]> {
  const conditions: string[] = [];
  const args: InValue[] = [];

  if (filters.imei) {
    // Buscar en ambas columnas (IMEI1 e IMEI2)
    conditions.push('(imei LIKE ? OR imei2 LIKE ?)');
    args.push(`%${filters.imei}%`, `%${filters.imei}%`);
  }
  if (filters.cliente) {
    conditions.push('clienteNombre LIKE ?');
    args.push(`%${filters.cliente}%`);
  }
  if (filters.tiendaId) {
    conditions.push('tiendaId = ?');
    args.push(filters.tiendaId);
  }
  if (filters.estado) {
    conditions.push('estado = ?');
    args.push(filters.estado);
  }
  if (filters.servicio) {
    conditions.push('servicio LIKE ?');
    args.push(`%${filters.servicio}%`);
  }
  if (filters.fechaDesde) {
    conditions.push('fechaIngreso >= ?');
    args.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    conditions.push('fechaIngreso <= ?');
    args.push(filters.fechaHasta);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rs = await db.execute({
    sql: `SELECT * FROM equipos ${where} ORDER BY fechaIngreso DESC`,
    args,
  });
  return mapRows<Equipo>(rs);
}

export async function getEquipoById(id: number): Promise<Equipo | undefined> {
  const rs = await db.execute({
    sql: 'SELECT * FROM equipos WHERE id = ?',
    args: [id],
  });
  return firstRow<Equipo>(rs);
}

export async function getEquipoByImei(imei: string): Promise<Equipo[]> {
  const rs = await db.execute({
    sql: 'SELECT * FROM equipos WHERE imei = ? OR imei2 = ? ORDER BY fechaIngreso DESC',
    args: [imei, imei],
  });
  return mapRows<Equipo>(rs);
}

export async function createEquipo(dto: CreateEquipoDto): Promise<Equipo> {
  const rs = await db.execute({
    sql: `INSERT INTO equipos
            (fechaIngreso, imei, imei2, modelo, clienteNombre, clienteTelefono,
             tiendaId, servicio, precio, costoPieza, manoDeObra, otrosCostos,
             observaciones, estado, imagenRuta)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      dto.fechaIngreso,
      dto.imei,
      dto.imei2 ?? null,
      dto.modelo,
      dto.clienteNombre,
      dto.clienteTelefono ?? null,
      dto.tiendaId ?? null,
      dto.servicio,
      dto.precio,
      dto.costoPieza ?? 0,
      dto.manoDeObra ?? 0,
      dto.otrosCostos ?? 0,
      dto.observaciones ?? null,
      dto.estado,
      dto.imagenRuta ?? null,
    ],
  });
  return (await getEquipoById(Number(rs.lastInsertRowid)))!;
}

export async function updateEquipo(
  id: number,
  dto: UpdateEquipoDto,
): Promise<Equipo | undefined> {
  const existing = await getEquipoById(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...dto, updatedAt: new Date().toISOString() };
  await db.execute({
    sql: `UPDATE equipos
          SET fechaIngreso = ?, imei = ?, imei2 = ?, modelo = ?,
              clienteNombre = ?, clienteTelefono = ?, tiendaId = ?,
              servicio = ?, precio = ?, costoPieza = ?, manoDeObra = ?,
              otrosCostos = ?, observaciones = ?, estado = ?,
              imagenRuta = ?, updatedAt = ?
          WHERE id = ?`,
    args: [
      updated.fechaIngreso,
      updated.imei,
      updated.imei2 ?? null,
      updated.modelo,
      updated.clienteNombre,
      updated.clienteTelefono ?? null,
      updated.tiendaId ?? null,
      updated.servicio,
      updated.precio,
      updated.costoPieza ?? 0,
      updated.manoDeObra ?? 0,
      updated.otrosCostos ?? 0,
      updated.observaciones ?? null,
      updated.estado,
      updated.imagenRuta ?? null,
      updated.updatedAt,
      id,
    ],
  });

  return getEquipoById(id);
}
