import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { isUnread, moduleLabel, notificationPath, visibleNotifications } from '../../utils/notifications';
import { formatDhaka } from '../../utils/format';
import { secondaryBtn } from '../admin/AdminPanel';
import type { StoredNotification } from '../../types/records';

type Filter = 'unread' | 'high' | 'handover' | 'overdue' | 'all';
const FILTERS: {id: Filter;label: string;test: (n: StoredNotification, uid: string) => boolean;}[] = [
{ id: 'unread', label: 'Unread', test: (n, u) => isUnread(n, u) },
{ id: 'high', label: 'High priority', test: (n) => n.priority === 'High' },
{ id: 'handover', label: 'Handovers', test: (n) => n.kind === 'Handover' },
{ id: 'overdue', label: 'Overdue and reminders', test: (n) => n.kind === 'Overdue' || n.kind === 'Reminder' },
{ id: 'all', label: 'All', test: () => true }];


/** Persistent in-app notifications, grouped by module. Nothing is sent by SMS or email. */
export function NotificationsView() {
  const { db, markNotificationsRead } = useData();
  const { user, role } = useSession();
  const { openRecord } = useRecordDrawer();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('unread');
  const all = useMemo(() => visibleNotifications(db, user, role), [db, user, role]);
  const f = FILTERS.find((x) => x.id === filter)!;
  const list = all.filter((n) => f.test(n, user.id));
  const groups = useMemo(() => {
    const m = new Map<string, StoredNotification[]>();
    list.forEach((n) => m.set(moduleLabel(n), [...(m.get(moduleLabel(n)) ?? []), n]));
    return [...m.entries()];
  }, [list]);
  const unreadInView = list.filter((n) => isUnread(n, user.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filter notifications" className="flex flex-wrap gap-1">
          {FILTERS.map((x) =>
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={filter === x.id}
            onClick={() => setFilter(x.id)}
            className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors duration-150 ${filter === x.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            
              {x.label} <span className="tabular-nums opacity-70">{all.filter((n) => x.test(n, user.id)).length}</span>
            </button>
          )}
        </div>
        <button type="button" className={`${secondaryBtn} ml-auto`} disabled={!unreadInView.length} onClick={() => markNotificationsRead(unreadInView.map((n) => n.id), user.id)}>
          Mark {unreadInView.length || ''} as read
        </button>
      </div>
      <p className="text-[11.5px] text-slate-500">In-app only. No SMS or email is sent. Repeated reminders about the same record are suppressed.</p>
      {groups.map(([label, items]) =>
      <section key={label} className="rounded-md border border-slate-200 bg-white">
          <h2 className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-[12.5px] font-bold text-slate-900">
            {label}
            <span className="text-[11px] font-normal text-slate-500">{items.length}</span>
          </h2>
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
            const u = isUnread(n, user.id);
            return (
              <li key={n.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${u ? n.priority === 'High' ? 'bg-status-critical' : 'bg-primary' : 'bg-slate-200'}`} aria-label={u ? 'Unread' : 'Read'} />
                  <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    markNotificationsRead([n.id], user.id);
                    const p = notificationPath(n);
                    if (p) navigate(p);else
                    openRecord(n.entity);
                  }}>
                  
                    <span className={`block text-[12.5px] ${u ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {n.priority === 'High' && <span className="mr-1 text-status-critical">High ·</span>}
                      {n.title}
                    </span>
                    <span className="block text-[11.5px] text-slate-500">{n.detail}</span>
                    <span className="block text-[10.5px] text-slate-400">
                      {formatDhaka(n.at)}
                      {n.kind ? ` · ${n.kind}` : ''}
                    </span>
                  </button>
                  {u &&
                <button type="button" className="shrink-0 text-[11.5px] font-semibold text-primary hover:text-primary-hover" onClick={() => markNotificationsRead([n.id], user.id)}>
                      Mark read
                    </button>
                }
                </li>);

          })}
          </ul>
        </section>
      )}
      {!list.length && <p className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center text-[12px] text-slate-500">Nothing here.</p>}
    </div>);

}