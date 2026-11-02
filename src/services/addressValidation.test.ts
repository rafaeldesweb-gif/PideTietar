import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAddress, type AddressVerificationError } from './addressValidation';

const confirmed = {
  configured: true, available: true, checked: true, verified: true,
  message: 'Dirección confirmada.',
};

test('verificación de dirección: distingue un fallo del servidor de una dirección no confirmada', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  for (const status of [200, 404, 502]) {
    await t.test(`HTML con estado ${status}: error legible sin intentar leer JSON`, async () => {
      globalThis.fetch = async () => new Response('<!DOCTYPE html><html>Error</html>', {
        status, headers: { 'Content-Type': 'text/html' },
      });
      await assert.rejects(verifyAddress('Calle doctor Díaz Palacios, #34', 'sotillo'), (error: AddressVerificationError) => {
        assert.equal(error.code, 'ADDRESS_API_UNAVAILABLE');
        assert.equal(error.status, status);
        assert.doesNotMatch(error.message, /Unexpected token|DOCTYPE/);
        if (status !== 502) assert.match(error.message, /Reinicia el backend/);
        return true;
      });
    });
  }

  await t.test('un cuerpo JSON vacío o incompleto no se considera verificado', async () => {
    for (const body of ['', '{}', 'null', '{invalido']) {
      globalThis.fetch = async () => new Response(body, { headers: { 'Content-Type': 'application/json' } });
      await assert.rejects(verifyAddress('Calle Mayor 34', 'sotillo'), { code: 'ADDRESS_API_INVALID_RESPONSE' });
    }
  });

  await t.test('sin clave no devuelve una confirmación falsa', async () => {
    const result = { ...confirmed, configured: false, available: false, checked: false, verified: false };
    globalThis.fetch = async () => Response.json(result);
    assert.deepEqual(await verifyAddress('Calle Mayor 34', 'sotillo'), result);
    globalThis.fetch = async () => Response.json({ ...result, verified: true });
    await assert.rejects(verifyAddress('Calle Mayor 34', 'sotillo'), { code: 'ADDRESS_API_INVALID_RESPONSE' });
  });

  await t.test('conserva los errores de campo de la API', async () => {
    globalThis.fetch = async () => Response.json({
      code: 'VALIDATION_ERROR', message: 'Selecciona una localidad.',
      errors: { localityId: 'Selecciona una localidad válida.' },
    }, { status: 400 });
    await assert.rejects(verifyAddress('Calle Mayor 34', ''), (error: AddressVerificationError) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.errors?.localityId, 'Selecciona una localidad válida.');
      return true;
    });
  });

  await t.test('un fallo de conexión informa de indisponibilidad', async () => {
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(verifyAddress('Calle Mayor 34', 'sotillo'), { code: 'ADDRESS_API_UNAVAILABLE' });
  });

  await t.test('envía la dirección literal y la localidad y acepta una confirmación completa', async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/address/verify');
      assert.equal(options?.method, 'POST');
      assert.deepEqual(JSON.parse(String(options?.body)), {
        address: 'Calle doctor Díaz Palacios, #34', localityId: 'sotillo',
      });
      return Response.json(confirmed);
    };
    assert.deepEqual(await verifyAddress(' Calle doctor Díaz Palacios, #34 ', 'sotillo'), confirmed);
  });
});
