// La conexión nativa sigue respondiendo al servidor aunque la pestaña esté en
// segundo plano. No se usa la IP como identificador: varias personas la comparten.
export function watchSessionConnection(token: string, onExpired: () => void): () => void {
  let stopped = false;
  let socket: WebSocket | undefined;
  let lostAt: number | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const offlineTimeout = 10000;

  const expire = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timeout);
    clearTimeout(retry);
    socket?.close();
    onExpired();
  };
  const connectionLost = () => {
    if (stopped) return;
    lostAt ??= Date.now();
    clearTimeout(timeout);
    timeout = setTimeout(expire, Math.max(0, offlineTimeout - (Date.now() - lostAt)));
  };
  const connectionAlive = () => {
    if (!navigator.onLine) return;
    lostAt = undefined;
    clearTimeout(timeout);
    // Si desaparecen las señales del servidor, también se detecta la caída.
    if (!document.hidden) timeout = setTimeout(expire, offlineTimeout);
  };
  const connect = () => {
    if (stopped || !navigator.onLine || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
    const url = new URL('/api/auth/session', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(url);
    socket.addEventListener('open', () => socket?.send(JSON.stringify({ token })));
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ready' || data.type === 'pulse') connectionAlive();
      } catch { /* Una respuesta inesperada no prolonga la sesión. */ }
    });
    socket.addEventListener('close', (event) => {
      if (stopped) return;
      if (event.code === 4001) return expire();
      connectionLost();
      retry = setTimeout(connect, 1000);
    });
    socket.addEventListener('error', connectionLost);
  };
  const onOffline = () => { connectionLost(); socket?.close(); };
  const onOnline = () => {
    if (lostAt !== undefined && Date.now() - lostAt >= offlineTimeout) return expire();
    connect();
  };
  const onPageHide = () => { stopped = true; clearTimeout(timeout); clearTimeout(retry); socket?.close(); };
  const onVisibility = () => {
    if (document.hidden && lostAt === undefined) clearTimeout(timeout);
    else if (!document.hidden) {
      if (lostAt !== undefined && Date.now() - lostAt >= offlineTimeout) return expire();
      if (navigator.onLine && socket?.readyState === WebSocket.OPEN) connectionAlive();
      else { connectionLost(); connect(); }
    }
  };
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);
  connectionLost();
  connect();
  return () => {
    onPageHide();
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
