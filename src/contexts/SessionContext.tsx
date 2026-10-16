import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { roles } from '../data/roles';
import { useData } from './DataContext';
import { hasPermission } from '../utils/access';
import type { BranchId, DemoUser, Role } from '../types/erp';

const USER_KEY = 'iol-erp-demo-user';

interface SessionValue {
  user: DemoUser;
  role: Role;
  /** Active accounts available in the demo switcher. */
  switchableUsers: DemoUser[];
  switchUser: (userId: string) => void;
  branchFilter: BranchId | 'all';
  setBranchFilter: (branch: BranchId | 'all') => void;
  zoneFilter: string;
  setZoneFilter: (zone: string) => void;
  canChangeBranch: boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export function getRole(user: DemoUser): Role {
  return roles.find((r) => r.id === user.role)!;
}

function storedUserId(): string {
  try {
    return localStorage.getItem(USER_KEY) ?? 'u-01';
  } catch {
    return 'u-01';
  }
}

export function SessionProvider({ children }: {children: React.ReactNode;}) {
  const { db } = useData();
  const [userId, setUserId] = useState<string>(storedUserId);

  const switchableUsers = useMemo(() => db.users.filter((u) => u.status === 'Active'), [db.users]);
  const user = switchableUsers.find((u) => u.id === userId) ?? switchableUsers[0];

  const [branchFilter, setBranchFilterState] = useState<BranchId | 'all'>(() => user.branch ?? 'all');
  const [zoneFilter, setZoneFilter] = useState('all');

  const role = getRole(user);
  const canChangeBranch = hasPermission(role, 'allBranches') && user.branch === null;

  useEffect(() => {
    try {
      localStorage.setItem(USER_KEY, user.id);
    } catch {

      /* ignore */}
  }, [user.id]);

  // If the account's scope changes (e.g. after an admin edit), keep filters inside it.
  useEffect(() => {
    if (user.branch && branchFilter !== user.branch) {
      setBranchFilterState(user.branch);
      setZoneFilter('all');
    }
  }, [user.branch, branchFilter]);

  const switchUser = useCallback(
    (id: string) => {
      const next = switchableUsers.find((u) => u.id === id);
      if (!next) return;
      setUserId(id);
      setBranchFilterState(next.branch ?? 'all');
      setZoneFilter('all');
    },
    [switchableUsers]
  );

  const setBranchFilter = useCallback((branch: BranchId | 'all') => {
    setBranchFilterState(branch);
    setZoneFilter('all');
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ user, role, switchableUsers, switchUser, branchFilter, setBranchFilter, zoneFilter, setZoneFilter, canChangeBranch }),
    [user, role, switchableUsers, switchUser, branchFilter, setBranchFilter, zoneFilter, canChangeBranch]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}