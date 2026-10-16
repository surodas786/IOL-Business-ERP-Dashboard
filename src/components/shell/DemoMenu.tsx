import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RotateCcwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../contexts/DataContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useDismiss } from '../../hooks/useDismiss';
import { COLLECTION } from '../../utils/relations';
import { ConfirmDialog } from './ConfirmDialog';
import { Popover } from './Popover';
import type { EntityType } from '../../types/records';

export function DemoMenu() {
  const { db, resetDemoData, changeCount } = useData();
  const { close: closeDrawer } = useRecordDrawer();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const cancelConfirm = useCallback(() => setConfirming(false), []);
  useDismiss(ref, open && !confirming, close);

  const types = Object.keys(COLLECTION) as EntityType[];
  const recordCount = types.reduce((s, t) => s + (db[COLLECTION[t]] as unknown[]).length, 0);

  const confirmReset = () => {
    resetDemoData();
    closeDrawer();
    setConfirming(false);
    setOpen(false);
    toast.success('Demo data restored to the original sample records.');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="rounded-full border border-amber-200 bg-amber-50 px-2 py-[3px] text-[10.5px] font-bold tracking-wide text-status-warning transition-colors duration-150 hover:bg-amber-100">
        
        DEMO
      </button>
      <AnimatePresence>
        {open &&
        <Popover className="right-0 top-full mt-1.5 w-72 max-w-[calc(100vw-24px)] overflow-hidden">
            <div className="px-3 py-2.5">
              <p className="text-[12.5px] font-bold text-slate-900">Fictional demo data</p>
              <p className="mt-1 text-[11.5px] leading-snug text-slate-600">
                Every company, person, ID and amount is invented. Nothing is connected to live systems. Changes are saved in this browser only.
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-y-1 text-[11px]">
                <dt className="text-slate-400">Shared records</dt>
                <dd className="text-right font-semibold text-slate-800">{recordCount}</dd>
                <dt className="text-slate-400">Record types</dt>
                <dd className="text-right font-semibold text-slate-800">{types.length}</dd>
                <dt className="text-slate-400">Changes made</dt>
                <dd className="text-right font-semibold text-slate-800">{changeCount}</dd>
              </dl>
            </div>
            <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[12px] font-semibold text-status-critical transition-colors duration-100 hover:bg-rose-50">
            
              <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
              Reset demo data…
            </button>
          </Popover>
        }
      </AnimatePresence>
      <ConfirmDialog
        open={confirming}
        title="Reset demo data?"
        description={
        <>
            This restores the original fictional records and discards{' '}
            {changeCount > 0 ? `${changeCount} change${changeCount === 1 ? '' : 's'}` : 'any changes'} made in this browser — approvals,
            receipts, installations, clearances, tickets and notification read states. It can’t be undone.
          </>
        }
        confirmLabel="Reset demo data"
        onCancel={cancelConfirm}
        onConfirm={confirmReset} />
      
    </div>);

}