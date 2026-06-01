export type EstadoEquipo =
  | 'RECIBIDO'
  | 'EN_DIAGNOSTICO'
  | 'PENDIENTE'
  | 'EN_REPARACION'
  | 'REPARADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export const ESTADOS: EstadoEquipo[] = [
  'RECIBIDO',
  'EN_DIAGNOSTICO',
  'PENDIENTE',
  'EN_REPARACION',
  'REPARADO',
  'ENTREGADO',
  'CANCELADO',
];

export const ESTADO_LABELS: Record<EstadoEquipo, string> = {
  RECIBIDO: 'Recibido',
  EN_DIAGNOSTICO: 'En diagnóstico',
  PENDIENTE: 'Pendiente',
  EN_REPARACION: 'En reparación',
  REPARADO: 'Reparado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export interface Tienda {
  id: number;
  nombre: string;
  telefono: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Equipo {
  id: number;
  fechaIngreso: string;
  imei: string;
  imei2: string | null;
  modelo: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  tiendaId: number | null;
  servicio: string;
  precio: number;
  costoPieza: number;
  manoDeObra: number;
  otrosCostos: number;
  observaciones: string | null;
  estado: EstadoEquipo;
  imagenRuta: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OcrResponse {
  candidatos: string[];
  textoCompleto: string;
  imagenRuta: string;
}
