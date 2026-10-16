import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { formatBDT } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canSeeCommission, effectiveMrcPct, effectiveOtcPct, financialEffect, rateSummary } from '../../utils/agentRules';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { FilterPills } from '../billing/FilterPills';
import type { CommissionProposal, ProposalStatus } from '../../types/agent';

type Filter = 'all' | ProposalStatus;

export function ProposalList({ proposals, showAgent = true }: {proposals: CommissionProposal[];showAgent?: boolean;}) {
  const { db } = useData();
  const { role } = useSession();
  const navigate = useNavigate();
  const money = canSeeCommission(role);
  const [filter, setFilter] = useState<Filter>('all');
  const opts: {id: Filter;label: string;}[] = [
  { id: 'all', label: 'All' },
  { id: 'Pending Approval', label: 'Awaiting decision' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Self-Sale', label: 'Self-Sale' },
  { id: 'Rejected', label: 'Rejected' },
  { id: 'Cancelled', label: 'Cancelled' }];

  const rows = proposals.filter((p) => filter === 'all' || p.status === filter).sort((a, b) => b.preparedAt.localeCompare(a.preparedAt));

  return (
    <div>
      <div className="border-b border-slate-200 px-4 py-2.5">
        <FilterPills label="Filter proposals" options={opts.map((o) => ({ ...o, count: proposals.filter((p) => o.id === 'all' || p.status === o.id).length }))} value={filter} onChange={setFilter} />
      </div>
      <CustomerTable<CommissionProposal>
        minWidth={money ? 1040 : 800}
        rows={rows}
        rowKey={(p) => p.id}
        onOpen={(p) => navigate(`/sales-agents/proposals/${p.id}`)}
        empty="No proposals."
        columns={[
        { label: 'Customer', cell: (p) => <span><span className="block font-semibold text-slate-900">{db.customers.find((c) => c.id === p.customerId)?.name}</span><span className="font-mono text-[10.5px] text-slate-400">{p.id}</span></span> },
        ...(showAgent ? [{ label: 'Agent', cell: (p: CommissionProposal) => p.selfSale ? <span className="text-slate-500">Self-Sale</span> : db.salesAgents.find((a) => a.id === p.agentId)?.name }] : []),
        { label: 'Salesperson', cell: (p) => userName(p.salespersonId) },
        ...(money ?
        [
        {
          label: 'Rate',
          cell: (p: CommissionProposal) =>
          <span className="text-[11.5px]">
                      {rateSummary(p, p.status !== 'Pending Approval')}
                      {p.revisions.length > 0 && <span className="block text-status-warning">Revised from {p.revisions.map((r) => `${r.from}%`).join(', ')}</span>}
                    </span>

        },
        {
          label: 'Total',
          align: 'right' as const,
          cell: (p: CommissionProposal) => p.selfSale ? <span className="text-slate-400">—</span> : <span className="tabular-nums">{formatBDT(financialEffect(p, effectiveMrcPct(p), effectiveOtcPct(p)).total)}</span>
        }] :

        []),
        { label: 'Qualifies on', cell: (p) => <span className="text-[11.5px]">{p.selfSale ? '—' : p.qualifyingEvent}{p.event && <span className="block text-status-ok">Confirmed</span>}</span> },
        { label: 'Work order', cell: (p) => <span className="font-mono text-[11px]">{p.workOrderId ?? '—'}</span> },
        { label: 'Status', cell: (p) => <StatusBadge status={p.status} /> }]
        } />
      
    </div>);

}