// Datos de contacto e identificación del repartidor. El backend aplica las
// mismas reglas, pero el formulario las comprueba antes para marcar el campo.
export const DNI_NIE_REGEX = /^([0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])$/;

export const normalizeDni = (value: string): string =>
  value.replace(/\s+/g, '').toUpperCase();

export const isValidPhone = (value: string): boolean => {
  const phone = value.trim();
  if (!phone || !/^\+?[\d\s.()-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

export const validateCourierContact = (
  data: { phone?: string; address?: string; dni?: string },
  { required = false }: { required?: boolean } = {},
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const phone = (data.phone || '').trim();
  const address = (data.address || '').trim();
  const dni = normalizeDni(data.dni || '');

  if (required && !phone) {
    errors.phone = 'El teléfono es obligatorio.';
  } else if (phone && !isValidPhone(phone)) {
    errors.phone =
      'El teléfono debe contener entre 7 y 15 dígitos (ej. +34 600 000 000).';
  }

  if (required && !address) {
    errors.address = 'La dirección es obligatoria.';
  } else if (address && (address.length < 5 || address.length > 500)) {
    errors.address = 'La dirección debe tener entre 5 y 500 caracteres.';
  }

  if (required && !dni) {
    errors.dni = 'El DNI/NIE es obligatorio.';
  } else if (dni && !DNI_NIE_REGEX.test(dni)) {
    errors.dni = 'El DNI/NIE no es válido. Ejemplo: 12345678Z o X1234567L.';
  }

  return errors;
};
