import { demoNow } from './format';
import { hasPermission } from './access';
import type { DemoUser, Role } from '../types/erp';
import type { CrmStage } from '../types/crm';
import type { DemoDatabase, EntityRef, Lead, Opportunity, ServiceType } from '../types/records';

// NOTE: These rules shape the demo only. Production systems must enforce them on the server.

export const STALE_DAYS = 14;
const DAY = 86400000;

export function stageById(db: DemoDatabase, id: string): CrmStage | undefined {
  return db.crmStages.find((s) => s.id === id);
}

export function stageLabel(db: DemoDatabase, id: string): string {
  return stageById(db, id)?.label ?? id;
}

export function stageIndex(db: DemoDatabase, id: string): number {
  return db.crmStages.findIndex((s) => s.id === id);
}

export function stageWithRole(db: DemoDatabase, role: CrmStage['role']): CrmStage {
  return db.crmStages.find((s) => s.role === role)!;
}

/** Stages a salesperson can move an opportunity into by hand (before Work Order). */
export function manualStages(db: DemoDatabase): CrmStage[] {
  const wo = stageIndex(db, stageWithRole(db, 'workOrder').id);
  return db.crmStages.slice(0, wo);
}

export function isActive(o: Opportunity): boolean {
  return o.status === 'Open' || o.status === 'Stalled';
}

/** Open pipeline (excludes opportunities already in Work Order or Closed Won). */
export function isPipeline(db: DemoDatabase, o: Opportunity): boolean {
  const role = stageById(db, o.stage)?.role;
  return isActive(o) && role !== 'workOrder' && role !== 'won';
}

export function displayStatus(db: DemoDatabase, o: Opportunity): string {
  if (o.status === 'Open') return stageLabel(db, o.stage);
  return o.status;
}

// ---------- Suspect → Prospect rule ----------

export function contactIdentified(lead: Lead): boolean {
  return lead.contactName.trim().length > 1 && (lead.contactPhone.trim().length > 6 || lead.contactEmail.includes('@'));
}

export function prospectReadiness(db: DemoDatabase, o: Opportunity) {
  const lead = db.leads.find((l) => l.id === o.leadId);
  const contact = !!lead && contactIdentified(lead);
  const communication = o.communications.length > 0;
  const interest = o.communications.some((c) => c.interest);
  return { contact, communication, interest, ready: contact && (communication || interest) };
}

/** Returns an error message when the move isn't allowed, otherwise null. */
export function stageMoveError(db: DemoDatabase, o: Opportunity, toId: string): string | null {
  if (o.status !== 'Open') return 'Reopen the opportunity before changing its stage.';
  const target = stageById(db, toId);
  if (!target) return 'Unknown stage.';
  if (target.role === 'workOrder') return 'Opportunities move to Work Order when Back Office converts the accepted quotation.';
  if (target.role === 'won') return 'Opportunities close as won when billing is activated for the installed service.';
  const cur = stageById(db, o.stage);
  if (cur?.role === 'workOrder' || cur?.role === 'won') return 'A work order already exists; the stage is now driven by delivery.';
  const prospectIdx = stageIndex(db, stageWithRole(db, 'prospect').id);
  if (stageIndex(db, toId) >= prospectIdx && stageIndex(db, o.stage) < prospectIdx) {
    const r = prospectReadiness(db, o);
    if (!r.contact) return 'A Suspect becomes a Prospect only once a named contact with a phone number or email is recorded.';
    if (!r.ready) return 'A Suspect becomes a Prospect only after a communication or customer interest is recorded.';
  }
  return null;
}

// ---------- Survey and quotation status ----------

export function deliverySummary(db: DemoDatabase, opportunityId: string) {
  const survey = db.surveys.filter((s) => s.opportunityId === opportunityId).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
  const quotation = db.quotations.filter((q) => q.opportunityId === opportunityId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const bypass = db.surveyBypasses.find((b) => b.opportunityId === opportunityId && b.status !== 'Rejected');
  const surveyLabel = survey ?
  survey.result ?
  `Survey ${survey.result.toLowerCase()}` :
  `Survey ${survey.status.toLowerCase()}` :
  bypass ?
  bypass.status === 'Approved' ?
  'Survey bypass approved' :
  'Survey bypass pending' :
  'No survey';
  const quotationLabel = !quotation ? 'No quotation' : `Quotation ${quotation.status.toLowerCase()}`;
  return { survey, quotation, surveyLabel, quotationLabel };
}

// ---------- Flags ----------

export function lastActivity(o: Opportunity): string {
  const times = [o.createdAt, ...o.communications.map((c) => c.at), ...o.history.map((h) => h.at), ...o.attachments.map((a) => a.uploadedAt)];
  return times.sort().at(-1)!;
}

export function daysSince(iso: string): number {
  return Math.floor((demoNow().getTime() - new Date(iso).getTime()) / DAY);
}

export function extensionCount(o: Opportunity): number {
  return o.decisionDateHistory.filter((c) => c.to > c.from).length;
}

export interface OpportunityFlags {
  overdueFollowUp: boolean;
  stale: boolean;
  repeatedExtensions: boolean;
  decisionPassed: boolean;
  duplicateReview: boolean;
  any: boolean;
}

export function opportunityFlags(db: DemoDatabase, o: Opportunity): OpportunityFlags {
  const now = demoNow().toISOString();
  const pipeline = isPipeline(db, o) && o.status === 'Open';
  const overdueFollowUp = o.status === 'Open' && !!o.nextActionDue && o.nextActionDue < now;
  const stale = pipeline && daysSince(lastActivity(o)) >= STALE_DAYS;
  const repeatedExtensions = isActive(o) && extensionCount(o) >= 2;
  const decisionPassed = pipeline && o.expectedDecisionDate < now;
  const duplicateReview = db.crmConflicts.some((c) => c.status === 'Open' && c.opportunityId === o.id);
  return { overdueFollowUp, stale, repeatedExtensions, decisionPassed, duplicateReview, any: overdueFollowUp || stale || repeatedExtensions || decisionPassed };
}

// ---------- Permissions (demo only) ----------

export function canManageSales(role: Role): boolean {
  return hasPermission(role, 'manageSalesTeam');
}

export function canCreateLead(role: Role): boolean {
  return hasPermission(role, 'createQuotation') || canManageSales(role);
}

export function canEditOpportunity(o: Opportunity, user: DemoUser, role: Role): boolean {
  if (canManageSales(role)) return true;
  return hasPermission(role, 'createQuotation') && o.ownerId === user.id;
}

/** Active users who may own opportunities. */
export function salesOwners(db: DemoDatabase, roles: Role[]): DemoUser[] {
  return db.users.filter((u) => u.status === 'Active' && roles.find((r) => r.id === u.role)?.permissions.includes('createQuotation'));
}

// ---------- Duplicate detection ----------

const NAME_STOP = new Set(['ltd', 'limited', 'plc', 'the', 'co', 'company', 'and', 'bd', 'bangladesh', 'pvt', 'private', 'inc', 'group']);
const ADDRESS_STOP = new Set(['road', 'house', 'floor', 'plot', 'block', 'level', 'sector', 'dhaka', 'chattogram', 'sylhet', 'bangladesh', 'main', 'the', 'and']);

function tokens(text: string, stop: Set<string>): string[] {
  return text.
  toLowerCase().
  replace(/[^\p{L}\p{N}\s]/gu, ' ').
  split(/\s+/).
  filter((t) => t.length > 1 && !stop.has(t) && !/^\d+$/.test(t));
}

/** Loose stem so "textile"/"textiles" or "mill"/"mills" compare equal. */
function stem(t: string): string {
  return t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t;
}

function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a.map(stem));
  const sb = new Set(b.map(stem));
  let shared = 0;
  sa.forEach((t) => sb.has(t) && shared++);
  return shared / Math.min(sa.size, sb.size);
}

export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export function similarName(a: string, b: string): boolean {
  const ta = tokens(a, NAME_STOP);
  const tb = tokens(b, NAME_STOP);
  return ta.length > 0 && tb.length > 0 && overlap(ta, tb) >= 0.6;
}

export function similarAddress(a: string, b: string): boolean {
  const ta = tokens(a, ADDRESS_STOP);
  const tb = tokens(b, ADDRESS_STOP);
  return ta.length >= 1 && tb.length >= 1 && overlap(ta, tb) >= 0.6;
}

export interface MatchInput {
  company: string;
  companyBn?: string;
  contactPhone: string;
  address: string;
  siteAddress: string;
  serviceType: ServiceType;
  customerId?: string;
  ownerId: string;
}

export interface PossibleMatch {
  ref: EntityRef;
  name: string;
  owner?: string;
  reasons: string[];
}

export interface BlockingConflict {
  opportunity: Opportunity;
  reason: string;
}

/**
 * Confirmed conflicts block creation: an active opportunity for the same confirmed customer,
 * same service and same site. A different site or service is a legitimate addition.
 */
export function findBlockingConflict(db: DemoDatabase, input: MatchInput, excludeId?: string): BlockingConflict | null {
  if (!input.customerId) return null;
  const hit = db.opportunities.find(
    (o) =>
    o.id !== excludeId &&
    isActive(o) &&
    o.customerId === input.customerId &&
    o.serviceType === input.serviceType &&
    similarAddress(o.siteAddress, input.siteAddress)
  );
  if (!hit) return null;
  const same = hit.ownerId === input.ownerId;
  return {
    opportunity: hit,
    reason: same ?
    `You already have ${hit.id} open for this service at this site.` :
    `${hit.id} for this customer, service and site is already assigned to another salesperson.`
  };
}

/** Similar names, phones or addresses only raise a review warning — never a block or an automatic merge. */
export function findPossibleMatches(db: DemoDatabase, input: MatchInput, excludeLeadId?: string): PossibleMatch[] {
  const out: PossibleMatch[] = [];
  const phone = phoneKey(input.contactPhone);

  db.leads.forEach((l) => {
    if (l.id === excludeLeadId || l.status === 'Merged') return;
    const reasons: string[] = [];
    if (similarName(input.company, l.company) || !!input.companyBn && input.companyBn === l.companyBn) reasons.push(`Similar name to ${l.company}`);
    if (phone && phone === phoneKey(l.contactPhone)) reasons.push(`Same phone as ${l.company} (${l.contactPhone})`);
    if (input.address && similarAddress(input.address, l.address)) reasons.push(`Similar address to ${l.company}`);
    if (!reasons.length) return;
    // Explicitly linked to the same existing customer — that's a deliberate addition, not a duplicate.
    const opp = db.opportunities.find((o) => o.leadId === l.id);
    if (input.customerId && opp?.customerId === input.customerId) return;
    out.push({ ref: opp ? { type: 'opportunity', id: opp.id } : { type: 'lead', id: l.id }, name: l.company, owner: opp?.ownerId ?? l.ownerId, reasons });
  });

  db.customers.forEach((c) => {
    if (c.id === input.customerId) return;
    const reasons: string[] = [];
    if (similarName(input.company, c.name)) reasons.push(`Similar name to customer ${c.name}`);
    db.sites.
    filter((s) => s.customerId === c.id).
    forEach((s) => {
      if (phone && phone === phoneKey(s.contactPhone) && !reasons.some((r) => r.startsWith('Same phone'))) reasons.push(`Same phone as ${c.name} site contact`);
      if (input.siteAddress && similarAddress(input.siteAddress, s.address) && !reasons.some((r) => r.startsWith('Similar address'))) reasons.push(`Similar address to ${c.name} — ${s.name}`);
    });
    if (reasons.length && !out.some((m) => m.name === c.name)) out.push({ ref: { type: 'customer', id: c.id }, name: c.name, owner: c.accountManagerId, reasons });
  });

  return out;
}