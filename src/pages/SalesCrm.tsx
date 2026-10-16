import React, { useState } from 'react';
import { NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon, SearchIcon, Settings2Icon } from 'lucide-react';
import { crmViews, type CrmViewId } from '../data/crmViews';
import { useSession } from '../contexts/SessionContext';
import { useCrmData, type OwnerScope } from '../hooks/useCrmData';
import { canAccessModule, hasPermission } from '../utils/access';
import { canCreateLead, canManageSales, isPipeline, opportunityFlags } from '../utils/crmRules';
import { formatBDT } from '../utils/format';
import { AccessDenied } from '../components/shell/AccessDenied';
import { inputClass } from '../components/admin/FormField';
import { primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { PipelineBoard } from '../components/crm/PipelineBoard';
import { LeadList } from '../components/crm/LeadList';
import { FollowUpCalendar } from '../components/crm/FollowUpCalendar';
import { TenderRegister } from '../components/crm/TenderRegister';
import { StaleOpportunities } from '../components/crm/StaleOpportunities';
import { DuplicateReviews } from '../components/crm/DuplicateReviews';
import { NewLeadDialog } from '../components/crm/NewLeadDialog';
import { StageConfigDialog } from '../components/crm/StageConfigDialog';

export function SalesCrm() {
  const { view } = useParams();
  const navigate = useNavigate();
  const { role } = useSession();
  const [owner, setOwner] = useState<OwnerScope>('all');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<'lead' | 'stages' | null>(null);
  const filters = { owner, query };
  const { db, opportunities, conflicts } = useCrmData(filters);

  if (!canAccessModule(role, 'crm')) return <AccessDenied title="Sales CRM" module="crm" />;
  const current = crmViews.find((v) => v.id === view);
  if (!current) return <Navigate to="/sales-crm/pipeline" replace />;

  const pipe = hasPermission(role, 'viewPipeline');
  const open = opportunities.filter((o) => isPipeline(db, o));
  const flagged = opportunities.filter((o) => opportunityFlags(db, o).any).length;
  const reviews = conflicts.filter((c) => c.status === 'Open').length;
  const badge: Partial<Record<CrmViewId, number>> = { stale: flagged, reviews };

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Sales CRM</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {open.length} open opportunities
            {pipe && <> · {formatBDT(open.reduce((s, o) => s + o.expectedMrc, 0))} expected MRC</>}
            {' · '}fictional demo data
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageSales(role) &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('stages')}>
              <Settings2Icon className="h-3.5 w-3.5" aria-hidden /> Stages
            </button>
          }
          {canCreateLead(role) &&
          <button type="button" className={primaryBtn} onClick={() => setDialog('lead')}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New lead
            </button>
          }
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200">
        <nav aria-label="Sales CRM views" className="-mb-px flex flex-1 gap-1 overflow-x-auto">
          {crmViews.map((v) => {
            const Icon = v.icon;
            const n = badge[v.id];
            return (
              <NavLink
                key={v.id}
                to={`/sales-crm/${v.id}`}
                className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${
                isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`

                }>
                
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {v.label}
                {!!n && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-status-warning">{n}</span>}
              </NavLink>);

          })}
        </nav>
        <div className="mb-2 flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input aria-label="Filter by organisation, contact or ID" placeholder="Organisation, contact, ID…" className={`${inputClass} h-8 w-56 pl-8 text-[12px]`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div role="group" aria-label="Owner" className="flex rounded-md border border-slate-200 bg-white p-0.5">
            {(['all', 'mine'] as OwnerScope[]).map((o) =>
            <button
              key={o}
              type="button"
              aria-pressed={owner === o}
              onClick={() => setOwner(o)}
              className={`whitespace-nowrap rounded px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${owner === o ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              
                {o === 'all' ? 'All owners' : 'Mine'}
              </button>
            )}
          </div>
        </div>
      </div>

      {current.id === 'pipeline' && <PipelineBoard filters={filters} />}
      {current.id === 'leads' && <LeadList filters={filters} />}
      {current.id === 'calendar' && <FollowUpCalendar filters={filters} />}
      {current.id === 'tenders' && <TenderRegister filters={filters} />}
      {current.id === 'stale' && <StaleOpportunities filters={filters} />}
      {current.id === 'reviews' && <DuplicateReviews filters={filters} />}

      <AnimatePresence>
        {dialog === 'lead' && <NewLeadDialog key="lead" onClose={() => setDialog(null)} onCreated={(id) => navigate(`/sales-crm/opportunities/${id}`)} />}
        {dialog === 'stages' && <StageConfigDialog key="stages" onClose={() => setDialog(null)} />}
      </AnimatePresence>
    </div>);

}