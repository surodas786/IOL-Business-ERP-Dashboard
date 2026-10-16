import {
  UsersIcon,
  ShieldCheckIcon,
  NetworkIcon,
  MapIcon,
  MapPinnedIcon,
  GitBranchIcon,
  ListIcon,
  HistoryIcon } from
'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AdminSectionId = 'users' | 'roles' | 'organisation' | 'geography' | 'zones' | 'approval-rules' | 'master-data' | 'audit';

export interface AdminSection {
  id: AdminSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const adminSections: AdminSection[] = [
{ id: 'users', label: 'Users', description: 'Accounts, single-role assignment, station, scope and reporting lines.', icon: UsersIcon },
{ id: 'roles', label: 'Roles and Permissions', description: 'What each role can view, create, edit, submit, approve and export, and which records it can reach.', icon: ShieldCheckIcon },
{ id: 'organisation', label: 'Organisation Structure', description: 'Configurable organisation units and hierarchy depth.', icon: NetworkIcon },
{ id: 'geography', label: 'Administrative Geography', description: 'Government divisions, districts and upazilas / thanas. Kept separate from operational zones.', icon: MapIcon },
{ id: 'zones', label: 'Operational Zones', description: 'IOL service zones and the administrative areas each one covers.', icon: MapPinnedIcon },
{ id: 'approval-rules', label: 'Approval Rules', description: 'Who approves what, at which threshold and within which SLA.', icon: GitBranchIcon },
{ id: 'master-data', label: 'Master Data', description: 'Shared pick-lists in English and Bangla.', icon: ListIcon },
{ id: 'audit', label: 'Audit History', description: 'Every operational and administrative change, with who and when.', icon: HistoryIcon }];