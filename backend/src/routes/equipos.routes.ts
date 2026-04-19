import { Router, Request, Response } from 'express';
import * as db from '../services/sqlite.service';
import { appendEquipoToSheet } from '../services/sheets.service';
import { EstadoEquipo, EquipoFilters } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const filters: EquipoFilters = {};

  if (req.query.imei) filters.imei = req.query.imei as string;
  if (req.query.cliente) filters.cliente = req.query.cliente as string;
  if (req.query.tiendaId) filters.tiendaId = parseInt(req.query.tiendaId as string, 10);
  if (req.query.estado) filters.estado = req.query.estado as EstadoEquipo;
  if (req.query.servicio) filters.servicio = req.query.servicio as string;
  if (req.query.fechaDesde) filters.fechaDesde = req.query.fechaDesde as string;
  if (req.query.fechaHasta) filters.fechaHasta = req.query.fechaHasta as string;

  const equipos = db.getAllEquipos(filters);
  res.json(equipos);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  const equipo = db.getEquipoById(id);
  if (!equipo) {
    res.status(404).json({ error: 'Equipo no encontrado.' });
    return;
  }
  res.json(equipo);
});

router.post('/', async (req: Request, res: Response) => {
  const {
    fechaIngreso, imei, imei2, modelo, clienteNombre, clienteTelefono,
    tiendaId, servicio, precio, observaciones, estado, imagenRuta,
  } = req.body;

  if (!imei || !modelo || !clienteNombre || !servicio || !estado) {
    res.status(400).json({ error: 'Faltan campos requeridos: imei, modelo, clienteNombre, servicio, estado.' });
    return;
  }

  const equipo = db.createEquipo({
    fechaIngreso: fechaIngreso || new Date().toISOString(),
    imei,
    imei2: imei2 ? String(imei2).trim() || null : null,
    modelo,
    clienteNombre,
    clienteTelefono,
    tiendaId: tiendaId ? parseInt(tiendaId, 10) : undefined,
    servicio,
    precio: parseFloat(precio) || 0,
    observaciones,
    estado,
    imagenRuta,
  });

  // Sincronizar con Google Sheets (no bloquea la respuesta si falla)
  const tienda = tiendaId ? db.getTiendaById(parseInt(tiendaId, 10)) : undefined;
  appendEquipoToSheet(equipo, tienda?.nombre).catch((e) =>
    console.error('[Sheets] Error al sincronizar:', e),
  );

  res.status(201).json(equipo);
});

router.patch('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  const updated = db.updateEquipo(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Equipo no encontrado.' });
    return;
  }
  res.json(updated);
});

export default router;
