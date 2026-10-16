import React, { useState } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { InvoiceLines } from './InvoiceLines';
import type { InvoiceDraft } from '../../utils/billingCalc';

/** One unposted invoice with an expandable calculation. */
export function DraftInvoiceCard({ draft, action }: {draft: InvoiceDraft;action?: React.ReactNode;}) {
  const { db } = useData();
  const [open, setOpen] = useState(false);
  const ba = db.billingAccounts.find((b) => b.id === draft.billingAccountId);
  return (
    <li className="border-t border-slate-100 first:border-t-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronRightIcon className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold text-slate-900">{ba?.name}</span>
            <span className="block text-[11px] text-slate-500">
              {draft.billingAccountId} · {draft.billingTerm} · {draft.lines.length} line(s) · due {formatDhakaDate(draft.dueDate)}
            </span>
          </span>
        </button>
        <span className="text-[13px] font-bold tabular-nums text-slate-900">{formatBDT(draft.amount)}</span>
        {action}
      </div>
      {open &&
      <div className="space-y-2 bg-slate-50/60 px-4 pb-3 pt-1">
          <InvoiceLines lines={draft.lines} taxNote={draft.taxNote} />
          {draft.notes.length > 0 &&
        <ul className="list-disc pl-5 text-[11px] text-slate-600">
              {draft.notes.map((n) =>
          <li key={n}>{n}</li>
          )}
            </ul>
        }
        </div>
      }
    </li>);

}