import { formatDhakaDate } from './format';
import { assessmentGaps, clearanceDone, closureGaps, needsCommercial, resumptionState } from './serviceChangeRules';
import type { Permission, Severity } from '../types/erp';
import type { DemoDatabase } from '../types/records';

export interface ServiceChangeTask {
  id: string;
  changeId: string;
  title: string;
  detail: string;
  severity: Severity;
  at: string;
  timeLabel: string;
  /** Permission needed to act. */
  requires: Permission[];
}

/** Open steps across all service changes, each owned by one department. */
export function serviceChangeTasks(db: DemoDatabase): ServiceChangeTask[] {
  const out: ServiceChangeTask[] = [];
  db.serviceChanges.forEach((s) => {
    const push = (key: string, t: Omit<ServiceChangeTask, 'id' | 'changeId'>) => out.push({ id: `sc-${key}-${s.id}`, changeId: s.id, ...t });
    if (s.status === 'Requested') {
      if (s.type === 'Resumption') {
        push('verify', { title: 'Verify resumption before reactivating', detail: 'Service stays stopped until Technical confirms it works', severity: 'warning', at: s.requestedAt, timeLabel: 'Requested', requires: ['technicalConfig'] });
        return;
      }
      const gaps = assessmentGaps(s);
      if (!s.technicalImpact) push('tech', { title: `Assess ${s.type.toLowerCase()}`, detail: s.type === 'Shifting' ? 'Mini-feasibility at destination' : s.type === 'Upgrade' || s.type === 'Downgrade' ? 'Validate capacity' : 'Technical impact', severity: 'neutral', at: s.requestedAt, timeLabel: 'Requested', requires: ['technicalConfig'] });else
      if (gaps.some((g) => g.startsWith('Capacity') || g.startsWith('Destination'))) push('blocked', { title: `${s.type} blocked by technical assessment`, detail: gaps.join(' · '), severity: 'warning', at: s.technicalImpact.at, timeLabel: 'Assessed', requires: ['createQuotation'] });
      if (needsCommercial(s.type) && (!s.commercialImpact || gaps.some((g) => g.includes('MRC') || g.includes('Cost bearer')))) push('com', { title: `Add commercial impact for ${s.type.toLowerCase()}`, detail: 'Needed before approval', severity: 'neutral', at: s.requestedAt, timeLabel: 'Requested', requires: ['viewFinancials'] });
    }
    if (s.status === 'Approved') {
      push('impl', {
        title: s.type === 'Discontinuation' ? 'Record service stop' : s.type === 'Temporary Stop' ? 'Carry out temporary stop' : `Implement ${s.type.toLowerCase()}`,
        detail: `Effective ${formatDhakaDate(s.effectiveDate!)}`,
        severity: 'info', at: s.effectiveDate!, timeLabel: 'Effective', requires: ['technicalConfig']
      });
    }
    if (s.type === 'Temporary Stop' && s.status === 'Stopped') {
      const st = resumptionState(s);
      if (st !== 'not-due' && !s.resumptionId)
      push('resume', {
        title: st === 'overdue' ? 'Expected resumption passed — still stopped' : 'Resumption due soon',
        detail: `Expected ${formatDhakaDate(s.expectedResumption!)} · raise a resumption request; reactivation needs Technical verification`,
        severity: st === 'overdue' ? 'critical' : 'warning', at: s.expectedResumption!, timeLabel: 'Expected', requires: []
      });
    }
    if (s.type === 'Discontinuation' && s.clearances && s.status !== 'Closed') {
      const { technical, accounts } = s.clearances;
      if (!clearanceDone(technical) && technical.status !== 'Exception Requested') push('tclr', { title: 'Technical clearance', detail: 'Equipment retrieval, damage, loss and exceptions', severity: 'warning', at: s.decidedAt ?? s.requestedAt, timeLabel: 'Opened', requires: ['technicalConfig'] });
      if (!clearanceDone(accounts) && accounts.status !== 'Exception Requested') push('aclr', { title: 'Accounts clearance', detail: 'Final invoice, dues, advance, deposit and refunds', severity: 'warning', at: s.decidedAt ?? s.requestedAt, timeLabel: 'Opened', requires: ['recordCollection'] });
      if (!closureGaps(s).length) push('close', { title: 'Ready for administrative closure', detail: 'Both clearances complete', severity: 'info', at: s.serviceStoppedAt ?? s.requestedAt, timeLabel: 'Stopped', requires: ['manageWorkOrders'] });
    }
    if (s.type === 'Shifting' && s.status === 'Implemented' && s.relocationCharge && !s.relocationInvoiceId)
    push('reloc', { title: 'Invoice relocation charge', detail: 'Approved one-time charge', severity: 'neutral', at: s.evidence?.at ?? s.requestedAt, timeLabel: 'Implemented', requires: ['recordCollection'] });
  });
  return out;
}