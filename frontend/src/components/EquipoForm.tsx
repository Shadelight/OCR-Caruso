import { useEffect, useState } from 'react';
import { createEquipo, getTiendas } from '../api/client';
import { EstadoEquipo, ESTADOS, ESTADO_LABELS, Tienda } from '../types';

interface Props {
  imei: string;
  imagenRuta: string;
  onSaved: () => void;
}

export default function EquipoForm({ imei, imagenRuta, onSaved }: Props) {
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
    precio: '',
    observaciones: '',
    estado: 'RECIBIDO' as EstadoEquipo,
  });

  useEffect(() => {
    getTiendas().then(setTiendas).catch(() => {});
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.modelo || !form.clienteNombre || !form.servicio) {
      setError('Completá los campos obligatorios: modelo, cliente y servicio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEquipo({
        ...form,
        imei,
        imagenRuta,
        precio: parseFloat(form.precio) || 0,
        tiendaId: form.tiendaId ? parseInt(form.tiendaId, 10) : undefined,
      });
      onSaved();
    } catch {
      setError('Error al guardar el equipo. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card equipo-form" onSubmit={handleSubmit}>
      <h2 className="card-title">Registrar equipo</h2>

      <div className="field-row">
        <div className="field">
          <label>IMEI</label>
          <input className="input" value={imei} readOnly />
        </div>
        <div className="field">
          <label>Fecha y hora de ingreso *</label>
          <input className="input" type="datetime-local" value={form.fechaIngreso} onChange={set('fechaIngreso')} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Modelo del teléfono *</label>
          <input className="input" placeholder="Ej: Samsung Galaxy A54" value={form.modelo} onChange={set('modelo')} />
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

      <div className="field-row">
        <div className="field">
          <label>Nombre del cliente *</label>
          <input className="input" placeholder="Nombre completo" value={form.clienteNombre} onChange={set('clienteNombre')} />
        </div>
        <div className="field">
          <label>Teléfono del cliente</label>
          <input className="input" placeholder="Ej: 11 2345 6789" value={form.clienteTelefono} onChange={set('clienteTelefono')} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Servicio *</label>
          <input className="input" placeholder="Ej: Cambio de pantalla" value={form.servicio} onChange={set('servicio')} />
        </div>
        <div className="field">
          <label>Precio</label>
          <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.precio} onChange={set('precio')} />
        </div>
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

      <div className="field">
        <label>Observaciones</label>
        <textarea className="input" rows={3} placeholder="Estado físico, accesorios, notas..." value={form.observaciones} onChange={set('observaciones')} />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar equipo'}
      </button>
    </form>
  );
}
