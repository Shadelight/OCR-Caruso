import { useMemo, useState } from 'react';
import { OcrResponse } from '../types';

interface Props {
  ocrResult: OcrResponse;
  /**
   * Se llama con los IMEIs finales elegidos:
   * - imei1: obligatorio
   * - imei2: opcional (null si el equipo es single-SIM)
   */
  onConfirm: (imei1: string, imei2: string | null, imagenRuta: string) => void;
  /** Volver al paso anterior (subir otra imagen). */
  onBack: () => void;
}

function isValidImei(raw: string): boolean {
  return /^\d{15}$/.test(raw);
}

export default function ImeiConfirm({ ocrResult, onConfirm, onBack }: Props) {
  // Por defecto: marcar todos los candidatos detectados (hasta 2).
  // Si el OCR detecta 1, queda 1 marcado.
  // Si detecta 2, quedan los 2 marcados (el usuario puede destildar uno).
  const detectados = ocrResult.candidatos.slice(0, 2);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(detectados),
  );
  const [manualExtra, setManualExtra] = useState('');
  const [manualList, setManualList] = useState<string[]>([]);

  const toggle = (imei: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(imei)) next.delete(imei);
      else next.add(imei);
      return next;
    });
  };

  const addManual = () => {
    const clean = manualExtra.trim();
    if (!isValidImei(clean)) {
      alert('El IMEI debe tener exactamente 15 dígitos.');
      return;
    }
    if (manualList.includes(clean) || detectados.includes(clean)) {
      alert('Ese IMEI ya está en la lista.');
      return;
    }
    setManualList((l) => [...l, clean]);
    setSelected((prev) => new Set(prev).add(clean));
    setManualExtra('');
  };

  const removeManual = (imei: string) => {
    setManualList((l) => l.filter((x) => x !== imei));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(imei);
      return next;
    });
  };

  // Lista unificada, respetando orden: primero detectados, después manuales
  const allImeis = useMemo(
    () => [...detectados, ...manualList],
    [detectados, manualList],
  );

  const elegidos = allImeis.filter((i) => selected.has(i));
  const imei1 = elegidos[0];
  const imei2 = elegidos[1] ?? null;

  const handleConfirm = () => {
    if (!imei1) {
      alert('Tenés que seleccionar al menos un IMEI.');
      return;
    }
    onConfirm(imei1, imei2, ocrResult.imagenRuta);
  };

  const sinCandidatos = detectados.length === 0 && manualList.length === 0;

  return (
    <div className="card">
      <h2 className="card-title">Confirmar IMEI(s)</h2>

      {sinCandidatos && (
        <div className="alert alert-warning">
          No se detectó ningún IMEI en la imagen. Ingresalo manualmente abajo.
        </div>
      )}

      {detectados.length > 0 && (
        <>
          <p className="card-sub">
            Detectados en la imagen. Marcá los que correspondan
            {detectados.length > 1 ? ' (podés elegir uno o los dos)' : ''}.
          </p>
          <div className="candidates-list">
            {detectados.map((c, idx) => (
              <label
                key={c}
                className={`candidate-item ${
                  selected.has(c) ? 'candidate-item--selected' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(c)}
                  onChange={() => toggle(c)}
                />
                <span className="candidate-label">
                  IMEI {idx + 1}
                </span>
                <span className="candidate-imei">{c}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {manualList.length > 0 && (
        <div className="candidates-list">
          {manualList.map((c) => (
            <label
              key={c}
              className={`candidate-item ${
                selected.has(c) ? 'candidate-item--selected' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(c)}
                onChange={() => toggle(c)}
              />
              <span className="candidate-label">Manual</span>
              <span className="candidate-imei">{c}</span>
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  removeManual(c);
                }}
              >
                Quitar
              </button>
            </label>
          ))}
        </div>
      )}

      <div className="field">
        <label>Agregar IMEI manualmente</label>
        <div className="inline-form">
          <input
            type="text"
            placeholder="15 dígitos"
            maxLength={15}
            value={manualExtra}
            onChange={(e) => setManualExtra(e.target.value.replace(/\D/g, ''))}
            className="input"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={addManual}
            disabled={manualExtra.length !== 15}
          >
            Agregar
          </button>
        </div>
      </div>

      <div className="imei-preview">
        <div>
          <span>IMEI 1:</span>
          <strong>{imei1 ?? '—'}</strong>
        </div>
        <div>
          <span>IMEI 2:</span>
          <strong>{imei2 ?? '—'}</strong>
        </div>
      </div>

      <div className="action-group">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
        >
          ← Subir otra imagen
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!imei1}
        >
          {imei2
            ? 'Confirmar 2 IMEIs y continuar'
            : 'Confirmar IMEI y continuar'}
        </button>
      </div>
    </div>
  );
}
