import type { Role } from '../types/erp';

export const roles: Role[] = [
{
  id: 'management',
  label: 'Management',
  modules: ['dashboard', 'crm', 'field', 'customers', 'surveys', 'quotations', 'installations', 'billing', 'serviceChanges', 'inventory', 'associates', 'agents', 'tickets', 'approvals', 'finance', 'reports'],
  permissions: ['viewFinancials', 'viewPipeline', 'viewMargins', 'viewCommissions', 'approveQuotation', 'exportReports', 'manageSalesTeam', 'allBranches'],
  can: ['All branches, dashboards and reports', 'Quotation approvals', 'Customer, billing and pipeline overview'],
  cannot: ['Commission approval (Finance Approver only)', 'Technical configuration forms']
},
{
  id: 'businessHead',
  label: 'Business Head',
  modules: ['dashboard', 'crm', 'field', 'customers', 'surveys', 'quotations', 'installations', 'billing', 'serviceChanges', 'associates', 'agents', 'tickets', 'approvals', 'finance', 'reports'],
  permissions: ['viewFinancials', 'viewPipeline', 'viewMargins', 'viewCommissions', 'approveQuotation', 'approveAgentCommission', 'createQuotation', 'manageWorkOrders', 'exportReports', 'manageSalesTeam', 'approveExpense', 'allBranches'],
  can: ['All branches and full sales pipeline', 'Quotation approvals and agent commission terms (Sales Head)', 'Resolve sales conflicts and reassign owners'],
  cannot: ['Commission payouts and financial approvals', 'Technical configuration forms']
},
{
  id: 'salesExecutive',
  label: 'Sales Executive',
  modules: ['dashboard', 'crm', 'field', 'customers', 'surveys', 'quotations', 'approvals', 'reports'],
  permissions: ['viewPipeline', 'createQuotation'],
  can: ['Own branch leads, visits and pipeline', 'Create quotations and request surveys'],
  cannot: ['Billing and collection figures', 'Margins and commissions', 'Approvals of any kind']
},
{
  id: 'accountManager',
  label: 'Account Manager',
  modules: ['dashboard', 'crm', 'field', 'customers', 'quotations', 'billing', 'serviceChanges', 'tickets', 'approvals', 'reports'],
  permissions: ['viewFinancials', 'viewPipeline', 'createQuotation'],
  can: ['Assigned customers and their invoices', 'Service change requests', 'Pipeline for own accounts'],
  cannot: ['Margins and commissions', 'Collection verification', 'Technical configuration forms']
},
{
  id: 'backOffice',
  label: 'Back Office',
  modules: ['dashboard', 'customers', 'surveys', 'quotations', 'installations', 'serviceChanges', 'associates', 'agents', 'approvals'],
  permissions: ['manageWorkOrders', 'allBranches'],
  can: ['Work orders and customer records', 'Associate and agent onboarding files'],
  cannot: ['Billing amounts, margins and commissions', 'Financial approvals']
},
{
  id: 'technicalSupervisor',
  label: 'Technical Supervisor',
  modules: ['dashboard', 'field', 'surveys', 'installations', 'serviceChanges', 'inventory', 'tickets', 'approvals', 'reports'],
  permissions: ['technicalConfig', 'assignTickets', 'approveExpense', 'allBranches'],
  can: ['Surveys, installations and dispatch', 'Network configuration forms', 'Ticket assignment and team expense approval'],
  cannot: ['Customer billing information', 'Commercial margins and commissions']
},
{
  id: 'fieldTechnician',
  label: 'Field Technician',
  modules: ['dashboard', 'field', 'surveys', 'installations', 'tickets', 'approvals'],
  permissions: ['technicalConfig'],
  can: ['Assigned jobs, surveys and tickets', 'Mobile field forms'],
  cannot: ['Customer billing information', 'Margins, commissions and pipeline']
},
{
  id: 'inventoryOfficer',
  label: 'Inventory Officer',
  modules: ['dashboard', 'surveys', 'inventory', 'installations', 'approvals'],
  permissions: ['manageStock', 'allBranches'],
  can: ['Stock, equipment and requisitions', 'Material issues for installations'],
  cannot: ['Customer billing and commercial values', 'Technical configuration forms']
},
{
  id: 'accountsOfficer',
  label: 'Accounts Officer',
  modules: ['dashboard', 'field', 'customers', 'billing', 'serviceChanges', 'associates', 'agents', 'approvals', 'finance', 'reports'],
  permissions: ['viewFinancials', 'viewCommissions', 'recordCollection', 'payExpense', 'exportReports', 'allBranches'],
  can: ['Invoices, collections and verification', 'Payment of approved expense claims', 'Commission statements (view only)'],
  cannot: ['Technical configuration forms', 'Financial or commission approval']
},
{
  id: 'financeApprover',
  label: 'Finance Approver',
  modules: ['dashboard', 'field', 'billing', 'associates', 'agents', 'approvals', 'finance', 'reports'],
  permissions: ['viewFinancials', 'viewMargins', 'viewCommissions', 'approveCommission', 'approveFinancial', 'exportReports', 'allBranches'],
  can: ['Credit notes and financial approvals', 'Commission approvals', 'Margins and collections'],
  cannot: ['Technical configuration forms', 'Sales pipeline editing']
},
{
  id: 'systemAdmin',
  label: 'System Administrator',
  modules: ['dashboard', 'approvals', 'admin'],
  permissions: ['manageUsers', 'allBranches'],
  can: ['Users, roles and system settings', 'Access reviews and audit logs'],
  cannot: ['Financial approvals', 'Billing, margins and commissions']
},
{
  id: 'supportStaff',
  label: 'Support Staff',
  modules: ['dashboard', 'customers', 'serviceChanges', 'tickets', 'approvals'],
  permissions: ['assignTickets'],
  can: ['Support tickets and assignment', 'Customer contact details', 'Service change requests'],
  cannot: ['Billing, margins and commissions', 'Technical configuration forms']
}];