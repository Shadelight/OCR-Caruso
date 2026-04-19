import { useState } from 'react';
import { OcrResponse } from '../types';

interface Props {
  ocrResult: OcrResponse;
  onConfirm: (imei: string, imagenRuta: string) => void;
}

export default function ImeiConfirm({ ocrResult, onConfirm }: Props) {
  const [selected, setSelected] = useState(ocrResult.candidatos[0] || '');
  const [manual, setManual] = useState('');
  const [mode, setMode] = useState<'candidatos' | 'manual'>(
    ocrResult.candidatos.length > 0 ? 'candidatos' : 'manual',
  );

  const handleConfirm = () => {
    const imei = mode === 'manual' ? manual.trim() : selected;
    if (!imei || imei.length < 14) {
      alert('IMEI inválido. Debe tener al menos 14 dígitos.');
      return;
    }
    onConfirm(imei, ocrResult.imagenRuta);
  };

  return (
    <div className="card">
      <h2 className="card-title">Confirmar IMEI</h2>

      {ocrResult.candidatos.length === 0 ? (
        <div className="alert alert-warning">
          No se detectó ningún IMEI en la imagen. Ingresalo manualmente.
        </div>
      ) : (
        <>
          <div className="tab-group">
            <button
              className={`tab ${mode === 'candidatos' ? 'tab--active' : ''}`}
              onClick={() => setMode('candidatos')}
            >
              Detectados ({ocrResult.candidatos.length})
            </button>
            <button
              className={`tab ${mode === 'manual' ? 'tab--active' : ''}`}
              onClick={() => setMode('manual')}
            >
              Ingresar manualmente
            </button>
          </div>
        </>
      )}

      {mode === 'candidatos' && ocrResult.candidatos.length > 0 && (
        <div className="candidates-list">
          {ocrResult.candidatos.map((c) => (
            <label key={c} className={`candidate-item ${selected === c ? 'candidate-item--selected' : ''}`}>
              <input
                type="radio"
                name="imei"
                value={c}
                checked={selected === c}
                onChange={() => setSelected(c)}
              />
              <span className="candidate-imei">{c}</span>
            </label>
          ))}
        </div>
      )}

      {mode === 'manual' && (
        <div className="field">
          <label>IMEI</label>
          <input
            type="text"
            placeholder="15 dígitos"
            maxLength={16}
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
            className="input"
          />
        </div>
      )}

      <div className="imei-preview">
        <span>IMEI seleccionado:</span>
        <strong>{mode === 'manual' ? manual || '—' : selected || '—'}</strong>
      </div>

      <button className="btn btn-primary" onClick={handleConfirm}>
        Confirmar IMEI y continuar
      </button>
    </div>
  );
}
