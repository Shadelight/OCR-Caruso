import { useState, useEffect } from 'react';
import ImageUploader from '../components/ImageUploader';
import ImeiConfirm from '../components/ImeiConfirm';
import EquipoForm from '../components/EquipoForm';
import { OcrResponse } from '../types';
import { getHealth, getEquipos } from '../api/client';

type Step = 'upload' | 'confirm' | 'form' | 'done';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
  const [confirmedImei, setConfirmedImei] = useState('');
  const [confirmedImei2, setConfirmedImei2] = useState<string | null>(null);
  const [confirmedImagen, setConfirmedImagen] = useState('');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [totalEquipos, setTotalEquipos] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getHealth().then((ok) => {
      if (!alive) return;
      setBackendOk(ok);
      if (ok) getEquipos().then((e) => alive && setTotalEquipos(e.length)).catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, [step]);

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

  const goBackToUpload = () => {
    setOcrResult(null);
    setConfirmedImei('');
    setConfirmedImei2(null);
    setConfirmedImagen('');
    setStep('upload');
  };

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

  const handleStepClick = (target: Step) => {
    const stepOrder: Step[] = ['upload', 'confirm', 'form', 'done'];
    const currentIdx = stepOrder.indexOf(step);
    const targetIdx = stepOrder.indexOf(target);
    if (targetIdx >= currentIdx) return;

    if (target === 'upload') goBackToUpload();
    else if (target === 'confirm' && ocrResult) goBackToConfirm();
  };

  return (
    <div className="page">
      <section className="hero-card">
        <span className="hero-kicker">OCR automatico</span>
        <h1>Ingreso de equipos por IMEI</h1>
        <p className="page-sub">
          Foto → IMEI detectado → registro. Sin friccion.
        </p>
        <div className="hero-metrics" aria-label="Estado del sistema">
          <div className="hero-metric">
            <strong>
              <span
                className={`live-dot ${backendOk === null ? 'live-dot--wait' : backendOk ? 'live-dot--ok' : 'live-dot--off'}`}
              />
              {backendOk === null ? '...' : backendOk ? 'Online' : 'Offline'}
            </strong>
            <span>Backend</span>
          </div>
          <div className="hero-metric">
            <strong>Listo</strong>
            <span>OCR</span>
          </div>
          <div className="hero-metric">
            <strong>{totalEquipos === null ? '—' : totalEquipos}</strong>
            <span>Procesados</span>
          </div>
        </div>
      </section>

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
              title={clickable ? 'Volver a este paso' : undefined}
            >
              <div className="step-num">{i + 1}</div>
              <div className="step-label">
                {s === 'upload' ? 'Subir' : s === 'confirm' ? 'Confirmar' : 'Registrar'}
              </div>
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="card motion-card">
          <h2 className="card-title">Escanea el IMEI</h2>
          <p className="card-sub">Toma una foto o sube una imagen. OCR automatico con vista previa inmediata.</p>
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
            fue guardado y sincronizado con Google Sheets.
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
