import { useEffect, useMemo, useState } from 'react';
import { createEquipo, getTiendas } from '../api/client';
import { EstadoEquipo, ESTADOS, ESTADO_LABELS, Tienda } from '../types';
import ModeloPicker from './ModeloPicker';

interface Props {
  imei: string;
  imei2?: string | null;
  imagenRuta: string;
  onSaved: () => void;
  onBack?: () => void;
}

const num = (s: string): number => parseFloat(s) || 0;
const fmtBs = (n: number): string =>
  `Bs. ${Math.abs(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EquipoForm({ imei, imei2, imagenRuta, onSaved, onBack }: Props) {
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fechaIngreso: localIso,
    modelo: '',
    clienteNombre: '',
    clienteTelefono: '',
    tiendaId: '',
    servicio: '',
    costoPieza: '',
    manoDeObra: '',
    otrosCostos: '',
    precio: '',
    observaciones: '',
    estado: 'RECIBIDO' as EstadoEquipo,
  });

  useEffect(() => {
    getTiendas().then(setTiendas).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // Ganancia = total cobrado − (costo pieza + otros costos). La mano de obra
  // no se resta: es lo que ganás por el trabajo.
  const ganancia = useMemo(
    () => num(form.precio) - num(form.costoPieza) - num(form.otrosCostos),
    [form.precio, form.costoPieza, form.otrosCostos],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.modelo || !form.clienteNombre || !form.servicio) {
      setError('Completa los campos obligatorios: modelo, cliente y servicio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEquipo({
        ...form,
        imei,
        imei2: imei2 ?? null,
        imagenRuta,
        precio: num(form.precio),
        costoPieza: num(form.costoPieza),
        manoDeObra: num(form.manoDeObra),
        otrosCostos: num(form.otrosCostos),
        tiendaId: form.tiendaId ? parseInt(form.tiendaId, 10) : undefined,
      });
      onSaved();
    } catch {
      setError('Error al guardar el equipo. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const money = (field: 'costoPieza' | 'manoDeObra' | 'otrosCostos' | 'precio', label: string) => (
    <div className="field">
      <label>{label}</label>
      <div className="input-prefix">
        <span className="input-prefix__tag">Bs.</span>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={form[field]}
          onChange={set(field)}
        />
      </div>
    </div>
  );

  return (
    <form className="card equipo-form" onSubmit={handleSubmit}>
      <h2 className="card-title">Registrar equipo</h2>
      <p className="card-sub">Completa los datos del servicio antes de sincronizar.</p>

      {/* ── Datos técnicos ─────────────────────────────────────────────── */}
      <span className="form-section">Datos técnicos</span>

      <div className="imei-badges">
        <div className="imei-badge">
          <span className="imei-badge__label">IMEI 1</span>
          <span className="imei-badge__value">{imei}</span>
        </div>
        {imei2 && (
          <div className="imei-badge">
            <span className="imei-badge__label">IMEI 2</span>
            <span className="imei-badge__value">{imei2}</span>
          </div>
        )}
      </div>

      <div className="field">
        <label>Fecha y hora de ingreso *</label>
        <input className="input" type="datetime-local" value={form.fechaIngreso} onChange={set('fechaIngreso')} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Modelo del telefono *</label>
          <ModeloPicker
            value={form.modelo}
            onChange={(v) => setForm((f) => ({ ...f, modelo: v }))}
            placeholder="Buscar iPhone…"
          />
        </div>
        <div className="field">
          <label>Estado *</label>
          <select className="input" value={form.estado} onChange={set('estado')}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Cliente ────────────────────────────────────────────────────── */}
      <span className="form-section">Cliente</span>

      <div className="field-row">
        <div className="field">
          <label>Nombre del cliente *</label>
          <input className="input" placeholder="Nombre completo" value={form.clienteNombre} onChange={set('clienteNombre')} />
        </div>
        <div className="field">
          <label>Telefono del cliente</label>
          <input className="input" placeholder="Ej: 11 2345 6789" value={form.clienteTelefono} onChange={set('clienteTelefono')} />
        </div>
      </div>

      {/* ── Servicio ───────────────────────────────────────────────────── */}
      <span className="form-section">Servicio</span>

      <div className="field-row">
        <div className="field">
          <label>Servicio *</label>
          <input className="input" placeholder="Ej: Cambio de pantalla" value={form.servicio} onChange={set('servicio')} />
        </div>
        <div className="field">
          <label>Tienda asociada</label>
          <select className="input" value={form.tiendaId} onChange={set('tiendaId')}>
            <option value="">Sin tienda</option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Observaciones</label>
        <textarea className="input" rows={3} placeholder="Estado fisico, accesorios, notas..." value={form.observaciones} onChange={set('observaciones')} />
      </div>

      {/* ── Costos (sí restan de la ganancia) ──────────────────────────── */}
      <span className="form-section">💰 Costos</span>
      <div className="field-row">
        {money('costoPieza', 'Costo de pieza')}
        {money('otrosCostos', 'Otros costos')}
      </div>

      {/* ── Mano de obra (informativa, NO resta) ───────────────────────── */}
      <span className="form-section">🛠 Mano de obra</span>
      {money('manoDeObra', 'Mano de obra')}
      <p className="field-hint">Es tu cobro por el trabajo (informativo): no se resta de la ganancia.</p>

      {/* ── Cobro ──────────────────────────────────────────────────────── */}
      <span className="form-section">💵 Cobro</span>
      {money('precio', 'Total cobrado')}

      {/* ── Resultado ──────────────────────────────────────────────────── */}
      <div className={`ganancia-card ganancia-card--${ganancia > 0 ? 'pos' : ganancia < 0 ? 'neg' : 'zero'}`}>
        <span className="ganancia-card__label">Ganancia estimada</span>
        <strong className="ganancia-card__value">
          {ganancia > 0 ? '+ ' : ganancia < 0 ? '− ' : ''}{fmtBs(ganancia)}
        </strong>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="action-group">
        {onBack && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onBack}
            disabled={saving}
          >
            ← Volver
          </button>
        )}
        <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Registrar equipo'}
        </button>
      </div>
    </form>
  );
}
