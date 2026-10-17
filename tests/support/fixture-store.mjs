import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { makeDataset } from '../../server/data.mjs';
import { dimensions } from '../../server/queries.mjs';
import { actionUpdate } from '../../server/workflow.mjs';

export class FixtureStore {
  kind = 'fixture';
  constructor({ directory = '.data', dataset = makeDataset() } = {}) {
    this.directory = directory;
    this.dataset = dataset;
    this.state = { investigations: [], actions: [] };
    this.pending = Promise.resolve();
  }
  async init() {
    await mkdir(this.directory, { recursive: true });
    try {
      this.state = JSON.parse(
        await readFile(path.join(this.directory, 'fixture-state.json'), 'utf8'),
      );
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  async persist() {
    const json = JSON.stringify(this.state, null, 2),
      file = path.join(this.directory, 'fixture-state.json');
    this.pending = this.pending.then(async () => {
      await writeFile(`${file}.tmp`, json);
      await rename(`${file}.tmp`, file);
    });
    await this.pending;
  }
  async orders() {
    return this.dataset.orders;
  }
  async products() {
    return this.dataset.products;
  }
  async counts() {
    return { nodes: this.dataset.nodes.length, edges: this.dataset.edges.length };
  }
  async cohorts(productId, dimension) {
    const field = dimensions[dimension]?.field;
    if (!field) throw Error('Invalid dimension');
    const map = new Map();
    for (const o of this.dataset.orders.filter(
      (o) => o.productId === productId && o.period === 'current',
    )) {
      const r = map.get(o[field]) || { id: o[field], orders: 0, returns: 0 };
      r.orders++;
      r.returns += Number(o.returned);
      map.set(r.id, r);
    }
    return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
  async strata(productId) {
    const map = new Map();
    for (const o of this.dataset.orders.filter(
      (o) => o.productId === productId && o.period === 'current',
    )) {
      const key = `${o.batchId}:${o.courier}`,
        r = map.get(key) || { batchId: o.batchId, courier: o.courier, orders: 0, returns: 0 };
      r.orders++;
      r.returns += Number(o.returned);
      map.set(key, r);
    }
    return [...map.values()];
  }
  async accounts(productId) {
    const m = new Map();
    for (const o of this.dataset.orders.filter(
      (o) => o.productId === productId && o.period === 'current',
    )) {
      const r = m.get(o.addressId) || {
        address: o.addressId,
        cs: new Set(),
        ds: new Set(),
        orders: 0,
        returns: 0,
      };
      r.cs.add(o.customerId);
      r.ds.add(o.deviceId);
      r.orders++;
      r.returns += Number(o.returned);
      m.set(o.addressId, r);
    }
    return [...m.values()]
      .map(({ cs, ds, ...r }) => ({ ...r, customers: cs.size, devices: ds.size }))
      .sort((a, b) => b.customers - a.customers)
      .slice(0, 20);
  }
  async paths(productId) {
    return this.dataset.orders
      .filter((o) => o.productId === productId && o.period === 'current' && o.returned)
      .slice(0, 60)
      .map((o) => ({
        returnId: o.returnId,
        reason: o.reason,
        orderId: o.id,
        unitId: o.unitId,
        batchId: o.batchId,
        courier: o.courier,
        productId,
      }));
  }
  async components(productId) {
    const orders = this.dataset.orders.filter((o) => o.period === 'current'),
      lots = new Set(orders.filter((o) => o.productId === productId).map((o) => o.componentLot));
    const peers = new Set(orders.filter((o) => lots.has(o.componentLot)).map((o) => o.productId)),
      groups = new Map();
    for (const o of orders.filter((o) => peers.has(o.productId))) {
      const key = `${o.batchId}:${o.courier}`,
        r = groups.get(key) || {
          productId: o.productId,
          productName: o.productName,
          batchId: o.batchId,
          lotId: o.componentLot,
          supplierId: o.supplierId,
          supplierName: 'Sonic Circuit Works',
          courier: o.courier,
          orders: 0,
          returns: 0,
        };
      r.orders++;
      r.returns += Number(o.returned);
      groups.set(key, r);
    }
    return [...groups.values()].sort((a, b) =>
      `${a.productId}:${a.batchId}:${a.courier}`.localeCompare(
        `${b.productId}:${b.batchId}:${b.courier}`,
      ),
    );
  }
  async inspections(productId) {
    const lots = new Set(
      this.dataset.orders.filter((o) => o.productId === productId).map((o) => o.componentLot),
    );
    return this.state.actions
      .map((a) => a.inspection)
      .filter((i) => i && (i.productId === productId || lots.has(i.targetId)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async saveInvestigation(value) {
    this.state.investigations.unshift(value);
    await this.persist();
    return value;
  }
  async investigations(productId) {
    return this.state.investigations.filter((v) => !productId || v.productId === productId);
  }
  async actions() {
    return this.state.actions;
  }
  async createAction(action) {
    const old = this.state.actions.find((a) => a.key === action.key && a.status !== 'dismissed');
    if (old) return { ...old, deduplicated: true };
    this.state.actions.unshift(action);
    await this.persist();
    return action;
  }
  async updateAction(id, status, note, inspection) {
    const index = this.state.actions.findIndex((a) => a.id === id);
    if (index < 0) return null;
    const action = actionUpdate(this.state.actions[index], status, note, inspection);
    this.state.actions[index] = action;
    await this.persist();
    return action;
  }
  async attachExternalTicket(id, external) {
    const action = this.state.actions.find((a) => a.id === id);
    action.externalTicket = external;
    await this.persist();
    return action;
  }
  async isReady() {
    return true;
  }
  async close() {}
}
