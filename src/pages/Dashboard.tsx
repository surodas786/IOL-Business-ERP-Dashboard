import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DownloadIcon, PlusIcon } from 'lucide-react';
import { branches } from '../data/branches';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useWorkItems } from '../hooks/useWorkItems';
import { BranchComparisonTable } from '../components/dashboard/BranchComparisonTable';
import { TodayPanel } from '../components/dashboard/TodayPanel';
import { RoleHighlights } from '../components/dashboard/RoleHighlights';
import { hasPermission } from '../utils/access';
import { TZ_LABEL, demoNow, formatDhaka } from '../utils/format';
import { METRIC_COLUMNS, buildComparison, liveZoneMetrics, type MetricColumn } from '../utils/metrics';
import type { BranchId } from '../types/erp';

export function Dashboard() {
  const { db } = useData();
  const { role, branchFilter, setBranchFilter, zoneFilter, canChangeBranch } = useSession();
  const { visible } = useWorkItems();
  const navigate = useNavigate();

  const showFinancials = hasPermission(role, 'viewFinancials');
  const showPipeline = hasPermission(role, 'viewPipeline');
  const commercial = showFinancials || showPipeline;

  const columns: MetricColumn[] = commercial ?
  [
  ...(showFinancials ? [METRIC_COLUMNS.mrc, METRIC_COLUMNS.billed, METRIC_COLUMNS.collected] : []),
  ...(showPipeline ? [METRIC_COLUMNS.pipeline] : [])] :

  [METRIC_COLUMNS.activeLinks, METRIC_COLUMNS.installsOpen, METRIC_COLUMNS.ticketsOpen];

  const zones = useMemo(() => liveZoneMetrics(db, visible), [db, visible]);
  const { level, rows, total } = useMemo(() => buildComparison(zones, branchFilter, zoneFilter), [zones, branchFilter, zoneFilter]);
  const todayItems = useMemo(
    () =>
    visible.filter(
      (i) =>
      (branchFilter === 'all' || i.branchId === null || i.branchId === branchFilter) && (
      zoneFilter === 'all' || !i.zoneId || i.zoneId === zoneFilter)
    ),
    [visible, branchFilter, zoneFilter]
  );

  const branch = branches.find((b) => b.id === branchFilter);
  const zone = branch?.zones.find((z) => z.id === zoneFilter);
  const scopeLabel = branch ? `${branch.name} · ${zone ? zone.name : 'All zones'}` : 'All branches · All zones';

  const exportCsv = () => {
    const header = [level === 'branch' ? 'Branch' : 'Zone', ...columns.map((c) => c.label), 'Open Tasks'];
    const lines = [...rows, total].map((r) => [r.label, ...columns.map((c) => r.values[c.key]), r.openTasks]);
    const csv = ['# Fictional demo data — IOL Business ERP', [header, ...lines].map((l) => l.map((v) => `"${v}"`).join(',')).join('\n')].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `iol-${level}-summary-2026-10.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="px-4 pb-6 pt-4 lg:px-5">
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {role.label} overview · {scopeLabel}
          </p>
        </div>
        <div className="flex gap-2">
          {hasPermission(role, 'exportReports') &&
          <button
            type="button"
            onClick={exportCsv}
            className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50">
            
              <DownloadIcon className="h-3.5 w-3.5" aria-hidden />
              Export summary
            </button>
          }
          {hasPermission(role, 'createQuotation') &&
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover">
            
              <PlusIcon className="h-3.5 w-3.5" aria-hidden />
              New quotation
            </button>
          }
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span>
          Data as of {formatDhaka(demoNow(), { year: true })} {TZ_LABEL}
        </span>
        <span>Period: October 2026</span>
        <span className="font-semibold text-status-warning">Fictional demo data</span>
        {!showFinancials && <span>Billing, margin and commission figures are not shown for this role</span>}
      </div>

      <RoleHighlights />

      <div className="grid gap-3.5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <BranchComparisonTable
            title={level === 'branch' ? commercial ? 'Branch performance comparison' : 'Branch operations comparison' : `${branch?.name} zones`}
            subtitle={[...columns.map((c) => c.label), 'Open tasks'].join(' · ')}
            columns={columns}
            rows={rows}
            total={total}
            firstColumnLabel={level === 'branch' ? 'Branch' : 'Zone'}
            onDrillIn={level === 'branch' && canChangeBranch ? (id) => setBranchFilter(id as BranchId) : undefined}
            onBack={level === 'zone' && canChangeBranch ? () => setBranchFilter('all') : undefined}
            footnote={level === 'branch' && canChangeBranch ? 'Select a branch to see its zones' : undefined} />
          
        </div>
        <TodayPanel items={todayItems} />
      </div>
    </div>);

}