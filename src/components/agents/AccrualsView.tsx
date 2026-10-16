import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, formatBDT } from '../../utils/format';
import { BUCKET_OF, canRunAccruals, periodLabel, periodOf, type AmountBucket } from '../../utils/agentRules';
import { AdminPanel, secondaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { CommissionTotals } from './CommissionTotals';
import type { CommissionAccrual } from '../../types/agent';

/** Commission earned after qualifying events — with accrued, pending, approved, paid and reversed totals. */
export function AccrualsView({ accruals, showAgent = true }: {accruals: CommissionAccrual[];showAgent?: boolean;}) {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const [bucket, setBucket] = useState<AmountBucket | 'all'>('all');
  const current = periodOf(demoNow().toISOString());
  const rows = accruals.filter((a) => bucket === 'all' || BUCKET_OF[a.status] === bucket).sort((a, b) => b.period.localeCompare(a.period) || b.id.localeCompare(a.id));

  return (
    <div className="space-y-3">
      <CommissionTotals accruals={accruals} value={bucket} onChange={setBucket} />
      <AdminPanel
        title="Accruals"
        description="Agent commission only — kept separate from Associate revenue shares. Nothing accrues before the qualifying event is confirmed."
        actions={
        showAgent &&
        canRunAccruals(role) &&
        <button type="button" className={secondaryBtn} onClick={() => runAction({ type: 'AGT_RUN_ACCRUALS', period: current })}>
              Run recurring accruals to {periodLabel(current)}
            </button>

        }>
        
        <CustomerTable<CommissionAccrual>
          minWidth={900}
          rows={rows}
          rowKey={(a) => a.id}
          empty="No accruals in this view."
          columns={[
          { label: 'Month', cell: (a) => <span><span className="block font-semibold text-slate-900">{periodLabel(a.period)}</span><span className="font-mono text-[10.5px] text-slate-400">{a.id}</span></span> },
          ...(showAgent ? [{ label: 'Agent', cell: (a: CommissionAccrual) => db.salesAgents.find((x) => x.id === a.agentId)?.name }] : []),
          { label: 'Customer', cell: (a) => db.customers.find((c) => c.id === a.customerId)?.name },
          {
            label: 'Proposal',
            cell: (a) =>
            <Link to={`/sales-agents/proposals/${a.proposalId}`} className="font-mono text-[11px] text-primary hover:text-primary-hover">
                  {a.proposalId}
                </Link>

          },
          { label: 'Basis', cell: (a) => <span className="text-[11.5px]">{a.component === 'Clawback' ? 'Clawback of paid commission' : `${a.pct}% of ${a.component} ${formatBDT(a.base)}`}</span> },
          { label: 'Amount', align: 'right', cell: (a) => <span className={`tabular-nums ${a.status === 'Reversed' ? 'text-slate-400 line-through' : a.amount < 0 ? 'text-status-critical' : 'text-slate-900'}`}>{formatBDT(a.amount)}</span> },
          {
            label: 'Status',
            cell: (a) =>
            <span className="flex flex-col items-start gap-0.5">
                  <StatusBadge status={a.status} />
                  {a.settlementId && <span className="font-mono text-[10.5px] text-slate-500">{a.settlementId}</span>}
                  {a.reversalReason && <span className="max-w-[220px] text-[10.5px] text-slate-500">{a.reversalReason}</span>}
                </span>

          }]
          } />
        
      </AdminPanel>
    </div>);

}