import { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import {
  EMPTY_DRAFT,
  draftFromUser,
  grantsFinancialApproval,
  reportingDescendants,
  validateUserDraft,
  type DraftErrors,
  type UserDraft } from
'../../utils/userValidation';
import type { DemoUser, RoleId } from '../../types/erp';

export function useUserForm(initial: DemoUser | null) {
  const { db } = useData();
  const { user: actor } = useSession();
  const runAction = useRunAction();
  const [draft, setDraft] = useState<UserDraft>(() => initial ? draftFromUser(initial) : EMPTY_DRAFT);
  const [submitted, setSubmitted] = useState(false);

  const isSelf = initial?.id === actor.id;
  const allErrors = useMemo(() => validateUserDraft(db, draft, actor.id), [db, draft, actor.id]);
  // Self-escalation and status guards show immediately; the rest after the first save attempt.
  const errors: DraftErrors = submitted ? allErrors : { role: isSelf ? allErrors.role : undefined, status: isSelf ? allErrors.status : undefined };

  const set = <K extends keyof UserDraft,>(key: K, value: UserDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const managerOptions = useMemo(() => {
    const blocked = initial ? reportingDescendants(db.users, initial.id) : new Set<string>();
    return db.users.filter((u) => u.status === 'Active' && u.id !== initial?.id && !blocked.has(u.id));
  }, [db.users, initial]);

  const roleDisabledReason = (roleId: RoleId): string | undefined =>
  isSelf && initial && roleId !== initial.role && grantsFinancialApproval(roleId) ? 'can’t self-assign financial approval' : undefined;

  const manager = db.users.find((u) => u.id === draft.managerId);

  const submit = (): boolean => {
    setSubmitted(true);
    if (Object.values(allErrors).some(Boolean)) return false;
    return runAction({ type: 'ADMIN_SAVE_USER', draft });
  };

  return { draft, set, errors, isSelf, managerOptions, manager, roleDisabledReason, submit, orgNodes: db.orgNodes, orgLevels: db.orgLevels };
}