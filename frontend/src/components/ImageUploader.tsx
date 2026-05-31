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
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const result = await extractImei(file);
      onResult(result);
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
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="uploader">
      <div
        className={`drop-zone ${loading ? 'drop-zone--loading' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <img src={preview} alt="Vista previa" className="preview-img" />
        ) : (
          <div className="drop-placeholder">
            <span className="drop-icon">OCR</span>
            <p className="drop-title">Arrastra una imagen del IMEI</p>
            <p className="drop-copy">
              La vista previa aparece al instante y el OCR detecta los numeros para confirmar.
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
          onClick={() => {
            setPreview(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          Cambiar imagen
        </button>
      )}
    </div>
  );
}
