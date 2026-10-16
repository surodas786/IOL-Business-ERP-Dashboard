import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canApproveSettlement, canPrepareSettlement, disputedAmount, shortfall, unverifiedRemitted, verifiedRemitted } from '../../utils/associateRules';
import { AdminPanel, linkBtn } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { BillingReasonDialog } from '../billing/BillingReasonDialog';
import type { AssociateSettlement, SettlementDispute } from '../../types/associate';

/** Receivable position: declaration, verified remittances, shortfall and disputes kept apart. */
export function SettlementPosition({ settlement: s }: {settlement: AssociateSettlement;}) {
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [resolving, setResolving] = useState<SettlementDispute | null>(null);
  const canVerify = canPrepareSettlement(role) || canApproveSettlement(role);
  const figures = [
  ...(s.declaration ? [{ label: 'Declared by associate', value: s.declaration.amount, note: 'Not a remittance' }] : []),
  { label: 'Receivable by IOL', value: s.receivable },
  { label: 'Verified remittances', value: verifiedRemitted(s) },
  { label: 'Awaiting verification', value: unverifiedRemitted(s) },
  { label: 'Under dispute', value: disputedAmount(s) },
  { label: 'Shortfall', value: shortfall(s), strong: true }];


  return (
    <AdminPanel title="Remittances, shortfall and disputes">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-slate-100 px-4 py-3 sm:grid-cols-3">
        {figures.map((f) =>
        <div key={f.label}>
            <dt className="text-[10.5px] font-semibold text-slate-400">{f.label}</dt>
            <dd className={`text-[14px] tabular-nums ${f.strong && f.value > 0 ? 'font-bold text-status-critical' : 'font-semibold text-slate-900'}`}>
              {formatBDT(f.value)}
              {f.note && <span className="ml-1 text-[10.5px] font-normal text-slate-500">{f.note}</span>}
            </dd>
          </div>
        )}
      </dl>
      <ul className="divide-y divide-slate-100">
        {s.remittances.map((r) =>
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12px]">
            <span>
              <span className="font-semibold tabular-nums text-slate-900">{formatBDT(r.amount)}</span> · {r.reference}
              <span className="block text-[11px] text-slate-500">
                Received {formatDhakaDate(r.at)} · recorded by {userName(r.recordedById)}
                {r.verified && r.verifiedById && ` · verified by ${userName(r.verifiedById)}`}
              </span>
            </span>
            {r.verified ?
          <StatusBadge status="Verified" /> :
          canVerify && r.recordedById !== user.id ?
          <button type="button" className={linkBtn} onClick={() => runAction({ type: 'ASC_VERIFY_REMITTANCE', settlementId: s.id, remittanceId: r.id })}>
                Verify against bank
              </button> :

          <StatusBadge status="Pending Verification" />
          }
          </li>
        )}
        {s.disputes.map((d) =>
        <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 bg-amber-50/40 px-4 py-2 text-[12px]">
            <span className="min-w-0">
              <span className="font-semibold tabular-nums text-slate-900">Dispute {formatBDT(d.amount)}</span> — {d.reason}
              <span className="block text-[11px] text-slate-500">
                Raised {formatDhaka(d.raisedAt)} by {userName(d.raisedById)}
                {d.resolution && ` · resolved: ${d.resolution}`}
              </span>
            </span>
            {d.status === 'Open' && canVerify ?
          <button type="button" className={linkBtn} onClick={() => setResolving(d)}>
                Resolve
              </button> :

          <StatusBadge status={d.status} />
          }
          </li>
        )}
        {!s.remittances.length && !s.disputes.length && <li className="px-4 py-5 text-center text-[12px] text-slate-500">No remittances or disputes yet.</li>}
      </ul>
      <AnimatePresence>
        {resolving &&
        <BillingReasonDialog
          key="r"
          title={`Resolve dispute ${formatBDT(resolving.amount)}`}
          description="Record the outcome. Any agreed correction goes into a future settlement — the approved figures stay as approved."
          submitLabel="Resolve"
          onSubmit={(resolution) => runAction({ type: 'ASC_RESOLVE_DISPUTE', settlementId: s.id, disputeId: resolving.id, resolution })}
          onClose={() => setResolving(null)} />

        }
      </AnimatePresence>
    </AdminPanel>);

}