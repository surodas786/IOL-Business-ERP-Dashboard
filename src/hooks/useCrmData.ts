import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';
import type { BranchId } from '../types/erp';
import type { Lead, Opportunity } from '../types/records';

export type OwnerScope = 'all' | 'mine';

export interface CrmFilters {
  owner: OwnerScope;
  query: string;
}

/** Sales CRM records inside the active account's scope and the top-bar branch/zone filters. */
export function useCrmData({ owner, query }: CrmFilters) {
  const { db } = useData();
  const { user, branchFilter, zoneFilter } = useSession();

  return useMemo(() => {
    const leadById = new Map<string, Lead>(db.leads.map((l) => [l.id, l]));
    const inFilter = (r: {branchId: BranchId;zoneId: string;}) =>
    inUserScope(user, r.branchId) && (branchFilter === 'all' || r.branchId === branchFilter) && (zoneFilter === 'all' || r.zoneId === zoneFilter);
    const q = query.trim().toLowerCase();
    const matches = (o: Opportunity) => {
      if (!q) return true;
      const l = leadById.get(o.leadId);
      return [o.id, o.title, l?.company, l?.companyBn, l?.contactName, l?.contactPhone].some((v) => v?.toLowerCase().includes(q));
    };

    const opportunities = db.opportunities.filter((o) => inFilter(o) && (owner === 'all' || o.ownerId === user.id) && matches(o));
    const oppIds = new Set(opportunities.map((o) => o.id));
    const leads = db.leads.filter((l) => {
      if (!inFilter(l)) return false;
      if (owner === 'mine' && l.ownerId !== user.id) return false;
      if (!q) return true;
      return [l.id, l.company, l.companyBn, l.contactName, l.contactPhone, l.contactEmail].some((v) => v.toLowerCase().includes(q));
    });
    const tenders = db.tenders.filter((t) => oppIds.has(t.opportunityId));
    const conflicts = db.crmConflicts.filter((c) => db.opportunities.some((o) => o.id === c.opportunityId && inFilter(o)));

    return { db, opportunities, leads, tenders, conflicts, leadOf: (o: Opportunity) => leadById.get(o.leadId)! };
  }, [db, user, branchFilter, zoneFilter, owner, query]);
}