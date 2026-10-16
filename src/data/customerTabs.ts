import type { Role } from '../types/erp';

export type CustomerTabId =
'overview' |
'contacts' |
'sites' |
'sales' |
'surveys' |
'quotations' |
'installation' |
'billing' |
'equipment' |
'service-changes' |
'tickets' |
'activity';

export interface CustomerTab {
  id: CustomerTabId;
  label: string;
  /** Whether the role sees the tab at all (demo-only rule). */
  visible: (role: Role) => boolean;
}

const mod = (r: Role, m: Role['modules'][number]) => r.modules.includes(m);
const perm = (r: Role, p: Role['permissions'][number]) => r.permissions.includes(p);

export const customerTabs: CustomerTab[] = [
{ id: 'overview', label: 'Overview', visible: () => true },
{ id: 'contacts', label: 'Contacts and Documents', visible: () => true },
{ id: 'sites', label: 'Sites and Services', visible: () => true },
{ id: 'sales', label: 'Sales History', visible: (r) => perm(r, 'viewPipeline') },
{ id: 'surveys', label: 'Surveys', visible: (r) => mod(r, 'surveys') },
{ id: 'quotations', label: 'Quotations and Work Orders', visible: (r) => mod(r, 'quotations') },
{ id: 'installation', label: 'Installation', visible: (r) => mod(r, 'installations') },
{ id: 'billing', label: 'Billing and Payments', visible: (r) => perm(r, 'viewFinancials') },
{ id: 'equipment', label: 'Equipment', visible: (r) => mod(r, 'installations') || mod(r, 'inventory') || perm(r, 'technicalConfig') },
{ id: 'service-changes', label: 'Service Changes', visible: (r) => mod(r, 'serviceChanges') },
{ id: 'tickets', label: 'Support Tickets', visible: (r) => mod(r, 'tickets') },
{ id: 'activity', label: 'Activity History', visible: () => true }];