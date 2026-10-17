import { FalkorDB } from 'falkordb';
import { makeDataset, DATASET_VERSION } from './data.mjs';
import {
  ORDER_QUERY,
  cohortQuery,
  STRATA_QUERY,
  ACCOUNTS_QUERY,
  PATH_QUERY,
  COMPONENT_QUERY,
  INSPECTION_QUERY,
} from './queries.mjs';
import { actionUpdate } from './workflow.mjs';

export class GraphStore {
  kind = 'falkordb';
  constructor(options = {}) {
    this.options = options;
  }
  async init() {
    const socket = { connectTimeout: 5000, reconnectStrategy: false };
    const options = process.env.FALKORDB_URL
      ? { url: process.env.FALKORDB_URL, socket }
      : {
          socket: {
            ...socket,
            host: process.env.FALKORDB_HOST || '127.0.0.1',
            port: Number(process.env.FALKORDB_PORT || 6380),
          },
          username: process.env.FALKORDB_USERNAME || undefined,
          password: process.env.FALKORDB_PASSWORD || undefined,
        };
    this.db = await FalkorDB.connect({ ...options, ...this.options });
    this.db.on('error', () => {}); // Queries surface connection errors through the API; avoid an unhandled emitter error.
    const graphName = process.env.FALKORDB_GRAPH || 'returntrace';
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(graphName)) throw Error('Invalid graph name');
    this.graph = this.db.selectGraph(graphName);
    const rows = await this.query('MATCH (m:Dataset {id: $id}) RETURN m.version AS version', {
      id: 'returntrace',
    });
    if (rows.length && !['returntrace-synthetic-v1', DATASET_VERSION].includes(rows[0].version))
      throw Error('Unknown dataset version; use a new FALKORDB_GRAPH to preserve existing data.');
    // v2 only adds products and component links; MERGE preserves history and outcomes.
    if (!rows.length || rows[0].version !== DATASET_VERSION) await this.seed();
  }
  async query(query, params = {}) {
    const result = await this.graph.query(query, { params, timeout: 15000 });
    return result.data || [];
  }
  async isReady() {
    return Boolean(this.db && (await this.db.connection).isReady);
  }
  async seed() {
    const d = makeDataset();
    try {
      await this.query('CREATE INDEX FOR (n:Record) ON (n.id)');
    } catch (error) {
      if (!/Attribute 'id' is already indexed/.test(error.message)) throw error;
    }
    // MERGE makes interrupted imports safe to resume. Labels and edge names come only from this fixed generator.
    for (const label of new Set(d.nodes.map((n) => n.label))) {
      const nodes = d.nodes.filter((n) => n.label === label).map(({ label, ...n }) => n);
      for (let i = 0; i < nodes.length; i += 200)
        await this.query(
          `UNWIND $rows AS row MERGE (n:Record:${label} {id: row.id}) SET n += row`,
          { rows: nodes.slice(i, i + 200) },
        );
    }
    for (const type of new Set(d.edges.map((e) => e.type))) {
      const rows = d.edges.filter((e) => e.type === type);
      for (let i = 0; i < rows.length; i += 200)
        await this.query(
          `UNWIND $rows AS row MATCH (a:Record {id: row.source}), (b:Record {id: row.target}) MERGE (a)-[:${type}]->(b)`,
          { rows: rows.slice(i, i + 200) },
        );
    }
    await this.query('MERGE (m:Dataset {id: $id}) SET m.version=$version, m.asOf=$asOf', {
      id: 'returntrace',
      version: d.version,
      asOf: d.asOf,
    });
  }
  async orders() {
    return (await this.query(ORDER_QUERY)).map((o) => ({
      ...o,
      returned: !!o.returnId,
      reason: o.reason || '',
      returnedAt: o.returnedAt || '',
    }));
  }
  async products() {
    return this.query(
      'MATCH (p:Product) RETURN p.id AS id, p.name AS name, p.category AS category, p.price AS price, p.icon AS icon, p.description AS description, p.color AS color ORDER BY p.id',
    );
  }
  async counts() {
    const [n, e] = await Promise.all([
      this.query('MATCH (n) RETURN count(n) AS count'),
      this.query('MATCH ()-[r]->() RETURN count(r) AS count'),
    ]);
    return { nodes: n[0].count, edges: e[0].count };
  }
  async cohorts(productId, dimension) {
    return this.query(cohortQuery(dimension), { productId });
  }
  async strata(productId) {
    return this.query(STRATA_QUERY, { productId });
  }
  async accounts(productId) {
    return this.query(ACCOUNTS_QUERY, { productId });
  }
  async paths(productId) {
    return this.query(PATH_QUERY, { productId });
  }
  async components(productId) {
    return this.query(COMPONENT_QUERY, { productId });
  }
  async inspections(productId) {
    return (await this.query(INSPECTION_QUERY, { productId })).map((r) => JSON.parse(r.payload));
  }
  async saveInvestigation(value) {
    await this.query(
      'MATCH (p:Product {id:$productId}) CREATE (i:Investigation {id:$id, productId:$productId, createdAt:$createdAt, payload:$payload}) CREATE (i)-[:INVESTIGATES]->(p)',
      {
        id: value.id,
        productId: value.productId,
        createdAt: value.createdAt,
        payload: JSON.stringify(value),
      },
    );
    return value;
  }
  async investigations(productId) {
    const q = productId
      ? 'MATCH (i:Investigation {productId:$productId}) RETURN i.payload AS payload ORDER BY i.createdAt DESC'
      : 'MATCH (i:Investigation) RETURN i.payload AS payload ORDER BY i.createdAt DESC';
    return (await this.query(q, productId ? { productId } : {})).map((r) => JSON.parse(r.payload));
  }
  async actions() {
    return (
      await this.query(
        'MATCH (a:Intervention) RETURN a.payload AS payload ORDER BY a.createdAt DESC',
      )
    ).map((r) => JSON.parse(r.payload));
  }
  async createAction(value) {
    const old = (await this.actions()).find((a) => a.key === value.key && a.status !== 'dismissed');
    if (old) return { ...old, deduplicated: true };
    await this.query(
      'MATCH (i:Investigation {id:$investigationId}) CREATE (a:Intervention {id:$id, key:$key, createdAt:$createdAt, payload:$payload}) CREATE (i)-[:PROPOSES]->(a)',
      {
        id: value.id,
        key: value.key,
        createdAt: value.createdAt,
        investigationId: value.investigationId,
        payload: JSON.stringify(value),
      },
    );
    return value;
  }
  async updateAction(id, status, note, inspection) {
    const old = (await this.actions()).find((a) => a.id === id);
    if (!old) return null;
    const a = actionUpdate(old, status, note, inspection);
    let query = 'MATCH (a:Intervention {id:$id}) SET a.payload=$payload';
    const params = { id, payload: JSON.stringify(a) };
    if (a.ticket) {
      query +=
        ' MERGE (t:Ticket {id:$ticketId}) SET t.payload=$ticketPayload MERGE (a)-[:HAS_TICKET]->(t)';
      Object.assign(params, { ticketId: a.ticket.id, ticketPayload: JSON.stringify(a.ticket) });
    }
    if (a.inspection) {
      query +=
        ' MERGE (i:Inspection {id:$inspectionId}) SET i.payload=$inspectionPayload, i.productId=$productId, i.targetId=$targetId, i.createdAt=$createdAt MERGE (a)-[:HAS_OUTCOME]->(i) WITH i OPTIONAL MATCH (target:Record {id:$targetId}) FOREACH (n IN CASE WHEN target IS NULL THEN [] ELSE [target] END | MERGE (i)-[:TESTS]->(n))';
      Object.assign(params, {
        inspectionId: a.inspection.id,
        inspectionPayload: JSON.stringify(a.inspection),
        productId: a.productId,
        targetId: a.target,
        createdAt: a.inspection.createdAt,
      });
    }
    await this.query(query, params);
    return a;
  }
  async attachExternalTicket(id, external) {
    const action = (await this.actions()).find((a) => a.id === id);
    action.externalTicket = external;
    await this.query('MATCH (a:Intervention {id:$id}) SET a.payload=$payload', {
      id,
      payload: JSON.stringify(action),
    });
    return action;
  }
  async close() {
    if (this.db) await this.db.close();
  }
}

export async function createStore() {
  if (process.env.GRAPH_BACKEND && process.env.GRAPH_BACKEND !== 'falkordb')
    throw Error('FalkorDB is required. FixtureStore is available only in the test harness.');
  const store = new GraphStore();
  try {
    await store.init();
    return store;
  } catch (error) {
    await store.close().catch(() => {});
    throw error;
  }
}
