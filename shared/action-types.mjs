const interventionTypes = {
  shared_component: 'component_inspection',
  batch_defect: 'batch_inspection',
  courier_damage: 'courier_audit',
  review_conflict: 'independent_review',
};

export function interventionType(conclusion) {
  return interventionTypes[conclusion.kind] || 'collect_evidence';
}

export function interventionKey(productId, type, target) {
  return `${productId}:${type}:${target}`;
}
