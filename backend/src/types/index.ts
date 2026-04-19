export type EstadoEquipo =
  | 'RECIBIDO'
  | 'EN_DIAGNOSTICO'
  | 'PENDIENTE'
  | 'EN_REPARACION'
  | 'REPARADO'
  | 'ENTREGADO';

export interface Tienda {
  id: number;
  nombre: string;
  telefono: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTiendaDto {
  nombre: string;
  telefono?: string;
  observaciones?: string;
}

export interface UpdateTiendaDto {
  nombre?: string;
  telefono?: string;
  observaciones?: string;
}

export interface Equipo {
  id: number;
  fechaIngreso: string;
  imei: string;
  modelo: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  tiendaId: number | null;
  servicio: string;
  precio: number;
  observaciones: string | null;
  estado: EstadoEquipo;
  imagenRuta: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipoDto {
  fechaIngreso: string;
  imei: string;
  modelo: string;
  clienteNombre: string;
  clienteTelefono?: string;
  tiendaId?: number;
  servicio: string;
  precio: number;
  observaciones?: string;
  estado: EstadoEquipo;
  imagenRuta?: string;
}

export interface UpdateEquipoDto {
  fechaIngreso?: string;
  imei?: string;
  modelo?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  tiendaId?: number | null;
  servicio?: string;
  precio?: number;
  observaciones?: string;
  estado?: EstadoEquipo;
  imagenRuta?: string;
}

export interface OcrResult {
  candidatos: string[];
  textoCompleto: string;
}

export interface EquipoFilters {
  cliente?: string;
  tiendaId?: number;
  estado?: EstadoEquipo;
  servicio?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  imei?: string;
}
