import { randomUUID } from 'node:crypto';
import { interventionType, interventionKey } from '../shared/action-types.mjs';

const inspectionSteps = {
  component_inspection: [
    'Sample returned units from each connected product and isolate the audio processor.',
    'Compare failure rates with units using other component lots.',
    'Record the tested sample and request supplier review if the inspection supports the lead.',
  ],
  batch_inspection: [
    'Bench-test returned units from this batch.',
    'Compare the failure mode against another batch.',
    'Review a temporary inventory hold only after inspection confirms the defect.',
  ],
  courier_audit: [
    'Review packaging photos and handling scans.',
    'Compare damage by route and packaging configuration.',
    'Trial an alternative route after logistics review.',
  ],
  independent_review: [
    'Review the contradictory inspection methods and sample selection.',
    'Run a blinded comparison with an independent sample.',
    'Record the outcome before any inventory or supplier action.',
  ],
  collect_evidence: [
    'Collect consistent return reasons and inspection results.',
    'Wait for sufficient mature orders in each comparison group.',
    'Rerun the investigation after new evidence arrives.',
  ],
};

export function makeIntervention(investigation) {
  const conclusion = investigation.conclusion;
  const type = interventionType(conclusion);
  const target = conclusion.target?.id || investigation.productId;
  const title = {
    component_inspection: `Inspect shared component ${target}`,
    batch_inspection: `Inspect batch ${target}`,
    courier_audit: `Audit handling with ${target}`,
    independent_review: `Reconcile inspections for ${target}`,
    collect_evidence: `Collect inspection evidence for ${investigation.productName}`,
  }[type];
  const steps = inspectionSteps[type];
  return {
    id: `ACT-${randomUUID().slice(0, 8).toUpperCase()}`,
    key: interventionKey(investigation.productId, type, target),
    investigationId: investigation.id,
    productId: investigation.productId,
    productName: investigation.productName,
    type,
    target,
    title,
    owner: type === 'courier_audit' ? 'Logistics operations' : 'Quality assurance',
    status: 'draft',
    priority: conclusion.kind === 'inconclusive' ? 'normal' : 'high',
    createdAt: new Date().toISOString(),
    note: '',
    rationale: conclusion.summary,
    steps,
    evidenceRefs: [
      investigation.id,
      ...(investigation.evidence.paths || []).slice(0, 6).map((p) => p.returnId),
    ],
    componentEvidence: conclusion.component?.comparisons || [],
    relatedProducts: conclusion.component?.comparisons.map((p) => p.productName) || [],
  };
}
