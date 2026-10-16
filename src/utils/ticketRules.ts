import { CATEGORY_SKILL, ESCALATION_LADDER, LOAD_POINTS, slaPolicies, technicianProfiles } from '../data/supportConfig';
import { hasPermission } from './access';
import { dhakaInputValue, demoNow } from './format';
import type { Role } from '../types/erp';
import type { DemoDatabase, Ticket } from '../types/records';
import type { Shift, SlaPolicy, TechnicianProfile, TicketPriority, TicketStatus } from '../types/ticket';

/* ---------- permissions (demo only — production must enforce on the server) ---------- */
export const canCreateTicket = (r: Role) => hasPermission(r, 'assignTickets') || hasPermission(r, 'createQuotation');
export const canDispatch = (r: Role) => hasPermission(r, 'assignTickets');
export const canSimulate = (r: Role) => hasPermission(r, 'assignTickets');
export const canCloseTicket = (r: Role) => hasPermission(r, 'assignTickets');
export const canReopen = (r: Role) => hasPermission(r, 'assignTickets') || hasPermission(r, 'createQuotation');
export const canEditRoster = (r: Role) => hasPermission(r, 'assignTickets') && hasPermission(r, 'technicalConfig');
/** Support desk works any ticket; technicians only the ones assigned to them. */
export const canWorkOn = (r: Role, userName: string, t: Ticket) => hasPermission(r, 'assignTickets') || hasPermission(r, 'technicalConfig') && t.assigneeName === userName;

export const MIN_REASON = 10;
export const OPEN_STATUSES: TicketStatus[] = ['Open', 'Assigned', 'In Progress', 'On Hold'];
export const isOpen = (t: Ticket) => OPEN_STATUSES.includes(t.status);

export const policyFor = (p: TicketPriority): SlaPolicy => slaPolicies.find((x) => x.priority === p) ?? slaPolicies[2];
const ms = (iso: string) => new Date(iso).getTime();
const MIN = 60000;

export const responseDueMs = (t: Ticket) => t.responseDueAt ? ms(t.responseDueAt) : ms(t.openedAt) + policyFor(t.priority).responseMinutes * MIN;

/** Paused time, counting only holds the configured policy allowed to pause. */
export function pausedMs(t: Ticket, untilMs: number): number {
  return (t.holds ?? []).filter((h) => h.pausesSla).reduce((n, h) => n + Math.max(0, Math.min(h.to ? ms(h.to) : untilMs, untilMs) - ms(h.from)), 0);
}

export type ClockState = 'running' | 'paused' | 'met' | 'missed' | 'breached';
export interface Clock {
  state: ClockState;
  dueMs: number;
  /** Positive = time left; negative = overdue. For finished clocks, margin at completion. */
  remainingMs: number;
  usedPct: number;
  doneAt?: string;
}

export function responseClock(t: Ticket, nowMs = demoNow().getTime()): Clock {
  const due = responseDueMs(t);
  const window = Math.max(1, due - ms(t.openedAt));
  if (t.firstResponseAt) {
    const at = ms(t.firstResponseAt);
    return { state: at <= due ? 'met' : 'missed', dueMs: due, remainingMs: due - at, usedPct: (at - ms(t.openedAt)) / window * 100, doneAt: t.firstResponseAt };
  }
  const left = due - nowMs;
  return { state: left < 0 ? 'breached' : 'running', dueMs: due, remainingMs: left, usedPct: (nowMs - ms(t.openedAt)) / window * 100 };
}

export function resolutionClock(t: Ticket, nowMs = demoNow().getTime()): Clock {
  const end = t.resolution ? ms(t.resolution.resolvedAt) : nowMs;
  const due = ms(t.slaDueAt) + pausedMs(t, end);
  const window = Math.max(1, ms(t.slaDueAt) - ms(t.openedAt));
  const used = (end - ms(t.openedAt) - pausedMs(t, end)) / window * 100;
  if (t.resolution && (t.status === 'Resolved' || t.status === 'Closed')) return { state: end <= due ? 'met' : 'missed', dueMs: due, remainingMs: due - end, usedPct: used, doneAt: t.resolution.resolvedAt };
  const hold = currentHold(t);
  const left = due - nowMs;
  return { state: left < 0 ? 'breached' : hold?.pausesSla ? 'paused' : 'running', dueMs: due, remainingMs: left, usedPct: used };
}

export const currentHold = (t: Ticket) => t.status === 'On Hold' ? (t.holds ?? []).find((h) => !h.to) : undefined;

export function formatSpan(msAbs: number): string {
  const m = Math.round(Math.abs(msAbs) / MIN);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, '0')}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export interface EscalationEntry {
  at: string;
  level: 1 | 2 | 3;
  to: string;
  reason: string;
  kind: 'Automatic' | 'Manual';
  byName: string;
}

/** Automatic escalations derived from the policy thresholds, merged with manual escalations. */
export function escalationHistory(t: Ticket, nowMs = demoNow().getTime()): EscalationEntry[] {
  const p = policyFor(t.priority);
  const end = t.resolution && !isOpen(t) ? ms(t.resolution.resolvedAt) : nowMs;
  const open = ms(t.openedAt);
  const window = ms(t.slaDueAt) - open;
  const paused = pausedMs(t, end);
  const out: EscalationEntry[] = [];
  const add = (atMs: number, level: 1 | 2 | 3, reason: string) => {
    if (atMs <= end) out.push({ at: new Date(atMs).toISOString(), level, to: ESCALATION_LADDER[level], reason, kind: 'Automatic', byName: 'SLA policy' });
  };
  const rDue = responseDueMs(t);
  if (!t.firstResponseAt || ms(t.firstResponseAt) > rDue) add(rDue, 1, 'First response target missed');
  add(open + window * (p.warnAtPct / 100) + paused, 1, `${p.warnAtPct}% of the resolution window used`);
  add(open + window + paused, 2, 'Resolution target breached');
  add(open + window * 1.5 + paused, 3, 'Breached by more than half the resolution window');
  (t.escalations ?? []).forEach((e) => out.push({ ...e, kind: 'Manual' }));
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export const escalationLevel = (t: Ticket, nowMs?: number) => escalationHistory(t, nowMs).reduce((n, e) => Math.max(n, e.level), 0);

/* ---------- people, roster and workload ---------- */
export const todayKey = () => dhakaInputValue(demoNow().toISOString());

export function shiftOf(db: DemoDatabase, name: string, date = todayKey()): Shift | undefined {
  return db.dutyRoster.find((r) => r.technicianName === name && r.date === date)?.shift;
}
export const onDuty = (s?: Shift) => s === 'Day' || s === 'Evening' || s === 'Night' || s === 'On call';

export interface Workload {
  tickets: Ticket[];
  jobs: number;
  points: number;
  capacity: number;
}

export function workloadOf(db: DemoDatabase, name: string): Workload {
  const tickets = db.tickets.filter((t) => t.assigneeName === name && isOpen(t));
  const jobs = db.installationJobs.filter((j) => j.technicianName === name && ['Assigned', 'Scheduled', 'In Progress', 'On Hold'].includes(j.status)).length;
  const points = tickets.reduce((n, t) => n + LOAD_POINTS[t.priority], 0) + jobs * LOAD_POINTS.job;
  return { tickets, jobs, points, capacity: technicianProfiles.find((p) => p.name === name)?.capacity ?? 8 };
}

export interface TechnicianOption {
  profile: TechnicianProfile;
  zoneMatch: boolean;
  branchMatch: boolean;
  skillMatch: boolean;
  shift?: Shift;
  load: Workload;
  score: number;
}

/** Technicians ranked for a ticket: same zone, needed skill, on duty today, then lightest load. */
export function rankTechnicians(db: DemoDatabase, t: Pick<Ticket, 'branchId' | 'zoneId' | 'category'>): TechnicianOption[] {
  const need = t.category ? CATEGORY_SKILL[t.category] : undefined;
  return technicianProfiles.
  map((profile) => {
    const zoneMatch = profile.zoneIds.includes(t.zoneId);
    const branchMatch = profile.branchId === t.branchId;
    const skillMatch = !!need && profile.skills.includes(need);
    const shift = shiftOf(db, profile.name);
    const load = workloadOf(db, profile.name);
    const score = (zoneMatch ? 40 : branchMatch ? 20 : 0) + (skillMatch ? 25 : 0) + (onDuty(shift) ? 30 : -50) - load.points / load.capacity * 20;
    return { profile, zoneMatch, branchMatch, skillMatch, shift, load, score };
  }).
  sort((a, b) => b.score - a.score);
}

export const neededSkill = (t: Pick<Ticket, 'category'>) => t.category ? CATEGORY_SKILL[t.category] : undefined;