import assert from 'node:assert/strict';
import { GraphStore } from '../server/store.mjs';
import { FixtureStore } from '../tests/support/fixture-store.mjs';
import { chooseConclusion, investigate } from '../server/agent.mjs';
import { randomUUID } from 'node:crypto';
process.env.FALKORDB_GRAPH = `returntrace_test_${randomUUID().replaceAll('-', '')}`;
const store = new GraphStore(),
  fixture = new FixtureStore();
try {
  await store.init();
  assert.equal(await store.isReady(), true);
  assert.equal((await store.orders()).length, 1920);
  for (const id of ['SKU-AURA', 'SKU-PULSE', 'SKU-NOVA']) {
    const e = {};
    for (const dimension of ['batch', 'courier', 'warehouse']) {
      const live = await store.cohorts(id, dimension),
        expected = await fixture.cohorts(id, dimension);
      assert.deepEqual(live, expected);
      e[dimension] = live;
    }
    e.strata = await store.strata(id);
    assert.equal(
      chooseConclusion(e).kind,
      { 'SKU-AURA': 'batch_defect', 'SKU-PULSE': 'courier_damage', 'SKU-NOVA': 'inconclusive' }[id],
    );
    assert.equal((await store.paths(id)).length, (await fixture.paths(id)).length);
  }
  const first = await investigate(
    store,
    { productId: 'SKU-AURA', question: 'Why are these products being returned?' },
    () => {},
    { useModel: false },
  );
  await store.updateAction(first.action.id, 'approved', '');
  await store.updateAction(
    first.action.id,
    'resolved',
    'Sample inspection reproduced the defect.',
    { assessment: 'confirmed', sampled: 10, failed: 8 },
  );
  assert.equal((await store.inspections('SKU-LYRA')).length, 1);
  assert.deepEqual(await store.components('SKU-AURA'), await fixture.components('SKU-AURA'));
  const counts = await store.counts();
  await store.query("MATCH (d:Dataset) SET d.version='returntrace-synthetic-v1'");
  await store.close();
  assert.equal(await store.isReady(), false);
  await store.init();
  assert.deepEqual(await store.counts(), counts);
  const second = await investigate(
    store,
    { productId: 'SKU-AURA', question: 'Recheck the pattern and previous outcomes.' },
    () => {},
    { useModel: false },
  );
  assert.equal(second.action.id, first.action.id);
  assert.equal(second.investigation.conclusion.feedback.status, 'confirmed');
  assert.ok(second.action.ticket.id);
  assert.equal(
    (await store.query('MATCH (:Inspection)-[:TESTS]->(:ComponentLot) RETURN count(*) AS n'))[0].n,
    1,
  );
  assert.equal(
    second.investigation.evidence.memory.actions[0].note,
    'Sample inspection reproduced the defect.',
  );
  assert.equal((await store.actions()).length, 1);
  console.log(
    'PASS: real FalkorDB queries, scenario parity, persisted investigations, action deduplication, and reconnect memory.',
  );
} finally {
  // Only this script's freshly generated test graph is deleted. Never the user graph.
  if (store.graph) await store.graph.delete();
  await store.close();
}
