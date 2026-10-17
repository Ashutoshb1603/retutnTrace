import { createStore } from '../server/store.mjs';
import { connectedConclusion } from '../server/agent.mjs';
const store = await createStore();
let failed = 0;
try {
  for (const [productId, expected] of [
    ['SKU-AURA', 'shared_component'],
    ['SKU-LYRA', 'shared_component'],
    ['SKU-PULSE', 'courier_damage'],
    ['SKU-NOVA', 'inconclusive'],
  ]) {
    const e = {
      batch: await store.cohorts(productId, 'batch'),
      courier: await store.cohorts(productId, 'courier'),
      warehouse: await store.cohorts(productId, 'warehouse'),
      strata: await store.strata(productId),
      components: await store.components(productId),
    };
    const actual = connectedConclusion(e).kind;
    console.log(
      JSON.stringify({
        backend: store.kind,
        productId,
        expected,
        actual,
        pass: expected === actual,
      }),
    );
    if (expected !== actual) failed++;
  }
  console.log(
    'Four products, three planted synthetic patterns; excludes inspection history. Not a real-world accuracy benchmark.',
  );
} finally {
  await store.close();
}
process.exitCode = failed ? 1 : 0;
