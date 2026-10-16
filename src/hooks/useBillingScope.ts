import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';
import type { BranchId } from '../types/erp';

/** Billing records within the user's branch scope and the top-bar branch/zone filters. */
export function useBillingScope() {
  const { db } = useData();
  const { user, branchFilter, zoneFilter } = useSession();
  return useMemo(() => {
    const inScope = (r: {branchId: BranchId | null;zoneId?: string;}) =>
    inUserScope(user, r.branchId) && (branchFilter === 'all' || r.branchId === branchFilter) && (zoneFilter === 'all' || r.zoneId === zoneFilter);
    const accounts = db.billingAccounts.filter(inScope);
    const ids = new Set(accounts.map((a) => a.id));
    return {
      inScope,
      accounts,
      accountIds: ids,
      invoices: db.invoices.filter((i) => ids.has(i.billingAccountId)).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
      receipts: db.receipts.filter((r) => ids.has(r.billingAccountId)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    };
  }, [db, user, branchFilter, zoneFilter]);
}