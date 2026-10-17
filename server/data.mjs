export const DATASET_VERSION = 'returntrace-synthetic-v2';
export const AS_OF = '2026-10-15';
export const PRODUCTS = [
  {
    id: 'SKU-AURA',
    name: 'Aura Pro Headphones',
    category: 'Audio',
    price: 129,
    icon: 'headphones',
    description: 'Wireless over-ear · Midnight',
    color: '#cae7d1',
  },
  {
    id: 'SKU-PULSE',
    name: 'Pulse Mini Speaker',
    category: 'Audio',
    price: 79,
    icon: 'speaker',
    description: 'Portable Bluetooth · Sand',
    color: '#f2dfc7',
  },
  {
    id: 'SKU-NOVA',
    name: 'Nova Studio Earbuds',
    category: 'Audio',
    price: 99,
    icon: 'earbuds',
    description: 'True wireless · Cloud',
    color: '#d9dcf0',
  },
  {
    id: 'SKU-LYRA',
    name: 'Lyra Travel Headphones',
    category: 'Audio',
    price: 119,
    icon: 'headphones',
    description: 'Compact over-ear · Moss',
    color: '#dce9be',
  },
];
export const COURIERS = ['ParcelFlow', 'SwiftShip', 'BlueRoute', 'NorthPost'];
export function makeDataset() {
  const nodes = [],
    edges = [],
    orders = [];
  const seen = new Set();
  const add = (label, props) => {
    if (!seen.has(props.id)) {
      nodes.push({ label, ...props });
      seen.add(props.id);
    }
  };
  const link = (source, type, target) => edges.push({ source, type, target });
  for (const product of PRODUCTS) {
    add('Product', product);
    for (const period of ['previous', 'current']) {
      for (let batch = 0; batch < 3; batch++) {
        const batchId = `${product.id.replace('SKU-', '')}-${period === 'current' ? 'SEP' : 'AUG'}-${String(batch + 1).padStart(2, '0')}`;
        add('Batch', {
          id: batchId,
          name: batchId,
          supplier: 'Meridian Audio',
          manufactured: period === 'current' ? '2026-08-20' : '2026-07-20',
        });
        const shared =
          period === 'current' && batch === 0 && ['SKU-AURA', 'SKU-LYRA'].includes(product.id);
        const componentLot = shared ? 'DSP-X17' : `DSP-${batchId}`;
        const supplierId = 'SUP-SONIC';
        add('Supplier', { id: supplierId, name: 'Sonic Circuit Works' });
        add('ComponentLot', {
          id: componentLot,
          name: 'Audio processor',
          component: 'DSP audio processor',
        });
        link(batchId, 'USES_COMPONENT', componentLot);
        if (!edges.some((e) => e.source === componentLot && e.type === 'SUPPLIED_BY'))
          link(componentLot, 'SUPPLIED_BY', supplierId);
        for (let i = 0; i < 80; i++) {
          const serial = orders.length + 1;
          const id = `ORD-${String(serial).padStart(5, '0')}`;
          const courier = COURIERS[i % 4];
          const warehouse = ['West fulfillment', 'East fulfillment'][(i + Math.floor(i / 4)) % 2];
          let returned = i < 4;
          if (period === 'current' && product.id === 'SKU-AURA' && batch === 0) returned = i < 32;
          if (period === 'current' && product.id === 'SKU-LYRA' && batch === 0) returned = i < 24;
          if (period === 'current' && product.id === 'SKU-PULSE')
            returned = i % 4 === 0 ? Math.floor(i / 4) < 9 : Math.floor(i / 4) < 1;
          const reason = shared
            ? 'Audio cuts out'
            : product.id === 'SKU-PULSE' && i % 4 === 0 && period === 'current'
              ? 'Damaged on arrival'
              : ['Changed mind', 'Fit preference', 'Not as expected', 'Changed mind'][i % 4];
          const customerId = `CUS-${String(serial).padStart(5, '0')}`;
          const deviceId = `DEV-${String(serial).padStart(5, '0')}`;
          // Ordinary households share an address; devices remain distinct.
          const addressId = `ADR-${Math.ceil(serial / 2)}`;
          const orderedAt = `2026-${period === 'current' ? '09' : '08'}-${String(1 + (i % 14)).padStart(2, '0')}`;
          const returnedAt = returned
            ? `2026-${period === 'current' ? '09' : '08'}-${String(15 + (i % 14)).padStart(2, '0')}`
            : '';
          const order = {
            id,
            productId: product.id,
            productName: product.name,
            batchId,
            courier,
            warehouse,
            customerId,
            deviceId,
            addressId,
            period,
            orderedAt,
            returned,
            returnedAt,
            reason: returned ? reason : '',
            amount: product.price,
            unitId: `UNIT-${serial}`,
            returnId: returned ? `RET-${String(serial).padStart(5, '0')}` : '',
          };
          orders.push({ ...order, componentLot, supplierId });
          add('Order', { id, period, orderedAt, amount: product.price });
          add('Unit', { id: order.unitId, name: `Unit ${serial}` });
          add('Courier', { id: courier, name: courier });
          add('Warehouse', { id: warehouse, name: warehouse });
          add('Customer', { id: customerId, name: customerId });
          add('Device', { id: deviceId, name: deviceId });
          add('Address', { id: addressId, name: `Household ${Math.ceil(serial / 2)}` });
          link(id, 'CONTAINS', order.unitId);
          link(order.unitId, 'OF_PRODUCT', product.id);
          link(order.unitId, 'FROM_BATCH', batchId);
          link(id, 'SHIPPED_BY', courier);
          link(id, 'FULFILLED_BY', warehouse);
          link(customerId, 'PLACED', id);
          link(customerId, 'USES_DEVICE', deviceId);
          link(id, 'DELIVERED_TO', addressId);
          if (returned) {
            add('Return', { id: order.returnId, reason, returnedAt });
            link(order.returnId, 'FOR_ORDER', id);
          }
        }
      }
    }
  }
  return { version: DATASET_VERSION, asOf: AS_OF, products: PRODUCTS, nodes, edges, orders };
}

export function summarizeOrders(orders, products = PRODUCTS) {
  const current = orders.filter((o) => o.period === 'current');
  const previous = orders.filter((o) => o.period === 'previous');
  const rate = (rows) => (rows.length ? rows.filter((o) => o.returned).length / rows.length : 0);
  const productStats = products
    .map((p) => {
      const rows = current.filter((o) => o.productId === p.id),
        old = previous.filter((o) => o.productId === p.id),
        returns = rows.filter((o) => o.returned);
      return {
        ...p,
        orders: rows.length,
        returns: returns.length,
        rate: rate(rows),
        previousRate: rate(old),
        value: returns.reduce((s, o) => s + o.amount, 0),
        lift: rate(old) ? rate(rows) / rate(old) : null,
      };
    })
    .sort((a, b) => b.rate - a.rate);
  return {
    asOf: AS_OF,
    orders: current.length,
    returns: current.filter((o) => o.returned).length,
    rate: rate(current),
    previousRate: rate(previous),
    value: current.filter((o) => o.returned).reduce((s, o) => s + o.amount, 0),
    products: productStats,
    trend: Array.from({ length: 14 }, (_, i) => ({
      day: `Sep ${15 + i}`,
      current: current.filter((o) => o.returned && Number(o.returnedAt.slice(-2)) === 15 + i)
        .length,
      previous: previous.filter((o) => o.returned && Number(o.returnedAt.slice(-2)) === 15 + i)
        .length,
    })),
    cohort: 'Orders Sep 1–14 vs Aug 1–14 · 30-day return window',
    synthetic: true,
  };
}
