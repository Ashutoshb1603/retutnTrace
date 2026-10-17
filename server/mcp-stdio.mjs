import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStore } from './store.mjs';
import { createEvidenceServer } from './evidence-tools.mjs';
const productId = process.argv[2];
const store = await createStore();
if (!(await store.products()).some((p) => p.id === productId)) {
  await store.close();
  throw Error('Pass a known product ID, e.g. SKU-AURA.');
}
const { server } = createEvidenceServer(store, productId);
await server.connect(new StdioServerTransport());
process.on('SIGINT', async () => {
  await server.close();
  await store.close();
  process.exit(0);
});
