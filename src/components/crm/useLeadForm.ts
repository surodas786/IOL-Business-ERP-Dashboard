import { useMemo, useState } from 'react';
import { roles } from '../../data/roles';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { canManageSales, findBlockingConflict, findPossibleMatches, salesOwners } from '../../utils/crmRules';
import { demoNow } from '../../utils/format';
import { emptyLeadDraft, validateLeadDraft, type LeadDraft, type LeadDraftErrors } from '../../utils/leadDraft';

/** State, live duplicate checks and submission for the New lead form. */
export function useLeadForm(onDone: (opportunityId: string) => void) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const manager = canManageSales(role);
  const [draft, setDraft] = useState<LeadDraft>(() => emptyLeadDraft(user.id, user.branch));
  const [errors, setErrors] = useState<LeadDraftErrors>({});
  const [acknowledged, setAcknowledged] = useState(false);

  const set = <K extends keyof LeadDraft,>(key: K, value: LeadDraft[K]) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === 'branchId') next.zoneId = '';
      if (key === 'expansion' && value === 'New customer') next.customerId = '';
      if (key === 'customerId') {
        const c = db.customers.find((x) => x.id === value);
        if (c) {
          next.company = c.name;
          next.companyBn = c.nameBn;
          next.branchId = c.branchId;
          next.zoneId = c.zoneId;
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
    setAcknowledged(false);
  };

  const matchInput = useMemo(
    () => ({
      company: draft.company,
      companyBn: draft.companyBn,
      contactPhone: draft.contactPhone,
      address: draft.address,
      siteAddress: draft.siteAddress,
      serviceType: draft.serviceType,
      customerId: draft.customerId || undefined,
      ownerId: draft.ownerId
    }),
    [draft]
  );
  const blocking = useMemo(() => findBlockingConflict(db, matchInput), [db, matchInput]);
  const matches = useMemo(() => draft.company.trim().length >= 3 || draft.contactPhone.length >= 10 ? findPossibleMatches(db, matchInput) : [], [db, matchInput, draft.company, draft.contactPhone]);
  const owners = useMemo(() => manager ? salesOwners(db, roles) : db.users.filter((u) => u.id === user.id), [db, manager, user.id]);

  const submit = () => {
    const e = validateLeadDraft(db, draft, demoNow().toISOString());
    setErrors(e);
    if (Object.keys(e).length || blocking) return;
    if (matches.length && !acknowledged) return;
    const before = new Set(db.opportunities.map((o) => o.id));
    const ok = runAction({ type: 'CRM_CREATE_LEAD', draft, reviewAcknowledged: acknowledged });
    if (ok) {
      // The new opportunity id is the next sequential one; find it from the shared store on the next render.
      const id = `OP-2026-${String(Math.max(...[...before].map((x) => Number(x.slice(-4)))) + 1).padStart(4, '0')}`;
      onDone(id);
    }
  };

  return { db, draft, set, errors, blocking, matches, acknowledged, setAcknowledged, owners, manager, submit };
}