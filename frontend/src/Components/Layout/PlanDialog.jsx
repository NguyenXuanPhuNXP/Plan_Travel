import { useEffect, useId, useRef } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import './PlanDialog.css';

export default function PlanDialog({ title, onClose, onBack, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="plan-dialog" aria-labelledby={titleId} onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="plan-dialog-content"><header>{onBack && <button type="button" className="plan-dialog-back" aria-label="Quay lại" onClick={onBack}><ArrowLeft size={21} /></button>}<h2 id={titleId}>{title}</h2><button type="button" className="plan-dialog-close" aria-label="Đóng popup" onClick={onClose}><X size={20} /></button></header>{children}</div>
  </dialog>;
}
