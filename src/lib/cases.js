import { interventionKey, interventionType } from '../../shared/action-types.mjs';

export const statusLabels = {
  draft: 'Needs approval',
  approved: 'In progress',
  resolved: 'Closed',
  dismissed: 'Dismissed',
};

export function actionForCase(investigation, actions) {
  if (!investigation) return null;
  const { productId, conclusion } = investigation;
  const key = interventionKey(
    productId,
    interventionType(conclusion),
    conclusion.target?.id || productId,
  );
  return actions.find((action) => action.key === key && action.status !== 'dismissed');
}

export function latestCase(productId, investigations) {
  return investigations.find((investigation) => investigation.productId === productId);
}

export function isOpen(action) {
  return action.status === 'draft' || action.status === 'approved';
}

export function evidenceLabel(conclusion) {
  if (conclusion.kind === 'review_conflict') return 'Inspection needs review';
  if (conclusion.kind === 'inconclusive') return 'More evidence needed';
  if (conclusion.feedback?.status === 'confirmed') return 'Sample supports the lead';
  return 'Inspection required';
}
