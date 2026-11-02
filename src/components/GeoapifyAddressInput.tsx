import React, { useEffect, useRef } from 'react';
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';
import { readAddressApiResponse } from '../services/addressValidation';

interface GeoapifyAddressInputProps {
  value: string;
  localityId: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

interface GeoapifyFeature {
  properties?: {
    formatted?: string;
  };
}

export const GeoapifyAddressInput: React.FC<GeoapifyAddressInputProps> = ({
  value,
  localityId,
  onChange,
  hasError = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef = useRef<GeocoderAutocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  }, [onChange, value]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const autocomplete = new GeocoderAutocomplete(
      containerRef.current,
      'server-proxy',
      {
        placeholder: 'Calle, número',
        lang: 'es',
        limit: 5,
        debounceDelay: 300,
        addDetails: false,
        skipIcons: true,
        countryCodes: ['es'],
      },
    );

    autocomplete.setSendGeocoderRequestFunc(async (text) => {
      if (!localityId || text.trim().length < 3) {
        return { type: 'FeatureCollection', features: [] };
      }
      const params = new URLSearchParams({
        text,
        localityId,
      });
      try {
        const response = await fetch(`/api/address/autocomplete?${params.toString()}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });
        const payload = await readAddressApiResponse(response);
        if (payload?.type === 'FeatureCollection' && Array.isArray(payload.features)) {
          return payload;
        }
      } catch {
        // Las sugerencias son opcionales; el botón muestra el diagnóstico al
        // verificar. No se rompe el campo si un proxy devuelve una página HTML.
      }
      return { type: 'FeatureCollection', features: [] };
    });

    const input = containerRef.current.querySelector('input');
    if (input) {
      input.required = true;
      input.maxLength = 500;
      input.autocomplete = 'street-address';
      input.setAttribute('aria-label', 'Dirección de entrega');
    }

    autocomplete.on('input', (text: unknown) => {
      onChangeRef.current(typeof text === 'string' ? text : autocomplete.getValue());
    });
    autocomplete.on('select', (feature: GeoapifyFeature | null) => {
      onChangeRef.current(
        feature?.properties?.formatted || autocomplete.getValue(),
      );
    });
    autocomplete.on('clear', () => onChangeRef.current(''));
    autocomplete.setValue(valueRef.current);
    autocompleteRef.current = autocomplete;

    return () => {
      autocomplete.destroy();
      autocompleteRef.current = null;
    };
  }, [localityId]);

  useEffect(() => {
    const autocomplete = autocompleteRef.current;
    if (autocomplete && autocomplete.getValue() !== value) {
      autocomplete.setValue(value);
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`geoapify-address-input${hasError ? ' geoapify-address-input--error' : ''}`}
      aria-label="Dirección de entrega"
    />
  );
};
