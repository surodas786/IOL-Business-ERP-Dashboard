import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';
import type { InstallationJob } from '../types/records';

/** Installation jobs in the user's scope and the top-bar branch/zone filters. Cancelled jobs are excluded unless asked for. */
export function useScopedJobs(includeCancelled = false): InstallationJob[] {
  const { db } = useData();
  const { user, branchFilter, zoneFilter } = useSession();
  return useMemo(
    () =>
    db.installationJobs.
    filter((j) => (includeCancelled || j.status !== 'Cancelled') && inUserScope(user, j.branchId) && (branchFilter === 'all' || j.branchId === branchFilter) && (zoneFilter === 'all' || j.zoneId === zoneFilter)).
    sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [db.installationJobs, user, branchFilter, zoneFilter, includeCancelled]
  );
}