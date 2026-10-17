import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../server/store.mjs';
import { cohortConclusion, connectedConclusion } from '../server/connected-evidence.mjs';
import { caseScope, inspectionEffect } from '../shared/case-impact.mjs';
import { FixtureStore } from './support/fixture-store.mjs';

async function evidenceFor(productId) {
  const store = new FixtureStore();
  return {
    batch: await store.cohorts(productId, 'batch'),
    courier: await store.cohorts(productId, 'courier'),
    warehouse: await store.cohorts(productId, 'warehouse'),
    strata: await store.strata(productId),
    components: await store.components(productId),
  };
}

test('scope counts a shared lot once across products and abstains on inconclusive evidence', async () => {
  assert.deepEqual(caseScope(connectedConclusion(await evidenceFor('SKU-AURA'))), {
    targetId: 'DSP-X17',
    orders: 160,
    returns: 56,
    products: 2,
  });
  assert.deepEqual(caseScope(connectedConclusion(await evidenceFor('SKU-PULSE'))), {
    targetId: 'ParcelFlow',
    orders: 60,
    returns: 27,
    products: 1,
  });
  assert.equal(caseScope(connectedConclusion(await evidenceFor('SKU-NOVA'))), null);
});

test('inspection comparison distinguishes changed actions from additional support without changing scope', async () => {
  const evidence = await evidenceFor('SKU-AURA');
  const baseline = cohortConclusion(evidence);
  assert.equal(inspectionEffect({ cohortConclusion: baseline, conclusion: baseline }), null);
  for (const assessment of ['confirmed', 'refuted', 'inconclusive']) {
    evidence.memory = {
      inspections: [
        {
          id: 'INS-TEST',
          targetId: 'DSP-X17',
          assessment,
          sampled: 12,
          failed: assessment === 'confirmed' ? 8 : 0,
        },
      ],
    };
    const conclusion = connectedConclusion(evidence);
    const effect = inspectionEffect({ cohortConclusion: baseline, conclusion });
    assert.equal(effect.changed, assessment === 'refuted');
    assert.deepEqual(caseScope(conclusion), caseScope(baseline));
    assert.equal(inspectionEffect({ conclusion }), null, 'Older cases have no invented baseline');
  }
});

test('the production store rejects fixture selection rather than bypassing FalkorDB', async () => {
  const old = process.env.GRAPH_BACKEND;
  process.env.GRAPH_BACKEND = 'fixture';
  try {
    await assert.rejects(createStore(), /FalkorDB is required/);
  } finally {
    if (old === undefined) delete process.env.GRAPH_BACKEND;
    else process.env.GRAPH_BACKEND = old;
  }
});
