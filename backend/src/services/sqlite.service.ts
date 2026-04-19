import db from '../db/schema';
import {
  Tienda,
  CreateTiendaDto,
  UpdateTiendaDto,
  Equipo,
  CreateEquipoDto,
  UpdateEquipoDto,
  EquipoFilters,
} from '../types';

// ─── Tiendas ────────────────────────────────────────────────────────────────

export function getAllTiendas(): Tienda[] {
  return db.prepare('SELECT * FROM tiendas ORDER BY nombre ASC').all() as Tienda[];
}

export function getTiendaById(id: number): Tienda | undefined {
  return db.prepare('SELECT * FROM tiendas WHERE id = ?').get(id) as Tienda | undefined;
}

export function createTienda(dto: CreateTiendaDto): Tienda {
  const stmt = db.prepare(`
    INSERT INTO tiendas (nombre, telefono, observaciones)
    VALUES (@nombre, @telefono, @observaciones)
  `);
  const result = stmt.run({
    nombre: dto.nombre,
    telefono: dto.telefono ?? null,
    observaciones: dto.observaciones ?? null,
  });
  return getTiendaById(result.lastInsertRowid as number)!;
}

export function updateTienda(id: number, dto: UpdateTiendaDto): Tienda | undefined {
  const existing = getTiendaById(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...dto, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE tiendas
    SET nombre = @nombre, telefono = @telefono, observaciones = @observaciones, updatedAt = @updatedAt
    WHERE id = @id
  `).run({ ...updated, id });

  return getTiendaById(id);
}

// ─── Equipos ────────────────────────────────────────────────────────────────

export function getAllEquipos(filters: EquipoFilters = {}): Equipo[] {
  const conditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.imei) {
    conditions.push('imei LIKE @imei');
    params.imei = `%${filters.imei}%`;
  }
  if (filters.cliente) {
    conditions.push('clienteNombre LIKE @cliente');
    params.cliente = `%${filters.cliente}%`;
  }
  if (filters.tiendaId) {
    conditions.push('tiendaId = @tiendaId');
    params.tiendaId = filters.tiendaId;
  }
  if (filters.estado) {
    conditions.push('estado = @estado');
    params.estado = filters.estado;
  }
  if (filters.servicio) {
    conditions.push('servicio LIKE @servicio');
    params.servicio = `%${filters.servicio}%`;
  }
  if (filters.fechaDesde) {
    conditions.push('fechaIngreso >= @fechaDesde');
    params.fechaDesde = filters.fechaDesde;
  }
  if (filters.fechaHasta) {
    conditions.push('fechaIngreso <= @fechaHasta');
    params.fechaHasta = filters.fechaHasta;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM equipos ${where} ORDER BY fechaIngreso DESC`;
  return db.prepare(sql).all(params) as Equipo[];
}

export function getEquipoById(id: number): Equipo | undefined {
  return db.prepare('SELECT * FROM equipos WHERE id = ?').get(id) as Equipo | undefined;
}

export function getEquipoByImei(imei: string): Equipo[] {
  return db.prepare('SELECT * FROM equipos WHERE imei = ? ORDER BY fechaIngreso DESC').all(imei) as Equipo[];
}

export function createEquipo(dto: CreateEquipoDto): Equipo {
  const stmt = db.prepare(`
    INSERT INTO equipos
      (fechaIngreso, imei, modelo, clienteNombre, clienteTelefono,
       tiendaId, servicio, precio, observaciones, estado, imagenRuta)
    VALUES
      (@fechaIngreso, @imei, @modelo, @clienteNombre, @clienteTelefono,
       @tiendaId, @servicio, @precio, @observaciones, @estado, @imagenRuta)
  `);
  const result = stmt.run({
    fechaIngreso: dto.fechaIngreso,
    imei: dto.imei,
    modelo: dto.modelo,
    clienteNombre: dto.clienteNombre,
    clienteTelefono: dto.clienteTelefono ?? null,
    tiendaId: dto.tiendaId ?? null,
    servicio: dto.servicio,
    precio: dto.precio,
    observaciones: dto.observaciones ?? null,
    estado: dto.estado,
    imagenRuta: dto.imagenRuta ?? null,
  });
  return getEquipoById(result.lastInsertRowid as number)!;
}

export function updateEquipo(id: number, dto: UpdateEquipoDto): Equipo | undefined {
  const existing = getEquipoById(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...dto, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE equipos
    SET fechaIngreso = @fechaIngreso, imei = @imei, modelo = @modelo,
        clienteNombre = @clienteNombre, clienteTelefono = @clienteTelefono,
        tiendaId = @tiendaId, servicio = @servicio, precio = @precio,
        observaciones = @observaciones, estado = @estado,
        imagenRuta = @imagenRuta, updatedAt = @updatedAt
    WHERE id = @id
  `).run({ ...updated, id });

  return getEquipoById(id);
}
