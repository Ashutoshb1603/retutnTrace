import { chooseConclusion, compareCohorts } from './analysis.mjs';

function total(rows, field) {
  return rows.reduce((sum, row) => sum + row[field], 0);
}

function compareProductLot(rows, productId, lotId) {
  const productRows = rows.filter((row) => row.productId === productId);
  const exposed = productRows.filter((row) => row.lotId === lotId);
  const controls = productRows.filter((row) => row.lotId !== lotId);
  const comparison = compareCohorts([
    { id: lotId, orders: total(exposed, 'orders'), returns: total(exposed, 'returns') },
    { id: 'other lots', orders: total(controls, 'orders'), returns: total(controls, 'returns') },
  ]).find((row) => row.id === lotId);

  const couriers = [...new Set(productRows.map((row) => row.courier))];
  const checks = couriers.map((courier) => {
    const courierExposed = exposed.filter((row) => row.courier === courier);
    const courierControls = controls.filter((row) => row.courier === courier);
    const orders = total(courierExposed, 'orders');
    const otherOrders = total(courierControls, 'orders');
    const rate = orders ? total(courierExposed, 'returns') / orders : 0;
    const otherRate = otherOrders ? total(courierControls, 'returns') / otherOrders : 0;
    return {
      courier,
      orders,
      otherOrders,
      rate,
      otherRate,
      supports:
        orders >= 10 &&
        otherOrders >= 10 &&
        rate - otherRate >= 0.08 &&
        rate >= 2 * Math.max(otherRate, 0.01),
    };
  });

  return {
    ...comparison,
    productId,
    productName: productRows[0].productName,
    batchIds: [...new Set(exposed.map((row) => row.batchId))],
    checks,
    supports: comparison.strong && checks.filter((check) => check.supports).length >= 2,
  };
}

function followSharedComponent(batchConclusion, componentRows) {
  if (batchConclusion.kind !== 'batch_defect' || !componentRows?.length) return batchConclusion;
  const lead = componentRows.find((row) => row.batchId === batchConclusion.target.id);
  if (!lead) return batchConclusion;

  const exposed = componentRows.filter((row) => row.lotId === lead.lotId);
  const productIds = [...new Set(exposed.map((row) => row.productId))];
  const comparisons = productIds.map((productId) =>
    compareProductLot(componentRows, productId, lead.lotId),
  );
  const supportingProducts = comparisons.filter((comparison) => comparison.supports).length;

  // A shared part is common in manufacturing. It only strengthens the lead when
  // separate products have their own elevated rates and courier comparisons.
  if (supportingProducts < 2) return batchConclusion;

  return {
    ...batchConclusion,
    kind: 'shared_component',
    batchLead: batchConclusion.target,
    target: {
      id: lead.lotId,
      dimension: 'component',
      orders: total(exposed, 'orders'),
      returns: total(exposed, 'returns'),
    },
    title: `${lead.lotId} connects the return spikes`,
    summary: `${supportingProducts} products using this audio-processor lot have elevated return rates versus their own other lots. The pattern survives courier comparisons. Inspect the shared component before assigning a cause.`,
    countercheck: `${supportingProducts} products corroborate the association; each has at least two supporting courier comparisons.`,
    component: {
      lotId: lead.lotId,
      supplierId: lead.supplierId,
      supplierName: lead.supplierName,
      comparisons,
    },
  };
}

function applyInspectionHistory(conclusion, history) {
  const inspections = history.filter((inspection) => inspection.targetId === conclusion.target?.id);
  if (!inspections.length) return conclusion;

  const confirmed = inspections.some((inspection) => inspection.assessment === 'confirmed');
  const refuted = inspections.some((inspection) => inspection.assessment === 'refuted');
  let status = 'inconclusive';
  if (confirmed) status = 'confirmed';
  if (refuted) status = 'refuted';
  if (confirmed && refuted) status = 'conflicting';
  const result = { ...conclusion, feedback: { status, inspections } };

  if (refuted)
    return {
      ...result,
      kind: 'review_conflict',
      strength: 'Inspection challenges the lead',
      title: `Review the evidence for ${conclusion.target.id}`,
      summary: `The cohort association remains, but a recorded inspection refutes this lead${confirmed ? ' and another supports it' : ''}. Reconcile the inspection methods and collect an independent sample before further action.`,
      countercheck:
        'Historical inspection evidence changed the recommendation to an independent review.',
    };
  if (confirmed)
    return {
      ...result,
      strength: 'Association + reported inspection',
      summary:
        conclusion.summary +
        ' A recorded inspection supports this lead in the tested sample; this does not establish that every unit is defective.',
    };
  return result;
}

export function cohortConclusion(evidence) {
  const cohortConclusion = chooseConclusion(evidence);
  return followSharedComponent(cohortConclusion, evidence.components);
}

export function connectedConclusion(evidence) {
  return applyInspectionHistory(cohortConclusion(evidence), evidence.memory?.inspections || []);
}
