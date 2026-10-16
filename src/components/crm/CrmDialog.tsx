import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface CrmDialogProps {
  title: string;
  description?: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitTone?: 'primary' | 'danger';
  submitDisabled?: boolean;
  size?: 'sm' | 'lg';
  children: React.ReactNode;
}

/** Modal form shell used across Sales CRM (wrap in AnimatePresence). Full-screen sheet on mobile. */
export function CrmDialog({ title, description, onClose, onSubmit, submitLabel, submitTone = 'primary', submitDisabled, size = 'sm', children }: CrmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <motion.div className="absolute inset-0 bg-slate-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} aria-hidden />
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={`relative flex max-h-[94vh] w-full flex-col rounded-t-lg bg-white shadow-xl sm:rounded-md ${size === 'lg' ? 'max-w-3xl' : 'max-w-md'}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
        
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-slate-200 bg-white px-3.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitDisabled}
            className={`h-9 rounded-md px-4 text-[12.5px] font-semibold text-white transition-colors duration-150 disabled:opacity-50 ${
            submitTone === 'danger' ? 'bg-status-critical hover:bg-rose-800' : 'bg-primary hover:bg-primary-hover'}`
            }>
            
            {submitLabel}
          </button>
        </footer>
      </motion.form>
    </div>);

}