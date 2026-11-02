import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp } from './test-app.mjs';
import {
  prepareAddressForGeocoding, localityMatchesResult, resolveLocalityName, assessAddressResult,
} from '../server/addressVerification.js';

const locality = { name: 'Sotillo', postal_code: '05420' };
const exactResult = {
  country_code: 'es', city: 'Sotillo de la Adrada', postcode: '05420',
  street: 'Calle de prueba', housenumber: '34', result_type: 'building',
  rank: { confidence: 1, confidence_street_level: 1, confidence_building_level: 1 },
};

test('normaliza #34 y reconoce un nombre abreviado solo con coincidencia de CP', () => {
  assert.equal(prepareAddressForGeocoding('Calle Doctor Díaz Palacios, #34'), 'Calle Doctor Díaz Palacios, 34');
  assert.equal(resolveLocalityName([exactResult], locality), 'Sotillo de la Adrada');
  assert.equal(localityMatchesResult(locality, exactResult), true);
  assert.equal(localityMatchesResult(locality, { ...exactResult, postcode: '00001' }), false);
  assert.equal(localityMatchesResult(locality, { ...exactResult, city: 'Otra localidad' }), false);
});

test('un full_match con confianza de portal cero confirma solo la calle', () => {
  const assessment = assessAddressResult({
    ...exactResult, rank: { ...exactResult.rank, match_type: 'full_match', confidence_building_level: 0 },
  }, locality, '34');
  assert.equal(assessment.verified, false);
  assert.equal(assessment.streetVerified, true);
  assert.equal(assessment.verificationLevel, 'street');
});

test('solo confirma un portal coincidente, con confianza suficiente y en la localidad', () => {
  assert.equal(assessAddressResult(exactResult, locality, '34').verified, true);
  assert.equal(assessAddressResult(exactResult, locality, '36').verified, false);
  assert.equal(assessAddressResult(exactResult, locality, undefined).verified, false);
  for (const other of [{ postcode: '05520' }, { city: 'La Torre' }, { country_code: 'pt' }]) {
    assert.equal(assessAddressResult({ ...exactResult, ...other }, locality, '34').verified, false);
    assert.equal(assessAddressResult({ ...exactResult, ...other }, locality, '34').streetVerified, false);
  }
});

test('API de direcciones: rutas JSON y estado sin configurar con SQLite aislada', async (t) => {
  const { api, url, admin } = await startTestApp(t);
  const zone = (await api('/localities', {
    method: 'POST', token: admin.token,
    body: { name: 'Sotillo', postalCode: '05420' }, status: 201,
  })).data.locality;

  const { data } = await api('/address/verify', {
    method: 'POST', body: { address: 'Calle doctor Díaz Palacios, #34', localityId: zone.id }, status: 200,
  });
  assert.equal(data.configured, false);
  assert.equal(data.checked, false);
  assert.equal(data.verified, false);
  assert.match(data.message, /sin confirmar/);

  const suggestions = await api(`/address/autocomplete?text=Calle&localityId=${zone.id}`, { status: 200 });
  assert.deepEqual(suggestions.data, { type: 'FeatureCollection', features: [] });

  for (const method of ['GET', 'POST']) {
    const response = await fetch(`${url}/api/address/ruta-inexistente`, { method });
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal((await response.json()).code, 'NOT_FOUND');
  }
});

test('API Geoapify simulada: búsqueda canónica, selección entre resultados y sugerencias de la zona', async (t) => {
  const { api, admin, password } = await startTestApp(t, {
    geoapifyApiKey: 'clave-aislada-de-prueba',
    preload: new URL('./fixtures/geoapify-address-fetch.mjs', import.meta.url).href,
  });
  const zone = (await api('/localities', {
    method: 'POST', token: admin.token, body: { name: 'Sotillo', postalCode: '05420' }, status: 201,
  })).data.locality;
  const exact = (await api('/address/verify', {
    method: 'POST', body: { address: 'Calle Exacta #34', localityId: zone.id }, status: 200,
  })).data;
  assert.equal(exact.configured, true);
  assert.equal(exact.verified, true);
  assert.equal(exact.verificationLevel, 'building');
  const partial = (await api('/address/verify', {
    method: 'POST', body: { address: 'Calle Parcial #34', localityId: zone.id }, status: 200,
  })).data;
  assert.equal(partial.available, true);
  assert.equal(partial.verified, false);
  assert.equal(partial.streetVerified, true);
  assert.match(partial.message, /no ha podido confirmar el portal 34/);
  const suggestions = (await api(`/address/autocomplete?text=Calle&localityId=${zone.id}`, { status: 200 })).data;
  assert.equal(suggestions.features.length, 1);
  assert.equal(suggestions.features[0].properties.postcode, '05420');

  await t.test('permite registrarse con la calle confirmada y conserva el portal escrito', async () => {
    const registered = (await api('/auth/register', {
      method: 'POST', status: 201,
      body: {
        username: 'cliente_calle', fullName: 'Cliente Calle', email: 'calle@example.com', password,
        address: 'Calle Parcial #55', localityId: zone.id, termsAccepted: true, termsVersion: 'v1',
      },
    })).data;
    assert.equal(registered.user.address, 'Calle Parcial #55');
    assert.equal(registered.user.role, 'CLIENT');
    assert.ok(registered.token);
    const verification = (await api('/address/verify', {
      method: 'POST', status: 200, body: { address: 'Calle Parcial #55', localityId: zone.id },
    })).data;
    assert.equal(verification.streetVerified, true);
    assert.equal(verification.verified, false);
  });

  await t.test('sigue rechazando coincidencias solo de localidad y calles fuera de zona', async () => {
    for (const [index, address] of ['Sin calle 55', 'Fuera zona 55'].entries()) {
      const rejected = (await api('/auth/register', {
        method: 'POST', status: 400,
        body: {
          username: `cliente_rechazado_${index}`, email: `rechazado${index}@example.com`, password,
          address, localityId: zone.id, termsAccepted: true, termsVersion: 'v1',
        },
      })).data;
      assert.equal(rejected.code, 'VALIDATION_ERROR');
      assert.ok(rejected.errors.address);
    }
  });
});
