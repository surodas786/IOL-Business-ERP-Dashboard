import React, { useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { linkBtn } from '../admin/AdminPanel';
import { fieldInput } from '../field/fieldStyles';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { invoiceOutstanding, receiptUnallocated } from '../../utils/relations';
import { duplicateReceipt, openInvoices } from '../../utils/billingCalc';
import type { Receipt } from '../../types/records';

function fill(order: {id: string;out: number;}[], amount: number): Record<string, string> {
  let left = amount;
  const out: Record<string, string> = {};
  order.forEach((i) => {
    const take = Math.max(0, Math.min(left, i.out));
    out[i.id] = take ? String(take) : '';
    left -= take;
  });
  return out;
}

/** Verify a payment claim (with allocation) or allocate a verified advance. Supports partial and multi-invoice allocation. */
export function AllocationDialog({ receipt: r, mode, onClose }: {receipt: Receipt;mode: 'verify' | 'allocate';onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const deposit = r.purpose === 'Security deposit';
  const invoices = openInvoices(db, r.billingAccountId);
  const free = mode === 'verify' ? r.amount : receiptUnallocated(r);
  const intended = r.intendedInvoiceIds ?? [];
  const ordered = [...invoices.filter((i) => intended.includes(i.id)), ...invoices.filter((i) => !intended.includes(i.id))].map((i) => ({ id: i.id, out: invoiceOutstanding(i) }));
  const [amounts, setAmounts] = useState<Record<string, string>>(() => deposit ? {} : fill(ordered, free));
  const [checked, setChecked] = useState(mode === 'allocate');
  const dup = mode === 'verify' ? duplicateReceipt(db, r.method, r.reference, r.id) : undefined;
  const total = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const over = total > free || invoices.some((i) => (Number(amounts[i.id]) || 0) > invoiceOutstanding(i));
  const allocations = invoices.map((i) => ({ invoiceId: i.id, amount: Number(amounts[i.id]) || 0 })).filter((a) => a.amount > 0);

  return (
    <CrmDialog
      size="lg"
      title={mode === 'verify' ? `Verify ${r.id}` : `Allocate advance from ${r.id}`}
      description={mode === 'verify' ? 'Only verified receipts affect balances. Check the evidence against the bank or bKash statement first.' : 'Apply the unallocated balance to one or more open invoices. Anything left stays as an advance.'}
      onClose={onClose}
      submitLabel={mode === 'verify' ? 'Verify receipt' : 'Allocate'}
      submitDisabled={!checked || over || !!dup || mode === 'allocate' && !allocations.length}
      onSubmit={() => runAction(mode === 'verify' ? { type: 'BILL_VERIFY_RECEIPT', receiptId: r.id, allocations } : { type: 'BILL_ALLOCATE', receiptId: r.id, allocations }) && onClose()}>
      
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] sm:grid-cols-3">
        {(
        [
        ['Account', db.billingAccounts.find((b) => b.id === r.billingAccountId)?.name ?? r.billingAccountId],
        ['Payer', r.payer ?? '—'],
        ['Amount', formatBDT(r.amount)],
        ['Method', r.method],
        ['Reference', r.reference],
        ['Received', formatDhaka(r.receivedAt, { year: true })],
        ['Collector', r.collectorName ?? '—'],
        ['Evidence', r.evidence ?? 'None attached'],
        ['Purpose', r.purpose ?? 'Payment']] as
        [string, string][]).
        map(([k, v]) =>
        <div key={k}>
            <dt className="text-[10.5px] font-semibold text-slate-500">{k}</dt>
            <dd className={`text-slate-900 ${k === 'Reference' ? 'font-mono text-[11.5px]' : ''}`}>{v}</dd>
          </div>
        )}
      </dl>

      {dup &&
      <p role="alert" className="flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-status-critical">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Duplicate reference — the same {r.method} reference is already on {dup.id} ({dup.status}). Verification is blocked; reject this claim.
        </p>
      }
      {!r.evidence && mode === 'verify' && <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-slate-800">No evidence attached. Confirm against the bank or wallet statement before verifying.</p>}

      {deposit ?
      <p className="rounded-md border border-slate-200 px-3 py-2 text-[12.5px] text-slate-700">This is a security deposit. It will be held separately and is never allocated to invoices or used for monthly charges.</p> :

      <fieldset>
          <div className="mb-1.5 flex items-center justify-between">
            <legend className="text-[12px] font-semibold text-slate-700">Allocate to open invoices</legend>
            <div className="flex gap-3">
              <button type="button" className={linkBtn} onClick={() => setAmounts(fill(invoices.map((i) => ({ id: i.id, out: invoiceOutstanding(i) })), free))}>
                Oldest first
              </button>
              <button type="button" className={linkBtn} onClick={() => setAmounts({})}>
                Clear
              </button>
            </div>
          </div>
          {invoices.length === 0 ?
        <p className="text-[12px] text-slate-500">No open invoices — the full amount will be held as an advance.</p> :

        <ul className="space-y-2">
              {invoices.map((i) =>
          <li key={i.id} className="grid grid-cols-[1fr_130px] items-center gap-3">
                  <label htmlFor={`al-${i.id}`} className="text-[12.5px] text-slate-800">
                    {i.id} · {i.period}
                    {intended.includes(i.id) && <span className="ml-1 text-[10.5px] font-semibold text-primary">suggested by collector</span>}
                    <span className="block text-[11px] text-slate-500">
                      {formatBDT(invoiceOutstanding(i))} outstanding · due {formatDhakaDate(i.dueDate)}
                    </span>
                  </label>
                  <input id={`al-${i.id}`} inputMode="numeric" className={`${fieldInput} text-right tabular-nums`} value={amounts[i.id] ?? ''} onChange={(e) => setAmounts({ ...amounts, [i.id]: e.target.value.replace(/[^\d]/g, '') })} />
                </li>
          )}
            </ul>
        }
          <p className={`mt-2 text-[12px] ${over ? 'text-status-critical' : 'text-slate-600'}`}>
            {over ? 'An amount exceeds what is available or outstanding.' : `Allocating ${formatBDT(total)} of ${formatBDT(free)}. ${free - total > 0 ? `${formatBDT(free - total)} will be held as an unallocated advance.` : 'Fully allocated.'}`}
          </p>
        </fieldset>
      }

      {mode === 'verify' &&
      <label className="flex items-start gap-2 text-[12.5px] text-slate-800">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          I have matched the amount, date and reference against the statement.
        </label>
      }
    </CrmDialog>);

}