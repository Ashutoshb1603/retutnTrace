import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { PageHeader, StatusBadge } from '../components/ui.jsx';
import { latestCase, isOpen, statusLabels } from '../lib/cases.js';
import { money, number, percent, shortDate } from '../lib/format.js';

export function ReviewPage({
  overview,
  history,
  actions,
  running,
  onInvestigate,
  onOpenCase,
  onOpenQueue,
}) {
  const [filter, setFilter] = useState('attention');
  const products = overview.products.filter((product) => filter === 'all' || product.lift >= 2);
  const openActions = actions.filter(isOpen);
  const connectedCase = history.find((item) => item.conclusion.component);
  const awaitingApproval = actions.filter((action) => action.status === 'draft');

  return (
    <>
      <PageHeader
        label="OPERATIONS / RETURNS"
        title="Returns review"
        action={
          <button className="btn secondary" onClick={onOpenQueue}>
            Inspection queue <ArrowRight size={16} />
          </button>
        }
      >
        Review unusual return rates, then decide what needs an inspection.
      </PageHeader>
      <section className="metrics-strip" aria-label="Current cohort metrics">
        <Metric
          label="Returned orders"
          value={number(overview.returns)}
          detail={`of ${number(overview.orders)} mature orders`}
        />
        <Metric
          label="Return rate"
          value={percent(overview.rate)}
          detail={`${percent(overview.previousRate)} in the previous cohort`}
          change={`+${((overview.rate - overview.previousRate) * 100).toFixed(1)} pp`}
        />
        <Metric
          label="Returned order value"
          value={money(overview.value)}
          detail="Gross order value · not realized loss"
        />
        <Metric
          label="Open inspection tasks"
          value={openActions.length}
          detail={`${awaitingApproval.length} waiting for approval`}
        />
      </section>
      <section className="panel triage-panel">
        <div className="panel-heading">
          <div>
            <h2>Product triage</h2>
            <p>Rates include every order in the mature cohort.</p>
          </div>
          <div className="segmented" aria-label="Product filter">
            <button
              aria-pressed={filter === 'attention'}
              className={filter === 'attention' ? 'selected' : ''}
              onClick={() => setFilter('attention')}
            >
              Elevated rates{' '}
              <span>{overview.products.filter((product) => product.lift >= 2).length}</span>
            </button>
            <button
              aria-pressed={filter === 'all'}
              className={filter === 'all' ? 'selected' : ''}
              onClick={() => setFilter('all')}
            >
              All products <span>{overview.products.length}</span>
            </button>
          </div>
        </div>
        <div className="table-scroll triage-desktop">
          <table className="triage-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Returned / orders</th>
                <th>Return rate</th>
                <th>Change</th>
                <th>Latest finding</th>
                <th>
                  <span className="sr-only">Case actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const previousCase = latestCase(product.id, history);
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <small className="mono">{product.id}</small>
                    </td>
                    <td className="tabular">
                      {product.returns} <span className="muted">/ {product.orders}</span>
                    </td>
                    <td>
                      <div className="rate-cell">
                        <strong>{percent(product.rate)}</strong>
                        <div className="rate-track">
                          <i style={{ width: `${Math.min(product.rate * 300, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={product.lift >= 2 ? 'rate-change' : 'muted'}>
                        {product.lift >= 2 && <ArrowUpRight size={14} />} {product.lift?.toFixed(1)}
                        ×
                      </span>
                    </td>
                    <td className="finding-cell">
                      {previousCase ? (
                        <button className="finding-link" onClick={() => onOpenCase(previousCase)}>
                          {previousCase.conclusion.title}
                          <small>{previousCase.id}</small>
                        </button>
                      ) : (
                        <span className="muted">Not investigated</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn table-action"
                        disabled={running}
                        aria-label={`Investigate ${product.name}`}
                        onClick={() => onInvestigate(product.id)}
                      >
                        Investigate <ArrowRight size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="triage-compact">
          {products.map((product) => {
            const previousCase = latestCase(product.id, history);
            return (
              <article key={product.id}>
                <h3>{product.name}</h3>
                <code>{product.id}</code>
                <div className="compact-rate">
                  <strong>{percent(product.rate)}</strong>
                  <span>
                    {product.returns}/{product.orders} returned
                    <br />
                    {product.lift?.toFixed(1)}× previous rate
                  </span>
                </div>
                {previousCase && (
                  <button className="finding-link" onClick={() => onOpenCase(previousCase)}>
                    {previousCase.conclusion.title}
                    <small>Open saved case →</small>
                  </button>
                )}
                <button
                  className="btn secondary"
                  disabled={running}
                  aria-label={`Investigate ${product.name}`}
                  onClick={() => onInvestigate(product.id)}
                >
                  Investigate <ArrowRight size={15} />
                </button>
              </article>
            );
          })}
        </div>
        <div className="table-note">
          Elevated = at least 2× the previous cohort’s return rate. This is a review signal, not a
          diagnosis.
        </div>
      </section>

      {connectedCase && (
        <section className="connected-lead">
          <div className="connection-index">
            01 /<br />
            CONNECTED LEAD
          </div>
          <div>
            <div className="lead-heading">
              <h2>{connectedCase.conclusion.component.lotId}</h2>
              <StatusBadge tone="rust">Shared component lot</StatusBadge>
            </div>
            <p>
              {connectedCase.conclusion.component.comparisons
                .map((product) => product.productName)
                .join(' and ')}{' '}
              share this lot. Review the comparison groups and inspection history together.
            </p>
          </div>
          <button className="btn secondary" onClick={() => onOpenCase(connectedCase)}>
            Review connection <ArrowRight size={16} />
          </button>
        </section>
      )}

      <div className="review-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent case files</h2>
              <p>Saved evidence and investigation decisions</p>
            </div>
            <span className="count-label">{history.length} total</span>
          </div>
          {history.length ? (
            <div className="case-list">
              {history.slice(0, 4).map((item) => (
                <button key={item.id} onClick={() => onOpenCase(item)}>
                  <span className="case-index">{item.id.slice(-4)}</span>
                  <span>
                    <strong>{item.productName}</strong>
                    <span>{item.conclusion.title}</span>
                    <small>{shortDate(item.createdAt)}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <p className="section-empty">
              Choose a product above to start the first investigation.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Awaiting follow-through</h2>
              <p>Review the evidence before approving work</p>
            </div>
          </div>
          {openActions.length ? (
            <div className="queue-preview">
              {openActions.slice(0, 3).map((action) => (
                <button key={action.id} onClick={onOpenQueue}>
                  <StatusBadge tone={action.status}>{statusLabels[action.status]}</StatusBadge>
                  <strong>{action.title}</strong>
                  <span>{action.owner}</span>
                  <small className="mono">{action.id}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="section-empty">
              No open inspection tasks. New investigations will propose the next step.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Metric({ label, value, detail, change }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        {change && <em>{change}</em>}
      </div>
      <small>{detail}</small>
    </div>
  );
}
