import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { isVisibleTo } from '../utils/access';
import { deriveWorkItems, type WorkItem } from '../utils/workItems';

/** All derived work items, plus those visible to the active demo account. */
export function useWorkItems(): {all: WorkItem[];visible: WorkItem[];} {
  const { db } = useData();
  const { user, role } = useSession();
  const all = useMemo(() => deriveWorkItems(db), [db]);
  const visible = useMemo(() => all.filter((i) => isVisibleTo(i, user, role)), [all, user, role]);
  return { all, visible };
}