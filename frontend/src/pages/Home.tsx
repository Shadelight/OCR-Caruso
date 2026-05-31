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

  /** Volver a subir otra imagen (descarta el resultado OCR actual). */
  const goBackToUpload = () => {
    setOcrResult(null);
    setConfirmedImei('');
    setConfirmedImei2(null);
    setConfirmedImagen('');
    setStep('upload');
  };

  /** Volver al paso de confirmar IMEI (mantiene el resultado OCR). */
  const goBackToConfirm = () => {
    setStep('confirm');
  };

  const reset = () => {
    setStep('upload');
    setOcrResult(null);
    setConfirmedImei('');
    setConfirmedImei2(null);
    setConfirmedImagen('');
  };

  /** Permite saltar entre pasos haciendo clic en el indicador de pasos. */
  const handleStepClick = (target: Step) => {
    const stepOrder: Step[] = ['upload', 'confirm', 'form', 'done'];
    const currentIdx = stepOrder.indexOf(step);
    const targetIdx = stepOrder.indexOf(target);
    // Solo dejar retroceder (no saltar hacia adelante sin completar)
    if (targetIdx >= currentIdx) return;

    if (target === 'upload') goBackToUpload();
    else if (target === 'confirm' && ocrResult) goBackToConfirm();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Nuevo ingreso</h1>
        <p className="page-sub">Subí una imagen con el IMEI del dispositivo para comenzar</p>
      </div>

      <div className="steps">
        {(['upload', 'confirm', 'form'] as Step[]).map((s, i) => {
          const stepOrder: Step[] = ['upload', 'confirm', 'form', 'done'];
          const isDone = stepOrder.indexOf(step) > i;
          const isActive = step === s;
          const clickable = isDone;
          return (
            <div
              key={s}
              onClick={clickable ? () => handleStepClick(s) : undefined}
              className={`step ${isActive ? 'step--active' : ''} ${isDone ? 'step--done' : ''} ${clickable ? 'step--clickable' : ''}`}
              title={clickable ? 'Hacé clic para volver a este paso' : undefined}
            >
              <div className="step-num">{i + 1}</div>
              <div className="step-label">
                {s === 'upload' ? 'Subir imagen' : s === 'confirm' ? 'Confirmar IMEI' : 'Registrar'}
              </div>
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="card">
          <h2 className="card-title">Subir imagen</h2>
          <p className="card-sub">Captura de pantalla, foto del IMEI o etiqueta trasera</p>
          <ImageUploader onResult={handleOcrResult} />
        </div>
      )}

      {step === 'confirm' && ocrResult && (
        <ImeiConfirm
          ocrResult={ocrResult}
          onConfirm={handleImeiConfirm}
          onBack={goBackToUpload}
        />
      )}

      {step === 'form' && (
        <EquipoForm
          imei={confirmedImei}
          imei2={confirmedImei2}
          imagenRuta={confirmedImagen}
          onSaved={handleSaved}
          onBack={goBackToConfirm}
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
