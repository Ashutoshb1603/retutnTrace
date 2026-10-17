import { interventionType } from './action-types.mjs';

const actionLabels = {
  component_inspection: 'Inspect the shared component',
  batch_inspection: 'Inspect the manufacturing batch',
  courier_audit: 'Audit the courier route',
  independent_review: 'Collect an independent sample and review the evidence',
  collect_evidence: 'Collect more evidence',
};

export function caseScope(conclusion) {
  const target = conclusion.target;
  if (conclusion.kind === 'inconclusive' || !target) return null;
  if (!Number.isFinite(target.orders) || !Number.isFinite(target.returns)) return null;
  return {
    targetId: target.id,
    orders: target.orders,
    returns: target.returns,
    products: conclusion.component
      ? new Set(conclusion.component.comparisons.map((row) => row.productId)).size
      : 1,
  };
}

export function inspectionEffect(investigation) {
  const before = investigation.cohortConclusion;
  const after = investigation.conclusion;
  if (!before || !after.feedback?.inspections?.length) return null;
  const beforeType = interventionType(before);
  const afterType = interventionType(after);
  return {
    changed: beforeType !== afterType,
    before: { finding: before.title, action: actionLabels[beforeType] },
    after: { finding: after.title, action: actionLabels[afterType] },
  };
}
