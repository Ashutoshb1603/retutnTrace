export const ORDER_QUERY = `MATCH (o:Order)-[:CONTAINS]->(u:Unit)-[:OF_PRODUCT]->(p:Product)
MATCH (u)-[:FROM_BATCH]->(b:Batch)
MATCH (o)-[:SHIPPED_BY]->(c:Courier)
MATCH (o)-[:FULFILLED_BY]->(w:Warehouse)
MATCH (customer:Customer)-[:PLACED]->(o)
MATCH (customer)-[:USES_DEVICE]->(device:Device)
MATCH (o)-[:DELIVERED_TO]->(address:Address)
OPTIONAL MATCH (r:Return)-[:FOR_ORDER]->(o)
RETURN o.id AS id, o.period AS period, o.orderedAt AS orderedAt, o.amount AS amount,
p.id AS productId, p.name AS productName, u.id AS unitId, b.id AS batchId,
c.id AS courier, w.id AS warehouse, customer.id AS customerId,
device.id AS deviceId, address.id AS addressId,
r.id AS returnId, r.reason AS reason, r.returnedAt AS returnedAt`;

const dimensions = {
  batch: { match: 'MATCH (u)-[:FROM_BATCH]->(d:Batch)', field: 'batchId' },
  courier: { match: 'MATCH (o)-[:SHIPPED_BY]->(d:Courier)', field: 'courier' },
  warehouse: { match: 'MATCH (o)-[:FULFILLED_BY]->(d:Warehouse)', field: 'warehouse' },
};
export function cohortQuery(dimension) {
  if (!dimensions[dimension]) throw new Error('Unsupported dimension');
  return `MATCH (o:Order)-[:CONTAINS]->(u:Unit)-[:OF_PRODUCT]->(p:Product {id: $productId})
${dimensions[dimension].match}
WHERE o.period = 'current'
OPTIONAL MATCH (r:Return)-[:FOR_ORDER]->(o)
RETURN d.id AS id, count(DISTINCT o) AS orders, count(DISTINCT r) AS returns
ORDER BY id`;
}
export const STRATA_QUERY = `MATCH (o:Order)-[:CONTAINS]->(u:Unit)-[:OF_PRODUCT]->(p:Product {id: $productId})
MATCH (u)-[:FROM_BATCH]->(b:Batch)
MATCH (o)-[:SHIPPED_BY]->(c:Courier)
WHERE o.period = 'current'
OPTIONAL MATCH (r:Return)-[:FOR_ORDER]->(o)
RETURN b.id AS batchId, c.id AS courier, count(DISTINCT o) AS orders, count(DISTINCT r) AS returns
ORDER BY batchId, courier`;
export const ACCOUNTS_QUERY = `MATCH (customer:Customer)-[:PLACED]->(o:Order)-[:CONTAINS]->(:Unit)-[:OF_PRODUCT]->(:Product {id: $productId})
MATCH (customer)-[:USES_DEVICE]->(device:Device)
MATCH (o)-[:DELIVERED_TO]->(address:Address)
WHERE o.period = 'current'
OPTIONAL MATCH (r:Return)-[:FOR_ORDER]->(o)
RETURN address.id AS address, count(DISTINCT customer) AS customers,
count(DISTINCT device) AS devices, count(DISTINCT o) AS orders, count(DISTINCT r) AS returns
ORDER BY customers DESC LIMIT 20`;
export const PATH_QUERY = `MATCH (r:Return)-[:FOR_ORDER]->(o:Order)-[:CONTAINS]->(u:Unit)-[:OF_PRODUCT]->(p:Product {id: $productId})
MATCH (u)-[:FROM_BATCH]->(b:Batch)
MATCH (o)-[:SHIPPED_BY]->(c:Courier)
WHERE o.period = 'current'
RETURN r.id AS returnId, r.reason AS reason, o.id AS orderId, u.id AS unitId,
b.id AS batchId, c.id AS courier, p.id AS productId
ORDER BY returnId LIMIT 60`;
export { dimensions };

// Expand only through component lots used by the selected product, then include
// every batch of each connected product as a denominator and comparison group.
export const COMPONENT_QUERY = `MATCH (o:Order)-[:CONTAINS]->(u:Unit)-[:OF_PRODUCT]->(:Product {id:$productId})
MATCH (u)-[:FROM_BATCH]->(:Batch)-[:USES_COMPONENT]->(shared:ComponentLot)
MATCH (shared)<-[:USES_COMPONENT]-(:Batch)<-[:FROM_BATCH]-(peer:Unit)-[:OF_PRODUCT]->(p:Product)
WHERE o.period='current'
WITH DISTINCT p
MATCH (order:Order)-[:CONTAINS]->(unit:Unit)-[:OF_PRODUCT]->(p)
MATCH (unit)-[:FROM_BATCH]->(batch:Batch)-[:USES_COMPONENT]->(lot:ComponentLot)-[:SUPPLIED_BY]->(supplier:Supplier)
MATCH (order)-[:SHIPPED_BY]->(courier:Courier)
WHERE order.period='current'
OPTIONAL MATCH (returned:Return)-[:FOR_ORDER]->(order)
RETURN p.id AS productId, p.name AS productName, batch.id AS batchId,
lot.id AS lotId, supplier.id AS supplierId, supplier.name AS supplierName,
courier.id AS courier, count(DISTINCT order) AS orders, count(DISTINCT returned) AS returns
ORDER BY productId, batchId, courier`;

export const INSPECTION_QUERY = `MATCH (p:Product {id:$productId})<-[:OF_PRODUCT]-(u:Unit)-[:FROM_BATCH]->(b:Batch)
OPTIONAL MATCH (b)-[:USES_COMPONENT]->(lot:ComponentLot)
WITH collect(DISTINCT lot.id) AS lots
MATCH (i:Inspection)
WHERE i.productId=$productId OR i.targetId IN lots
RETURN i.payload AS payload ORDER BY i.createdAt DESC`;
