import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../utils/access';
import { demoNow, formatDhakaDate } from '../utils/format';
import { canEditAgent, canPrepare, canSeeCommission } from '../utils/agentRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { AdminPanel, linkBtn, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { StatusBadge } from '../components/records/StatusBadge';
import { CommissionTotals } from '../components/agents/CommissionTotals';
import { AttributionsView } from '../components/agents/AttributionsView';
import { ProposalList } from '../components/agents/ProposalList';
import { AccrualsView } from '../components/agents/AccrualsView';
import { SettlementsView } from '../components/agents/SettlementsView';
import { PaymentDetailsPanel } from '../components/agents/PaymentDetailsPanel';
import { AgentFormDialog } from '../components/agents/AgentFormDialog';
import { ProposalDialog } from '../components/agents/ProposalDialog';

function Fact({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-slate-800">{children}</dd>
    </div>);

}

export function SalesAgentDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const [dialog, setDialog] = useState<'edit' | 'proposal' | null>(null);
  if (!canAccessModule(role, 'agents')) return <AccessDenied title="Sales Agents" module="agents" />;
  const a = db.salesAgents.find((x) => x.id === id);
  if (!a || !inUserScope(user, a.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{a ? 'This agent is outside your branch scope.' : 'Agent not found.'}</p>
        <Link to="/sales-agents" className={`${linkBtn} mt-2 inline-block`}>
          Agent register
        </Link>
      </div>);

  }
  const money = canSeeCommission(role);
  const attributions = db.agentAttributions.filter((x) => x.agentId === a.id);
  const reassignments = db.attributionReassignments.filter((r) => r.fromAgentId === a.id || r.toAgentId === a.id);
  const proposals = db.commissionProposals.filter((p) => p.agentId === a.id);
  const accruals = db.commissionAccruals.filter((x) => x.agentId === a.id);
  const settlements = db.agentSettlements.filter((s) => s.agentId === a.id);
  const expired = !!a.agreementEnd && new Date(a.agreementEnd).getTime() < demoNow().getTime();

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/sales-agents" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Agent register
      </Link>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">{a.id}</p>
          <h1 className="text-[19px] font-bold text-slate-900">{a.name}</h1>
          <p className="text-[12px] text-slate-600">
            {a.nameBn} · {a.phone} · {a.territory ?? '—'}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <StatusBadge status={a.status} />
            {expired && <StatusBadge status="Expired" />}
          </div>
        </div>
        <div className="flex gap-2">
          {canEditAgent(role) &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('edit')}>
              Edit profile
            </button>
          }
          {canPrepare(role) && a.status === 'Active' &&
          <button type="button" className={primaryBtn} onClick={() => setDialog('proposal')}>
              Commission proposal
            </button>
          }
        </div>
      </header>

      <div className="space-y-3">
        {money && <CommissionTotals accruals={accruals} />}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <AdminPanel title="Profile and agreement">
            <dl className="grid gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Agreement">{a.agreementStart ? `${formatDhakaDate(a.agreementStart)} – ${formatDhakaDate(a.agreementEnd!)}` : '—'}</Fact>
              {money &&
              <Fact label="Standard terms (defaults only)">
                  {a.standardBasis ?? '—'} · {a.standardArrangement}
                  {a.standardMrcPct ? ` · ${a.standardMrcPct}% MRC${a.standardArrangement === 'Recurring' ? ` × ${a.standardMonths} mo` : ''}` : ''}
                  {a.standardOtcPct ? ` · ${a.standardOtcPct}% OTC` : ''}
                </Fact>
              }
              <Fact label="Territory">{a.territory ?? '—'}</Fact>
              <Fact label="Phone">{a.phone}</Fact>
              <Fact label="Email">{a.email ?? '—'}</Fact>
              <Fact label="NID">{a.nid ?? '—'}</Fact>
              <Fact label="Address">{a.address ?? '—'}</Fact>
              <Fact label="Activations credited">{a.activations}</Fact>
            </dl>
          </AdminPanel>
          <PaymentDetailsPanel agent={a} />
        </div>

        <AttributionsView attributions={attributions} reassignments={reassignments} agentId={a.id} />

        <AdminPanel title="Commission proposals">
          <ProposalList proposals={proposals} showAgent={false} />
        </AdminPanel>

        {money && <AccrualsView accruals={accruals} showAgent={false} />}
        {money && <SettlementsView agents={[a]} settlements={settlements} accruals={accruals} showAgent={false} />}
      </div>

      <AnimatePresence>
        {dialog === 'edit' && <AgentFormDialog key="e" agent={a} onClose={() => setDialog(null)} />}
        {dialog === 'proposal' && <ProposalDialog key="p" agentId={a.id} onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </div>);

}