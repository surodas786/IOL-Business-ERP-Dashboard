import { useCallback } from 'react';
import { toast } from 'sonner';
import { useData, type AnyAction } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';

/** Runs a workflow or administration action as the active demo user and reports the outcome. */
export function useRunAction() {
  const { run } = useData();
  const { user } = useSession();
  return useCallback(
    (action: AnyAction) => {
      const result = run(action, { id: user.id, name: user.name });
      if (result.ok) toast.success(result.message);else
      toast.error(result.message);
      return result.ok;
    },
    [run, user.id, user.name]
  );
}