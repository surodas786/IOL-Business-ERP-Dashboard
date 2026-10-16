import React, { useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon, ShieldCheckIcon } from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { useScopedAgents } from '../hooks/useScopedAgents';
import { canAccessModule } from '../utils/access';
import { canDecideRates, canEditAgent, canPrepare, canSeeCommission } from '../utils/agentRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { AgentRegister } from '../components/agents/AgentRegister';
import { AttributionsView } from '../components/agents/AttributionsView';
import { ProposalList } from '../components/agents/ProposalList';
import { AccrualsView } from '../components/agents/AccrualsView';
import { SettlementsView } from '../components/agents/SettlementsView';
import { AgentFormDialog } from '../components/agents/AgentFormDialog';
import { ProposalDialog } from '../components/agents/ProposalDialog';

const VIEWS = [
{ id: 'register', label: 'Agent register' },
{ id: 'attributions', label: 'Customer attributions' },
{ id: 'proposals', label: 'Commission proposals' },
{ id: 'accruals', label: 'Accruals' },
{ id: 'settlements', label: 'Settlements and payments' }] as
const;

export function SalesAgents() {
  const { view } = useParams();
  const { user, role } = useSession();
  const scoped = useScopedAgents();
  const [dialog, setDialog] = useState<'agent' | 'proposal' | null>(null);
  if (!canAccessModule(role, 'agents')) return <AccessDenied title="Sales Agents" module="agents" />;
  const money = canSeeCommission(role);
  const views = VIEWS.filter((v) => money || v.id === 'register' || v.id === 'attributions');
  const current = view ? views.find((v) => v.id === view) : views[0];
  if (!current) return <Navigate to="/sales-agents" replace />;

  const awaitingMe = canDecideRates(role) ?
  scoped.proposals.filter((p) => p.status === 'Pending Approval' && p.preparedById !== user.id).length + scoped.reassignments.filter((r) => r.status === 'Pending Approval' && r.requestedById !== user.id).length :
  0;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Sales Agents</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">Introducers, customer attributions and commission · separate from Associate revenue shares · fictional demo data</p>
        </div>
        <div className="flex gap-2">
          {canEditAgent(role) &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('agent')}>
              New agent
            </button>
          }
          {canPrepare(role) &&
          <button type="button" className={primaryBtn} onClick={() => setDialog('proposal')}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Commission proposal
            </button>
          }
        </div>
      </div>

      <p role="note" className="mb-3 flex items-start gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-[12px] text-slate-700">
        <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span>
          Commission rates are approved, revised or rejected by the <span className="font-semibold">Business Head (Sales Head) only</span>. Management, Operations, Accounts and System Admin hold no rate authority. Payouts of earned commission are approved by the Finance Approver.
          {awaitingMe > 0 && <span className="ml-1 font-semibold text-slate-900">{awaitingMe} item{awaitingMe === 1 ? '' : 's'} awaiting your decision.</span>}
        </span>
      </p>

      <nav aria-label="Sales agent views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {views.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'register' ? '/sales-agents' : `/sales-agents/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
          }>
          
            {v.label}
          </NavLink>
        )}
      </nav>

      {current.id === 'register' && <AgentRegister />}
      {current.id === 'attributions' && <AttributionsView attributions={scoped.attributions} reassignments={scoped.reassignments} />}
      {current.id === 'proposals' &&
      <section className="rounded-md border border-slate-200 bg-white">
          <ProposalList proposals={scoped.proposals} />
        </section>
      }
      {current.id === 'accruals' && <AccrualsView accruals={scoped.accruals} />}
      {current.id === 'settlements' && <SettlementsView agents={scoped.agents} settlements={scoped.settlements} accruals={scoped.accruals} />}

      <AnimatePresence>
        {dialog === 'agent' && <AgentFormDialog key="a" onClose={() => setDialog(null)} />}
        {dialog === 'proposal' && <ProposalDialog key="p" onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </div>);

}