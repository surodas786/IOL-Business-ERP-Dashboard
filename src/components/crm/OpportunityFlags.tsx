import React from 'react';
import { AlarmClockIcon, CalendarClockIcon, CopyIcon, HourglassIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { extensionCount, opportunityFlags } from '../../utils/crmRules';
import type { Opportunity } from '../../types/records';

interface OpportunityFlagsProps {
  opportunity: Opportunity;
  compact?: boolean;
}

/** Overdue follow-up, stale, repeated closing-date extension and duplicate review flags. */
export function OpportunityFlags({ opportunity, compact = false }: OpportunityFlagsProps) {
  const { db } = useData();
  const f = opportunityFlags(db, opportunity);
  const items = [
  f.overdueFollowUp && { key: 'od', icon: AlarmClockIcon, label: 'Follow-up overdue', cls: 'bg-rose-50 text-status-critical ring-rose-200' },
  f.stale && { key: 'st', icon: HourglassIcon, label: 'Stale', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
  f.repeatedExtensions && { key: 'ex', icon: CalendarClockIcon, label: `Closing date extended ${extensionCount(opportunity)}×`, cls: 'bg-amber-50 text-status-warning ring-amber-200' },
  f.duplicateReview && { key: 'dp', icon: CopyIcon, label: 'Duplicate review', cls: 'bg-blue-50 text-status-info ring-blue-200' }].
  filter(Boolean) as {key: string;icon: typeof AlarmClockIcon;label: string;cls: string;}[];

  if (!items.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map(({ key, icon: Icon, label, cls }) =>
      <span key={key} title={label} className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-px text-[10px] font-semibold ring-1 ring-inset ${cls}`}>
          <Icon className="h-3 w-3" aria-hidden />
          {compact ? <span className="sr-only">{label}</span> : label}
        </span>
      )}
    </span>);

}