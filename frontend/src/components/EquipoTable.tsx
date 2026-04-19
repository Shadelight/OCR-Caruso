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
    return <p className="empty-msg">No se encontraron equipos.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>IMEI</th>
            <th>Modelo</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Precio</th>
            <th>Tienda</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((eq) => (
            <tr key={eq.id}>
              <td>{new Date(eq.fechaIngreso).toLocaleString('es-AR')}</td>
              <td className="imei-cell">{eq.imei}</td>
              <td>{eq.modelo}</td>
              <td>
                <div>{eq.clienteNombre}</div>
                {eq.clienteTelefono && <div className="cell-sub">{eq.clienteTelefono}</div>}
              </td>
              <td>{eq.servicio}</td>
              <td>${eq.precio.toLocaleString('es-AR')}</td>
              <td>{eq.tiendaId ? tiendaMap[eq.tiendaId] ?? '—' : '—'}</td>
              <td>
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
              </td>
              <td>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
