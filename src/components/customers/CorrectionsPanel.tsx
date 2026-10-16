import React, { useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { AdminPanel, primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import { StatusBadge } from '../records/StatusBadge';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canApproveCorrection, canViewIdentity } from '../../utils/customerProfile';
import { FIELD_LABEL, RESTRICTED_FIELDS, type ProfileCorrection } from '../../types/customer';
import type { Customer } from '../../types/records';

/** Correction requests for locked fields, with approval for authorised managers. */
export function CorrectionsPanel({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const list = db.profileCorrections.filter((p) => p.customerId === c.id).sort((a, b) => Number(b.status === 'Pending') - Number(a.status === 'Pending') || b.requestedAt.localeCompare(a.requestedAt));
  if (list.length === 0) return null;
  return (
    <AdminPanel title="Profile corrections" description="Corrections to locked fields need old value, proposed value, reason and approval. Approved changes never alter issued quotations, work orders or invoices.">
      <ul className="divide-y divide-slate-100">
        {list.map((p) =>
        <CorrectionRow key={p.id} correction={p} />
        )}
      </ul>
    </AdminPanel>);

}

function CorrectionRow({ correction: p }: {correction: ProfileCorrection;}) {
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [note, setNote] = useState('');
  const hidden = RESTRICTED_FIELDS.includes(p.field) && !canViewIdentity(role);
  const canDecide = p.status === 'Pending' && canApproveCorrection(role) && p.requestedById !== user.id;
  const value = (v: string) => hidden ? 'Restricted' : v || '—';

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-slate-900">{FIELD_LABEL[p.field]}</span>
        <StatusBadge status={p.status} />
        <span className="text-[11px] text-slate-400">{p.id}</span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-slate-700 line-through decoration-rose-300">{value(p.oldValue)}</span>
        <ArrowRightIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-slate-900">{value(p.proposedValue)}</span>
      </p>
      <p className="mt-1 text-[12px] text-slate-700">{p.reason}</p>
      <p className="mt-0.5 text-[10.5px] text-slate-400">
        Requested by {userName(p.requestedById)} · {formatDhaka(p.requestedAt, { year: true })}
        {p.decidedById &&
        <>
            {' · '}
            {p.status} by {userName(p.decidedById)} · {p.decidedAt && formatDhaka(p.decidedAt)}
            {p.decisionNote && ` — ${p.decisionNote}`}
          </>
        }
      </p>
      {p.status === 'Approved' && p.frozenDocs && p.frozenDocs.length > 0 && <p className="mt-1 text-[11px] text-slate-500">Kept original snapshot: {p.frozenDocs.join(', ')}</p>}
      {p.status === 'Pending' && !canDecide &&
      <p className="mt-1.5 text-[11px] italic text-slate-500">{p.requestedById === user.id ? 'You requested this — another manager must approve it.' : 'Awaiting Management or Business Head approval.'}</p>
      }
      {canDecide &&
      <div className="mt-2 flex flex-wrap items-center gap-2">
          <input aria-label="Decision note" className={`${inputClass} h-8 min-w-[200px] flex-1 text-[12px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required to reject)" />
          <button type="button" className={primaryBtn} disabled={note.trim().length < 10} title="A comment of at least 10 characters is required" onClick={() => runAction({ type: 'CUST_DECIDE_CORRECTION', correctionId: p.id, decision: 'Approved', note })}>
            Approve
          </button>
          <button type="button" className={secondaryBtn} disabled={note.trim().length < 10} onClick={() => runAction({ type: 'CUST_DECIDE_CORRECTION', correctionId: p.id, decision: 'Rejected', note })}>
            Reject
          </button>
        </div>
      }
    </li>);

}