import { createStore } from '../server/store.mjs';
const store = await createStore();
try {
  console.log(JSON.stringify({ backend: store.kind, ...(await store.counts()) }, null, 2));
} finally {
  await store.close();
}
