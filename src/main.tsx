import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AppProvider} from './context/AppContext.tsx';
import './index.css';

// Algunas instalaciones antiguas conservan un bloqueo de orientación del
// manifiesto anterior. Se libera y se solicita explícitamente cualquier
// orientación para que la app instalada siga el giro automático del equipo.
const allowDeviceRotation = () => {
  const orientation = globalThis.screen?.orientation;
  if (!orientation) return;

  try {
    orientation.unlock();
  } catch {
    // Hay navegadores que exponen la API pero no permiten desbloquearla aquí.
  }

  try {
    void orientation.lock('any').catch(() => {
      // En una pestaña normal el bloqueo puede requerir una condición
      // adicional; el manifiesto sigue siendo la configuración principal.
    });
  } catch {
    // Algunas implementaciones rechazan la llamada antes de crear la promesa.
  }
};

allowDeviceRotation();
window.addEventListener('pageshow', allowDeviceRotation);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) allowDeviceRotation();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

