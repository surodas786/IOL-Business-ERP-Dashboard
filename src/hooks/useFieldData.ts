import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';
import { canSeeClaimOf, canSeeVisitsOf, isFieldRole } from '../utils/fieldRules';
import type { BranchId } from '../types/erp';

/** Field visits, claims and field staff the active account may see, within the top-bar filters. */
export function useFieldData() {
  const { db } = useData();
  const { user, role, branchFilter, zoneFilter } = useSession();

  return useMemo(() => {
    const inFilter = (r: {branchId: BranchId;zoneId?: string;}) =>
    inUserScope(user, r.branchId) && (branchFilter === 'all' || r.branchId === branchFilter) && (zoneFilter === 'all' || !r.zoneId || r.zoneId === zoneFilter);
    const visits = db.fieldVisits.filter((v) => inFilter(v) && canSeeVisitsOf(user, role, v.userId, db)).sort((a, b) => b.at.localeCompare(a.at));
    const claims = db.expenseClaims.
    filter((c) => inFilter(c) && canSeeClaimOf(user, role, c.claimantId, db))
    // Drafts stay private to the claimant.
    .filter((c) => c.status !== 'Draft' || c.claimantId === user.id).
    sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
    const people = db.users.filter((u) => u.status === 'Active' && isFieldRole(u) && canSeeVisitsOf(user, role, u.id, db) && inUserScope(user, u.branch ?? u.stationBranchId) && (branchFilter === 'all' || (u.branch ?? u.stationBranchId) === branchFilter));
    return { db, user, role, visits, claims, people };
  }, [db, user, role, branchFilter, zoneFilter]);
}