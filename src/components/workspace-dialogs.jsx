import React from 'react';
import { StatusBadge } from './ui.jsx';

export function WorkspaceSettings({ health, graph }) {
  return (
    <>
      <p className="section-label">WORKSPACE</p>
      <h2 id="modal-title">Meridian Audio</h2>
      <p>A local demo workspace for investigating product returns.</p>
      <dl className="settings-list">
        <div>
          <dt>Database</dt>
          <dd>
            <StatusBadge tone={health?.ok ? 'resolved' : 'rust'}>
              {health?.backend} · {health?.ok ? 'connected' : 'offline'}
            </StatusBadge>
          </dd>
        </div>
        <div>
          <dt>Investigation mode</dt>
          <dd>{health?.agent}</dd>
        </div>
        <div>
          <dt>Connected records</dt>
          <dd>{graph?.nodes.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Relationships</dt>
          <dd>{graph?.edges.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>Synthetic · complete 30-day cohorts</dd>
        </div>
      </dl>
      <details className="configuration-help">
        <summary>Model and ticket integrations</summary>
        <p>
          The evidence policy runs without an API key. To enable model selection, set{' '}
          <code>LLM_BASE_URL</code>, <code>LLM_API_KEY</code>, and <code>LLM_MODEL</code> privately
          in the project’s <code>.env</code> and restart the server. At most three provider requests
          run per investigation.
        </p>
        <p>
          GitHub delivery needs <code>GITHUB_REPOSITORY</code> and <code>GITHUB_TOKEN</code>.
          Sending an approved ticket is always a separate action.
        </p>
      </details>
    </>
  );
}

export function ReviewGuide({ onStart }) {
  return (
    <>
      <p className="section-label">CASE REVIEW GUIDE</p>
      <h2 id="modal-title">From a return spike to an inspection</h2>
      <ol className="guide-list">
        <li>
          <strong>Choose a product</strong>
          <p>
            Start in Returns review. The table compares mature order cohorts and highlights products
            above twice their previous return rate.
          </p>
        </li>
        <li>
          <strong>Challenge the lead</strong>
          <p>
            Read the findings and competing explanations. In the Aura demo, a shared component
            connects to Lyra. Connections shows the graph; Source records lists the evidence.
          </p>
        </li>
        <li>
          <strong>Approve the work</strong>
          <p>
            Review the proposed ticket and checklist. Approval saves an inspection task for the
            named owner.
          </p>
        </li>
        <li>
          <strong>Record what happened</strong>
          <p>
            Enter the tested sample, failure count, and findings. Rerun a related product to see how
            the reported inspection affects the recommendation. Label simulated results clearly.
          </p>
        </li>
      </ol>
      <button className="btn primary" onClick={onStart}>
        Start with Aura Pro
      </button>
    </>
  );
}
