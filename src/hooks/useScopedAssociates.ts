import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';

/** Associates and settlements inside the user's scope and the top-bar branch filter. */
export function useScopedAssociates() {
  const { db } = useData();
  const { user, branchFilter } = useSession();
  const associates = db.associates.filter((a) => inUserScope(user, a.branchId) && (branchFilter === 'all' || a.branchId === branchFilter));
  const ids = new Set(associates.map((a) => a.id));
  const settlements = db.associateSettlements.filter((s) => ids.has(s.associateId));
  return { associates, settlements };
}