import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FixtureStore } from './support/fixture-store.mjs';
import { chooseConclusion, compareCohorts, investigate, wilson } from '../server/agent.mjs';
import { makeDataset, summarizeOrders } from '../server/data.mjs';

async function evidence(store, id) {
  return {
    batch: await store.cohorts(id, 'batch'),
    courier: await store.cohorts(id, 'courier'),
    warehouse: await store.cohorts(id, 'warehouse'),
    strata: await store.strata(id),
  };
}
test('seeded scenarios identify batch, courier, and insufficient evidence separately', async () => {
  const store = new FixtureStore();
  for (const [id, expected] of [
    ['SKU-AURA', 'batch_defect'],
    ['SKU-PULSE', 'courier_damage'],
    ['SKU-NOVA', 'inconclusive'],
  ]) {
    assert.equal(chooseConclusion(await evidence(store, id)).kind, expected);
  }
  assert.equal(chooseConclusion(await evidence(store, 'SKU-NOVA')).target, null);
});
test('rates use delivered order denominators, not raw return volume', () => {
  const comparisons = compareCohorts([
    { id: 'large', orders: 1000, returns: 50 },
    { id: 'small', orders: 100, returns: 30 },
  ]);
  assert.equal(comparisons[0].id, 'small');
  assert.equal(comparisons[0].strong, true);
  assert.equal(comparisons[1].strong, false);
});
test('small sample cannot trigger a targeted intervention', () => {
  assert.equal(
    compareCohorts([
      { id: 'tiny', orders: 5, returns: 5 },
      { id: 'control', orders: 100, returns: 2 },
    ])[0].strong,
    false,
  );
});
test('a confounded association is downgraded', async () => {
  const store = new FixtureStore(),
    e = await evidence(store, 'SKU-AURA');
  e.strata = [];
  assert.equal(chooseConclusion(e).kind, 'inconclusive');
});
test('empty evidence abstains and Wilson interval stays finite at extremes', () => {
  assert.equal(chooseConclusion({}).kind, 'inconclusive');
  for (const n of [0, 1, 100]) {
    const [lo, hi] = wilson(n, 100);
    assert.ok(lo >= 0 && hi <= 1 && lo <= hi);
  }
});
test('changing graph evidence changes the conclusion, independent of product name', async () => {
  const d = makeDataset();
  for (const o of d.orders.filter((o) => o.productId === 'SKU-AURA' && o.period === 'current'))
    o.returned = false;
  assert.equal(
    chooseConclusion(await evidence(new FixtureStore({ dataset: d }), 'SKU-AURA')).kind,
    'inconclusive',
  );
});
test('households sharing addresses retain distinct devices and are not labeled fraudulent', async () => {
  const rows = await new FixtureStore().accounts('SKU-AURA');
  assert.ok(rows.some((r) => r.customers === 2));
  assert.ok(rows.every((r) => r.devices === r.customers));
});
test('mature 30-day cohorts have complete denominators and matching baseline', () => {
  const d = makeDataset(),
    summary = summarizeOrders(d.orders);
  assert.equal(summary.orders, 960);
  assert.equal(summary.returns, 120);
  assert.equal(summary.previousRate, 0.05);
  assert.equal(summary.value, 13000);
  for (const o of d.orders) {
    assert.ok(new Date('2026-10-15') - new Date(o.orderedAt) >= 30 * 86400000);
    if (o.returned) assert.ok(new Date(o.returnedAt) - new Date(o.orderedAt) <= 30 * 86400000);
  }
});
test('investigations persist, repeated runs deduplicate actions, and outcomes are recalled', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'returntrace-test-'));
  try {
    const store = new FixtureStore({ directory });
    await store.init();
    const first = await investigate(store, {
      productId: 'SKU-AURA',
      question: 'What explains the return spike?',
    });
    assert.equal(first.action.type, 'component_inspection');
    assert.equal(first.investigation.trace.length, 7);
    await store.updateAction(
      first.action.id,
      'resolved',
      'Inspection reproduced the fault in the sample.',
    );
    const fresh = new FixtureStore({ directory });
    await fresh.init();
    const second = await investigate(fresh, {
      productId: 'SKU-AURA',
      question: 'What did we learn from the previous inspection?',
    });
    assert.equal(second.action.id, first.action.id);
    assert.equal(second.investigation.evidence.memory.cases.length, 1);
    assert.equal(second.investigation.evidence.memory.actions[0].status, 'resolved');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
