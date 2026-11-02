export interface AddressVerificationResult {
  configured: boolean;
  available: boolean;
  checked: boolean;
  verified: boolean;
  streetVerified?: boolean;
  verificationLevel?: 'building' | 'street' | 'locality' | 'none';
  message: string;
  localityId?: string;
  localityName?: string;
  normalizedAddress?: string;
  postalCode?: string;
  locality?: string;
  coordinates?: { lat: number; lng: number };
  confidence?: number;
  resultType?: string;
  matchType?: string;
}

export interface AddressVerificationError extends Error {
  errors?: Record<string, string>;
  status?: number;
  code?: string;
}

function addressServiceError(
  message: string,
  status?: number,
  code?: string,
): AddressVerificationError {
  return Object.assign(new Error(message), { status, code });
}

// Un backend antiguo o un proxy mal configurado puede responder con index.html
// o con el 404 HTML de Express. Nunca se interpreta esa página como JSON.
export async function readAddressApiResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (!/application\/(?:[\w.+-]+\+)?json\b/i.test(contentType)) {
    throw addressServiceError(
      response.status === 404 || response.ok
        ? 'El servicio de direcciones no está disponible en este servidor. Reinicia el backend y vuelve a intentarlo.'
        : 'No hay conexión con el servicio de direcciones. Vuelve a intentarlo en unos instantes.',
      response.status,
      'ADDRESS_API_UNAVAILABLE',
    );
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw addressServiceError(
      'El servicio de direcciones ha devuelto una respuesta no válida. Vuelve a intentarlo.',
      response.status,
      'ADDRESS_API_INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    const missingRoute = response.status === 404 && payload?.code === 'NOT_FOUND';
    const error = addressServiceError(
      missingRoute
        ? 'El servicio de direcciones no está disponible en este servidor. Reinicia el backend y vuelve a intentarlo.'
        : payload?.message || 'No se pudo verificar la dirección.',
      response.status,
      payload?.code,
    );
    error.errors = payload?.errors;
    throw error;
  }
  return payload;
}

export async function verifyAddress(
  address: string,
  localityId: string,
): Promise<AddressVerificationResult> {
  let response: Response;
  try {
    response = await fetch('/api/address/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ address: address.trim(), localityId }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw addressServiceError(
      'No hay conexión con el servicio de direcciones. Vuelve a intentarlo en unos instantes.',
      undefined,
      'ADDRESS_API_UNAVAILABLE',
    );
  }

  const payload = await readAddressApiResponse(response);
  if (
    !payload ||
    !['configured', 'available', 'checked', 'verified'].every((key) => typeof payload[key] === 'boolean') ||
    typeof payload.message !== 'string' ||
    (payload.verified && (!payload.configured || !payload.available || !payload.checked))
  ) {
    throw addressServiceError(
      'El servicio de direcciones ha devuelto una respuesta no válida. Vuelve a intentarlo.',
      response.status,
      'ADDRESS_API_INVALID_RESPONSE',
    );
  }

  return payload;
}
