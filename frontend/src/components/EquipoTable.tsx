import { useState } from 'react';
import { Equipo, ESTADO_LABELS, EstadoEquipo, ESTADOS, Tienda } from '../types';
import { updateEquipo } from '../api/client';

interface Props {
  equipos: Equipo[];
  tiendas: Tienda[];
  onUpdated: () => void;
}

export default function EquipoTable({ equipos, tiendas, onUpdated }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEstado, setEditEstado] = useState<EstadoEquipo>('RECIBIDO');
  const [saving, setSaving] = useState(false);

  const tiendaMap = Object.fromEntries(tiendas.map((t) => [t.id, t.nombre]));

  const startEdit = (equipo: Equipo) => {
    setEditingId(equipo.id);
    setEditEstado(equipo.estado);
  };

  const saveEstado = async (id: number) => {
    setSaving(true);
    try {
      await updateEquipo(id, { estado: editEstado });
      setEditingId(null);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  if (equipos.length === 0) {
    return (
      <div className="empty-state">
        <strong>Todavia no registraste equipos</strong>
        <span>Sube una imagen del IMEI para crear el primer ingreso y verlo aca.</span>
        <a className="btn btn-primary btn-sm" href="/">Nuevo ingreso</a>
      </div>
    );
  }

  return (
    <div className="equipment-grid">
      {equipos.map((eq) => (
        <article key={eq.id} className="equipment-card">
          <div className="equipment-card__top">
            <div className="equipment-title">
              <span className="equipment-thumb">IMEI</span>
              <div>
                <strong>{eq.modelo}</strong>
                <span>{new Date(eq.fechaIngreso).toLocaleString('es-AR')}</span>
              </div>
            </div>
            {editingId === eq.id ? (
              <select
                className="input input--sm"
                value={editEstado}
                onChange={(e) => setEditEstado(e.target.value as EstadoEquipo)}
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
                ))}
              </select>
            ) : (
              <span className={`badge badge--${eq.estado.toLowerCase().replace('_', '-')}`}>
                {ESTADO_LABELS[eq.estado]}
              </span>
            )}
          </div>

          <div className="equipment-meta">
            <div>
              <span>Cliente</span>
              <strong>{eq.clienteNombre}</strong>
              {eq.clienteTelefono && <small className="cell-sub">{eq.clienteTelefono}</small>}
            </div>
            <div>
              <span>Servicio</span>
              <strong>{eq.servicio}</strong>
            </div>
            <div>
              <span>IMEI 1</span>
              <strong className="imei-cell">{eq.imei}</strong>
            </div>
            <div>
              <span>IMEI 2</span>
              <strong className="imei-cell">{eq.imei2 ?? '-'}</strong>
            </div>
            <div>
              <span>Precio</span>
              <strong>${eq.precio.toLocaleString('es-AR')}</strong>
            </div>
            <div>
              <span>Tienda</span>
              <strong>{eq.tiendaId ? tiendaMap[eq.tiendaId] ?? '-' : '-'}</strong>
            </div>
          </div>

          {editingId === eq.id ? (
            <div className="action-group">
              <button className="btn btn-primary btn-xs" onClick={() => saveEstado(eq.id)} disabled={saving}>
                Guardar
              </button>
              <button className="btn btn-secondary btn-xs" onClick={() => setEditingId(null)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-xs" onClick={() => startEdit(eq)}>
              Editar estado
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
