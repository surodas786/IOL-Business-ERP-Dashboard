import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
          className="absolute inset-0 bg-slate-900/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
          aria-hidden />
        
          <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
          
            <h2 id="confirm-title" className="text-[15px] font-bold text-slate-900">
              {title}
            </h2>
            <div id="confirm-desc" className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
              {description}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50">
              
                Cancel
              </button>
              <button
              type="button"
              onClick={onConfirm}
              className="h-8 rounded-md bg-status-critical px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-rose-800">
              
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}