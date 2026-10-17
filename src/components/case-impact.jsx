import React from 'react';
import { caseScope, inspectionEffect } from '../../shared/case-impact.mjs';
import { StatusBadge } from './ui.jsx';

export function CohortScope({ conclusion }) {
  const scope = caseScope(conclusion);
  if (!scope) return null;
  return (
    <section className="panel evidence-section cohort-scope">
      <div className="panel-heading">
        <div>
          <p className="section-label">INSPECTION SCOPE</p>
          <h2>Orders connected to {scope.targetId}</h2>
        </div>
      </div>
      <dl className="scope-counts">
        <div>
          <dt>Delivered orders</dt>
          <dd>{scope.orders.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Returned orders</dt>
          <dd>{scope.returns.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Products</dt>
          <dd>{scope.products}</dd>
        </div>
      </dl>
      <p className="table-note">
        Counts cover the current mature cohort in the graph. Connected orders are a scope for
        investigation; they are not a count of defective units or prevented returns.
      </p>
    </section>
  );
}

export function InspectionEffect({ investigation }) {
  const effect = inspectionEffect(investigation);
  if (!effect) return null;
  return (
    <section className="panel evidence-section inspection-effect">
      <div className="panel-heading">
        <div>
          <p className="section-label">DECISION CHECK</p>
          <h2>What the inspection changes</h2>
          <p>The same cohort evidence, with and without recorded inspection reports.</p>
        </div>
        <StatusBadge tone={effect.changed ? 'rust' : 'neutral'}>
          {effect.changed ? 'Next action changed' : 'Next action retained'}
        </StatusBadge>
      </div>
      <div className="decision-comparison">
        <article>
          <h3>Cohort evidence alone</h3>
          <p>{effect.before.finding}</p>
          <small>PROPOSED ACTION</small>
          <strong>{effect.before.action}</strong>
        </article>
        <article>
          <h3>With recorded inspections</h3>
          <p>{effect.after.finding}</p>
          <small>PROPOSED ACTION</small>
          <strong>{effect.after.action}</strong>
        </article>
      </div>
      <p className="table-note">
        This comparison explains the decision in this run. It does not measure a reduction in
        returns; inspection reports do not alter the cohort counts.
      </p>
    </section>
  );
}
