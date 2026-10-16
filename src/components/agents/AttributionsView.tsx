import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canDecideRates, canPrepare } from '../../utils/agentRules';
import { AdminPanel, linkBtn, primaryBtn } from '../admin/AdminPanel';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { BillingReasonDialog } from '../billing/BillingReasonDialog';
import { AttributionDialog } from './AttributionDialog';
import { ReassignDialog } from './ReassignDialog';
import type { AgentAttribution, AttributionReassignment } from '../../types/agent';

interface Props {
  attributions: AgentAttribution[];
  reassignments: AttributionReassignment[];
  agentId?: string;
}

/** Agent + customer + salesperson links, pending reassignments and preserved history. */
export function AttributionsView({ attributions, reassignments, agentId }: Props) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [adding, setAdding] = useState(false);
  const [reassign, setReassign] = useState<AgentAttribution | null>(null);
  const [rejecting, setRejecting] = useState<AttributionReassignment | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const agent = (id: string) => db.salesAgents.find((a) => a.id === id)?.name ?? id;
  const customer = (id: string) => db.customers.find((c) => c.id === id)?.name ?? id;
  const pending = reassignments.filter((r) => r.status === 'Pending Approval');
  const rows = attributions.filter((a) => showHistory || !a.effectiveTo).sort((a, b) => customer(a.customerId).localeCompare(customer(b.customerId)) || b.effectiveFrom.localeCompare(a.effectiveFrom));
  const prep = canPrepare(role);
  const decider = canDecideRates(role);

  return (
    <div className="space-y-3">
      {pending.length > 0 &&
      <AdminPanel title={`Reassignments awaiting approval · ${pending.length}`} description="Only the Business Head (Sales Head) decides. The requester cannot approve their own request.">
          <ul className="divide-y divide-slate-100">
            {pending.map((r) => {
            const self = r.requestedById === user.id;
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 text-[12.5px]">
                    <p className="font-semibold text-slate-900">
                      {customer(r.customerId)} <span className="font-mono text-[10.5px] font-normal text-slate-400">{r.id}</span>
                    </p>
                    <p className="text-slate-700">
                      {agent(r.fromAgentId)} / {userName(r.fromSalespersonId)} → <span className="font-semibold">{agent(r.toAgentId)} / {userName(r.toSalespersonId)}</span> from {formatDhakaDate(r.effectiveDate)}
                    </p>
                    <p className="text-[11.5px] text-slate-500">
                      {r.reason} · requested by {userName(r.requestedById)}
                    </p>
                  </div>
                  {decider &&
                <div className="flex gap-3">
                      <button type="button" className={linkBtn} disabled={self} title={self ? 'You requested this' : undefined} onClick={() => setRejecting(r)}>
                        Reject
                      </button>
                      <button type="button" className={linkBtn} disabled={self} title={self ? 'You requested this' : undefined} onClick={() => runAction({ type: 'AGT_DECIDE_REASSIGNMENT', reassignmentId: r.id, approve: true, note: '' })}>
                        Approve
                      </button>
                    </div>
                }
                </li>);

          })}
          </ul>
        </AdminPanel>
      }

      <AdminPanel
        title="Customer attributions"
        description="A customer has one agent and one salesperson at a time. Reassignment needs Business Head approval with an effective date; earlier attributions are kept."
        actions={
        <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
              <input type="checkbox" className="accent-primary" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} /> Show history
            </label>
            {prep &&
          <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
                <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Attribute customer
              </button>
          }
          </div>
        }>
        
        <CustomerTable<AgentAttribution>
          minWidth={820}
          rows={rows}
          rowKey={(a) => a.id}
          empty="No attributions."
          columns={[
          {
            label: 'Customer',
            cell: (a) =>
            <Link to={`/customers/${a.customerId}`} className="font-semibold text-slate-900 hover:text-primary">
                  {customer(a.customerId)}
                </Link>

          },
          ...(agentId ?
          [] :
          [
          {
            label: 'Agent',
            cell: (a: AgentAttribution) =>
            <Link to={`/sales-agents/records/${a.agentId}`} className="text-slate-800 hover:text-primary">
                        {agent(a.agentId)}
                      </Link>

          }]),

          { label: 'Salesperson', cell: (a) => userName(a.salespersonId) },
          { label: 'Effective', cell: (a) => <span className="whitespace-nowrap text-[11.5px]">{formatDhakaDate(a.effectiveFrom)} – {a.effectiveTo ? formatDhakaDate(a.effectiveTo) : 'current'}{a.reassignmentId && <span className="block text-slate-500">via {a.reassignmentId}</span>}</span> },
          { label: 'Status', cell: (a) => <StatusBadge status={a.effectiveTo ? 'Ended' : reassignments.some((r) => r.attributionId === a.id && r.status === 'Pending Approval') ? 'Pending Approval' : 'Active'} /> },
          {
            label: '',
            align: 'right',
            cell: (a) =>
            prep && !a.effectiveTo && !reassignments.some((r) => r.attributionId === a.id && r.status === 'Pending Approval') ?
            <button type="button" className={linkBtn} onClick={() => setReassign(a)}>
                    Request reassignment
                  </button> :
            null
          }]
          } />
        
      </AdminPanel>

      <AnimatePresence>
        {adding && <AttributionDialog key="a" agentId={agentId} onClose={() => setAdding(false)} />}
        {reassign && <ReassignDialog key="r" attribution={reassign} onClose={() => setReassign(null)} />}
        {rejecting &&
        <BillingReasonDialog
          key="x"
          title={`Reject ${rejecting.id}`}
          description="The current attribution stays in force."
          submitLabel="Reject"
          danger
          onSubmit={(note) => runAction({ type: 'AGT_DECIDE_REASSIGNMENT', reassignmentId: rejecting.id, approve: false, note })}
          onClose={() => setRejecting(null)} />

        }
      </AnimatePresence>
    </div>);

}