import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { EntityRef } from '../types/records';

interface DrawerValue {
  current: EntityRef | null;
  history: EntityRef[];
  openRecord: (ref: EntityRef) => void;
  back: () => void;
  close: () => void;
}

const RecordDrawerContext = createContext<DrawerValue | null>(null);

export function RecordDrawerProvider({ children }: {children: React.ReactNode;}) {
  const [stack, setStack] = useState<EntityRef[]>([]);

  const openRecord = useCallback((ref: EntityRef) => {
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.type === ref.type && top.id === ref.id) return prev;
      return [...prev, ref].slice(-12);
    });
  }, []);
  const back = useCallback(() => setStack((prev) => prev.slice(0, -1)), []);
  const close = useCallback(() => setStack([]), []);

  const value = useMemo(
    () => ({ current: stack[stack.length - 1] ?? null, history: stack, openRecord, back, close }),
    [stack, openRecord, back, close]
  );

  return <RecordDrawerContext.Provider value={value}>{children}</RecordDrawerContext.Provider>;
}

export function useRecordDrawer(): DrawerValue {
  const ctx = useContext(RecordDrawerContext);
  if (!ctx) throw new Error('useRecordDrawer must be used inside RecordDrawerProvider');
  return ctx;
}