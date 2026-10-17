import test from 'node:test';
import assert from 'node:assert/strict';
import { FixtureStore } from './support/fixture-store.mjs';
import { sampleEvidencePaths } from '../src/graph.mjs';

test('inconclusive graph covers the available batches and couriers, without duplicate records', async () => {
  const paths = await new FixtureStore().paths('SKU-NOVA');
  const sample = sampleEvidencePaths(paths, { kind: 'inconclusive', target: null });
  assert.equal(sample.length, 6);
  assert.equal(new Set(sample.map((p) => p.returnId)).size, 6);
  assert.equal(new Set(sample.map((p) => p.batchId)).size, 3);
  assert.equal(new Set(sample.map((p) => p.courier)).size, 4);
  assert.ok(sample.every((p) => paths.includes(p)));
  assert.deepEqual(sampleEvidencePaths([], {}), []);
});

test('targeted graph includes corroborating contexts and comparison records', async () => {
  for (const [product, kind, field, target, context, minimum] of [
    ['SKU-AURA', 'batch_defect', 'batchId', 'AURA-SEP-01', 'courier', 4],
    ['SKU-PULSE', 'courier_damage', 'courier', 'ParcelFlow', 'batchId', 3],
  ]) {
    const paths = await new FixtureStore().paths(product);
    const sample = sampleEvidencePaths(paths, { kind, target: { id: target } });
    const leads = sample.filter((p) => p[field] === target);
    assert.equal(sample.length, 6);
    assert.equal(leads.length, 4);
    assert.ok(new Set(leads.map((p) => p[context])).size >= minimum);
    assert.equal(new Set(sample.map((p) => p.returnId)).size, 6);
  }
});
