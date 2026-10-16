import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_DATA_VERSION, demoSeed } from '../data/demoSeed';
import { demoNow, resetDemoClock } from '../utils/format';
import { applyWorkflow, type Actor, type WorkflowAction, type WorkflowResult } from '../utils/workflow';
import { applyAdminAction, isAdminAction, type AdminAction } from '../utils/adminWorkflow';
import { applyCrmAction, isCrmAction, type CrmAction } from '../utils/crmWorkflow';
import { applyFieldAction, isFieldAction, type FieldAction } from '../utils/fieldWorkflow';
import { applyCustomerAction, isCustomerAction, type CustomerAction } from '../utils/customerWorkflow';
import { applySurveyAction, isSurveyAction, type SurveyAction } from '../utils/surveyWorkflow';
import { applyQuoteAction, isQuoteAction, type QuoteAction } from '../utils/quoteWorkflow';
import { applyJobAction, isJobAction, type JobAction } from '../utils/installationWorkflow';
import { applyBillingAction, isBillingAction, type BillingAction } from '../utils/billingWorkflow';
import { applyServiceChangeAction, isServiceChangeAction, type ServiceChangeAction } from '../utils/serviceChangeWorkflow';
import { applyInventoryAction, isInventoryAction, type InventoryAction } from '../utils/inventoryWorkflow';
import { applyAssociateAction, isAssociateAction, type AssociateAction } from '../utils/associateWorkflow';
import { applyAgentAction, isAgentAction, type AgentAction } from '../utils/agentWorkflow';
import { applyTicketAction, isTicketAction, type TicketAction } from '../utils/ticketWorkflow';
import { applyOpsAction, isOpsAction, sweepNotifications, type OpsAction } from '../utils/opsFinanceWorkflow';
import { setUserDirectory } from '../utils/relations';
import type { DemoDatabase } from '../types/records';

const STORAGE_KEY = 'iol-erp-demo-db';

export type AnyAction = WorkflowAction | AdminAction | CrmAction | FieldAction | CustomerAction | SurveyAction | QuoteAction | JobAction | BillingAction | ServiceChangeAction | InventoryAction | AssociateAction | AgentAction | TicketAction | OpsAction;

interface DataValue {
  db: DemoDatabase;
  run: (action: AnyAction, actor: Actor) => WorkflowResult;
  markNotificationsRead: (ids: string[], userId: string) => void;
  resetDemoData: () => void;
  changeCount: number;
}

const DataContext = createContext<DataValue | null>(null);

function loadDatabase(): DemoDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDatabase;
      if (parsed.version === DEMO_DATA_VERSION) return sweepNotifications(parsed, demoNow()) ?? parsed;
    }
  } catch {

    /* fall back to seed */}
  const seed = structuredClone(demoSeed);
  return sweepNotifications(seed, demoNow()) ?? seed;
}

export function DataProvider({ children }: {children: React.ReactNode;}) {
  const [db, setDb] = useState<DemoDatabase>(loadDatabase);
  const dbRef = useRef(db);
  // Keep name lookups in sync so created, reassigned or deactivated users resolve everywhere.
  setUserDirectory(db.users);

  useEffect(() => {
    dbRef.current = db;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {

      /* storage full or unavailable */}
  }, [db]);

  const commit = useCallback((next: DemoDatabase) => {
    dbRef.current = next;
    setDb(next);
  }, []);

  const run = useCallback(
    (action: AnyAction, actor: Actor) => {
      const at = demoNow().toISOString();
      const result = isAdminAction(action) ?
      applyAdminAction(dbRef.current, action, actor, at) :
      isCrmAction(action) ?
      applyCrmAction(dbRef.current, action, actor, at) :
      isFieldAction(action) ?
      applyFieldAction(dbRef.current, action, actor, at) :
      isCustomerAction(action) ?
      applyCustomerAction(dbRef.current, action, actor, at) :
      isSurveyAction(action) ?
      applySurveyAction(dbRef.current, action, actor, at) :
      isQuoteAction(action) ?
      applyQuoteAction(dbRef.current, action, actor, at) :
      isJobAction(action) ?
      applyJobAction(dbRef.current, action, actor, at) :
      isBillingAction(action) ?
      applyBillingAction(dbRef.current, action, actor, at) :
      isServiceChangeAction(action) ?
      applyServiceChangeAction(dbRef.current, action, actor, at) :
      isInventoryAction(action) ?
      applyInventoryAction(dbRef.current, action, actor, at) :
      isAssociateAction(action) ?
      applyAssociateAction(dbRef.current, action, actor, at) :
      isAgentAction(action) ?
      applyAgentAction(dbRef.current, action, actor, at) :
      isTicketAction(action) ?
      applyTicketAction(dbRef.current, action, actor, at) :
      isOpsAction(action) ?
      applyOpsAction(dbRef.current, action, actor, at) :
      applyWorkflow(dbRef.current, action as WorkflowAction, actor, at);
      if (result.ok) commit(sweepNotifications(result.db, demoNow()) ?? result.db);
      return result;
    },
    [commit]
  );

  const markNotificationsRead = useCallback(
    (ids: string[], userId: string) => {
      const next = structuredClone(dbRef.current);
      next.notifications.forEach((n) => {
        if (ids.includes(n.id) && !n.readBy.includes(userId)) n.readBy.push(userId);
      });
      commit(next);
    },
    [commit]
  );

  const resetDemoData = useCallback(() => {
    resetDemoClock();
    const seed = structuredClone(demoSeed);
    commit(sweepNotifications(seed, demoNow()) ?? seed);
  }, [commit]);

  const changeCount = db.auditEvents.length - demoSeed.auditEvents.length;

  const value = useMemo(
    () => ({ db, run, markNotificationsRead, resetDemoData, changeCount }),
    [db, run, markNotificationsRead, resetDemoData, changeCount]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}