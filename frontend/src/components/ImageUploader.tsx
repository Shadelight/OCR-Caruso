import { useRef, useState } from 'react';
import { extractImei } from '../api/client';
import { OcrResponse } from '../types';

interface Props {
  onResult: (result: OcrResponse) => void;
}

export default function ImageUploader({ onResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [successResult, setSuccessResult] = useState<OcrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccessResult(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const result = await extractImei(file);
      setSuccessResult(result);
      window.setTimeout(() => onResult(result), 650);
    } catch {
      setError('Error al procesar la imagen. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setPreview(null);
    setSuccessResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="uploader">
      <div
        className={`drop-zone ${loading ? 'drop-zone--loading' : ''} ${dragging ? 'drop-zone--drag' : ''} ${successResult ? 'drop-zone--success' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
      >
        {preview ? (
          <div className="upload-preview-grid">
            <div className="preview-frame">
              <img src={preview} alt="Vista previa" className="preview-img" />
              {(loading || successResult) && <span className="scan-line" aria-hidden="true" />}
            </div>
            <div className="preview-side">
              <span className={`preview-status ${successResult ? 'preview-status--ok' : ''}`}>
                {successResult ? 'Detectado' : loading ? 'Procesando' : 'Vista previa'}
              </span>
              <strong>{successResult ? 'IMEI listo' : loading ? 'OCR en vivo' : 'Imagen cargada'}</strong>
              <div className="preview-imeis">
                <span>IMEI 1</span>
                <b>{successResult?.candidatos[0] ?? 'Analizando...'}</b>
                <span>IMEI 2</span>
                <b>{successResult?.candidatos[1] ?? '-'}</b>
              </div>
            </div>
          </div>
        ) : (
          <div className="drop-placeholder">
            <span className="drop-icon">OCR</span>
            <p className="drop-title">{dragging ? 'Suelta la imagen' : 'Arrastra una imagen del IMEI'}</p>
            <p className="drop-copy">
              {dragging
                ? 'El OCR empieza apenas entre el archivo.'
                : 'La vista previa aparece al instante y el OCR detecta los numeros para confirmar.'}
            </p>
            <div className="drop-chips">
              <span className="drop-chip">JPG</span>
              <span className="drop-chip">PNG</span>
              <span className="drop-chip">TIFF</span>
              <span className="drop-chip">Hasta 10 MB</span>
            </div>
            <p className="drop-hint">Click para seleccionar archivo</p>
          </div>
        )}

        {loading && (
          <div className="drop-overlay">
            <div className="spinner" />
            <strong>Analizando imagen con OCR</strong>
            <div className="ocr-progress" aria-hidden="true">
              <span />
            </div>
            <p className="drop-copy">Buscando patrones de IMEI y limpiando la lectura.</p>
          </div>
        )}

        {successResult && (
          <div className="drop-success" aria-live="polite">
            <div className="success-icon success-icon--sm">✓</div>
            <strong>IMEI detectado</strong>
            <span>Pasando a confirmacion...</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onInputChange}
      />

      {error && <p className="error-msg">{error}</p>}

      {preview && !loading && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={reset}
        >
          Cambiar imagen
        </button>
      )}
    </div>
  );
}
