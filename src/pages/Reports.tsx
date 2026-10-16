import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { DownloadIcon, PrinterIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useReportExport } from '../hooks/useReportExport';
import { canAccessModule } from '../utils/access';
import { demoNow } from '../utils/format';
import { defaultFilters, makeCtx } from '../utils/reports/scope';
import { REPORT_GROUPS, buildGroup, canSeeGroup, primaryGroup } from '../utils/reports';
import { AccessDenied } from '../components/shell/AccessDenied';
import { primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { PrintPreview } from '../components/quotations/PrintPreview';
import { ReportFiltersBar } from '../components/reports/ReportFiltersBar';
import { ReportSectionView } from '../components/reports/ReportSectionView';
import { ReportPrintDocument } from '../components/reports/ReportPrintDocument';
import type { ReportFilters, ReportGroup } from '../types/reports';

export function Reports() {
  const { group } = useParams();
  const { db } = useData();
  const { user, role, branchFilter } = useSession();
  const lockedBranch = user.branch ?? branchFilter;
  const [filters, setFilters] = useState<ReportFilters>(() => defaultFilters(demoNow(), lockedBranch));
  const [printing, setPrinting] = useState(false);
  const { exportCsv, blocked, meta } = useReportExport();

  // Follow the user switcher and top-bar branch filter.
  useEffect(() => setFilters((f) => ({ ...f, branchId: user.branch ?? branchFilter, zoneId: '' })), [user.id, user.branch, branchFilter]);

  const allowed = REPORT_GROUPS.filter((g) => canSeeGroup(role, g.id));
  const g = REPORT_GROUPS.find((x) => x.id === group);
  const dateError = filters.from > filters.to ? 'The start date is after the end date.' : !filters.from || !filters.to ? 'Choose both dates.' : undefined;

  const sections = useMemo(() => {
    if (!g || !canSeeGroup(role, g.id) || dateError) return [];
    return buildGroup(makeCtx(db, filters, user, role, demoNow()), g.id);
  }, [db, filters, user, role, g, dateError]);

  if (!canAccessModule(role, 'reports') || !allowed.length) return <AccessDenied module="reports" />;
  if (!group) return <Navigate to={`/reports/${(primaryGroup(role) && canSeeGroup(role, primaryGroup(role)!) ? primaryGroup(role) : allowed[0].id) as ReportGroup}`} replace />;
  if (!g) return <Navigate to="/reports" replace />;
  if (!canSeeGroup(role, g.id)) return <AccessDenied title={`${g.label} reports are not available for ${role.label}`} module="reports" />;

  const title = `${g.label} reports`;
  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Reports</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">Calculated live from the shared demo records. Billed revenue, verified collected cash and contracted MRC are always reported separately.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} onClick={() => setPrinting(true)} disabled={!!blocked || !!dateError || !sections.length} title={blocked}>
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> Print / PDF
          </button>
          <button type="button" className={primaryBtn} onClick={() => exportCsv(`iol-${g.id}-report`, sections, filters)} disabled={!!blocked || !!dateError} title={blocked}>
            <DownloadIcon className="h-3.5 w-3.5" aria-hidden /> Download for Excel
          </button>
        </div>
      </div>
      {blocked && <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-600">{blocked} You can still view every report you have access to.</p>}

      <nav aria-label="Report groups" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {allowed.map((x) =>
        <NavLink key={x.id} to={`/reports/${x.id}`} className={({ isActive }) => `-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {x.label}
          </NavLink>
        )}
      </nav>

      <ReportFiltersBar value={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters(demoNow(), lockedBranch))} error={dateError} />

      <div className="mt-3 space-y-3">
        {dateError ?
        <p className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center text-[12px] text-slate-500">Fix the dates to see results.</p> :
        sections.length ?
        sections.map((s) => <ReportSectionView key={s.id} section={s} exportBlocked={blocked} onExport={() => exportCsv(`iol-${s.id}`, [s], filters)} />) :

        <p className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center text-[12px] text-slate-500">No reports in this group are visible to your role.</p>
        }
      </div>

      <AnimatePresence>
        {printing &&
        <PrintPreview key="p" title={title} note="Use your browser’s Print dialog and choose “Save as PDF” for a PDF." onClose={() => setPrinting(false)}>
            <ReportPrintDocument title={title} meta={meta(filters)} sections={sections} />
          </PrintPreview>
        }
      </AnimatePresence>
    </div>);

}