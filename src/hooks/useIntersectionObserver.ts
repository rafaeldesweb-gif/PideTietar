import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook que detecta cuándo un elemento entra en el viewport.
 * Ideal para lazy loading de imágenes en galerías.
 *
 * @param options Opciones de IntersectionObserver (root, rootMargin, threshold)
 * @returns [ref, isIntersecting] - ref para adjuntar al elemento y booleano de visibilidad
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {},
): [React.RefObject<HTMLDivElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null!);

  const callback: IntersectionObserverCallback = useCallback(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
        }
      });
    },
    [],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(callback, {
      root: null,
      rootMargin: '200px', // Carga un poco antes de entrar al viewport
      threshold: 0,
      ...options,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [callback, options.root, options.rootMargin, options.threshold]);

  return [ref, isIntersecting];
}
