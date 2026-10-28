import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { SensitiveInput } from './SensitiveInput';
import { useApp } from '../context/AppContext';

interface ResetPasswordViewProps {
  /** Token del enlace de recuperación entregado por el superadmin. */
  token: string;
  /** Cierra la vista sin cambiar nada (botón X o "Volver"). */
  onClose: () => void;
  /** Contraseña fijada con éxito: limpiar hash y ofrecer el acceso. */
  onSuccess: () => void;
}

/**
 * Vista del enlace de recuperación: el superadmin envía al usuario un enlace
 * con token de un solo uso (válido durante 60 minutos) que permite fijar una
 * nueva contraseña sin conocer la antigua.
 */
export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ token, onClose, onSuccess }) => {
  const { showNotification } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const cleanPassword = newPassword.trim();
    if (cleanPassword.length < 8) {
      setFieldError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (confirmPassword.trim() !== cleanPassword) {
      setFieldError('Las contraseñas no coinciden.');
      return;
    }

    setFieldError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: cleanPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.message ||
            'El enlace no es válido o ha caducado. Pide otro al superadministrador. Recuerda: cada enlace vale una sola vez y un enlace nuevo anula los anteriores.',
        );
      }

      showNotification(data?.message || 'Contraseña restablecida. Ya puedes iniciar sesión.', 'success');
      onSuccess();
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.');
      showNotification('No se pudo restablecer la contraseña.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-stone-800 bg-[#141417] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF4E00]/10 text-[#FF4E00]">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Nueva contraseña</h2>
              <p className="text-xs text-stone-400">Enlace de recuperación del superadmin de PideTiétar. Vale una sola vez y 60 minutos.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar y volver"
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-new-password" className="mb-1 block text-xs font-bold text-stone-300">
              Contraseña nueva (mín. 8 caracteres)
            </label>
            <SensitiveInput
              id="reset-new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 sm:text-sm"
              toggleClassName="text-stone-400 hover:bg-white/10 hover:text-white"
              toggleLabel="contraseña nueva"
            />
          </div>
          <div>
            <label htmlFor="reset-confirm-password" className="mb-1 block text-xs font-bold text-stone-300">
              Repite la contraseña
            </label>
            <SensitiveInput
              id="reset-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-xl border border-stone-800 bg-[#1a1a1e] px-4 py-3 text-xs text-white placeholder-stone-500 sm:text-sm"
              toggleClassName="text-stone-400 hover:bg-white/10 hover:text-white"
              toggleLabel="contraseña"
            />
          </div>

          {fieldError && (
            <p className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300">
              {fieldError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#FF4E00] py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-[#d63f00] disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : 'Fijar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};
