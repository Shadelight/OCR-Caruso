import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Equipo, ESTADO_LABELS, EstadoEquipo, ESTADOS, Tienda } from '../types';
import { deleteEquipo, updateEquipo } from '../api/client';

interface Props {
  equipos: Equipo[];
  tiendas: Tienda[];
  onUpdated: () => void;
}

const fmtBs = (n: number): string =>
  `Bs. ${(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isViewableImagePath = (ruta: string | null): ruta is string =>
  Boolean(ruta && /^(https?:\/\/|\/(?![/\\]))/i.test(ruta));

function PhoneIcon() {
  return (
    <svg className="phone-glyph" viewBox="0 0 32 32" aria-hidden="true">
      <rect className="phone-glyph__body" x="8" y="3" width="16" height="26" rx="4.5" />
      <rect className="phone-glyph__screen" x="10.5" y="6" width="11" height="19" rx="2.4" />
      <path className="phone-glyph__camera" d="M14 7.8h4" />
      <circle className="phone-glyph__lens" cx="16" cy="15.5" r="3.2" />
      <circle className="phone-glyph__dot" cx="16" cy="15.5" r="1.1" />
      <path className="phone-glyph__home" d="M14.6 26h2.8" />
    </svg>
  );
}

export default function EquipoTable({ equipos, tiendas, onUpdated }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEstado, setEditEstado] = useState<EstadoEquipo>('RECIBIDO');
  const [menuId, setMenuId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const tiendaMap = Object.fromEntries(tiendas.map((t) => [t.id, t.nombre]));
  const ganancia = (eq: Equipo) => (eq.precio ?? 0) - (eq.costoPieza ?? 0) - (eq.otrosCostos ?? 0);

  const startEdit = (equipo: Equipo) => {
    setMenuId(null);
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

  const handleDelete = async (eq: Equipo) => {
    setMenuId(null);
    const ok = window.confirm(
      `¿Eliminar el equipo ${eq.modelo} (IMEI ${eq.imei})?\n\nSe puede recuperar luego (borrado suave).`,
    );
    if (!ok) return;
    await deleteEquipo(eq.id);
    onUpdated();
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
      {equipos.map((eq) => {
        const g = ganancia(eq);
        const expanded = expandedId === eq.id;
        return (
          <article key={eq.id} className="equipment-card">
            <div
              className="equipment-card__top equipment-card__top--clickable"
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={() => setExpandedId(expanded ? null : eq.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedId(expanded ? null : eq.id);
                }
              }}
            >
              <div className="equipment-title">
                <span className="equipment-thumb"><PhoneIcon /></span>
                <div>
                  <strong>{eq.modelo}</strong>
                  <span>{new Date(eq.fechaIngreso).toLocaleString('es-BO')}</span>
                  <span className="imei-cell">{eq.imei}</span>
                </div>
              </div>

              <div className="card-head-right" onClick={(e) => e.stopPropagation()}>
                <span className={`badge badge--${eq.estado.toLowerCase().replace(/_/g, '-')}`}>
                  {ESTADO_LABELS[eq.estado]}
                </span>
                <div className="menu-wrap">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Acciones"
                    aria-haspopup="true"
                    aria-expanded={menuId === eq.id}
                    onClick={() => setMenuId(menuId === eq.id ? null : eq.id)}
                  >
                    ⋮
                  </button>
                  {menuId === eq.id && (
                    <>
                      <div className="menu-backdrop" onClick={() => setMenuId(null)} />
                      <div className="menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => navigate(`/equipos/${eq.id}`)}>
                          Ver detalle
                        </button>
                        <button type="button" role="menuitem" onClick={() => startEdit(eq)}>
                          Cambiar estado
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="menu-item--danger"
                          onClick={() => handleDelete(eq)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {expanded && (
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
                <span>Foto IMEI</span>
                {isViewableImagePath(eq.imagenRuta) ? (
                  <div className="imei-photo-preview">
                    <img src={eq.imagenRuta} alt={`Foto del IMEI de ${eq.modelo}`} loading="lazy" />
                    <a
                      className="imei-photo-link"
                      href={eq.imagenRuta}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver grande
                    </a>
                  </div>
                ) : (
                  <strong className="muted-value">Sin foto guardada</strong>
                )}
              </div>
              <div>
                <span>Total cobrado</span>
                <strong>{fmtBs(eq.precio)}</strong>
              </div>
              <div>
                <span>Ganancia</span>
                <strong className={g > 0 ? 'gan-pos' : g < 0 ? 'gan-neg' : 'gan-zero'}>
                  {g > 0 ? '+ ' : g < 0 ? '− ' : ''}{fmtBs(Math.abs(g))}
                </strong>
              </div>
              <div>
                <span>Tienda</span>
                <strong>{eq.tiendaId ? tiendaMap[eq.tiendaId] ?? '-' : '-'}</strong>
              </div>
            </div>
            )}

            {editingId === eq.id && (
              <div className="estado-editor">
                <select
                  className="input input--sm"
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value as EstadoEquipo)}
                >
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>{ESTADO_LABELS[s]}</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-xs" onClick={() => saveEstado(eq.id)} disabled={saving}>
                  Guardar
                </button>
                <button className="btn btn-secondary btn-xs" onClick={() => setEditingId(null)}>
                  Cancelar
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
