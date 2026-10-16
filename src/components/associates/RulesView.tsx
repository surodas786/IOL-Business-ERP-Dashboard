import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { demoNow, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canApproveSettlement, canPrepareSettlement } from '../../utils/associateRules';
import { AdminPanel, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { AddRuleDialog } from './AddRuleDialog';
import type { SettlementRule } from '../../types/associate';

/** Effective-dated deduction and cost rules. Shown for one associate when associateId is set. */
export function RulesView({ associateId }: {associateId?: string;}) {
  const { db } = useData();
  const { role } = useSession();
  const [open, setOpen] = useState(false);
  const nowMs = demoNow().getTime();
  const ms = (iso: string) => new Date(iso).getTime();
  const rows = db.settlementRules.
  filter((r) => !associateId || !r.associateId || r.associateId === associateId).
  sort((a, b) => a.kind.localeCompare(b.kind) || b.effectiveFrom.localeCompare(a.effectiveFrom));
  const state = (r: SettlementRule) => ms(r.effectiveFrom) > nowMs ? 'Scheduled' : r.effectiveTo && ms(r.effectiveTo) < nowMs ? 'Ended' : 'Active';

  return (
    <AdminPanel
      title="Settlement rules"
      description="Tax, OTC, discounts, refunds and direct costs used when deductions are part of the sharing basis. Changing a rule never recalculates an approved settlement."
      actions={
      (canPrepareSettlement(role) || canApproveSettlement(role)) &&
      <button type="button" className={primaryBtn} onClick={() => setOpen(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add rule
          </button>

      }>
      
      <CustomerTable<SettlementRule>
        minWidth={860}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No rules."
        columns={[
        { label: 'Rule', cell: (r) => <span><span className="block font-semibold text-slate-900">{r.label}</span><span className="font-mono text-[10.5px] text-slate-400">{r.id}</span></span> },
        { label: 'Kind', cell: (r) => r.kind },
        { label: 'Value', align: 'right', cell: (r) => <span className="tabular-nums">{r.method === 'Percent of revenue' ? `${r.value}%` : r.method === 'Per subscriber' ? `৳ ${r.value} / subscriber` : `৳ ${r.value.toLocaleString('en-IN')}`}</span> },
        { label: 'Applies to', cell: (r) => r.associateId ? db.associates.find((a) => a.id === r.associateId)?.name ?? r.associateId : 'All associates' },
        { label: 'Effective', cell: (r) => <span className="whitespace-nowrap text-[11.5px]">{formatDhakaDate(r.effectiveFrom)} – {r.effectiveTo ? formatDhakaDate(r.effectiveTo) : 'open'}</span> },
        { label: 'Added', cell: (r) => <span className="text-[11.5px]">{userName(r.createdById)}<span className="block text-slate-500">{formatDhakaDate(r.createdAt)}</span></span> },
        { label: 'Status', cell: (r) => <StatusBadge status={state(r)} /> }]
        } />
      
      <AnimatePresence>{open && <AddRuleDialog key="r" associateId={associateId} onClose={() => setOpen(false)} />}</AnimatePresence>
    </AdminPanel>);

}