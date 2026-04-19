import { useEffect, useState, useCallback } from 'react';
import { getEquipos, getTiendas } from '../api/client';
import { Equipo, EstadoEquipo, ESTADO_LABELS, ESTADOS, Tienda } from '../types';
import EquipoTable from '../components/EquipoTable';

interface Filters {
  imei: string;
  cliente: string;
  tiendaId: string;
  estado: string;
  servicio: string;
  fechaDesde: string;
  fechaHasta: string;
}

const EMPTY_FILTERS: Filters = {
  imei: '', cliente: '', tiendaId: '', estado: '',
  servicio: '', fechaDesde: '', fechaHasta: '',
};

export default function Equipos() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);

  const fetchEquipos = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.imei) params.imei = filters.imei;
      if (filters.cliente) params.cliente = filters.cliente;
      if (filters.tiendaId) params.tiendaId = filters.tiendaId;
      if (filters.estado) params.estado = filters.estado;
      if (filters.servicio) params.servicio = filters.servicio;
      if (filters.fechaDesde) params.fechaDesde = filters.fechaDesde;
      if (filters.fechaHasta) params.fechaHasta = filters.fechaHasta;
      const data = await getEquipos(params as Parameters<typeof getEquipos>[0]);
      setEquipos(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchEquipos(); }, [fetchEquipos]);
  useEffect(() => { getTiendas().then(setTiendas).catch(() => {}); }, []);

  const set = (field: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Historial de equipos</h1>
        <p className="page-sub">{equipos.length} equipo{equipos.length !== 1 ? 's' : ''} encontrado{equipos.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="card">
        <h3 className="card-title">Filtros</h3>
        <div className="filter-grid">
          <div className="field">
            <label>Buscar por IMEI</label>
            <input className="input" placeholder="15 dígitos..." value={filters.imei} onChange={set('imei')} />
          </div>
          <div className="field">
            <label>Cliente</label>
            <input className="input" placeholder="Nombre..." value={filters.cliente} onChange={set('cliente')} />
          </div>
          <div className="field">
            <label>Servicio</label>
            <input className="input" placeholder="Ej: pantalla..." value={filters.servicio} onChange={set('servicio')} />
          </div>
          <div className="field">
            <label>Estado</label>
            <select className="input" value={filters.estado} onChange={set('estado')}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABELS[e as EstadoEquipo]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Tienda</label>
            <select className="input" value={filters.tiendaId} onChange={set('tiendaId')}>
              <option value="">Todas</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Desde</label>
            <input className="input" type="date" value={filters.fechaDesde} onChange={set('fechaDesde')} />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input className="input" type="date" value={filters.fechaHasta} onChange={set('fechaHasta')} />
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          Limpiar filtros
        </button>
      </div>

      {loading ? (
        <div className="loading-msg">Cargando equipos...</div>
      ) : (
        <EquipoTable equipos={equipos} tiendas={tiendas} onUpdated={fetchEquipos} />
      )}
    </div>
  );
}
