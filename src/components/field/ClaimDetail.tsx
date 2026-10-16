import React from 'react';
import { CheckIcon, PaperclipIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useRunAction } from '../../hooks/useRunAction';
import { StatusBadge } from '../records/StatusBadge';
import { ClaimActions } from './ClaimActions';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { branchName, recordName, userName } from '../../utils/relations';
import { claimLinesTotal, claimTotal, isEditable, receiptProblem } from '../../utils/fieldRules';
import type { ClaimStatus, ExpenseClaim } from '../../types/field';

const STEPS: {label: string;match: ClaimStatus[];}[] = [
{ label: 'Draft', match: ['Draft'] },
{ label: 'Submitted', match: ['Submitted'] },
{ label: 'Decision', match: ['Approved', 'Returned', 'Rejected'] },
{ label: 'Paid', match: ['Paid'] }];


export function ClaimDetail({ claim: c, onClose }: {claim: ExpenseClaim;onClose: () => void;}) {
  const { db } = useData();
  const { user } = useSession();
  const { openRecord } = useRecordDrawer();
  const runAction = useRunAction();
  const editable = c.claimantId === user.id && isEditable(c);
  const at = STEPS.findIndex((s) => s.match.includes(c.status));

  return (
    <section aria-label={`Claim ${c.id}`} className="rounded-md border border-slate-200 bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold text-slate-900">{c.id}</span>
            <StatusBadge status={c.status} />
          </p>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            {userName(c.claimantId)} · {branchName(c.branchId)}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <p className="text-[16px] font-bold tabular-nums text-slate-900">{formatBDT(claimTotal(c))}</p>
            {c.adjustments.length > 0 && <p className="text-[10.5px] text-slate-500">lines {formatBDT(claimLinesTotal(c))}</p>}
          </div>
          <button type="button" aria-label="Close claim" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      <ol aria-label="Claim progress" className="grid grid-cols-4 gap-1 border-b border-slate-100 px-4 py-2.5">
        {STEPS.map((s, i) => {
          const label = i === 2 && at >= 2 && c.status !== 'Paid' ? c.status : i === 2 && c.status === 'Paid' ? 'Approved' : s.label;
          const done = i < at || i === at && c.status === 'Paid';
          const here = i === at && c.status !== 'Paid';
          const bad = here && (c.status === 'Rejected' || c.status === 'Returned');
          return (
            <li key={s.label} className="min-w-0">
              <span className={`block h-1 rounded-full ${done ? 'bg-primary' : here ? bad ? 'bg-status-warning' : 'bg-primary/50' : 'bg-slate-200'}`} aria-hidden />
              <span className={`mt-1 flex items-center gap-1 truncate text-[10.5px] font-semibold ${here ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                {done && <CheckIcon className="h-3 w-3 text-primary" aria-hidden />}
                {label}
              </span>
            </li>);

        })}
      </ol>

      <ul className="divide-y divide-slate-100">
        {c.lines.length === 0 && <li className="px-4 py-6 text-center text-[12px] text-slate-500">No lines yet. Use “Add expense”.</li>}
        {c.lines.map((l) => {
          const problem = receiptProblem(l);
          return (
            <li key={l.id} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-slate-900">
                    {l.category} <span className="font-normal text-slate-500">· {formatDhakaDate(`${l.date}T12:00:00+06:00`)}</span>
                  </p>
                  <p className="text-[12px] text-slate-700">{l.purpose}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {l.relation}
                    {l.subject &&
                    <>
                        {' · '}
                        <button type="button" className="text-primary hover:text-primary-hover" onClick={() => openRecord(l.subject!)}>
                          {recordName(db, l.subject)}
                        </button>
                      </>
                    }
                    {l.visitId &&
                    <>
                        {' · '}
                        <button type="button" className="text-primary hover:text-primary-hover" onClick={() => openRecord({ type: 'fieldVisit', id: l.visitId! })}>
                          {l.visitId}
                        </button>
                      </>
                    }
                  </p>
                  <p className={`mt-0.5 flex items-center gap-1 text-[11px] ${problem ? 'font-semibold text-status-warning' : 'text-slate-500'}`}>
                    <PaperclipIcon className="h-3 w-3" aria-hidden />
                    {l.receipt ? l.receipt.name : problem ?? (l.noReceiptReason ? `No receipt: ${l.noReceiptReason}` : 'No receipt (under threshold)')}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <span className="text-[13px] font-semibold tabular-nums text-slate-900">{formatBDT(l.amount)}</span>
                  {editable &&
                  <button type="button" aria-label={`Remove ${l.category} line`} onClick={() => runAction({ type: 'FIELD_REMOVE_EXPENSE', claimId: c.id, lineId: l.id })} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  }
                </div>
              </div>
              {editable && !l.receipt &&
              <button
                type="button"
                onClick={() => runAction({ type: 'FIELD_ATTACH_RECEIPT', claimId: c.id, lineId: l.id, file: { name: `receipt_${l.id.toLowerCase()}.jpg`, sizeKb: 260 } })}
                className="mt-1 text-[11.5px] font-semibold text-primary hover:text-primary-hover">
                
                  Attach demo receipt
                </button>
              }
            </li>);

        })}
        {c.adjustments.map((a) =>
        <li key={a.id} className="flex items-start justify-between gap-3 bg-slate-50 px-4 py-2">
            <p className="text-[11.5px] text-slate-700">
              <span className="font-semibold">Adjustment</span> · {a.reason}
              <span className="block text-[10.5px] text-slate-500">
                {userName(a.byId)} · {formatDhaka(a.at)}
              </span>
            </p>
            <span className="text-[12.5px] font-semibold tabular-nums text-slate-900">
              {a.amount > 0 ? '+' : '−'}
              {formatBDT(Math.abs(a.amount))}
            </span>
          </li>
        )}
      </ul>

      <div className="border-t border-slate-200 px-4 py-3">
        <ClaimActions claim={c} />
      </div>

      {c.history.length > 0 &&
      <div className="border-t border-slate-200 px-4 py-3">
          <h3 className="mb-2 text-[12px] font-bold text-slate-900">History</h3>
          <ol className="space-y-2">
            {[...c.history].reverse().map((h, i) =>
          <li key={`${h.at}-${i}`} className="text-[11.5px] text-slate-700">
                <span className="font-semibold text-slate-900">{h.action}</span> · {userName(h.byId)} · {formatDhaka(h.at)}
                {h.note && <span className="block italic text-slate-600">{h.note}</span>}
              </li>
          )}
          </ol>
        </div>
      }
    </section>);

}