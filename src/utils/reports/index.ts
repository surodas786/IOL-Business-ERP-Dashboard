import { financeReports } from './financeReports';
import { managementReports } from './managementReports';
import { salesReports } from './salesReports';
import { technicalReports } from './technicalReports';
import { visibleSection, type ReportCtx } from './scope';
import type { Role } from '../../types/erp';
import type { ReportGroup, ReportSection } from '../../types/reports';

export const REPORT_GROUPS: {id: ReportGroup;label: string;description: string;}[] = [
{ id: 'sales', label: 'Sales', description: 'Visits, pipeline, tenders, targets and acquisition cost.' },
{ id: 'technical', label: 'Technical', description: 'Surveys, installations, equipment, stock movements and clearances.' },
{ id: 'finance', label: 'Finance', description: 'Billing, collections, receivables, balances, expenses, associates and commission.' },
{ id: 'management', label: 'Management', description: 'Company position, regions, associate exposure and approvals.' }];


/** Which report groups a role may open. Technical never includes customer financial fields. */
export function canSeeGroup(role: Role, g: ReportGroup): boolean {
  const p = (x: string) => role.permissions.includes(x as never);
  switch (g) {
    case 'sales':
      return p('viewPipeline');
    case 'technical':
      return p('technicalConfig') || p('manageStock') || role.id === 'management' || role.id === 'businessHead';
    case 'finance':
      return p('viewFinancials') && (p('recordCollection') || p('approveFinancial') || role.id === 'management');
    case 'management':
      return role.id === 'management' || role.id === 'businessHead';
  }
}

export function primaryGroup(role: Role): ReportGroup | null {
  if (role.id === 'management' || role.id === 'businessHead') return 'management';
  if (role.id === 'accountsOfficer' || role.id === 'financeApprover') return 'finance';
  if (role.id === 'salesExecutive' || role.id === 'accountManager') return 'sales';
  if (['technicalSupervisor', 'fieldTechnician', 'inventoryOfficer', 'supportStaff', 'backOffice'].includes(role.id)) return 'technical';
  return null;
}

export function buildGroup(c: ReportCtx, g: ReportGroup): ReportSection[] {
  const raw = g === 'sales' ? salesReports(c) : g === 'technical' ? technicalReports(c) : g === 'finance' ? financeReports(c) : managementReports(c);
  return raw.map((s) => visibleSection(s, c.role)).filter((s): s is ReportSection => !!s);
}