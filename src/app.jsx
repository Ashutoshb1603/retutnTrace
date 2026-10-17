import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, X } from 'lucide-react';
import { WorkspaceShell } from './components/workspace-shell.jsx';
import { EmptyState, Modal } from './components/ui.jsx';
import { TicketReview, InspectionForm } from './components/inspection-forms.jsx';
import { WorkspaceSettings, ReviewGuide } from './components/workspace-dialogs.jsx';
import { ReviewPage } from './pages/review.jsx';
import { CaseFilePage } from './pages/case-file.jsx';
import { InspectionQueue } from './pages/inspection-queue.jsx';
import { ReturnRecords } from './pages/return-records.jsx';
import { useWorkspace } from './hooks/use-workspace.js';
import { request, readInvestigation } from './lib/api.js';
import { latestCase } from './lib/cases.js';

const defaultQuestion =
  'What explains the increased return rate? Compare batch, component, courier, and fulfillment evidence, then propose an inspection.';

export default function App() {
  const [view, setView] = useState('overview');
  const [toast, setToast] = useState('');
  const { health, overview, history, actions, returns, refresh, loading } = useWorkspace(setToast);
  const [selected, setSelected] = useState('SKU-AURA');
  const [question, setQuestion] = useState(defaultQuestion);
  const [result, setResult] = useState(null);
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 7000);
    return () => clearTimeout(timeout);
  }, [toast]);
  const closeModal = useCallback(() => {
    if (!saving) setModal(null);
  }, [saving]);

  function openCase(investigation) {
    if (running) {
      setView('cases');
      return;
    }
    setSelected(investigation.productId);
    setResult(investigation);
    setSteps(investigation.trace);
    setView('cases');
  }
  function selectProduct(productId) {
    if (running) return;
    setSelected(productId);
    setResult(null);
    setSteps([]);
  }

  async function run(productId = selected) {
    if (running) return;
    selectProduct(productId);
    setView('cases');
    setRunning(true);
    setActiveStep('Preparing investigation');
    try {
      await readInvestigation({ productId, question }, (event) => {
        if (event.type === 'step_start') setActiveStep(event.label);
        if (event.type === 'step') setSteps((previous) => [...previous, event.step]);
        if (event.type === 'notice') setToast(event.message);
        if (event.type === 'complete') {
          setResult(event.investigation);
          setToast(
            event.action.deduplicated
              ? 'Case saved. The existing inspection task is linked.'
              : 'Case saved. The proposed inspection is ready for review.',
          );
        }
      });
      await refresh();
    } catch (error) {
      setToast(error.message);
      await refresh().catch(() => {});
    } finally {
      setRunning(false);
      setActiveStep('');
    }
  }

  async function reviewTicket(action) {
    try {
      const ticket = await request(`/actions/${action.id}/ticket`);
      setModal({ type: 'ticket', action, ticket });
    } catch (error) {
      setToast(error.message);
    }
  }
  async function updateAction(action, status, note = '', inspection) {
    setSaving(true);
    try {
      await request(`/actions/${action.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note, inspection }),
      });
      await refresh();
      setModal(null);
      setToast(
        status === 'approved'
          ? 'Ticket approved. It is now in the inspection queue.'
          : status === 'resolved'
            ? 'Inspection recorded. Rerun the product to include this result in a new case.'
            : 'Task dismissed. Its case evidence is still saved.',
      );
    } catch (error) {
      setToast(error.message);
    } finally {
      setSaving(false);
    }
  }
  async function sendTicket(action) {
    setSaving(true);
    try {
      await request(`/actions/${action.id}/github`, {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      });
      await refresh();
      setModal(null);
      setToast('GitHub issue created and linked to this task.');
    } catch (error) {
      setToast(error.message);
    } finally {
      setSaving(false);
    }
  }
  const recordOutcome = (action) => setModal({ type: 'inspection', action });

  return (
    <>
      <WorkspaceShell
        view={view}
        onNavigate={setView}
        health={health}
        openTasks={overview?.openActions || 0}
        onSettings={() => setModal({ type: 'settings' })}
        onGuide={() => setModal({ type: 'guide' })}
      >
        {loading ? (
          <EmptyState title="Opening the workspace">Connecting to the evidence store.</EmptyState>
        ) : !health?.ok || !overview ? (
          <section className="panel offline-state">
            <AlertCircle size={26} />
            <h1>Connect the returns graph</h1>
            <p>
              {health?.error ||
                'The workspace could not reach its database. Start FalkorDB, then reconnect.'}
            </p>
            <pre>docker compose up -d falkordb</pre>
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  await request('/reconnect', { method: 'POST' });
                  await refresh();
                } catch (error) {
                  setToast(error.message);
                }
              }}
            >
              Reconnect <ArrowRight size={16} />
            </button>
          </section>
        ) : (
          <>
            {view === 'overview' && (
              <ReviewPage
                overview={overview}
                history={history}
                actions={actions}
                running={running}
                onInvestigate={run}
                onOpenCase={openCase}
                onOpenQueue={() => setView('work')}
              />
            )}
            {view === 'cases' && (
              <CaseFilePage
                products={overview.products}
                history={history}
                actions={actions}
                selected={selected}
                question={question}
                result={result}
                running={running}
                steps={steps}
                activeStep={activeStep}
                onSelectProduct={selectProduct}
                onQuestion={setQuestion}
                onRun={run}
                onOpenCase={openCase}
                onNewCase={() => selectProduct(selected)}
                onReviewTicket={reviewTicket}
                onRecordOutcome={recordOutcome}
                saving={saving}
              />
            )}
            {view === 'work' && (
              <InspectionQueue
                actions={actions}
                history={history}
                saving={saving}
                onOpenCase={openCase}
                onReviewTicket={reviewTicket}
                onRecordOutcome={recordOutcome}
                onDismiss={(action) => updateAction(action, 'dismissed')}
              />
            )}
            {view === 'records' && (
              <ReturnRecords
                rows={returns}
                products={overview.products}
                onReviewProduct={(productId) => {
                  const previous = latestCase(productId, history);
                  if (previous) openCase(previous);
                  else {
                    selectProduct(productId);
                    setView('cases');
                  }
                }}
              />
            )}
          </>
        )}
      </WorkspaceShell>
      {running && view !== 'cases' && (
        <button className="running-notice" onClick={() => setView('cases')}>
          <LoaderCircle size={16} className="spin" />
          Investigation running · View case
          <ArrowRight size={14} />
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {modal && (
        <Modal onClose={closeModal}>
          {modal.type === 'settings' && (
            <WorkspaceSettings health={health} graph={overview?.graph} />
          )}
          {modal.type === 'guide' && (
            <ReviewGuide
              onStart={() => {
                setModal(null);
                run('SKU-AURA');
              }}
            />
          )}
          {modal.type === 'ticket' && (
            <TicketReview
              action={modal.action}
              ticket={modal.ticket}
              health={health}
              saving={saving}
              onApprove={() => updateAction(modal.action, 'approved')}
              onSend={() => sendTicket(modal.action)}
            />
          )}
          {modal.type === 'inspection' && (
            <InspectionForm
              action={modal.action}
              saving={saving}
              onSave={(note, inspection) =>
                updateAction(modal.action, 'resolved', note, inspection)
              }
            />
          )}
        </Modal>
      )}
    </>
  );
}
