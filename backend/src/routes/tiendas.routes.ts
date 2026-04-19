import { Router, Request, Response } from 'express';
import * as db from '../services/sqlite.service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const tiendas = db.getAllTiendas();
  res.json(tiendas);
});

router.post('/', (req: Request, res: Response) => {
  const { nombre, telefono, observaciones } = req.body;
  if (!nombre) {
    res.status(400).json({ error: 'El campo nombre es requerido.' });
    return;
  }
  const tienda = db.createTienda({ nombre, telefono, observaciones });
  res.status(201).json(tienda);
});

router.patch('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  const updated = db.updateTienda(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Tienda no encontrada.' });
    return;
  }
  res.json(updated);
});

export default router;
