import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';
import type { ServiceChange } from '../types/records';

/** Service changes within the user's branch scope and the top-bar branch/zone filters, newest first. */
export function useScopedChanges(): ServiceChange[] {
  const { db } = useData();
  const { user, branchFilter, zoneFilter } = useSession();
  return useMemo(
    () =>
    db.serviceChanges.
    filter((s) => inUserScope(user, s.branchId) && (branchFilter === 'all' || s.branchId === branchFilter) && (zoneFilter === 'all' || s.zoneId === zoneFilter)).
    sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [db.serviceChanges, user, branchFilter, zoneFilter]
  );
}