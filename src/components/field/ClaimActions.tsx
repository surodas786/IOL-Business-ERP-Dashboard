import React, { useState } from 'react';
import { LockIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { primaryBtn, secondaryBtn } from '../admin/AdminPanel';
import { FormField, inputClass } from '../admin/FormField';
import { formatBDT } from '../../utils/format';
import { canAdjustClaim, canDecideClaim, canPayClaim, claimTotal, isEditable, parseTaka, receiptProblem } from '../../utils/fieldRules';
import type { ExpenseClaim } from '../../types/field';

const textarea = `${inputClass} h-auto py-2`;

/** The actions the active account may take on a claim, with the reason when it can't. */
export function ClaimActions({ claim: c }: {claim: ExpenseClaim;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [note, setNote] = useState('');
  const [ref, setRef] = useState('');
  const [adj, setAdj] = useState('');
  const [adjSign, setAdjSign] = useState<1 | -1>(-1);
  const [adjReason, setAdjReason] = useState('');

  const mine = c.claimantId === user.id;
  const decideBlock = canDecideClaim(c, user, role, db);
  const payBlock = canPayClaim(c, user, role);
  const adjustBlock = canAdjustClaim(c, user, role);
  const problems = c.lines.map(receiptProblem).filter(Boolean);

  if (mine && isEditable(c)) {
    return (
      <div className="space-y-2">
        {problems.length > 0 && <p className="text-[11.5px] text-status-warning">{problems.length} line{problems.length > 1 ? 's need' : ' needs'} a receipt or reason before submitting.</p>}
        <button type="button" className={`${primaryBtn} h-10 w-full justify-center sm:h-8 sm:w-auto`} disabled={!c.lines.length || problems.length > 0} onClick={() => runAction({ type: 'FIELD_SUBMIT_CLAIM', claimId: c.id })}>
          {c.status === 'Returned' ? 'Resubmit claim' : 'Submit claim'} · {formatBDT(claimTotal(c))}
        </button>
      </div>);

  }

  if (!decideBlock) {
    const reasonOk = note.trim().length >= 8;
    return (
      <div className="space-y-2">
        <FormField label="Note" htmlFor="cl-note" help="Required to return or reject (8+ characters). Returned claims come back to the claimant to correct and resubmit.">
          <textarea id="cl-note" rows={2} className={textarea} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryBtn} disabled={note.trim().length < 10} title="A comment of at least 10 characters is required" onClick={() => runAction({ type: 'FIELD_DECIDE_CLAIM', claimId: c.id, decision: 'Approved', note })}>
            Approve
          </button>
          <button type="button" className={secondaryBtn} disabled={!reasonOk} onClick={() => runAction({ type: 'FIELD_DECIDE_CLAIM', claimId: c.id, decision: 'Returned', note })}>
            Return for correction
          </button>
          <button type="button" className={`${secondaryBtn} text-status-critical`} disabled={!reasonOk} onClick={() => runAction({ type: 'FIELD_DECIDE_CLAIM', claimId: c.id, decision: 'Rejected', note })}>
            Reject
          </button>
        </div>
      </div>);

  }

  return (
    <div className="space-y-4">
      {(c.status === 'Approved' || c.status === 'Paid') &&
      <p className="flex items-start gap-2 text-[11.5px] text-slate-600">
          <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          {c.status === 'Approved' ? 'Approved and locked. Lines can’t be edited; corrections need an authorised adjustment.' : 'Paid and closed.'}
        </p>
      }
      {c.status === 'Submitted' && <p className="text-[11.5px] text-slate-600">{decideBlock}</p>}
      {c.status === 'Rejected' && mine && <p className="text-[11.5px] text-slate-600">Rejected claims are closed. Raise a new claim for any valid expense.</p>}

      {!payBlock &&
      <div className="flex flex-wrap items-end gap-2">
          <FormField label="Payment reference" htmlFor="cl-ref" className="min-w-[200px] flex-1">
            <input id="cl-ref" className={inputClass} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. bKash PAY-77510" />
          </FormField>
          <button type="button" className={primaryBtn} disabled={ref.trim().length < 4} onClick={() => runAction({ type: 'FIELD_PAY_CLAIM', claimId: c.id, reference: ref })}>
            Mark paid
          </button>
        </div>
      }

      {!adjustBlock &&
      <fieldset className="rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-[12px] font-semibold text-slate-700">Authorised adjustment</legend>
          <div className="flex flex-wrap items-end gap-2">
            <div role="group" aria-label="Direction" className="flex rounded-md border border-slate-200 p-0.5">
              {([-1, 1] as const).map((s) =>
            <button key={s} type="button" aria-pressed={adjSign === s} onClick={() => setAdjSign(s)} className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${adjSign === s ? 'bg-navy text-white' : 'text-slate-600'}`}>
                  {s < 0 ? 'Reduce' : 'Increase'}
                </button>
            )}
            </div>
            <input aria-label="Adjustment amount" inputMode="decimal" className={`${inputClass} w-28`} value={adj} onChange={(e) => setAdj(e.target.value)} placeholder="৳" />
          </div>
          <textarea aria-label="Reason for adjustment" rows={2} className={`${textarea} mt-2`} value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="Reason (kept in the claim history)" />
          <button
          type="button"
          className={`${secondaryBtn} mt-2`}
          disabled={!parseTaka(adj) || adjReason.trim().length < 8}
          onClick={() => {
            if (runAction({ type: 'FIELD_ADJUST_CLAIM', claimId: c.id, amount: adjSign * parseTaka(adj), reason: adjReason })) {
              setAdj('');
              setAdjReason('');
            }
          }}>
          
            Record adjustment
          </button>
        </fieldset>
      }
    </div>);

}