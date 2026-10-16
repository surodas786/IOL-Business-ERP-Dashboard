import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { inUserScope } from '../../utils/access';
import { formatDhaka } from '../../utils/format';
import { branchName, userName } from '../../utils/relations';
import { canBackOfficeReview, canSuperviseSurveys, isSurveyor, surveyContext, surveyLabel, unreserved } from '../../utils/surveyRules';
import { StatusBadge } from '../records/StatusBadge';
import { CustomerTable } from '../customers/CustomerTable';
import { inputClass } from '../admin/FormField';
import { SURVEY_STATUSES, type SurveyStatus } from '../../types/survey';
import type { DemoDatabase, Survey } from '../../types/records';

type Filter = 'mine' | 'open' | SurveyStatus | 'all';

/** Who the survey is waiting on next. */
function waitingOn(s: Survey): string {
  switch (s.status) {
    case 'Submitted':
      return 'Back Office';
    case 'Back Office Review':
      return s.boClearedAt ? 'Technical Supervisor' : 'Back Office';
    case 'Assigned':
    case 'Scheduled':
    case 'In Progress':
    case 'Returned':
      return s.technicianName || 'Technician';
    case 'Submitted for Technical Review':
      return 'Technical Supervisor';
    default:
      return '—';
  }
}

export function SurveyQueue() {
  const { db } = useData();
  const { user, role, branchFilter, zoneFilter } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('mine');

  const scoped = useMemo(
    () => db.surveys.filter((s) => inUserScope(user, s.branchId) && (branchFilter === 'all' || s.branchId === branchFilter) && (zoneFilter === 'all' || s.zoneId === zoneFilter)),
    [db.surveys, user, branchFilter, zoneFilter]
  );
  const mine = (s: Survey) => needsMe(db, s, user.id, role);
  const counts = (f: Filter) => scoped.filter((s) => matches(s, f, mine)).length;

  const rows = scoped.
  filter((s) => matches(s, filter, mine)).
  filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const ctx = surveyContext(db, s);
    return [s.id, s.address, s.siteLabel ?? '', ctx.name, ctx.lead?.companyBn ?? '', s.technicianName].join(' ').toLowerCase().includes(q);
  }).
  sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const chips: {id: Filter;label: string;}[] = [
  { id: 'mine', label: 'Needs my action' },
  { id: 'open', label: 'All open' },
  ...SURVEY_STATUSES.map((s) => ({ id: s, label: s })),
  { id: 'all', label: 'All' }];


  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-200 px-4 py-2.5">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search surveys" placeholder="Survey ID, organisation, address or technician…" className={`${inputClass} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {chips.map((c) => {
            const n = counts(c.id);
            if (n === 0 && c.id !== filter && c.id !== 'mine' && c.id !== 'all' && c.id !== 'open') return null;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={filter === c.id}
                onClick={() => setFilter(c.id)}
                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${filter === c.id ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                
                {c.label} <span className={filter === c.id ? 'text-white/70' : 'text-slate-400'}>{n}</span>
              </button>);

          })}
        </div>
      </div>
      <CustomerTable<Survey>
        minWidth={940}
        rows={rows}
        rowKey={(s) => s.id}
        onOpen={(s) => navigate(`/surveys/records/${s.id}`)}
        empty={filter === 'mine' ? 'Nothing is waiting on you.' : 'No surveys match these filters.'}
        columns={[
        {
          label: 'Survey',
          cell: (s) => {
            const ctx = surveyContext(db, s);
            return (
              <span>
                  <span className="block font-semibold text-slate-900">{ctx.name}</span>
                  <span className="block text-[11px] text-slate-500">
                    {s.id} · {s.siteLabel ?? s.address}
                  </span>
                </span>);

          }
        },
        { label: 'Requested service', cell: (s) => <span className="text-[11.5px]">{s.requestedService ?? '—'}{s.requestedBandwidthMbps ? ` · ${s.requestedBandwidthMbps} Mbps` : ''}</span> },
        { label: 'Status', cell: (s) => <StatusBadge status={surveyLabel(s)} /> },
        { label: 'Waiting on', cell: (s) => <span className="text-[11.5px]">{waitingOn(s)}</span> },
        { label: 'Technician', cell: (s) => <span className="text-[11.5px]">{s.technicianName || <span className="text-slate-400">Not assigned</span>}</span> },
        {
          label: 'Key date',
          cell: (s) =>
          <span className="text-[11.5px]">
                {s.status === 'Scheduled' && s.scheduledAt ? `Visit ${formatDhaka(s.scheduledAt)}` : formatDhaka(s.reviewedAt ?? s.completedAt ?? s.startedAt ?? s.requestedAt)}
              </span>

        },
        { label: 'Requested by · branch', cell: (s) => <span className="text-[11.5px]">{s.requestedById ? userName(s.requestedById) : '—'}<span className="block text-slate-500">{branchName(s.branchId)}</span></span> }]
        } />
      
    </section>);

}

function matches(s: Survey, f: Filter, mine: (s: Survey) => boolean): boolean {
  if (f === 'all') return true;
  if (f === 'mine') return mine(s);
  if (f === 'open') return s.status !== 'Approved' && s.status !== 'Not Feasible';
  return s.status === f;
}

function needsMe(db: DemoDatabase, s: Survey, userId: string, role: Parameters<typeof canSuperviseSurveys>[0]): boolean {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  if (canBackOfficeReview(role) && (s.status === 'Submitted' || s.status === 'Back Office Review' && !s.boClearedAt)) return true;
  if (canSuperviseSurveys(role) && (s.status === 'Back Office Review' && !!s.boClearedAt || s.status === 'Submitted for Technical Review' && !isSurveyor(s, user))) return true;
  if (isSurveyor(s, user) && ['Assigned', 'Scheduled', 'In Progress', 'Returned'].includes(s.status)) return true;
  if (role.permissions.includes('manageStock') && s.status === 'Approved') return (s.bom ?? []).some((l) => l.supply === 'IOL stock' && !!l.sku && unreserved(db, s, l) > 0);
  return false;
}