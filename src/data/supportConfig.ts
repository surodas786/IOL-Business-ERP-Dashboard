import type { IssueCategory, SlaPolicy, Skill, TechnicianProfile } from '../types/ticket';

/**
 * Configured SLA policy (fictional). Timers pause ONLY for the hold reasons listed per priority.
 * Urgent tickets never pause. Reopened tickets keep their original resolution target.
 */
export const slaPolicies: SlaPolicy[] = [
{ priority: 'Urgent', responseMinutes: 15, resolutionMinutes: 240, pauseReasons: [], warnAtPct: 75 },
{ priority: 'High', responseMinutes: 30, resolutionMinutes: 1440, pauseReasons: ['Awaiting customer access', 'Awaiting customer information'], warnAtPct: 75 },
{ priority: 'Normal', responseMinutes: 120, resolutionMinutes: 1440, pauseReasons: ['Awaiting customer access', 'Awaiting customer information', 'Power outage at customer site'], warnAtPct: 80 },
{ priority: 'Low', responseMinutes: 480, resolutionMinutes: 4320, pauseReasons: ['Awaiting customer access', 'Awaiting customer information', 'Power outage at customer site'], warnAtPct: 80 }];


/** Escalation ladder used for automatic escalation history. */
export const ESCALATION_LADDER = {
  1: 'Technical Supervisor — Arif Chowdhury',
  2: 'Business Head — Mahbubul Alam',
  3: 'Management — Farhana Rahman'
} as const;

/** Skill most likely needed for each issue category — used to rank technicians when assigning. */
export const CATEGORY_SKILL: Record<IssueCategory, Skill> = {
  'Link down': 'Fibre splicing',
  'Fibre cut': 'Fibre splicing',
  'Packet loss / latency': 'Routing & BGP',
  'Slow speed': 'Routing & BGP',
  'Configuration request': 'Routing & BGP',
  'Equipment fault': 'GPON / ONT',
  'Wireless link issue': 'Wireless / radio',
  'CCTV fault': 'CCTV',
  'Equipment pickup / relocation': 'Customer premises'
};

/** Field technicians with zone coverage, skills and workload capacity (fictional). */
export const technicianProfiles: TechnicianProfile[] = [
{ name: 'Jahid Hasan', branchId: 'dhaka-north', zoneIds: ['uttara', 'mirpur'], team: 'Field Team', skills: ['Fibre splicing', 'GPON / ONT', 'Customer premises'], capacity: 8 },
{ name: 'Faruk Hossain', branchId: 'dhaka-north', zoneIds: ['mirpur', 'gulshan'], team: 'CPE Support', skills: ['Wireless / radio', 'CCTV', 'Customer premises'], capacity: 8 },
{ name: 'Sohel Rana', branchId: 'dhaka-south', zoneIds: ['dhanmondi', 'motijheel', 'jatrabari'], team: 'Field Team', skills: ['Fibre splicing', 'Routing & BGP', 'GPON / ONT'], capacity: 8 },
{ name: 'Rakib Uddin', userId: 'u-07', branchId: 'chattogram', zoneIds: ['agrabad', 'pahartali'], team: 'Field Team', skills: ['Fibre splicing', 'GPON / ONT', 'Wireless / radio'], capacity: 8 },
{ name: 'Mizanur Rahman', branchId: 'chattogram', zoneIds: ['pahartali'], team: 'CPE Support', skills: ['Customer premises', 'CCTV'], capacity: 6 },
{ name: 'Tareq Aziz', userId: 'u-13', branchId: 'sylhet', zoneIds: ['zindabazar', 'ambarkhana'], team: 'Field Team', skills: ['GPON / ONT', 'Fibre splicing', 'Routing & BGP'], capacity: 8 }];


/** Workload points per open item. */
export const LOAD_POINTS = { Urgent: 3, High: 2, Normal: 1, Low: 1, job: 2 } as const;