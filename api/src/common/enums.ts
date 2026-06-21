export enum UserRole {
  ALIADO = 'aliado',
  KAM = 'kam',
  ADMIN = 'admin',
}

export enum ClientSegment {
  A = 'A',
  B = 'B',
  C = 'C',
}

export enum ClientStatus {
  ACTIVO = 'activo',
  RIESGO = 'riesgo',
  INACTIVO = 'inactivo',
}

export enum ProductBadge {
  TOP = 'TOP',
  NUEVO = 'NUEVO',
  PREMIUM = 'PREMIUM',
  BAJO = 'BAJO',
  AGOTADO = 'AGOTADO',
}

export enum PaymentTerm {
  CONTADO = 'contado',
  PRONTO_PAGO = 'pronto_pago',
  CREDITO_90 = 'credito90',
}

export enum OrderStatus {
  PENDIENTE  = 'pendiente',
  CONFIRMADO = 'confirmado',
  ALISTANDO  = 'alistando',
  EN_RUTA    = 'en_ruta',
  ENTREGADO  = 'entregado',
  CANCELADO  = 'cancelado',
}

export enum InvoiceStatus {
  PENDIENTE = 'pendiente',
  PAGADA = 'pagada',
  VENCIDA = 'vencida',
}
