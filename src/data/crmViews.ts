import { CalendarDaysIcon, CopyIcon, GavelIcon, HourglassIcon, SquareKanbanIcon as KanbanSquareIcon, ListIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CrmViewId = 'pipeline' | 'leads' | 'calendar' | 'tenders' | 'stale' | 'reviews';

export interface CrmView {
  id: CrmViewId;
  label: string;
  icon: LucideIcon;
}

export const crmViews: CrmView[] = [
{ id: 'pipeline', label: 'Pipeline', icon: KanbanSquareIcon },
{ id: 'leads', label: 'Leads', icon: ListIcon },
{ id: 'calendar', label: 'Follow-up calendar', icon: CalendarDaysIcon },
{ id: 'tenders', label: 'Tenders', icon: GavelIcon },
{ id: 'stale', label: 'Stale and overdue', icon: HourglassIcon },
{ id: 'reviews', label: 'Duplicate review', icon: CopyIcon }];