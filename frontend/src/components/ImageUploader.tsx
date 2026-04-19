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
      setError('Error al procesar la imagen. Intentá de nuevo.');
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
            <span className="drop-icon">📷</span>
            <p>Arrastrá una imagen aquí o hacé clic para seleccionar</p>
            <p className="drop-hint">JPG, PNG, BMP, TIFF hasta 10 MB</p>
          </div>
        )}
        {loading && (
          <div className="drop-overlay">
            <div className="spinner" />
            <p>Analizando imagen con OCR...</p>
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
