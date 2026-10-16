import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { hasPermission, inUserScope } from '../../utils/access';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { branchName, userName } from '../../utils/relations';
import { checklistGaps, currentVersion, quoteName, quoteNextStep, releaseChecklist, seesQuoteMoney } from '../../utils/quoteRules';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import { inputClass } from '../admin/FormField';
import { primaryBtn } from '../admin/AdminPanel';
import { NewQuotationDialog } from './NewQuotationDialog';
import type { Quotation } from '../../types/records';

type Filter = 'open' | 'approval' | 'release' | 'released' | 'closed' | 'all';

const FILTERS: {id: Filter;label: string;test: (q: Quotation, ready: boolean) => boolean;}[] = [
{ id: 'open', label: 'Open', test: (q) => !q.workOrderId && q.status !== 'Cancelled' },
{ id: 'approval', label: 'Awaiting approval', test: (q) => q.status === 'Pending Approval' },
{ id: 'release', label: 'Approved — not released', test: (q) => q.status === 'Approved' && !q.workOrderId },
{ id: 'released', label: 'Released', test: (q) => !!q.workOrderId },
{ id: 'closed', label: 'Cancelled or rejected', test: (q) => q.status === 'Cancelled' || q.status === 'Rejected' },
{ id: 'all', label: 'All', test: () => true }];


export function QuoteList() {
  const { db } = useData();
  const { user, role, branchFilter, zoneFilter } = useSession();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const money = seesQuoteMoney(role);

  const scoped = useMemo(
    () => db.quotations.filter((q) => q.versions?.length && inUserScope(user, q.branchId) && (branchFilter === 'all' || q.branchId === branchFilter) && (zoneFilter === 'all' || q.zoneId === zoneFilter)),
    [db.quotations, user, branchFilter, zoneFilter]
  );
  const ready = (q: Quotation) => q.status === 'Approved' && !q.workOrderId && checklistGaps(releaseChecklist(db, q)).length === 0;
  const f = FILTERS.find((x) => x.id === filter)!;
  const rows = scoped.
  filter((q) => f.test(q, ready(q))).
  filter((q) => {
    const s = query.trim().toLowerCase();
    if (!s) return true;
    const opp = db.opportunities.find((o) => o.id === q.opportunityId);
    const lead = db.leads.find((l) => l.id === opp?.leadId);
    return [q.id, quoteName(db, q), lead?.companyBn ?? '', currentVersion(q)?.terms.siteAddress ?? ''].join(' ').toLowerCase().includes(s);
  }).
  sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="relative max-w-md">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input aria-label="Search quotations" placeholder="Quotation ID, organisation or site…" className={`${inputClass} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div role="group" aria-label="Filter quotations" className="flex flex-wrap gap-1">
            {FILTERS.map((x) =>
            <button
              key={x.id}
              type="button"
              aria-pressed={filter === x.id}
              onClick={() => setFilter(x.id)}
              className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${filter === x.id ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              
                {x.label} <span className={filter === x.id ? 'text-white/70' : 'text-slate-400'}>{scoped.filter((q) => x.test(q, ready(q))).length}</span>
              </button>
            )}
          </div>
        </div>
        {hasPermission(role, 'createQuotation') &&
        <button type="button" className={primaryBtn} onClick={() => setCreating(true)}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> New quotation
          </button>
        }
      </div>
      <CustomerTable<Quotation>
        minWidth={920}
        rows={rows}
        rowKey={(q) => q.id}
        onOpen={(q) => navigate(`/quotations/records/${q.id}`)}
        empty="No quotations match these filters."
        columns={[
        {
          label: 'Quotation',
          cell: (q) =>
          <span>
                <span className="block font-semibold text-slate-900">{quoteName(db, q)}</span>
                <span className="block text-[11px] text-slate-500">
                  {q.id} · v{q.version} · {currentVersion(q)?.terms.siteName}
                </span>
              </span>

        },
        { label: 'Service', cell: (q) => <span className="text-[11.5px]">{currentVersion(q)?.terms.serviceType} · {currentVersion(q)?.terms.bandwidthMbps} Mbps</span> },
        ...(money ? [{ label: 'MRC', align: 'right' as const, cell: (q: Quotation) => formatBDT(q.mrc) }, { label: 'OTC', align: 'right' as const, cell: (q: Quotation) => formatBDT(q.otc) }] : []),
        { label: 'Status', cell: (q) => <StatusBadge status={q.workOrderId ? 'Released' : q.status} /> },
        { label: 'Next step', cell: (q) => <span className={`text-[11.5px] ${ready(q) ? 'font-semibold text-status-ok' : ''}`}>{quoteNextStep(db, q)}</span> },
        { label: 'Valid until', cell: (q) => <span className="text-[11.5px]">{q.validUntil ? formatDhakaDate(q.validUntil) : '—'}</span> },
        { label: 'Prepared by · branch', cell: (q) => <span className="text-[11.5px]">{userName(q.preparedById)}<span className="block text-slate-500">{branchName(q.branchId)}</span></span> }]
        } />
      
      <AnimatePresence>{creating && <NewQuotationDialog key="new" onClose={() => setCreating(false)} />}</AnimatePresence>
    </section>);

}