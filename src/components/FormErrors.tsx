import React from 'react';
import { AlertCircle } from 'lucide-react';

// El backend devuelve los errores de validación con el nombre de la columna
// de la base de datos (snake_case) y los formularios usan camelCase en su
// estado. Sin este mapa el usuario sólo ve "hay campos con errores" sin saber
// cuáles, y sobre todo sin saber por qué.
export type FieldErrors = Record<string, string>;

const BUSINESS_ERROR_FIELD_MAP: Record<string, string> = {
  name: 'name',
  legal_name: 'legalName',
  cif: 'cif',
  email: 'email',
  phone: 'phone',
  address: 'address',
  locality_id: 'localityId',
  category: 'category',
  account_number: 'accountNumber',
  manager_name: 'managerName',
  manager_dni: 'managerDni',
  banner_url: 'bannerUrl',
  logo_url: 'logoUrl',
  min_order_cents: 'minOrderCents',
  delivery_fee_cents: 'deliveryFeeCents',
  estimated_time_min: 'estimatedTimeMin',
  estimated_time_max: 'estimatedTimeMax',
  delivery_radius_km: 'deliveryRadiusKm',
  schedule: 'schedule',
  // Errores de la cuenta del propietario: se pintan junto a su campo.
  ownerUsername: 'adminUsername',
  ownerEmail: 'adminEmail',
  ownerPassword: 'adminPassword',
  owner: 'adminUsername',
};

// El alta de repartidores usa los nombres del backend (courierBusinessIds,
// courier_business_ids...) y el formulario agrupa los negocios en `businessIds`.
// Sin este mapa el aviso quedaba en el mensaje genérico y no se veía el campo.
const COURIER_ERROR_FIELD_MAP: Record<string, string> = {
  fullName: 'fullName',
  full_name: 'fullName',
  username: 'username',
  email: 'email',
  password: 'password',
  phone: 'phone',
  address: 'address',
  dni: 'dni',
  documentNumber: 'dni',
  document_number: 'dni',
  role: 'role',
  businessId: 'businessIds',
  business_id: 'businessIds',
  courierBusinessIds: 'businessIds',
  courier_business_ids: 'businessIds',
  accountNumber: 'accountNumber',
  account_number: 'accountNumber',
  courierConfirmation: 'courierConfirmation',
  courier_confirmation: 'courierConfirmation',
};

export const extractFieldErrors = (error: unknown): FieldErrors => {
  const candidate = (error as { errors?: FieldErrors } | null)?.errors;
  return candidate && typeof candidate === 'object' ? candidate : {};
};

export const toCourierFieldErrors = (errors: FieldErrors): FieldErrors => {
  const mapped: FieldErrors = {};

  for (const [key, message] of Object.entries(errors)) {
    mapped[COURIER_ERROR_FIELD_MAP[key] || key] = message;
  }

  return mapped;
};

export const toBusinessFieldErrors = (errors: FieldErrors): FieldErrors => {
  const mapped: FieldErrors = {};

  for (const [key, message] of Object.entries(errors)) {
    const field = BUSINESS_ERROR_FIELD_MAP[key];
    // Si el backend añade un campo nuevo, no se pierde: se muestra igual.
    mapped[field || key] = message;
  }

  return mapped;
};

// El primer mensaje del servidor, para la notificación y para el resumen.
export const firstErrorMessage = (errors: FieldErrors): string | undefined => {
  const values = Object.values(errors).filter(Boolean);
  return values.length ? values[0] : undefined;
};

export const FieldError: React.FC<{ message?: string }> = ({ message }) => {
  if (!message) return null;

  return (
    <p className="mt-1 flex items-start gap-1 text-xs font-semibold text-red-600">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
};

// Añade el borde rojo a un campo que el servidor ha rechazado.
export const fieldClass = (baseClass: string, hasError: boolean): string =>
  hasError ? `${baseClass} border-red-400 ring-1 ring-red-300` : baseClass;
