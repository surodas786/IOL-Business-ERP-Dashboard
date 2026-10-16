import { ApprovalButtons } from '../approvals/ApprovalButtons';
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, formatBDT, formatDhaka, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canApprovePayout, canPay, canRunAccruals, canSeePayment, maskAccount, periodOf } from '../../utils/agentRules';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { MoneyEntryDialog } from '../associates/MoneyEntryDialog';
import type { AgentSettlement, CommissionAccrual } from '../../types/agent';
import type { SalesAgent } from '../../types/records';

interface Props {
  agents: SalesAgent[];
  settlements: AgentSettlement[];
  accruals: CommissionAccrual[];
  showAgent?: boolean;
}

/** Settlements (Finance Approver sign-off) and payment history. */
export function SettlementsView({ agents, settlements, accruals, showAgent = true }: Props) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [paying, setPaying] = useState<AgentSettlement | null>(null);
  const now = periodOf(demoNow().toISOString());
  const agentName = (id: string) => db.salesAgents.find((a) => a.id === id)?.name ?? id;
  const ready = agents.
  map((a) => ({ a, rows: accruals.filter((x) => x.agentId === a.id && x.status === 'Accrued' && x.period <= now) })).
  filter((x) => x.rows.length > 0).
  map((x) => ({ ...x, total: x.rows.reduce((s, r) => s + r.amount, 0) }));
  const open = settlements.filter((s) => s.status !== 'Paid').sort((a, b) => b.preparedAt.localeCompare(a.preparedAt));
  const paid = settlements.filter((s) => s.status === 'Paid').sort((a, b) => (b.payment?.paidAt ?? '').localeCompare(a.payment?.paidAt ?? ''));
  const payView = canSeePayment(role);

  const actionFor = (s: AgentSettlement) => {
    if (s.status === 'Pending Approval' && canApprovePayout(role) && s.approvalId) {
      const self = s.preparedById === user.id;
      return (
        <ApprovalButtons approvalId={s.approvalId} disabled={self} disabledReason={self ? 'The preparer cannot approve' : undefined} />);

    }
    if (s.status === 'Approved' && canPay(role))
    return (
      <button type="button" className={linkBtn} onClick={() => setPaying(s)}>
          Record payment
        </button>);

    return null;
  };

  return (
    <div className="space-y-3">
      {canRunAccruals(role) && ready.length > 0 &&
      <AdminPanel title="Ready to settle" description="Accrued commission not yet in a settlement. Clawbacks are netted here.">
          <ul className="divide-y divide-slate-100">
            {ready.map(({ a, rows, total }) =>
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[12.5px]">
                <span>
                  <span className="font-semibold text-slate-900">{a.name}</span> · {rows.length} accrual{rows.length === 1 ? '' : 's'}
                  {!a.payment && <span className="ml-2 text-[11.5px] text-status-warning">No payment details on file</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className={`font-semibold tabular-nums ${total <= 0 ? 'text-status-critical' : 'text-slate-900'}`}>{formatBDT(total)}</span>
                  <button type="button" className={primaryBtn} disabled={total <= 0} onClick={() => runAction({ type: 'AGT_CREATE_SETTLEMENT', agentId: a.id })}>
                    Prepare settlement
                  </button>
                </span>
              </li>
          )}
          </ul>
        </AdminPanel>
      }

      <AdminPanel title="Settlements" description="Prepared by Accounts, approved by the Finance Approver. The preparer cannot approve.">
        <CustomerTable<AgentSettlement>
          minWidth={860}
          rows={open}
          rowKey={(s) => s.id}
          empty="No settlements awaiting approval or payment."
          columns={[
          { label: 'Settlement', cell: (s) => <span><span className="block font-semibold text-slate-900">{s.periods}</span><span className="font-mono text-[10.5px] text-slate-400">{s.id}</span></span> },
          ...(showAgent ? [{ label: 'Agent', cell: (s: AgentSettlement) => agentName(s.agentId) }] : []),
          { label: 'Accruals', align: 'right', cell: (s) => s.accrualIds.length },
          { label: 'Amount', align: 'right', cell: (s) => <span className="font-semibold tabular-nums">{formatBDT(s.amount)}</span> },
          { label: 'Prepared', cell: (s) => <span className="text-[11.5px]">{userName(s.preparedById)}<span className="block text-slate-500">{formatDhaka(s.preparedAt)}</span></span> },
          { label: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
          { label: '', align: 'right', cell: actionFor }]
          } />
        
      </AdminPanel>

      <AdminPanel title="Payment history" description={payView ? undefined : 'Destination accounts are masked for your role.'}>
        <CustomerTable<AgentSettlement>
          minWidth={820}
          rows={paid}
          rowKey={(s) => s.id}
          empty="No payments yet."
          columns={[
          { label: 'Paid on', cell: (s) => <span className="whitespace-nowrap">{formatDhakaDate(s.payment!.paidAt)}</span> },
          ...(showAgent ? [{ label: 'Agent', cell: (s: AgentSettlement) => agentName(s.agentId) }] : []),
          { label: 'Covers', cell: (s) => <span className="text-[11.5px]">{s.periods}<span className="block font-mono text-[10.5px] text-slate-400">{s.id}</span></span> },
          { label: 'Amount', align: 'right', cell: (s) => <span className="font-semibold tabular-nums">{formatBDT(s.amount)}</span> },
          { label: 'Paid to', cell: (s) => <span className="text-[11.5px]">{payView ? s.payment!.toAccount : `${s.payment!.method} ${maskAccount('')}`}</span> },
          { label: 'Reference', cell: (s) => <span className="text-[11.5px]">{payView ? s.payment!.reference : 'Restricted'}</span> },
          { label: 'Approved by', cell: (s) => <span className="text-[11.5px]">{userName(s.decidedById)}</span> }]
          } />
        
      </AdminPanel>

      <AnimatePresence>
        {paying &&
        <MoneyEntryDialog
          key="p"
          title={`Pay ${agentName(paying.agentId)}`}
          description={(() => {
            const p = db.salesAgents.find((a) => a.id === paying.agentId)?.payment;
            return p ? `${formatBDT(paying.amount)} to ${p.method} ${maskAccount(p.accountNumber)} (${p.accountName}).` : 'No payment details on file — add them on the agent’s profile first.';
          })()}
          submitLabel="Record payment"
          fields={{ amount: paying.amount, reference: 'Bank, BEFTN or wallet transaction reference', date: 'Paid on' }}
          onSubmit={(v) => runAction({ type: 'AGT_RECORD_PAYMENT', settlementId: paying.id, reference: v.reference, paidAt: v.at })}
          onClose={() => setPaying(null)} />

        }
      </AnimatePresence>
    </div>);

}