import { useState } from 'react';
import { Tienda } from '../types';
import TiendaForm from './TiendaForm';

interface Props {
  tiendas: Tienda[];
  onUpdated: () => void;
}

export default function TiendaTable({ tiendas, onUpdated }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);

  if (tiendas.length === 0) {
    return <p className="empty-msg">No hay tiendas registradas.</p>;
  }

  return (
    <div>
      {tiendas.map((t) =>
        editingId === t.id ? (
          <TiendaForm
            key={t.id}
            tienda={t}
            onSaved={() => { setEditingId(null); onUpdated(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={t.id} className="tienda-row">
            <div className="tienda-info">
              <strong>{t.nombre}</strong>
              {t.telefono && <span className="cell-sub">{t.telefono}</span>}
              {t.observaciones && <span className="cell-sub">{t.observaciones}</span>}
            </div>
            <button className="btn btn-secondary btn-xs" onClick={() => setEditingId(t.id)}>
              Editar
            </button>
          </div>
        ),
      )}
    </div>
  );
}
