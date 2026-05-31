import React, { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, AlertCircle, Inbox } from 'lucide-react';
import type { DeclarationStatus, RiskLevel, PCAStatus, Role, PCARiskBand } from '../../types';
import { STATUS_META, RISK_META, PCA_STATUS_META, PCA_RISK_META } from '../../lib/constants';
import {
  DECLARATION_STATUS_LABEL, PCA_STATUS_LABEL, PCA_RISK_BAND_LABEL,
  RISK_LEVEL_LABEL, ROLE_LABEL, CHANNEL_LABEL,
} from '../../lib/i18n';
import { useToastStore } from '../../store/toastStore';
import { initials, cn } from '../../lib/utils';

export function StatusBadge({ status }: { status: DeclarationStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="badge dot" style={{ background: meta.bg, color: meta.text }}>
      {DECLARATION_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const meta = RISK_META[level];
  return (
    <span className="badge" style={{ background: meta.bg, color: meta.text }}>
      {RISK_LEVEL_LABEL[level] ?? meta.label}{score !== undefined ? ` · ${score}` : ''}
    </span>
  );
}

export function PCAStatusBadge({ status }: { status: PCAStatus }) {
  const meta = PCA_STATUS_META[status];
  return (
    <span className="badge dot" style={{ background: meta.bg, color: meta.text }}>
      {PCA_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PCARiskBadge({ band }: { band: PCARiskBand }) {
  const meta = PCA_RISK_META[band];
  return (
    <span className="badge" style={{ background: meta.bg, color: meta.text }}>
      {PCA_RISK_BAND_LABEL[band] ?? band}
    </span>
  );
}

export function RoleChip({ role }: { role: Role }) {
  return <span className="role-chip">{ROLE_LABEL[role]}</span>;
}

export function ChannelPill({ channel }: { channel: 'GREEN' | 'YELLOW' | 'RED' }) {
  return <span className={cn('channel-pill', channel)}>{CHANNEL_LABEL[channel]}</span>;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'lg' | 'xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
}
export function Modal({ open, onClose, title, size, footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={cn('modal', size === 'lg' && 'lg', size === 'xl' && 'xl')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close" onClick={onClose} aria-label="Bağla"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ flex: 1 }}>{children}</div>
      </div>
    </>
  );
}

interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; count?: number }[];
}
export function Tabs({ value, onChange, items }: TabsProps) {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button
          key={it.value}
          className={cn('tab', value === it.value && 'active')}
          onClick={() => onChange(it.value)}
        >
          {it.label}{it.count !== undefined ? ` (${it.count})` : ''}
        </button>
      ))}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={cn('toast', t.type)} onClick={() => dismiss(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="es-icon">{icon ?? <Inbox size={24} />}</div>
      <div className="es-title">{title}</div>
      {hint && <p style={{ color: 'var(--n-500)', maxWidth: 360, margin: '4px auto' }}>{hint}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return <div className={cn('avatar', size === 'sm' && 'sm', size === 'lg' && 'lg')}>{initials(name)}</div>;
}

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onChange: (p: number) => void;
}
export function Pagination({ total, page, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Əvvəlki">
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        typeof p === 'number' ? (
          <button key={i} className={cn('page-btn', p === page && 'active')} onClick={() => onChange(p)}>{p}</button>
        ) : (
          <span key={i} style={{ padding: '0 4px', color: 'var(--n-400)' }}>{p}</span>
        )
      )}
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Növbəti">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Təsdiqlə', danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={
      <>
        <button className="btn btn-secondary" onClick={onClose}>Ləğv et</button>
        <button className={cn('btn', danger ? 'btn-danger' : '')} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</button>
      </>
    }>
      <p>{message}</p>
    </Modal>
  );
}
