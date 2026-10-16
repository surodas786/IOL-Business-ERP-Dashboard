import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ClockIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { canOpenRecord } from '../../utils/access';
import { formatDhaka, relativeAge } from '../../utils/format';
import { WorkItemActions } from '../records/WorkItemActions';
import type { Severity } from '../../types/erp';
import type { WorkItem } from '../../utils/workItems';

type KindFilter = 'all' | 'task' | 'bottleneck';

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, neutral: 3 };
const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-status-critical',
  warning: 'bg-amber-500',
  info: 'bg-status-info',
  neutral: 'bg-status-neutral'
};
const FILTERS: {id: KindFilter;label: string;}[] = [
{ id: 'all', label: 'All' },
{ id: 'task', label: 'Tasks' },
{ id: 'bottleneck', label: 'Bottlenecks' }];


interface TodayPanelProps {
  items: WorkItem[];
}

export function TodayPanel({ items }: TodayPanelProps) {
  const { db } = useData();
  const { user, role } = useSession();
  const { openRecord } = useRecordDrawer();
  const [kind, setKind] = useState<KindFilter>('all');

  const sorted = useMemo(
    () => [...items].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.timestamp.localeCompare(b.timestamp)),
    [items]
  );
  const shown = sorted.filter((i) => kind === 'all' || i.kind === kind);
  const approvalsPath = role.modules.includes('approvals') ? '/approvals' : null;

  const openItem = (item: WorkItem) => {
    const target = item.subject && canOpenRecord(db, item.subject, user, role) ? item.subject : item.entity;
    openRecord(target);
  };

  return (
    <section aria-labelledby="today-title" className="flex min-w-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5">
        <div>
          <h2 id="today-title" className="text-[13px] font-bold text-slate-900">
            Today <span className="ml-1 font-semibold text-slate-400">{items.length} open</span>
          </h2>
          <p className="mt-px text-[10.5px] text-slate-400">15 Oct 2026 · Asia/Dhaka</p>
        </div>
        {approvalsPath &&
        <Link to={approvalsPath} className="text-[11.5px] font-semibold text-primary hover:text-primary-hover">
            View all →
          </Link>
        }
      </div>
      <div role="tablist" aria-label="Filter today items" className="flex gap-1 border-b border-slate-100 px-3.5 py-1.5">
        {FILTERS.map((f) =>
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={kind === f.id}
          onClick={() => setKind(f.id)}
          className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors duration-150 ${
          kind === f.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`
          }>
          
            {f.label}
          </button>
        )}
      </div>
      <ul className="flex-1">
        {shown.length === 0 && <li className="px-3.5 py-6 text-center text-[12px] text-slate-500">Nothing needs your attention here today.</li>}
        <AnimatePresence initial={false}>
          {shown.map((item) =>
          <motion.li
            key={item.id}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-start gap-2 overflow-hidden border-b border-slate-100 px-3.5 py-[9px] last:border-b-0">
            
              <span className={`mt-[5px] h-[7px] w-[7px] flex-shrink-0 rounded-full ${SEVERITY_DOT[item.severity]}`} aria-label={`${item.severity} ${item.kind}`} />
              <div className="min-w-0 flex-1">
                <button
                type="button"
                onClick={() => openItem(item)}
                className="mb-0.5 block text-left text-[11.8px] font-semibold leading-snug text-slate-900 hover:text-primary">
                
                  {item.title}
                </button>
                <p className="text-[10.5px] leading-snug text-slate-500">{item.detail}</p>
                <p className="mt-[3px] flex items-center gap-1 text-[9.5px] text-slate-400">
                  <ClockIcon className="h-2.5 w-2.5" aria-hidden />
                  {item.timeLabel} {formatDhaka(item.timestamp)} · {relativeAge(item.timestamp)}
                </p>
                <div className="mt-1.5">
                  <WorkItemActions item={item} />
                </div>
              </div>
            </motion.li>
          )}
        </AnimatePresence>
      </ul>
    </section>);

}