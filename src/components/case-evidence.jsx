import React from 'react';
import { ArrowUp, Check, ChevronDown } from 'lucide-react';
import { percent, shortDate } from '../lib/format.js';
import { StatusBadge } from './ui.jsx';

export function ComponentEvidence({ component, showMap = false }) {
  if (!component) return null;
  return (
    <section className="panel evidence-section">
      <div className="panel-heading">
        <div>
          <p className="section-label">CROSS-PRODUCT CHECK</p>
          <h2>Shared lot: {component.lotId}</h2>
          <p>
            {component.supplierName} · {component.supplierId}
          </p>
        </div>
        <StatusBadge tone="rust">{component.comparisons.length} products</StatusBadge>
      </div>
      {showMap && (
        <div className="component-map">
          <div className="supplier-node">
            <small>SUPPLIER</small>
            <strong>{component.supplierName}</strong>
            <code>{component.supplierId}</code>
          </div>
          <div className="relation">
            <ArrowUp size={18} />
            <code>SUPPLIED_BY</code>
          </div>
          <div className="lot-node">
            <small>COMPONENT LOT</small>
            <strong>{component.lotId}</strong>
          </div>
          <div className="relation">
            <ArrowUp size={18} />
            <code>USES_COMPONENT</code>
          </div>
          <div className="batch-nodes">
            {component.comparisons.map((product) => (
              <div key={product.productId}>
                <code>{product.batchIds.join(', ')}</code>
                <strong>{product.productName}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="table-scroll">
        <table className="component-table">
          <thead>
            <tr>
              <th>Product / batch</th>
              <th>Using {component.lotId}</th>
              <th>Other lots</th>
              <th>Courier checks</th>
            </tr>
          </thead>
          <tbody>
            {component.comparisons.map((product) => (
              <tr key={product.productId}>
                <td>
                  <strong>{product.productName}</strong>
                  <small className="mono">{product.batchIds.join(', ')}</small>
                </td>
                <td>
                  <strong className="signal-rate">{percent(product.rate)}</strong>
                  <small>
                    {product.returns} returns / {product.orders} orders
                  </small>
                </td>
                <td>
                  <strong>{percent(product.otherRate)}</strong>
                  <small>
                    {product.otherReturns} returns / {product.otherOrders} orders
                  </small>
                </td>
                <td>
                  <span className="check-result">
                    <Check size={14} />
                    {product.checks.filter((check) => check.supports).length} support the lead
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Each product has its own comparison group. Sharing a component is a lead to inspect, not
        proof that it caused the returns.
      </p>
    </section>
  );
}

export function InspectionMemory({ feedback }) {
  if (!feedback) return null;
  const challenged = ['refuted', 'conflicting'].includes(feedback.status);
  return (
    <section className={`inspection-memory ${challenged ? 'challenged' : ''}`}>
      <p className="section-label">PREVIOUS INSPECTION</p>
      <h2>
        {challenged
          ? 'This lead needs an independent review'
          : feedback.status === 'confirmed'
            ? 'A reported sample supports this lead'
            : 'The previous inspection was inconclusive'}
      </h2>
      {feedback.inspections.map((inspection) => (
        <article key={inspection.id}>
          <div className="memory-meta">
            <StatusBadge tone={challenged ? 'rust' : 'resolved'}>
              {inspection.assessment}
            </StatusBadge>
            <span>
              {inspection.failed} of {inspection.sampled} units reproduced the suspected failure
            </span>
          </div>
          <p>{inspection.note}</p>
          <small>
            {inspection.id} · {shortDate(inspection.createdAt)}
          </small>
        </article>
      ))}
      <p className="muted">
        Inspection reports inform the next action. Historical return counts remain unchanged.
      </p>
    </section>
  );
}

export function ComparisonEvidence({ investigation }) {
  const lead = investigation.conclusion.batchLead?.id || investigation.conclusion.target?.id;
  const groups = [
    ['batch', 'Manufacturing batches'],
    ['courier', 'Shipping partners'],
    ['warehouse', 'Fulfillment locations'],
  ];
  return (
    <section className="panel evidence-section">
      <div className="panel-heading">
        <div>
          <h2>Competing explanations</h2>
          <p>Compare rates before deciding which group to inspect.</p>
        </div>
      </div>
      {groups.map(([key, label]) => (
        <details
          className="comparison-group"
          key={key}
          open={key === (investigation.conclusion.kind === 'courier_damage' ? 'courier' : 'batch')}
        >
          <summary>
            <span>{label}</span>
            <span>
              {investigation.evidence[key]?.length || 0} groups <ChevronDown size={15} />
            </span>
          </summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Orders</th>
                  <th>Returns</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {(investigation.evidence[key] || []).map((row) => (
                  <tr key={row.id} className={row.id === lead ? 'leading-row' : ''}>
                    <td>
                      {row.id}
                      {row.id === lead && <small>Leading association</small>}
                    </td>
                    <td>{row.orders}</td>
                    <td>{row.returns}</td>
                    <td>
                      <strong>{percent(row.returns / row.orders)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}

export function SourceRecords({ rows }) {
  return (
    <section className="panel evidence-section">
      <div className="panel-heading">
        <div>
          <h2>Source return paths</h2>
          <p>
            {rows.length} records retrieved for this case. The graph shows a sample of these paths.
          </p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Return / order</th>
              <th>Unit</th>
              <th>Return reason</th>
              <th>Batch</th>
              <th>Courier</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.returnId}>
                <td>
                  <strong className="mono">{row.returnId}</strong>
                  <small className="mono">{row.orderId}</small>
                </td>
                <td className="mono">{row.unitId}</td>
                <td>{row.reason}</td>
                <td className="mono">{row.batchId}</td>
                <td>{row.courier}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RunLog({ steps, running, activeStep, investigation }) {
  return (
    <section className="panel evidence-section">
      <div className="panel-heading">
        <div>
          <h2>Investigation log</h2>
          <p>
            {investigation?.mode || 'Reading evidence from the connected graph'}
            {investigation?.modelCalls > 0 && ` · ${investigation.modelCalls} model requests`}
          </p>
        </div>
        <StatusBadge tone={running ? 'approved' : 'resolved'}>
          {running ? 'Running' : `${steps.length} checks`}
        </StatusBadge>
      </div>
      <ol className="run-log">
        {steps.map((step, index) => (
          <li key={step.name}>
            <span className="run-number">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <div className="run-title">
                <h3>{step.label}</h3>
                <span>{step.durationMs} ms</span>
              </div>
              <p>{step.reason || step.summary}</p>
              <small>
                {step.summary} · {step.transport || 'Evidence tool'} ·{' '}
                {step.backend === 'falkordb' ? 'FalkorDB' : 'Fixture'}
                {step.selection &&
                  ` · ${step.selection === 'LLM' ? 'Selected by model' : 'Evidence policy'}`}
              </small>
              <details>
                <summary>
                  {step.backend === 'falkordb' ? 'Executed query' : 'Query template'}
                  <ChevronDown size={13} />
                </summary>
                <pre>{step.query}</pre>
                <code>productId: {step.params?.productId || investigation?.productId}</code>
              </details>
            </div>
          </li>
        ))}
        {running && (
          <li className="running-step">
            <span className="run-number">…</span>
            <div>
              <h3>{activeStep || 'Preparing investigation'}</h3>
              <p>Waiting for evidence.</p>
            </div>
          </li>
        )}
      </ol>
      {investigation && (
        <div className="methodology">
          <h3>Decision criteria</h3>
          <p>{investigation.methodology}</p>
          <p>{investigation.accountSummary}</p>
        </div>
      )}
    </section>
  );
}
