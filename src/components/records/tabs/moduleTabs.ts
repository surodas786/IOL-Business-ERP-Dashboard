import { hasPermission } from '../../../utils/access';
import type { ModuleId, Role } from '../../../types/erp';
import type { DemoDatabase } from '../../../types/records';
import {
  agentTabs,
  approvalTabs,
  associateTabs,
  billingTabs,
  customerTabs,
  quotationTabs } from
'./commercialTabs';
import {
  installationTabs,
  inventoryTabs,
  reportTabs,
  serviceChangeTabs,
  surveyTabs,
  ticketTabs } from
'./operationsTabs';
import type { TabDef, ViewCtx } from './tabHelpers';

const BUILDERS: Partial<Record<ModuleId, (ctx: ViewCtx) => TabDef[]>> = {
  customers: customerTabs,
  surveys: surveyTabs,
  quotations: quotationTabs,
  installations: installationTabs,
  billing: billingTabs,
  serviceChanges: serviceChangeTabs,
  inventory: inventoryTabs,
  associates: associateTabs,
  agents: agentTabs,
  tickets: ticketTabs,
  approvals: approvalTabs,
  reports: reportTabs
};

export function getModuleTabs(module: ModuleId, db: DemoDatabase, role: Role): TabDef[] {
  const builder = BUILDERS[module];
  if (!builder) return [];
  return builder({
    db,
    role,
    fin: hasPermission(role, 'viewFinancials'),
    pipe: hasPermission(role, 'viewPipeline'),
    margin: hasPermission(role, 'viewMargins'),
    comm: hasPermission(role, 'viewCommissions'),
    tech: hasPermission(role, 'technicalConfig')
  });
}