import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';
import { hasPermission } from '../utils/access';

/** Tickets inside the user's scope and the top-bar branch filter. Field technicians see only their own. */
export function useScopedTickets() {
  const { db } = useData();
  const { user, role, branchFilter } = useSession();
  const techOnly = hasPermission(role, 'technicalConfig') && !hasPermission(role, 'assignTickets');
  return db.tickets.filter((t) => inUserScope(user, t.branchId) && (branchFilter === 'all' || t.branchId === branchFilter) && (!techOnly || t.assigneeName === user.name));
}