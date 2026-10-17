import React from 'react';
import { ClipboardList, FileSearch, LayoutList, RotateCcw, Settings2 } from 'lucide-react';

const navigation = [
  { id: 'overview', label: 'Returns review', icon: LayoutList },
  { id: 'cases', label: 'Case files', icon: FileSearch },
  { id: 'records', label: 'Return records', icon: RotateCcw },
  { id: 'work', label: 'Inspection queue', icon: ClipboardList },
];

export function WorkspaceShell({
  view,
  onNavigate,
  health,
  openTasks,
  onSettings,
  onGuide,
  children,
}) {
  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => onNavigate('overview')}
          aria-label="ReturnTrace home"
        >
          <span className="brand-mark">rt</span>
          <span>
            ReturnTrace<small>RETURNS OPERATIONS</small>
          </span>
        </button>
        <div className="workspace-name">
          <span className="company-mark">M</span>
          <div>
            Meridian Audio<small>Demo workspace</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'active' : ''}`}
              aria-label={label}
              aria-current={view === id ? 'page' : undefined}
              title={label}
              onClick={() => onNavigate(id)}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {id === 'work' && openTasks > 0 && <b>{openTasks}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="section-label">REVIEW PERIOD</p>
          <strong>01–14 Sep 2026</strong>
          <p>
            30-day return window
            <br />
            Compared with 01–14 Aug
          </p>
          <button className="text-button" onClick={onGuide}>
            How to review a case <span>↗</span>
          </button>
          <button
            className="nav-item"
            aria-label="Workspace settings"
            title="Workspace settings"
            onClick={onSettings}
          >
            <Settings2 size={18} />
            <span>Workspace settings</span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span>Meridian Audio</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{navigation.find((item) => item.id === view)?.label}</strong>
          </div>
          <div className="topbar-status">
            <span className="dataset-label">Synthetic data</span>
            <span className={`connection ${health?.ok ? 'connected' : ''}`}>
              <i />
              {health?.ok
                ? health.backend === 'falkordb'
                  ? 'FalkorDB connected'
                  : 'Fixture preview'
                : 'Database offline'}
            </span>
          </div>
        </header>
        <main>
          {health?.backend === 'fixture' && (
            <div className="notice-banner">
              Fixture preview — connect FalkorDB before recording or submitting.
            </div>
          )}
          {children}
        </main>
        <footer className="page-footer">
          <span>ReturnTrace / Meridian Audio</span>
          <span>Synthetic records · As of 15 Oct 2026</span>
        </footer>
      </div>
    </div>
  );
}
