// Ninguna credencial ni dato de una cuenta debe sobrevivir en localStorage.
// sessionStorage conserva la sesión durante F5, pero pertenece a la pestaña.
const PERSONAL_KEYS = ['pidetietar_token', 'pidetietar_orders', 'pidetietar_cart', 'pidetietar_google_token', 'pidetietar_device_id'];
const EXIT_MARKER = 'pidetietar_session_page_exited';
const memory = new Map<string, string>();

export const sessionStore = {
  getItem(key: string): string | null {
    try { return window.sessionStorage.getItem(key); }
    catch { return memory.get(key) ?? null; }
  },
  setItem(key: string, value: string): void {
    try {
      window.sessionStorage.setItem(key, value);
      memory.delete(key);
    } catch { memory.set(key, value); }
  },
  removeItem(key: string): void {
    memory.delete(key);
    try { window.sessionStorage.removeItem(key); } catch { /* Ya no queda en memoria. */ }
  },
};

export function clearLegacyPersonalStorage(): void {
  if (typeof window === 'undefined') return;
  for (const key of PERSONAL_KEYS) {
    try { window.localStorage.removeItem(key); } catch { /* El navegador puede bloquear el almacenamiento. */ }
  }
}

export function clearBrowserSession(): void {
  PERSONAL_KEYS.forEach((key) => sessionStore.removeItem(key));
  sessionStore.removeItem(EXIT_MARKER);
  clearLegacyPersonalStorage();
}

function initializeBrowserSession(): void {
  if (typeof window === 'undefined') return;
  clearLegacyPersonalStorage();
  const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const isReload = navigation?.type === 'reload';
  // Los navegadores pueden restaurar pestañas cerradas. Una reapertura o el
  // regreso desde otra página no debe restaurar la cuenta anterior. Los
  // términos abiertos con window.opener tampoco heredan una sesión propia.
  if (!isReload && (sessionStore.getItem(EXIT_MARKER) || window.opener)) clearBrowserSession();
  sessionStore.removeItem(EXIT_MARKER);
}

export function watchBrowserSession(onRestoredPage: () => void): () => void {
  const onPageHide = () => {
    clearLegacyPersonalStorage();
    sessionStore.setItem(EXIT_MARKER, '1');
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    clearBrowserSession();
    onRestoredPage();
  };
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  return () => {
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  };
}

initializeBrowserSession();

export function getBrowserDeviceId(): string {
  let id = sessionStore.getItem('pidetietar_device_id');
  if (!id) {
    id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID()
      : [...crypto.getRandomValues(new Uint8Array(24))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    sessionStore.setItem('pidetietar_device_id', id);
  }
  return id;
}
