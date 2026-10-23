import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type SensitiveInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /**
   * Tipo que se usa cuando el contenido está visible. Para contraseñas se
   * mantiene `password`; para PIN/IBAN se usa `text` o `tel`.
   */
  type?: 'password' | 'text' | 'tel' | 'number';
  /** Clase extra para el botón del ojo (por ejemplo, en fondos oscuros). */
  toggleClassName?: string;
  /** Etiqueta accesible: "Mostrar contraseña", "Mostrar IBAN", etc. */
  toggleLabel?: string;
  /** Clase para el contenedor relativo que coloca el botón encima del input. */
  wrapperClassName?: string;
};

/**
 * Input para datos sensibles (contraseñas, PIN e IBAN) con botón para
 * alternar entre contenido oculto y visible.
 */
export const SensitiveInput: React.FC<SensitiveInputProps> = ({
  type = 'password',
  className = '',
  toggleClassName = 'text-stone-400 hover:bg-black/5 hover:text-stone-700',
  toggleLabel = 'contenido',
  wrapperClassName = 'relative',
  style,
  disabled,
  ...props
}) => {
  const [visible, setVisible] = useState(false);
  const visibleType = type === 'password' ? 'text' : type;
  const inputType = visible ? visibleType : 'password';

  return (
    <div className={wrapperClassName}>
      <input
        {...props}
        type={inputType}
        disabled={disabled}
        className={`${className} pr-10`}
        style={{ paddingRight: '2.5rem', ...style }}
      />
      <button
        type="button"
        onClick={() => setVisible((previous) => !previous)}
        onMouseDown={(event) => event.preventDefault()}
        disabled={disabled}
        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${toggleClassName}`}
        title={visible ? `Ocultar ${toggleLabel}` : `Mostrar ${toggleLabel}`}
        aria-label={visible ? `Ocultar ${toggleLabel}` : `Mostrar ${toggleLabel}`}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};
