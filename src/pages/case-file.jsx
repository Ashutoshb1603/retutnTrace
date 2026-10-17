import React, { useRef, useState } from 'react';
import { ArrowRight, Download, LoaderCircle, Plus, Check } from 'lucide-react';
import { PageHeader, StatusBadge, EmptyState } from '../components/ui.jsx';
import { EvidenceGraph } from '../components/evidence-graph.jsx';
import { CohortScope, InspectionEffect } from '../components/case-impact.jsx';
import {
  ComponentEvidence,
  InspectionMemory,
  ComparisonEvidence,
  SourceRecords,
  RunLog,
} from '../components/case-evidence.jsx';
import { actionForCase, evidenceLabel, statusLabels } from '../lib/cases.js';
import { shortDate } from '../lib/format.js';

const tabs = [
  ['findings', 'Findings'],
  ['connections', 'Connections'],
  ['records', 'Source records'],
  ['log', 'Run log'],
];

export function CaseFilePage({
  products,
  history,
  actions,
  selected,
  question,
  result,
  running,
  steps,
  activeStep,
  onSelectProduct,
  onQuestion,
  onRun,
  onOpenCase,
  onNewCase,
  onReviewTicket,
  onRecordOutcome,
  saving,
}) {
  const [tab, setTab] = useState('findings');
  const tabButtons = useRef({});
  const action = actionForCase(result, actions);
  const uncertain = result && ['inconclusive', 'review_conflict'].includes(result.conclusion.kind);
  const visibleTab = running ? 'log' : tab;

  function newCase() {
    onNewCase();
    setTab('findings');
  }

  function moveTab(event, id) {
    if (running) return;
    const index = tabs.findIndex(([key]) => key === id);
    const destinations = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    const [nextId] = tabs[destinations[event.key]];
    setTab(nextId);
    tabButtons.current[nextId]?.focus();
  }

  return (
    <>
      <PageHeader
        label="INVESTIGATIONS"
        title="Case files"
        action={
          <button className="btn secondary" disabled={running} onClick={newCase}>
            <Plus size={16} />
            New case
          </button>
        }
      >
        Trace the return pattern, check alternatives, and document the next step.
      </PageHeader>
      <div className="case-toolbar">
        <label>
          Saved case
          <select
            aria-label="Open saved case"
            value={result?.id || ''}
            disabled={running}
            onChange={(event) => {
              const found = history.find((item) => item.id === event.target.value);
              if (found) {
                onOpenCase(found);
                setTab('findings');
              } else {
                newCase();
              }
            }}
          >
            <option value="">New investigation</option>
            {history.map((item) => (
              <option key={item.id} value={item.id}>
                {item.productName} · {item.id}
              </option>
            ))}
          </select>
        </label>
        {result && (
          <a className="text-button" href={`/api/export/${result.id}`} download>
            <Download size={15} />
            Export evidence
          </a>
        )}
      </div>
      <form
        className="investigation-form panel"
        onSubmit={(event) => {
          event.preventDefault();
          onRun();
        }}
      >
        <div className="investigation-controls">
          <label>
            Product
            <select
              aria-label="Investigate a product"
              value={selected}
              disabled={running}
              onChange={(event) => onSelectProduct(event.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn primary" disabled={running || question.trim().length < 5}>
            {running ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={16} />}{' '}
            {running ? 'Investigating…' : 'Run investigation'}
          </button>
        </div>
        <details className="question-details">
          <summary>Investigation question</summary>
          <label className="sr-only" htmlFor="case-question">
            Investigation question
          </label>
          <textarea
            id="case-question"
            value={question}
            onChange={(event) => onQuestion(event.target.value)}
            disabled={running}
            maxLength={1200}
            rows={3}
          />
          <p>
            Comparisons use mature order cohorts. The question can request additional account
            context.
          </p>
        </details>
      </form>

      {!result && !running ? (
        <section className="panel">
          <EmptyState
            title="Choose a product to investigate"
            action={
              <button className="btn primary" onClick={() => onRun('SKU-AURA')}>
                Investigate Aura Pro
                <ArrowRight size={16} />
              </button>
            }
          >
            Start with an elevated return rate. The case will include source records, alternative
            explanations, and an inspection recommendation.
          </EmptyState>
          {history.length > 0 && (
            <div className="saved-case-list">
              <h2>Recent cases</h2>
              {history.slice(0, 5).map((item) => (
                <button key={item.id} onClick={() => onOpenCase(item)}>
                  <span>
                    <strong>{item.productName}</strong>
                    <small>{item.conclusion.title}</small>
                  </span>
                  <code>{item.id}</code>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {result && (
            <section className={`case-conclusion ${uncertain ? 'uncertain' : ''}`}>
              <div className="case-meta">
                <code>{result.id}</code>
                <span>{shortDate(result.createdAt)}</span>
                <StatusBadge tone={uncertain ? 'rust' : 'neutral'}>
                  {evidenceLabel(result.conclusion)}
                </StatusBadge>
              </div>
              <p className="section-label">WORKING EXPLANATION</p>
              <h2>{result.conclusion.title}</h2>
              <p>{result.conclusion.summary}</p>
              <div className="countercheck">
                <Check size={17} />
                <span>{result.conclusion.countercheck}</span>
              </div>
            </section>
          )}
          <div className="case-tabs" role="tablist" aria-label="Case evidence">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                id={`tab-${id}`}
                aria-controls={`panel-${id}`}
                aria-selected={visibleTab === id}
                tabIndex={visibleTab === id ? 0 : -1}
                ref={(button) => {
                  tabButtons.current[id] = button;
                }}
                disabled={running && id !== 'log'}
                onClick={() => setTab(id)}
                onKeyDown={(event) => moveTab(event, id)}
              >
                {label}
                {id === 'log' && steps.length > 0 && <span>{steps.length}</span>}
              </button>
            ))}
          </div>
          <div
            className="case-body"
            role="tabpanel"
            id={`panel-${visibleTab}`}
            aria-labelledby={`tab-${visibleTab}`}
            tabIndex={0}
          >
            <div className="case-evidence">
              {visibleTab === 'findings' && result && (
                <>
                  <CohortScope conclusion={result.conclusion} />
                  <InspectionEffect investigation={result} />
                  <InspectionMemory feedback={result.conclusion.feedback} />
                  <ComponentEvidence component={result.conclusion.component} />
                  <ComparisonEvidence investigation={result} />
                </>
              )}
              {visibleTab === 'connections' && result && (
                <>
                  <ComponentEvidence component={result.conclusion.component} showMap />
                  <section className="panel evidence-section">
                    <div className="panel-heading">
                      <div>
                        <h2>Return-to-batch paths</h2>
                        <p>Select a record to inspect its connections.</p>
                      </div>
                    </div>
                    <EvidenceGraph investigation={result} />
                  </section>
                </>
              )}
              {visibleTab === 'records' && result && (
                <SourceRecords rows={result.evidence.paths || []} />
              )}
              {visibleTab === 'log' && (
                <RunLog
                  steps={steps}
                  running={running}
                  activeStep={activeStep}
                  investigation={result}
                />
              )}
            </div>
            {action && !running && (
              <aside className="case-next-step">
                <p className="section-label">NEXT ACTION</p>
                <StatusBadge tone={action.status}>{statusLabels[action.status]}</StatusBadge>
                <h2>{action.title}</h2>
                <dl>
                  <div>
                    <dt>Owner</dt>
                    <dd>{action.owner}</dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd className="mono">{action.target}</dd>
                  </div>
                  <div>
                    <dt>Task</dt>
                    <dd className="mono">{action.id}</dd>
                  </div>
                </dl>
                <ol>
                  {action.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {action.status === 'draft' ? (
                  <button
                    className="btn primary"
                    disabled={saving}
                    onClick={() => onReviewTicket(action)}
                  >
                    Review inspection ticket <ArrowRight size={15} />
                  </button>
                ) : action.status === 'approved' ? (
                  <button className="btn primary" onClick={() => onRecordOutcome(action)}>
                    Record inspection
                  </button>
                ) : (
                  <p className="closed-note">
                    {action.status === 'resolved'
                      ? 'This task is closed. Its inspection is available to future cases.'
                      : 'This task was dismissed. Start a new investigation to review the evidence again.'}
                  </p>
                )}
                {action.ticket && (
                  <button className="text-button" onClick={() => onReviewTicket(action)}>
                    Open {action.ticket.id}
                    <ArrowRight size={14} />
                  </button>
                )}
                <p className="muted">
                  Approval creates a review task. An operator carries out the inspection.
                </p>
              </aside>
            )}
          </div>
        </>
      )}
    </>
  );
}
