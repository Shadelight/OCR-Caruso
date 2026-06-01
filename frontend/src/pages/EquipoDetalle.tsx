import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteEquipo, getEquipo, getTiendas, updateEquipo } from '../api/client';
import { Equipo, EstadoEquipo, ESTADO_LABELS, ESTADOS, Tienda } from '../types';

const fmtBs = (n: number): string =>
  `Bs. ${(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EquipoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const equipoId = Number(id);

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState<EstadoEquipo>('RECIBIDO');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getEquipo(equipoId)
      .then((e) => {
        if (!alive) return;
        setEquipo(e);
        setEstado(e.estado);
      })
      .catch(() => alive && setEquipo(null))
      .finally(() => alive && setLoading(false));
    getTiendas().then((t) => alive && setTiendas(t)).catch(() => {});
    return () => { alive = false; };
  }, [equipoId]);

  const ganancia = useMemo(
    () => equipo ? (equipo.precio ?? 0) - (equipo.costoPieza ?? 0) - (equipo.otrosCostos ?? 0) : 0,
    [equipo],
  );

  const tiendaNombre = equipo?.tiendaId
    ? tiendas.find((t) => t.id === equipo.tiendaId)?.nombre ?? '-'
    : '-';

  const guardarEstado = async () => {
    if (!equipo || estado === equipo.estado) return;
    setSaving(true);
    try {
      const updated = await updateEquipo(equipo.id, { estado });
      setEquipo(updated);
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!equipo) return;
    const ok = window.confirm(
      `¿Eliminar el equipo ${equipo.modelo} (IMEI ${equipo.imei})?\n\nSe puede recuperar luego (borrado suave).`,
    );
    if (!ok) return;
    await deleteEquipo(equipo.id);
    navigate('/equipos');
  };

  if (loading) return <div className="page"><div className="card loading-msg">Cargando equipo...</div></div>;

  if (!equipo) {
    return (
      <div className="page">
        <div className="empty-state">
          <strong>Equipo no encontrado</strong>
          <span>Puede haber sido eliminado o el enlace es inválido.</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/equipos')}>Volver al historial</button>
        </div>
      </div>
    );
  }

  const ganClass = ganancia > 0 ? 'pos' : ganancia < 0 ? 'neg' : 'zero';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/equipos')}>← Historial</button>
          <h1>{equipo.modelo}</h1>
          <p className="page-sub">{new Date(equipo.fechaIngreso).toLocaleString('es-BO')}</p>
        </div>
        <span className={`badge badge--${equipo.estado.toLowerCase().replace(/_/g, '-')}`}>
          {ESTADO_LABELS[equipo.estado]}
        </span>
      </div>

      {equipo.imagenRuta && (
        <div className="card detalle-foto">
          <img src={equipo.imagenRuta} alt={`Foto IMEI ${equipo.modelo}`} />
        </div>
      )}

      <div className="card">
        <span className="form-section">Datos técnicos</span>
        <div className="imei-badges">
          <div className="imei-badge">
            <span className="imei-badge__label">IMEI 1</span>
            <span className="imei-badge__value">{equipo.imei}</span>
          </div>
          {equipo.imei2 && (
            <div className="imei-badge">
              <span className="imei-badge__label">IMEI 2</span>
              <span className="imei-badge__value">{equipo.imei2}</span>
            </div>
          )}
        </div>

        <span className="form-section">Cliente</span>
        <div className="detalle-grid">
          <div><span>Nombre</span><strong>{equipo.clienteNombre}</strong></div>
          <div><span>Teléfono</span><strong>{equipo.clienteTelefono || '-'}</strong></div>
        </div>

        <span className="form-section">Servicio</span>
        <div className="detalle-grid">
          <div><span>Servicio</span><strong>{equipo.servicio}</strong></div>
          <div><span>Tienda</span><strong>{tiendaNombre}</strong></div>
        </div>
        {equipo.observaciones && (
          <div className="detalle-notas">
            <span>Observaciones</span>
            <p>{equipo.observaciones}</p>
          </div>
        )}

        <span className="form-section">💰 Costos y cobro</span>
        <div className="detalle-grid">
          <div><span>Costo de pieza</span><strong>{fmtBs(equipo.costoPieza)}</strong></div>
          <div><span>Mano de obra</span><strong>{fmtBs(equipo.manoDeObra)}</strong></div>
          <div><span>Otros costos</span><strong>{fmtBs(equipo.otrosCostos)}</strong></div>
          <div><span>Total cobrado</span><strong>{fmtBs(equipo.precio)}</strong></div>
        </div>

        <div className={`ganancia-card ganancia-card--${ganClass}`}>
          <span className="ganancia-card__label">Ganancia</span>
          <strong className="ganancia-card__value">
            {ganancia > 0 ? '+ ' : ganancia < 0 ? '− ' : ''}{fmtBs(ganancia)}
          </strong>
        </div>
      </div>

      <div className="card">
        <span className="form-section">Cambiar estado</span>
        <div className="estado-editor">
          <select className="input" value={estado} onChange={(e) => setEstado(e.target.value as EstadoEquipo)}>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={guardarEstado}
            disabled={saving || estado === equipo.estado}
          >
            {saving ? 'Guardando...' : 'Guardar estado'}
          </button>
        </div>

        <div className="action-group">
          <button className="btn btn-ghost menu-item--danger" onClick={eliminar}>
            Eliminar equipo
          </button>
        </div>
      </div>
    </div>
  );
}
