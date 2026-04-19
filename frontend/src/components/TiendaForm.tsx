import { useState } from 'react';
import { createTienda, updateTienda } from '../api/client';
import { Tienda } from '../types';

interface Props {
  tienda?: Tienda;
  onSaved: () => void;
  onCancel?: () => void;
}

export default function TiendaForm({ tienda, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    nombre: tienda?.nombre ?? '',
    telefono: tienda?.telefono ?? '',
    observaciones: tienda?.observaciones ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setError('El nombre de la tienda es requerido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (tienda) {
        await updateTienda(tienda.id, form);
      } else {
        await createTienda(form);
      }
      onSaved();
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 className="card-title">{tienda ? 'Editar tienda' : 'Nueva tienda'}</h3>

      <div className="field">
        <label>Nombre *</label>
        <input className="input" value={form.nombre} onChange={set('nombre')} placeholder="Nombre de la tienda" />
      </div>

      <div className="field">
        <label>Teléfono</label>
        <input className="input" value={form.telefono} onChange={set('telefono')} placeholder="Ej: 11 1234 5678" />
      </div>

      <div className="field">
        <label>Observaciones</label>
        <textarea className="input" rows={2} value={form.observaciones} onChange={set('observaciones')} placeholder="Dirección, notas..." />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="action-group">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Guardando...' : tienda ? 'Actualizar' : 'Crear tienda'}
        </button>
        {onCancel && (
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
