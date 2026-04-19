import { useState } from 'react';
import ImageUploader from '../components/ImageUploader';
import ImeiConfirm from '../components/ImeiConfirm';
import EquipoForm from '../components/EquipoForm';
import { OcrResponse } from '../types';

type Step = 'upload' | 'confirm' | 'form' | 'done';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
  const [confirmedImei, setConfirmedImei] = useState('');
  const [confirmedImei2, setConfirmedImei2] = useState<string | null>(null);
  const [confirmedImagen, setConfirmedImagen] = useState('');

  const handleOcrResult = (result: OcrResponse) => {
    setOcrResult(result);
    setStep('confirm');
  };

  const handleImeiConfirm = (
    imei: string,
    imei2: string | null,
    imagenRuta: string,
  ) => {
    setConfirmedImei(imei);
    setConfirmedImei2(imei2);
    setConfirmedImagen(imagenRuta);
    setStep('form');
  };

  const handleSaved = () => {
    setStep('done');
  };

  const reset = () => {
    setStep('upload');
    setOcrResult(null);
    setConfirmedImei('');
    setConfirmedImei2(null);
    setConfirmedImagen('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Nuevo ingreso</h1>
        <p className="page-sub">Subí una imagen con el IMEI del dispositivo para comenzar</p>
      </div>

      <div className="steps">
        {(['upload', 'confirm', 'form'] as Step[]).map((s, i) => (
          <div key={s} className={`step ${step === s ? 'step--active' : ''} ${
            ['upload', 'confirm', 'form', 'done'].indexOf(step) > i ? 'step--done' : ''
          }`}>
            <div className="step-num">{i + 1}</div>
            <div className="step-label">
              {s === 'upload' ? 'Subir imagen' : s === 'confirm' ? 'Confirmar IMEI' : 'Registrar'}
            </div>
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="card">
          <h2 className="card-title">Subir imagen</h2>
          <p className="card-sub">Captura de pantalla, foto del IMEI (*#06#) o etiqueta trasera</p>
          <ImageUploader onResult={handleOcrResult} />
        </div>
      )}

      {step === 'confirm' && ocrResult && (
        <ImeiConfirm ocrResult={ocrResult} onConfirm={handleImeiConfirm} />
      )}

      {step === 'form' && (
        <EquipoForm
          imei={confirmedImei}
          imei2={confirmedImei2}
          imagenRuta={confirmedImagen}
          onSaved={handleSaved}
        />
      )}

      {step === 'done' && (
        <div className="card card--success">
          <div className="success-icon">✓</div>
          <h2>Equipo registrado correctamente</h2>
          <p>
            El equipo con IMEI <strong>{confirmedImei}</strong>
            {confirmedImei2 && (
              <>
                {' '}y <strong>{confirmedImei2}</strong>
              </>
            )}{' '}
            fue guardado en la base de datos y sincronizado con Google Sheets.
          </p>
          <div className="action-group">
            <button className="btn btn-primary" onClick={reset}>
              Registrar otro equipo
            </button>
            <a className="btn btn-secondary" href="/equipos">
              Ver historial
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
