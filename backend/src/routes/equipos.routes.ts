import { Router, Request, Response } from 'express';
import * as db from '../services/sqlite.service';
import { appendEquipoToSheet } from '../services/sheets.service';
import { EstadoEquipo, EquipoFilters } from '../types';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: EquipoFilters = {};

    if (req.query.imei) filters.imei = req.query.imei as string;
    if (req.query.cliente) filters.cliente = req.query.cliente as string;
    if (req.query.tiendaId) filters.tiendaId = parseInt(req.query.tiendaId as string, 10);
    if (req.query.estado) filters.estado = req.query.estado as EstadoEquipo;
    if (req.query.servicio) filters.servicio = req.query.servicio as string;
    if (req.query.fechaDesde) filters.fechaDesde = req.query.fechaDesde as string;
    if (req.query.fechaHasta) filters.fechaHasta = req.query.fechaHasta as string;

    const equipos = await db.getAllEquipos(filters);
    res.json(equipos);
  } catch (err) {
    console.error('[Equipos] Error al listar:', err);
    res.status(500).json({ error: 'Error al obtener equipos.' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  try {
    const equipo = await db.getEquipoById(id);
    if (!equipo) {
      res.status(404).json({ error: 'Equipo no encontrado.' });
      return;
    }
    res.json(equipo);
  } catch (err) {
    console.error('[Equipos] Error al obtener:', err);
    res.status(500).json({ error: 'Error al obtener el equipo.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const {
    fechaIngreso, imei, imei2, modelo, clienteNombre, clienteTelefono,
    tiendaId, servicio, precio, costoPieza, manoDeObra, otrosCostos,
    observaciones, estado, imagenRuta,
  } = req.body;

  if (!imei || !modelo || !clienteNombre || !servicio || !estado) {
    res.status(400).json({ error: 'Faltan campos requeridos: imei, modelo, clienteNombre, servicio, estado.' });
    return;
  }

  try {
    const equipo = await db.createEquipo({
      fechaIngreso: fechaIngreso || new Date().toISOString(),
      imei,
      imei2: imei2 ? String(imei2).trim() || null : null,
      modelo,
      clienteNombre,
      clienteTelefono,
      tiendaId: tiendaId ? parseInt(tiendaId, 10) : undefined,
      servicio,
      precio: parseFloat(precio) || 0,
      costoPieza: parseFloat(costoPieza) || 0,
      manoDeObra: parseFloat(manoDeObra) || 0,
      otrosCostos: parseFloat(otrosCostos) || 0,
      observaciones,
      estado,
      imagenRuta,
    });

    // Sincronizar con Google Sheets (no bloquea la respuesta si falla)
    const tienda = tiendaId ? await db.getTiendaById(parseInt(tiendaId, 10)) : undefined;
    appendEquipoToSheet(equipo, tienda?.nombre).catch((e) =>
      console.error('[Sheets] Error al sincronizar:', e),
    );

    res.status(201).json(equipo);
  } catch (err) {
    console.error('[Equipos] Error al crear:', err);
    res.status(500).json({ error: 'Error al registrar el equipo.' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  try {
    const updated = await db.updateEquipo(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Equipo no encontrado.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('[Equipos] Error al actualizar:', err);
    res.status(500).json({ error: 'Error al actualizar el equipo.' });
  }
});

export default router;
