import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import {
  cohortQuery,
  STRATA_QUERY,
  ACCOUNTS_QUERY,
  PATH_QUERY,
  COMPONENT_QUERY,
  INSPECTION_QUERY,
} from './queries.mjs';

export function evidenceTools(store, productId) {
  return {
    recall_cases: {
      label: 'Recall inspections and earlier decisions',
      key: 'memory',
      description: 'Read prior investigations, interventions and structured inspection results.',
      query: `MATCH (i:Investigation {productId:$productId}) RETURN i.payload AS payload ORDER BY i.createdAt DESC\n\nMATCH (a:Intervention) RETURN a.payload AS payload ORDER BY a.createdAt DESC\n\n${INSPECTION_QUERY}`,
      run: async () => ({
        cases: (await store.investigations(productId))
          .slice(0, 5)
          .map((i) => ({ id: i.id, conclusion: i.conclusion.title })),
        actions: (await store.actions()).filter((a) => a.productId === productId).slice(0, 5),
        inspections: await store.inspections(productId),
      }),
    },
    inspect_batches: {
      label: 'Compare manufacturing batches',
      key: 'batch',
      description: 'Compare batch return rates using all mature orders.',
      query: cohortQuery('batch'),
      run: () => store.cohorts(productId, 'batch'),
    },
    inspect_couriers: {
      label: 'Check the courier explanation',
      key: 'courier',
      description: 'Compare courier return rates with order denominators.',
      query: cohortQuery('courier'),
      run: () => store.cohorts(productId, 'courier'),
    },
    inspect_warehouses: {
      label: 'Check fulfillment origins',
      key: 'warehouse',
      description: 'Compare fulfillment locations as an alternative explanation.',
      query: cohortQuery('warehouse'),
      run: () => store.cohorts(productId, 'warehouse'),
    },
    check_confounding: {
      label: 'Test the lead across comparison groups',
      key: 'strata',
      description: 'Test a batch within couriers, and a courier within batches.',
      query: STRATA_QUERY,
      run: () => store.strata(productId),
    },
    trace_components: {
      label: 'Follow component lots into other products',
      key: 'components',
      description:
        'Traverse batch → component lot ← other batches → products, including comparison batches and courier strata.',
      query: COMPONENT_QUERY,
      run: () => store.components(productId),
    },
    trace_paths: {
      label: 'Trace findings to source records',
      key: 'paths',
      description: 'Retrieve source return, order, unit, batch and courier IDs.',
      query: PATH_QUERY,
      run: () => store.paths(productId),
    },
    check_accounts: {
      label: 'Check shared-account context',
      key: 'accounts',
      description: 'Inspect household and device context. Shared addresses are not proof of fraud.',
      query: ACCOUNTS_QUERY,
      run: () => store.accounts(productId),
    },
  };
}

export function createEvidenceServer(store, productId) {
  const server = new McpServer({ name: 'returntrace-evidence', version: '2.0.0' }),
    definitions = evidenceTools(store, productId);
  for (const [name, t] of Object.entries(definitions))
    server.registerTool(
      name,
      {
        title: t.label,
        description: t.description,
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      async () => ({ content: [{ type: 'text', text: JSON.stringify(await t.run()) }] }),
    );
  return { server, definitions };
}

export async function openEvidenceSession(store, productId) {
  const { server, definitions } = createEvidenceServer(store, productId);
  const client = new Client({ name: 'returntrace-investigator', version: '2.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  try {
    await client.connect(clientTransport);
    await client.listTools();
  } catch (error) {
    await server.close();
    throw error;
  }
  return {
    definitions,
    client,
    async call(name) {
      const r = await client.callTool({ name, arguments: {} });
      if (r.isError) throw Error(`Evidence tool failed: ${name}`);
      return JSON.parse(r.content.find((c) => c.type === 'text').text);
    },
    async close() {
      await client.close();
      await server.close();
    },
  };
}
