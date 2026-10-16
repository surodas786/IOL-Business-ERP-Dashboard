import { formatBDT, formatDhaka } from '../../utils/format';
import { taxLabel, taxTreatment } from '../../utils/quoteRules';
import type { DemoDatabase } from '../../types/records';
import type { WorkOrderSnapshot } from '../../types/quotation';

/** Scope and technical parameters for the Technical handover. Contains no prices, margins or commissions. */
export function technicalRows(s: WorkOrderSnapshot, ggcLabel: string, fnnLabel: string): {scope: [string, string][];params: [string, string][];} {
  const t = s.terms;
  const x = s.technical ?? {};
  const scope: [string, string][] = [
  ['Site', `${t.siteName} — ${t.siteAddress}`],
  ['Service', `${t.serviceType} · ${t.bandwidthMbps} Mbps`],
  ['Scope', t.description],
  ['Installation deadline', formatDhaka(s.deadline, { year: true })],
  ['Customer equipment', t.equipment.map((e) => `${e.item} (${e.ownership})`).join('; ')]];

  const params: [string, string][] = [];
  const add = (k: string, v: string | undefined | boolean) => {
    if (v === undefined || v === '') return;
    params.push([k, typeof v === 'boolean' ? v ? 'Required' : 'Not required' : v]);
  };
  add('Delivery medium', x.medium);
  add('Nearby PoP', x.nearbyPop && `${x.nearbyPop}${x.popDistanceM ? ` · ${x.popDistanceM} m` : ''}`);
  add('Route', x.route);
  add('Last-mile responsibility', x.lastMile);
  add('NTTN / upstream', x.nttn && `${x.nttn}${x.nttnNotes ? ` — ${x.nttnNotes}` : ''}`);
  add('Capacity', x.capacity && `${x.capacity}${x.capacityNotes ? ` — ${x.capacityNotes}` : ''}`);
  if (x.ggcRequired !== undefined) add(ggcLabel, x.ggcRequired ? `Required${x.ggcNotes ? ` — ${x.ggcNotes}` : ''}` : 'Not required');
  if (x.fnnRequired !== undefined) add(fnnLabel, x.fnnRequired ? `Required${x.fnnNotes ? ` — ${x.fnnNotes}` : ''}` : 'Not required');
  add('Latency target', x.latencyMs && `${x.latencyMs} ms`);
  add('MTU', x.mtu);
  add('Redundancy', x.redundancy);
  add('IP requirement', x.ipRequirement);
  add('Power', x.power);
  add('Grounding', x.grounding);
  add('Rack', x.rack);
  add('Installation constraints', x.constraints);
  if (params.length === 0) params.push(['Technical parameters', s.bypassId ? `Survey bypassed (${s.bypassId}) — confirm on site before installation` : 'Not recorded']);
  return { scope, params };
}

/** Billing terms and commissioning date for the Accounts handover. Contains no network configuration. */
export function accountsRows(db: DemoDatabase, s: WorkOrderSnapshot): [string, string][] {
  const t = s.terms;
  return [
  ['Approved commissioning date', formatDhaka(s.commissioningDate, { year: true })],
  ['Billing starts', 'On commissioning, pro-rated for the first month'],
  ['MRC', formatBDT(t.mrc)],
  ['OTC', formatBDT(t.otc)],
  ['Payment terms', t.billingTerm === 'Prepaid' ? 'Prepaid — monthly in advance' : `Postpaid — ${t.creditDays} days credit`],
  ['Advance requirement', t.advanceRequired > 0 ? formatBDT(t.advanceRequired) : 'None'],
  ['Security deposit (refundable)', t.securityDeposit > 0 ? formatBDT(t.securityDeposit) : 'None'],
  ['Tax treatment', taxLabel(taxTreatment(db, t.taxTreatmentId))],
  ['Contract duration', `${t.contractMonths} months`],
  ['Billable service', `${t.serviceType} · ${t.bandwidthMbps} Mbps · ${t.siteName}`]];

}