import { useEffect, useId, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import './PlanDialog.css';

export default function PlanDialog({ title, onClose, onBack, busy = false, className = '', children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`plan-dialog ${className}`.trim()} aria-labelledby={titleId} aria-busy={busy || undefined} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} onClose={onClose} onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <div className="plan-dialog-content"><header>{onBack && <button type="button" className="plan-dialog-back" aria-label="Quay lại" onClick={onBack}><ArrowLeft size={21} /></button>}<h2 id={titleId}>{title}</h2><button type="button" className="plan-dialog-close" aria-label="Đóng popup" disabled={busy} onClick={onClose}><X size={20} /></button></header>{children}</div>
  </dialog>;
}
