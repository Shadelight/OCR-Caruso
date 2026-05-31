import { Router, Request, Response } from 'express';
import * as db from '../services/sqlite.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const tiendas = await db.getAllTiendas();
    res.json(tiendas);
  } catch (err) {
    console.error('[Tiendas] Error al listar:', err);
    res.status(500).json({ error: 'Error al obtener tiendas.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { nombre, telefono, observaciones } = req.body;
  if (!nombre) {
    res.status(400).json({ error: 'El campo nombre es requerido.' });
    return;
  }
  try {
    const tienda = await db.createTienda({ nombre, telefono, observaciones });
    res.status(201).json(tienda);
  } catch (err) {
    console.error('[Tiendas] Error al crear:', err);
    res.status(500).json({ error: 'Error al crear la tienda.' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  try {
    const updated = await db.updateTienda(id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Tienda no encontrada.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('[Tiendas] Error al actualizar:', err);
    res.status(500).json({ error: 'Error al actualizar la tienda.' });
  }
});

export default router;
