import axios from 'axios';
import { Equipo, Tienda, OcrResponse } from '../types';

// En dev queda vacío y usa el proxy de Vite (/api → localhost:3001).
// En producción, VITE_API_URL apunta al backend (ej: https://xxx.onrender.com/api).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// ─── OCR ────────────────────────────────────────────────────────────────────

export async function extractImei(file: File): Promise<OcrResponse> {
  const form = new FormData();
  form.append('imagen', file);
  const res = await api.post<OcrResponse>('/ocr/extract-imei', form);
  return res.data;
}

// ─── Equipos ────────────────────────────────────────────────────────────────

export interface EquipoFilters {
  imei?: string;
  cliente?: string;
  tiendaId?: number;
  estado?: string;
  servicio?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export async function getEquipos(filters?: EquipoFilters): Promise<Equipo[]> {
  const res = await api.get<Equipo[]>('/equipos', { params: filters });
  return res.data;
}

export async function getEquipo(id: number): Promise<Equipo> {
  const res = await api.get<Equipo>(`/equipos/${id}`);
  return res.data;
}

export async function createEquipo(data: Partial<Equipo>): Promise<Equipo> {
  const res = await api.post<Equipo>('/equipos', data);
  return res.data;
}

export async function updateEquipo(id: number, data: Partial<Equipo>): Promise<Equipo> {
  const res = await api.patch<Equipo>(`/equipos/${id}`, data);
  return res.data;
}

// ─── Tiendas ────────────────────────────────────────────────────────────────

export async function getTiendas(): Promise<Tienda[]> {
  const res = await api.get<Tienda[]>('/tiendas');
  return res.data;
}

export async function createTienda(data: Partial<Tienda>): Promise<Tienda> {
  const res = await api.post<Tienda>('/tiendas', data);
  return res.data;
}

export async function updateTienda(id: number, data: Partial<Tienda>): Promise<Tienda> {
  const res = await api.patch<Tienda>(`/tiendas/${id}`, data);
  return res.data;
}
