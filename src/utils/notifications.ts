import { canAccessModule, isVisibleTo } from './access';
import { navItems } from '../data/navigation';
import type { DemoUser, Role } from '../types/erp';
import type { DemoDatabase, StoredNotification } from '../types/records';

export function visibleNotifications(db: DemoDatabase, user: DemoUser, role: Role): StoredNotification[] {
  return db.notifications.
  filter((n) => n.forUserIds ? n.forUserIds.includes(user.id) && canAccessModule(role, n.module) : isVisibleTo(n, user, role)).
  sort((a, b) => {
    const pa = a.priority === 'High' ? 0 : 1;
    const pb = b.priority === 'High' ? 0 : 1;
    const ua = Number(a.readBy.includes(user.id));
    const ub = Number(b.readBy.includes(user.id));
    return ua - ub || pa - pb || b.at.localeCompare(a.at);
  });
}

export const isUnread = (n: StoredNotification, userId: string) => !n.readBy.includes(userId);

export const moduleLabel = (n: StoredNotification) => navItems.find((m) => m.id === n.module)?.label ?? 'General';

/** Deep link to the page that owns the record. Returns undefined to fall back to the record drawer. */
export function notificationPath(n: StoredNotification): string | undefined {
  const { type, id } = n.entity;
  switch (type) {
    case 'approval':
      return `/approvals/all?item=approval:${id}`;
    case 'expenseClaim':
      return `/approvals/all?item=claim:${id}`;
    case 'opsExpense':
      return id.startsWith('RP-') ? '/operational-finance/recurring' : `/operational-finance/register?id=${id}`;
    case 'ticket':
      return `/support-tickets/records/${id}`;
    case 'serviceChange':
      return `/service-changes/records/${id}`;
    case 'quotation':
      return `/quotations/records/${id}`;
    case 'workOrder':
      return `/quotations/wo/${id}`;
    case 'customer':
      return `/customers/${id}`;
    case 'opportunity':
      return `/sales-crm/opportunities/${id}`;
    case 'installationJob':
      return `/installations/jobs/${id}`;
    case 'invoice':
      return `/billing/invoice/${id}`;
    case 'associate':
      return `/associates/records/${id}`;
    case 'salesAgent':
      return `/sales-agents/records/${id}`;
    default:
      return undefined;
  }
}