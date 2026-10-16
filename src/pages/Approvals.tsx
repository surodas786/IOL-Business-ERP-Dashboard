import React, { useMemo } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule } from '../utils/access';
import { canSeeItem, centreItems, decideBlock, isOverdue } from '../utils/approvalCentre';
import { isUnread, visibleNotifications } from '../utils/notifications';
import { demoNow } from '../utils/format';
import { AccessDenied } from '../components/shell/AccessDenied';
import { ApprovalQueue } from '../components/approvals/ApprovalQueue';
import { NotificationsView } from '../components/approvals/NotificationsView';
import { ActivityHistory } from '../components/approvals/ActivityHistory';

const VIEWS = [
{ id: 'inbox', label: 'Needs my decision' },
{ id: 'mine', label: 'My requests' },
{ id: 'all', label: 'All approvals' },
{ id: 'notifications', label: 'Notifications' },
{ id: 'activity', label: 'Activity history' }] as
const;
type ViewId = (typeof VIEWS)[number]['id'];

export function Approvals() {
  const { view } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const counts = useMemo(() => {
    const items = centreItems(db).filter((i) => canSeeItem(db, i, user, role));
    const inbox = items.filter((i) => i.status === 'Pending' && !decideBlock(db, i, user, role));
    return {
      inbox: inbox.length,
      overdue: inbox.filter((i) => isOverdue(i, demoNow())).length,
      mine: items.filter((i) => i.requestedById === user.id && (i.status === 'Pending' || i.status === 'Returned')).length,
      returned: items.filter((i) => i.requestedById === user.id && i.status === 'Returned').length,
      unread: visibleNotifications(db, user, role).filter((n) => isUnread(n, user.id)).length
    };
  }, [db, user, role]);

  if (!canAccessModule(role, 'approvals')) return <AccessDenied module="approvals" />;
  if (!view) return <Navigate to={counts.inbox || !counts.mine ? '/approvals/inbox' : '/approvals/mine'} replace />;
  if (!VIEWS.some((v) => v.id === view)) return <Navigate to="/approvals/inbox" replace />;
  const v = view as ViewId;
  const badge: Partial<Record<ViewId, number>> = { inbox: counts.inbox, mine: counts.mine, notifications: counts.unread };

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">Approvals and Tasks</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {counts.inbox} waiting for you{counts.overdue ? ` · ${counts.overdue} overdue` : ''}
          {counts.returned ? ` · ${counts.returned} of your requests returned for more information` : ''}
        </p>
      </div>
      <nav aria-label="Approvals views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {VIEWS.map((x) =>
        <NavLink
          key={x.id}
          to={`/approvals/${x.id}`}
          className={({ isActive }) => `-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[12.5px] font-semibold transition-colors duration-150 ${isActive ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          
            {x.label}
            {!!badge[x.id] && <span className="rounded bg-slate-100 px-1.5 text-[10.5px] tabular-nums text-slate-600">{badge[x.id]}</span>}
          </NavLink>
        )}
      </nav>
      {(v === 'inbox' || v === 'mine' || v === 'all') && <ApprovalQueue key={v} mode={v} />}
      {v === 'notifications' && <NotificationsView />}
      {v === 'activity' && <ActivityHistory />}
    </div>);

}