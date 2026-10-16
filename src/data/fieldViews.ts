import { CalendarClockIcon, ClockIcon, ReceiptIcon, TargetIcon, UsersIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../types/erp';

export type FieldViewId = 'day' | 'visits' | 'follow-ups' | 'expenses' | 'targets';

export interface FieldView {
  id: FieldViewId;
  label: string;
  icon: LucideIcon;
  /** Whether the role sees this view. */
  visible: (role: Role) => boolean;
}

const doesFieldWork = (r: Role) => r.permissions.includes('createQuotation') || r.permissions.includes('technicalConfig') || r.permissions.includes('manageSalesTeam');

export const fieldViews: FieldView[] = [
{ id: 'day', label: 'Daily timeline', icon: ClockIcon, visible: doesFieldWork },
{ id: 'visits', label: 'Visits by person', icon: UsersIcon, visible: doesFieldWork },
{ id: 'follow-ups', label: 'Pending follow-ups', icon: CalendarClockIcon, visible: doesFieldWork },
{ id: 'expenses', label: 'Expenses', icon: ReceiptIcon, visible: () => true },
{ id: 'targets', label: 'Targets', icon: TargetIcon, visible: (r) => r.permissions.includes('viewPipeline') }];