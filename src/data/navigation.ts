import {
  LayoutDashboardIcon,
  TargetIcon,
  MapPinIcon,
  UsersIcon,
  ScanSearchIcon,
  FileTextIcon,
  WrenchIcon,
  BanknoteIcon,
  ArrowUpDownIcon,
  BoxesIcon,
  HandshakeIcon,
  UserCheckIcon,
  LifeBuoyIcon,
  ListChecksIcon,
  ChartColumnIcon,
  SettingsIcon,
  WalletIcon } from
'lucide-react';
import type { NavItem } from '../types/erp';

export const navItems: NavItem[] = [
{ id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboardIcon, description: 'Branch performance, tasks and bottlenecks for your role.' },
{ id: 'crm', label: 'Sales CRM', path: '/sales-crm', icon: TargetIcon, description: 'Leads, opportunities and the sales pipeline by branch and zone.' },
{ id: 'field', label: 'Field Activities', path: '/field-activities', icon: MapPinIcon, description: 'Customer visits, check-ins and field reports from sales and technical teams.' },
{ id: 'customers', label: 'Customers', path: '/customers', icon: UsersIcon, description: 'Corporate and retail customer records, contacts and connections.' },
{ id: 'surveys', label: 'Surveys and Feasibility', path: '/surveys', icon: ScanSearchIcon, description: 'Site surveys, fibre distance checks and feasibility decisions.' },
{ id: 'quotations', label: 'Quotations and Work Orders', path: '/quotations', icon: FileTextIcon, description: 'Quotations, approvals and the work orders they turn into.' },
{ id: 'installations', label: 'Installation Jobs', path: '/installations', icon: WrenchIcon, description: 'Scheduled installations, dispatch and job completion.' },
{ id: 'billing', label: 'Billing and Collections', path: '/billing', icon: BanknoteIcon, description: 'Invoices, payments, collection verification and credit notes.' },
{ id: 'serviceChanges', label: 'Service Changes', path: '/service-changes', icon: ArrowUpDownIcon, description: 'Shifting, upgrades, downgrades, temporary stops, resumptions and discontinuations.' },
{ id: 'inventory', label: 'Inventory and Equipment', path: '/inventory', icon: BoxesIcon, description: 'ONTs, routers, fibre and warehouse stock across branches.' },
{ id: 'associates', label: 'Associates', path: '/associates', icon: HandshakeIcon, description: 'Partner associates, agreements and onboarding.' },
{ id: 'agents', label: 'Sales Agents', path: '/sales-agents', icon: UserCheckIcon, description: 'Agent roster, activations and commission statements.' },
{ id: 'tickets', label: 'Support Tickets', path: '/support-tickets', icon: LifeBuoyIcon, description: 'Customer issues, assignment and resolution tracking.' },
{ id: 'approvals', label: 'Approvals and Tasks', path: '/approvals', icon: ListChecksIcon, description: 'Everything waiting on you or your team.' },
{ id: 'finance', label: 'Operational Finance', path: '/operational-finance', icon: WalletIcon, description: 'Operational payments, evidence, approval, payment references and recurring reminders. Not a general ledger.' },
{ id: 'reports', label: 'Reports', path: '/reports', icon: ChartColumnIcon, description: 'Revenue, collections, operations and team reports.' },
{ id: 'admin', label: 'Administration', path: '/administration', icon: SettingsIcon, description: 'Users, roles, organisation, geography, zones, approval rules, master data and audit history.' }];