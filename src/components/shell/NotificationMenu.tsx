import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BellIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { useDismiss } from '../../hooks/useDismiss';
import { isUnread, moduleLabel, notificationPath, visibleNotifications } from '../../utils/notifications';
import { formatDhaka } from '../../utils/format';
import { Popover } from './Popover';
import type { StoredNotification } from '../../types/records';

const SHOWN = 12;

/** In-app only — no SMS or email is ever sent. */
export function NotificationMenu() {
  const { db, markNotificationsRead } = useData();
  const { user, role } = useSession();
  const { openRecord } = useRecordDrawer();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const visible = useMemo(() => visibleNotifications(db, user, role), [db, user, role]);
  const unread = visible.filter((n) => isUnread(n, user.id));
  const highUnread = unread.filter((n) => n.priority === 'High').length;

  const groups = useMemo(() => {
    const map = new Map<string, StoredNotification[]>();
    visible.slice(0, SHOWN).forEach((n) => {
      const k = moduleLabel(n);
      map.set(k, [...(map.get(k) ?? []), n]);
    });
    return [...map.entries()];
  }, [visible]);

  const go = (n: StoredNotification) => {
    markNotificationsRead([n.id], user.id);
    const path = notificationPath(n);
    if (path) navigate(path);else
    openRecord(n.entity);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications, ${unread.length} unread${highUnread ? `, ${highUnread} high priority` : ''}`}
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:bg-slate-50">
        
        <BellIcon className="h-4 w-4" aria-hidden />
        {unread.length > 0 &&
        <span className={`absolute -right-[5px] -top-[5px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white px-[3px] text-[9px] font-bold text-white ${highUnread ? 'bg-status-critical' : 'bg-slate-700'}`}>
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        }
      </button>
      <AnimatePresence>
        {open &&
        <Popover className="right-0 top-10 w-[min(380px,calc(100vw-24px))]">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-[12.5px] font-bold text-slate-900">
                Notifications <span className="font-normal text-slate-500">· {unread.length} unread</span>
              </p>
              <button
              type="button"
              disabled={!unread.length}
              onClick={() => markNotificationsRead(unread.map((n) => n.id), user.id)}
              className="text-[11.5px] font-semibold text-primary disabled:text-slate-300">
              
                Mark all as read
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {visible.length === 0 && <p className="px-3 py-4 text-[12px] text-slate-500">No notifications for this account.</p>}
              {groups.map(([label, list]) =>
            <section key={label} aria-label={label}>
                  <h3 className="bg-slate-50 px-3 py-1 text-[10.5px] font-semibold text-slate-500">{label}</h3>
                  <ul>
                    {list.map((n) => {
                  const u = isUnread(n, user.id);
                  return (
                    <li key={n.id} className="border-b border-slate-100 last:border-b-0">
                          <button type="button" onClick={() => go(n)} className="flex w-full gap-2.5 px-3 py-2 text-left transition-colors duration-100 hover:bg-slate-50">
                            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${u ? n.priority === 'High' ? 'bg-status-critical' : 'bg-primary' : 'bg-transparent'}`} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className={`block text-[12px] leading-snug ${u ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                                {n.priority === 'High' && <span className="mr-1 text-status-critical">High ·</span>}
                                {n.title}
                              </span>
                              <span className="block text-[11px] text-slate-500">{n.detail}</span>
                              <span className="mt-0.5 block text-[10px] text-slate-400">
                                {formatDhaka(n.at)}
                                {n.kind ? ` · ${n.kind}` : ''}
                              </span>
                            </span>
                          </button>
                        </li>);

                })}
                  </ul>
                </section>
            )}
            </div>
            {role.modules.includes('approvals') &&
          <Link to="/approvals/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-3 py-2 text-center text-[12px] font-semibold text-primary hover:text-primary-hover">
                View all {visible.length} notifications
              </Link>
          }
          </Popover>
        }
      </AnimatePresence>
    </div>);

}