import { useEffect, useState } from 'react';
import { getTiendas } from '../api/client';
import { Tienda } from '../types';
import TiendaForm from '../components/TiendaForm';
import TiendaTable from '../components/TiendaTable';

export default function Tiendas() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      setTiendas(await getTiendas());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tiendas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nueva tienda'}
        </button>
      </div>

      {showForm && (
        <TiendaForm onSaved={() => { setShowForm(false); fetch(); }} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="loading-msg">Cargando...</div>
      ) : (
        <TiendaTable tiendas={tiendas} onUpdated={fetch} />
      )}
    </div>
  );
}
