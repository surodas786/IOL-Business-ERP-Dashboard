import React from 'react';
import { LockIcon, RotateCcwIcon } from 'lucide-react';
import { branches } from '../../data/branches';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { zonesForArea } from '../../utils/reports/scope';
import { CUSTOMER_PROFILE_CATEGORIES } from '../../types/customer';
import { inputClass } from '../admin/FormField';
import type { ReportFilters } from '../../types/reports';
import type { BranchId } from '../../types/erp';

/** Filters are limited to what the user is authorised to see: a branch-bound user cannot pick another branch. */
export function ReportFiltersBar({ value, onChange, onReset, error }: {value: ReportFilters;onChange: (f: ReportFilters) => void;onReset: () => void;error?: string;}) {
  const { db } = useData();
  const { user, canChangeBranch } = useSession();
  const set = <K extends keyof ReportFilters,>(k: K, v: ReportFilters[K]) => onChange({ ...value, [k]: v });
  const divisions = db.adminAreas.filter((a) => a.level === 'Division');
  const districts = db.adminAreas.filter((a) => a.level === 'District' && (!value.division || a.parentId === value.division));
  const geo = value.district || value.division ? zonesForArea(db, value.district || value.division) : null;
  const zones = db.operationalZones.filter((z) => z.status === 'Active' && (value.branchId === 'all' || z.branchId === value.branchId) && (!user.branch || z.branchId === user.branch) && (!geo || geo.has(z.id)) && (user.scopeType !== 'zones' || !user.zoneIds.length || user.zoneIds.includes(z.id)));
  const owners = db.users.filter((u) => u.status === 'Active' && (!user.branch || u.branch === user.branch || u.branch === null) && ['salesExecutive', 'accountManager', 'businessHead', 'technicalSupervisor', 'fieldTechnician'].includes(u.role));
  const field = (id: string, label: string, el: React.ReactNode) =>
  <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold text-slate-500">{label}</span>
      {el}
    </label>;

  const sel = `${inputClass} h-8 py-0 text-[12px]`;

  return (
    <section aria-label="Report filters" className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        {field('rf-from', 'From', <input id="rf-from" type="date" className={sel} value={value.from} max={value.to} onChange={(e) => set('from', e.target.value)} />)}
        {field('rf-to', 'To', <input id="rf-to" type="date" className={sel} value={value.to} min={value.from} onChange={(e) => set('to', e.target.value)} />)}
        {field('rf-div', 'Division',
        <select id="rf-div" className={sel} value={value.division} onChange={(e) => onChange({ ...value, division: e.target.value, district: '', zoneId: '' })}>
            <option value="">All</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {field('rf-dis', 'District',
        <select id="rf-dis" className={sel} value={value.district} onChange={(e) => onChange({ ...value, district: e.target.value, zoneId: '' })}>
            <option value="">All</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {field('rf-br', 'Branch', canChangeBranch ?
        <select id="rf-br" className={sel} value={value.branchId} onChange={(e) => onChange({ ...value, branchId: e.target.value as BranchId | 'all', zoneId: '' })}>
            <option value="all">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select> :

        <span id="rf-br" className={`${sel} flex items-center gap-1.5 bg-slate-50 text-slate-600`} title="Limited to your assigned branch">
            <LockIcon className="h-3 w-3" aria-hidden /> {branches.find((b) => b.id === user.branch)?.name ?? 'All branches'}
          </span>
        )}
        {field('rf-zone', 'Zone',
        <select id="rf-zone" className={sel} value={value.zoneId} onChange={(e) => set('zoneId', e.target.value)}>
            <option value="">All</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        )}
        {field('rf-cat', 'Customer category',
        <select id="rf-cat" className={sel} value={value.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">All</option>
            {CUSTOMER_PROFILE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
        {field('rf-own', 'Owner',
        <select id="rf-own" className={sel} value={value.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
            <option value="">Anyone</option>
            {owners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[11px] ${error ? 'font-semibold text-status-critical' : 'text-slate-500'}`} role={error ? 'alert' : undefined}>
          {error ?? 'Dates apply to period measures. Snapshot measures (balances, active services, pipeline) are as of today. Category and owner apply where a record carries them.'}
        </p>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:text-primary-hover">
          <RotateCcwIcon className="h-3 w-3" aria-hidden /> Reset filters
        </button>
      </div>
    </section>);

}