import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { canAccessModule } from '../../utils/access';
import { demoNow } from '../../utils/format';
import { formatCell } from '../../utils/reports/export';
import { defaultFilters, makeCtx } from '../../utils/reports/scope';
import { REPORT_GROUPS, buildGroup, canSeeGroup, primaryGroup } from '../../utils/reports';
import { InfoTip } from '../reports/InfoTip';

const TONE = { critical: 'text-status-critical', warning: 'text-status-warning', ok: 'text-status-ok' } as const;

/** The role's headline measures, computed from the same shared records as the Reports centre (last 90 days). */
export function RoleHighlights() {
  const { db } = useData();
  const { user, role, branchFilter } = useSession();
  const group = primaryGroup(role);
  const sections = useMemo(() => {
    if (!group || !canSeeGroup(role, group)) return [];
    const now = demoNow();
    return buildGroup(makeCtx(db, defaultFilters(now, user.branch ?? branchFilter), user, role, now), group);
  }, [db, user, role, branchFilter, group]);
  if (!group || !sections.length) return null;
  const label = REPORT_GROUPS.find((g) => g.id === group)!.label;
  const kpis = sections.flatMap((s) => s.kpis.slice(0, s.id === 'position' ? 5 : 1).map((k) => ({ ...k, section: s }))).slice(0, 6);
  const link = canAccessModule(role, 'reports');

  return (
    <section aria-labelledby="role-highlights" className="mb-3.5 rounded-md border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 id="role-highlights" className="text-[13px] font-bold text-slate-900">
          {label} highlights <span className="font-normal text-slate-500">· last 90 days, snapshots as of today</span>
        </h2>
        {link &&
        <Link to={`/reports/${group}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary-hover">
            Open {label.toLowerCase()} reports <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      </header>
      <dl className="grid grid-cols-2 divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {kpis.map((k) =>
        <div key={`${k.section.id}-${k.label}`} className="px-4 py-3">
            <dt className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-500">
              <span className="truncate">{k.label}</span>
              {k.tip && <InfoTip text={k.tip} label={`Definition of ${k.label}`} />}
            </dt>
            <dd className={`text-[18px] font-bold tabular-nums ${k.tone && k.value ? TONE[k.tone] : 'text-slate-900'}`}>{formatCell(k.value, k.kind)}</dd>
            <p className="truncate text-[10.5px] text-slate-500">{k.note ?? k.section.title}</p>
          </div>
        )}
      </dl>
    </section>);

}