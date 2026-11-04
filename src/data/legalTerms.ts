export const TERMS_VERSION = 'v1';
export const TERMS_LAST_UPDATED = '2 de noviembre de 2026';
export const TERMS_ACCEPTED_MESSAGE = 'pidetietar-terms-accepted';

/*─────────────────────────────────────────────────────────────────────────────
  Anclas de los documentos legales. Cada tipo de usuario acepta los términos
  que le corresponden:
    - TERMS_CLIENT_ANCHOR   → clientes que se registran en AuthModal
    - TERMS_BUSINESS_ANCHOR → negocios que da de alta el superadmin
    - TERMS_COURIER_ANCHOR  → repartidores (plataforma o negocio)
  ─────────────────────────────────────────────────────────────────────────────*/
export const TERMS_CLIENT_ANCHOR = '#terminos-clientes';
export const TERMS_BUSINESS_ANCHOR = '#terminos-negocios';
export const TERMS_COURIER_ANCHOR = '#terminos-repartidores';
export const PRIVACY_POLICY_ANCHOR = '#politica-privacidad';
export const COOKIE_POLICY_ANCHOR = '#politica-cookies';

// Alias de compatibilidad con nombres usados en otros componentes.
export const COURIER_TERMS_ANCHOR = TERMS_COURIER_ANCHOR;
export const TERMS_ANCHOR = TERMS_CLIENT_ANCHOR;

/** Abre los términos en una pestaña que la propia aplicación puede cerrar al volver. */
export const openTermsInNewTab = (
  event: { preventDefault: () => void },
  anchor: string,
) => {
  event.preventDefault();
  const termsUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${anchor}`;
  const termsWindow = window.open(termsUrl, '_blank');

  if (termsWindow) {
    termsWindow.focus();
    return;
  }

  // Si el navegador bloquea la pestaña, se conserva el enlace como alternativa.
  window.location.hash = anchor;
};

export type TermsType = 'client' | 'business' | 'courier' | 'privacy' | 'cookies';

export const getTermsAnchorByType = (type: TermsType): string => {
  switch (type) {
    case 'client': return TERMS_CLIENT_ANCHOR;
    case 'business': return TERMS_BUSINESS_ANCHOR;
    case 'courier': return TERMS_COURIER_ANCHOR;
    case 'privacy': return PRIVACY_POLICY_ANCHOR;
    case 'cookies': return COOKIE_POLICY_ANCHOR;
  }
};

export const getTermsTitleByType = (type: TermsType): string => {
  switch (type) {
    case 'client': return 'Términos y condiciones para clientes';
    case 'business': return 'Términos y condiciones para negocios';
    case 'courier': return 'Términos y condiciones para repartidores';
    case 'privacy': return 'Política de privacidad';
    case 'cookies': return 'Política de cookies';
  }
};
