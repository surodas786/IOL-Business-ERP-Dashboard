/** Internal support ticket types. FICTIONAL DEMO — production must enforce these rules on the server. */

export const TICKET_STATUSES = ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['Urgent', 'High', 'Normal', 'Low'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_SOURCES = ['Phone call', 'Email', 'Walk-in', 'Account Manager', 'Field team', 'Internal'] as const;
export type TicketSource = (typeof TICKET_SOURCES)[number];

export const ISSUE_CATEGORIES = [
'Link down',
'Fibre cut',
'Packet loss / latency',
'Slow speed',
'Configuration request',
'Equipment fault',
'Wireless link issue',
'CCTV fault',
'Equipment pickup / relocation'] as
const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const SUPPORT_TEAMS = ['Field Team', 'NOC Desk', 'Core Network', 'CPE Support'] as const;
export type SupportTeam = (typeof SUPPORT_TEAMS)[number];

export const SKILLS = ['Fibre splicing', 'GPON / ONT', 'Wireless / radio', 'Routing & BGP', 'CCTV', 'Customer premises'] as const;
export type Skill = (typeof SKILLS)[number];

export const HOLD_REASONS = [
'Awaiting customer access',
'Awaiting customer information',
'Awaiting third-party / upstream',
'Awaiting materials',
'Power outage at customer site'] as
const;
export type HoldReason = (typeof HOLD_REASONS)[number];

export const CONFIRMATION_STATUSES = ['Confirmed by customer', 'Confirmation pending', 'Customer unreachable', 'Customer disputes'] as const;
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number];

export const SHIFTS = ['Day', 'Evening', 'Night', 'On call', 'Off', 'Leave'] as const;
export type Shift = (typeof SHIFTS)[number];

export interface TicketAttachment {
  name: string;
  sizeKb: number;
  at: string;
  byName: string;
}

export type TicketEventKind = 'Created' | 'Assigned' | 'Response' | 'Status' | 'Hold' | 'Resume' | 'Escalation' | 'Note' | 'Attachment' | 'Resolution' | 'Confirmation' | 'Closed' | 'Reopened';

export interface TicketEvent {
  at: string;
  byName: string;
  kind: TicketEventKind;
  detail: string;
}

export interface TicketHold {
  from: string;
  to?: string;
  reason: HoldReason;
  note: string;
  /** Decided from the configured SLA policy when the hold starts — never assumed. */
  pausesSla: boolean;
  byName: string;
  resumeTo: 'Assigned' | 'In Progress';
}

export interface TicketEscalation {
  at: string;
  level: 1 | 2 | 3;
  to: string;
  reason: string;
  byName: string;
}

export interface TicketMaterialUse {
  sku: string;
  itemName: string;
  quantity: number;
  unit: string;
  serials: string[];
  /** Technician stock = already issued; Warehouse = issued now from the branch warehouse. */
  source: 'Technician stock' | 'Warehouse';
  warehouse: string;
  movementIds: string[];
}

export interface TicketResolution {
  description: string;
  workPerformed: string;
  materials: TicketMaterialUse[];
  resolvedAt: string;
  confirmation: ConfirmationStatus;
  confirmedBy?: string;
  confirmationNote?: string;
  byName: string;
  recordedAt: string;
}

/** Response and resolution targets. Pausing is allowed only for the listed hold reasons. */
export interface SlaPolicy {
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  pauseReasons: HoldReason[];
  /** Share of the resolution window after which the ticket escalates to level 1. */
  warnAtPct: number;
}

export interface TechnicianProfile {
  name: string;
  userId?: string;
  branchId: string;
  zoneIds: string[];
  team: SupportTeam;
  skills: Skill[];
  /** Workload points before the technician is considered fully loaded. */
  capacity: number;
}

export interface RosterEntry {
  id: string;
  technicianName: string;
  /** YYYY-MM-DD, Dhaka calendar day. */
  date: string;
  shift: Shift;
  note?: string;
}