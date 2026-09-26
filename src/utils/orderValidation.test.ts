import test from 'node:test';
import assert from 'node:assert/strict';

import { isSingleBusinessOrder } from './orderValidation';

test('accepts an order whose items belong to the same business', () => {
  const result = isSingleBusinessOrder('biz-1', [
    { product: { businessId: 'biz-1' } },
    { product: { businessId: 'biz-1' } },
  ]);

  assert.equal(result, true);
});

test('rejects a mixed-business order', () => {
  const result = isSingleBusinessOrder('biz-1', [
    { product: { businessId: 'biz-1' } },
    { product: { businessId: 'biz-2' } },
  ]);

  assert.equal(result, false);
});

test('rejects an empty or invalid item list for a business order', () => {
  assert.equal(isSingleBusinessOrder('biz-1', []), false);
  assert.equal(isSingleBusinessOrder('biz-1', [{ product: undefined }]), false);
});
