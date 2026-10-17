import React, { useEffect, useRef } from 'react';
import { FileSearch, X } from 'lucide-react';

export function StatusBadge({ children, tone = '' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <FileSearch size={28} strokeWidth={1.5} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function PageHeader({ label, title, children, action }) {
  return (
    <header className="page-heading">
      <div>
        <p className="section-label">{label}</p>
        <h1>{title}</h1>
        {children && <p className="page-description">{children}</p>}
      </div>
      {action}
    </header>
  );
}

export function Modal({ children, onClose }) {
  const panel = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const selector = 'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]';
    panel.current.querySelector(selector)?.focus();
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const fields = [...panel.current.querySelectorAll(selector)].filter(
        (element) => element.getClientRects().length,
      );
      const first = fields[0],
        last = fields.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={panel}
      >
        <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}
