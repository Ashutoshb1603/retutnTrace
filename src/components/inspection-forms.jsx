import React, { useState } from 'react';
import { Download, ClipboardCheck } from 'lucide-react';

export function TicketReview({ action, ticket, health, saving, onApprove, onSend }) {
  return (
    <>
      <span className="eyebrow">REVIEW BEFORE ACTION</span>
      <h2 id="modal-title">{action.ticket?.id || 'Approve an investigation ticket'}</h2>
      <p>
        Owner: <strong>{action.owner}</strong> · Target: <strong>{action.target}</strong>
      </p>
      <pre className="ticket-preview">
        {ticket.title}
        {'\n\n'}
        {ticket.body}
      </pre>
      <div className="ticket-controls">
        <a className="btn secondary" href={`/api/actions/${action.id}/ticket?download=1`} download>
          <Download size={15} />
          Download ticket
        </a>
        {action.status === 'draft' && (
          <button className="btn primary" disabled={saving} onClick={onApprove}>
            <ClipboardCheck size={16} />
            Approve and create ticket
          </button>
        )}
      </div>
      {action.status !== 'draft' && (
        <div className="publish-ticket">
          {action.externalTicket ? (
            <a href={action.externalTicket.url} target="_blank" rel="noreferrer">
              Open GitHub issue #{action.externalTicket.number}
            </a>
          ) : health.githubConfigured ? (
            <>
              <p>
                This sends the ticket shown above to <strong>{health.githubRepository}</strong>.
              </p>
              <button className="btn primary" disabled={saving} onClick={onSend}>
                Send ticket to GitHub
              </button>
            </>
          ) : (
            <p className="muted">
              Your ticket is saved in FalkorDB. Optional GitHub publishing needs a repository and
              token in the local .env file.
            </p>
          )}
        </div>
      )}
      <p className="muted">
        Approval creates an inspection ticket. An operator carries out the inspection and records
        the result.
      </p>
    </>
  );
}

export function InspectionForm({ action, saving, onSave }) {
  const [assessment, setAssessment] = useState('inconclusive'),
    [sampled, setSampled] = useState('10'),
    [failed, setFailed] = useState('0'),
    [note, setNote] = useState('');
  const n = Number(sampled),
    f = Number(failed),
    valid =
      Number.isInteger(n) &&
      n > 0 &&
      Number.isInteger(f) &&
      f >= 0 &&
      f <= n &&
      note.trim().length >= 8 &&
      (assessment !== 'confirmed' || f > 0) &&
      (assessment !== 'refuted' || f === 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(note, { assessment, sampled: n, failed: f });
      }}
    >
      <span className="eyebrow">CLOSE THE LOOP</span>
      <h2 id="modal-title">Record the inspection outcome</h2>
      <p>{action.title}</p>
      <label className="field-label" htmlFor="assessment">
        Does the sample support the suspected lead?
      </label>
      <select id="assessment" value={assessment} onChange={(e) => setAssessment(e.target.value)}>
        <option value="inconclusive">Inconclusive — more evidence needed</option>
        <option value="confirmed">Confirmed in tested sample</option>
        <option value="refuted">Refuted in tested sample</option>
      </select>
      <div className="sample-fields">
        <label>
          Units tested
          <input
            type="number"
            min="1"
            max="100000"
            value={sampled}
            onChange={(e) => setSampled(e.target.value)}
          />
        </label>
        <label>
          Units reproducing suspected failure
          <input
            type="number"
            min="0"
            max={sampled}
            value={failed}
            onChange={(e) => setFailed(e.target.value)}
          />
        </label>
      </div>
      <label className="field-label" htmlFor="inspection-note">
        Inspection method and findings
      </label>
      <textarea
        id="inspection-note"
        rows={4}
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Describe the sample, comparison, and result. Label simulated demo inspections clearly."
      />
      <p className="muted">
        Future investigations use this structured result. Refuted or conflicting evidence triggers
        independent review. A refuted result requires zero units reproducing the suspected failure.
      </p>
      <button className="btn primary" type="submit" disabled={saving || !valid}>
        Save outcome and resolve
      </button>
    </form>
  );
}
