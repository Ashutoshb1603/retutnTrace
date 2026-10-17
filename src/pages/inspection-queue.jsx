import React, { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { EmptyState, PageHeader, StatusBadge } from '../components/ui.jsx';
import { statusLabels, isOpen } from '../lib/cases.js';
import { shortDate } from '../lib/format.js';

const filters = [
  ['open', 'Open'],
  ['draft', 'Needs approval'],
  ['approved', 'In progress'],
  ['resolved', 'Closed'],
  ['all', 'All tasks'],
];

export function InspectionQueue({
  actions,
  history,
  onOpenCase,
  onReviewTicket,
  onRecordOutcome,
  onDismiss,
  saving,
}) {
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const matchesStatus = (action, filter) =>
    filter === 'all' || (filter === 'open' ? isOpen(action) : action.status === filter);
  const visible = actions.filter(
    (action) =>
      matchesStatus(action, status) &&
      `${action.title} ${action.productName} ${action.owner} ${action.target} ${action.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader label="FOLLOW-THROUGH" title="Inspection queue">
        Approve the work, record the sample, and bring the result back into the next case.
      </PageHeader>
      <div className="queue-toolbar">
        <div className="filter-tabs" aria-label="Inspection status">
          {filters.map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              className={status === value ? 'selected' : ''}
              onClick={() => setStatus(value)}
            >
              {label}
              <span>{actions.filter((action) => matchesStatus(action, value)).length}</span>
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search inspection tasks"
            placeholder="Find a task, lot, or owner"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="inspection-list">
        {visible.map((action) => {
          const originalCase = history.find((item) => item.id === action.investigationId);
          return (
            <article className={`inspection-task ${action.status}`} key={action.id}>
              <div className="task-heading">
                <div>
                  <div className="task-meta">
                    <code>{action.id}</code>
                    <span>{shortDate(action.createdAt)}</span>
                    <StatusBadge tone={action.status}>{statusLabels[action.status]}</StatusBadge>
                  </div>
                  <h2>{action.title}</h2>
                  <p>
                    {action.productName} <span>·</span> {action.owner}
                  </p>
                </div>
                {action.status === 'draft' && (
                  <button
                    className="btn primary"
                    disabled={saving}
                    onClick={() => onReviewTicket(action)}
                  >
                    Review ticket <ArrowRight size={16} />
                  </button>
                )}
                {action.status === 'approved' && (
                  <button
                    className="btn primary"
                    disabled={saving}
                    onClick={() => onRecordOutcome(action)}
                  >
                    Record inspection <ArrowRight size={16} />
                  </button>
                )}
              </div>
              <p className="task-rationale">{action.rationale}</p>
              {action.note && (
                <div className="task-outcome">
                  <p className="section-label">RECORDED OUTCOME</p>
                  <strong>
                    {action.inspection
                      ? `${action.inspection.assessment} · ${action.inspection.failed}/${action.inspection.sampled} units reproduced the failure`
                      : 'Legacy inspection note'}
                  </strong>
                  <p>{action.note}</p>
                </div>
              )}
              <div className="task-footer">
                <div>
                  {originalCase && (
                    <button className="text-button" onClick={() => onOpenCase(originalCase)}>
                      Open evidence <ArrowRight size={14} />
                    </button>
                  )}
                  {action.ticket && (
                    <button className="text-button" onClick={() => onReviewTicket(action)}>
                      {action.ticket.id}
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                {isOpen(action) && (
                  <button
                    className="text-button subdued"
                    disabled={saving}
                    onClick={() => onDismiss(action)}
                  >
                    Dismiss task
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <section className="panel">
          <EmptyState title="No tasks match this view">
            Change the status filter or search. New investigations create tasks here for review.
          </EmptyState>
        </section>
      )}
    </>
  );
}
