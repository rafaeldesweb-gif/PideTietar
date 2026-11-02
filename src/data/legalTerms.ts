export const TERMS_VERSION = 'v1';
export const TERMS_LAST_UPDATED = '2 de noviembre de 2026';
export const TERMS_ANCHOR = '#terminos-y-condiciones';
export const COURIER_TERMS_ANCHOR = '#terminos-repartidores';
export const TERMS_ACCEPTED_MESSAGE = 'pidetietar-terms-accepted';

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
