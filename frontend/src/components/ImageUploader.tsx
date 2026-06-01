import { useRef, useState } from 'react';
import { extractImei } from '../api/client';
import { downscaleImage } from '../lib/downscaleImage';
import { OcrResponse } from '../types';

interface Props {
  onResult: (result: OcrResponse) => void;
}

export default function ImageUploader({ onResult }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [successResult, setSuccessResult] = useState<OcrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccessResult(null);
    setLoading(true);
    try {
      // Reducimos en el cliente antes de subir: foto típica 5-12 MB → ~300 KB.
      const optimized = await downscaleImage(file);
      setPreview(URL.createObjectURL(optimized));
      const result = await extractImei(optimized);
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
    if (cameraRef.current) cameraRef.current.value = '';
    if (uploadRef.current) uploadRef.current.value = '';
  };

  return (
    <div className="uploader">
      <div
        className={`drop-zone ${loading ? 'drop-zone--loading' : ''} ${dragging ? 'drop-zone--drag' : ''} ${successResult ? 'drop-zone--success' : ''}`}
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
            <p className="drop-title">{dragging ? 'Suelta la imagen' : 'Escanea el IMEI'}</p>
            <p className="drop-copy">
              {dragging
                ? 'El OCR empieza apenas entre el archivo.'
                : 'Toma una foto del IMEI o sube una imagen. El OCR detecta los numeros para confirmar.'}
            </p>
            <div className="capture-actions">
              <button
                type="button"
                className="btn btn-primary capture-btn"
                onClick={() => cameraRef.current?.click()}
              >
                <span aria-hidden="true">📸</span> Tomar foto
              </button>
              <button
                type="button"
                className="btn btn-secondary capture-btn"
                onClick={() => uploadRef.current?.click()}
              >
                <span aria-hidden="true">🖼️</span> Subir imagen
              </button>
            </div>
            <p className="drop-hint">o arrastra una imagen aqui</p>
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

      {/* Cámara trasera directa en móvil */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={onInputChange}
      />
      {/* Galería / archivos */}
      <input
        ref={uploadRef}
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
