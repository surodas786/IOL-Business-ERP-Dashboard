import { dhakaDayAt } from './format';
import { defaultCommission, rateCardMrc, rateCardOtc } from './quoteRules';
import type { DemoDatabase, Opportunity } from '../types/records';
import type { EquipmentTerm, QuotationTerms } from '../types/quotation';

/** Starting terms for a new quotation, taken from the opportunity and its approved survey. */
export function defaultTerms(db: DemoDatabase, opp: Opportunity, nowIso: string): QuotationTerms {
  const survey = db.surveys.find((s) => s.opportunityId === opp.id && s.status === 'Approved');
  const agent = opp.agentId ? db.salesAgents.find((a) => a.id === opp.agentId) : undefined;
  const site = opp.customerId ? db.sites.find((s) => s.customerId === opp.customerId && s.address === opp.siteAddress) : undefined;
  const fibreM = survey?.fibreDistanceM ?? (Number(survey?.tech?.popDistanceM) || undefined);
  const equipment: EquipmentTerm[] = (survey?.bom ?? []).
  filter((l) => l.ownership !== 'IOL-owned · consumed').
  map((l, i) => ({
    id: `EQ-${i + 1}`,
    item: l.item,
    ownership: l.ownership,
    returnCondition: l.ownership === 'IOL-owned · returnable' ? `Return on disconnection in working order; replacement charged at cost if lost or damaged.` : l.ownership === 'Customer-owned' ? 'Customer supplied; IOL does not take ownership.' : 'Remains with the partner.'
  }));
  if (equipment.length === 0) equipment.push({ id: 'EQ-1', item: 'Huawei EG8145V5 ONT', ownership: 'IOL-owned · returnable', returnCondition: 'Return within 15 days of disconnection in working order; replacement charged if lost or damaged.' });
  const mrc = opp.expectedMrc;
  return {
    siteId: site?.id,
    siteName: opp.siteName,
    siteAddress: opp.siteAddress,
    serviceType: opp.serviceType,
    bandwidthMbps: opp.bandwidthMbps,
    description: `${opp.serviceType} ${opp.bandwidthMbps} Mbps${survey?.tech?.medium ? `, ${survey.tech.medium.toLowerCase()}` : ''}`,
    listMrc: rateCardMrc(opp.serviceType, opp.bandwidthMbps),
    listOtc: rateCardOtc(fibreM),
    mrc,
    otc: opp.otc,
    advanceRequired: mrc,
    securityDeposit: 10000,
    billingTerm: 'Prepaid',
    creditDays: 0,
    taxTreatmentId: 'TX-01',
    contractMonths: 24,
    leadTimeDays: Number(survey?.tech?.deliveryDays) || 14,
    validUntil: dhakaDayAt(nowIso, 30, '23:59'),
    equipment,
    agentId: opp.agentId,
    agentCommission: agent ? defaultCommission(agent.commissionRule, mrc) : 0,
    marginPct: opp.marginPct
  };
}