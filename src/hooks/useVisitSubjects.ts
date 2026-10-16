import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';
import type { BranchId } from '../types/erp';

export interface SubjectOption {
  id: string;
  label: string;
  sub: string;
  address: string;
  branchId: BranchId;
}

/** Leads and customers the active account can link a visit or expense to. */
export function useVisitSubjects() {
  const { db } = useData();
  const { user } = useSession();
  return useMemo(() => {
    const leads: SubjectOption[] = db.leads.
    filter((l) => inUserScope(user, l.branchId) && l.status !== 'Merged').
    map((l) => ({ id: l.id, label: l.company, sub: `${l.id} · ${l.contactName}`, address: l.address, branchId: l.branchId }));
    const customers: SubjectOption[] = db.customers.
    filter((c) => inUserScope(user, c.branchId)).
    map((c) => {
      const site = db.sites.find((s) => s.customerId === c.id);
      return { id: c.id, label: c.name, sub: c.id, address: site?.address ?? '', branchId: c.branchId };
    });
    return { leads, customers };
  }, [db, user]);
}