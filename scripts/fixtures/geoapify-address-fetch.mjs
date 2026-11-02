import assert from 'node:assert/strict';

// Transporte de prueba: no se consultan Geoapify ni direcciones reales.
const originalFetch = globalThis.fetch;
const place = { country_code: 'es', city: 'Sotillo de la Adrada', postcode: '05420' };
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.hostname !== 'api.geoapify.com') return originalFetch(input, options);
  assert.equal(url.searchParams.get('apiKey'), 'clave-aislada-de-prueba');
  if (url.searchParams.get('type') === 'postcode') {
    return Response.json({ results: [{ ...place, result_type: 'postcode' }] });
  }
  const text = url.searchParams.get('text');
  assert.match(text, /05420 Sotillo de la Adrada/);
  assert.doesNotMatch(text, /#/);
  const exact = text.includes('Exacta');
  const houseNumber = text.match(/\b(\d{1,4})\b/)?.[1] || '34';
  const result = {
    ...place, street: exact ? 'Calle Exacta' : 'Calle Parcial', housenumber: houseNumber,
    formatted: `${exact ? 'Calle Exacta' : 'Calle Parcial'}, ${houseNumber}, 05420 Sotillo de la Adrada, España`,
    result_type: 'building', lat: 40.29, lon: -4.58,
    rank: { confidence: exact ? 1 : 0.5, confidence_street_level: 1, confidence_building_level: exact ? 1 : 0, match_type: 'full_match' },
  };
  if (text.includes('Sin calle')) {
    return Response.json({ results: [{ ...place, result_type: 'city', rank: { confidence: 1 } }] });
  }
  if (text.includes('Fuera zona')) {
    return Response.json({ results: [{ ...result, city: 'La Torre', postcode: '05520' }] });
  }
  if (url.pathname.endsWith('/autocomplete')) {
    return Response.json({ type: 'FeatureCollection', features: [
      { type: 'Feature', properties: result },
      { type: 'Feature', properties: { ...result, city: 'La Torre', postcode: '05520' } },
    ] });
  }
  return Response.json({ results: [
    { ...place, city: 'Sotillo', postcode: '40160', result_type: 'city' }, result,
  ], query: { parsed: { housenumber: houseNumber } } });
};
