export const normalizeAddressPart = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// En España #34 suele indicar el portal. El geocodificador puede interpretar
// esa notación como un piso/unidad y buscar solo la calle.
export const prepareAddressForGeocoding = (value) => String(value || '')
  .replace(/#\s*(\d+[a-z]?)/gi, '$1').replace(/\s+/g, ' ').trim();

export const hasLocalityPostalCode = (locality) =>
  /^\d{5}$/.test(String(locality?.postal_code || '')) && locality.postal_code !== '00000';

export function localityMatchesResult(locality, result) {
  const expected = normalizeAddressPart(locality?.name);
  if (!expected) return false;
  const candidates = [result.city, result.town, result.village, result.suburb, result.district]
    .map(normalizeAddressPart).filter(Boolean);
  const samePostalCode = hasLocalityPostalCode(locality) && result.postcode === locality.postal_code;

  return candidates.some((candidate) => candidate === expected || (samePostalCode && (
    candidate.startsWith(`${expected} de `) || candidate.startsWith(`${expected} del `)
  )));
}

export function resolveLocalityName(results, locality) {
  const names = [...new Set(results.filter((result) =>
    result.country_code === 'es' && result.postcode === locality.postal_code &&
    localityMatchesResult(locality, result),
  ).map((result) => result.city || result.town || result.village).filter(Boolean))];
  // Si un CP abarca varias localidades compatibles, se mantiene el nombre
  // original y la comprobación posterior exige también coincidencia de localidad.
  return names.length === 1 ? names[0] : locality.name;
}

export function assessAddressResult(result, locality, requestedHouseNumber) {
  const postalMatches = !hasLocalityPostalCode(locality) || result.postcode === locality.postal_code;
  const localityMatches = localityMatchesResult(locality, result);
  const inLocality = result.country_code === 'es' && postalMatches && localityMatches;
  const streetConfidence = Number(result.rank?.confidence_street_level ?? result.rank?.confidence ?? 0);
  const streetVerified = inLocality && Boolean(result.street) && streetConfidence >= 0.7;
  const buildingConfidence = Number(result.rank?.confidence_building_level ?? result.rank?.confidence ?? 0);
  const sameHouseNumber = Boolean(requestedHouseNumber) &&
    normalizeAddressPart(result.housenumber) === normalizeAddressPart(requestedHouseNumber);
  const verified = streetVerified && sameHouseNumber && buildingConfidence >= 0.8 &&
    ['building', 'amenity'].includes(result.result_type);

  return {
    verified, streetVerified, inLocality, postalMatches, localityMatches,
    verificationLevel: verified ? 'building' : streetVerified ? 'street' : inLocality ? 'locality' : 'none',
  };
}
