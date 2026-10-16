import { associates as baseAssociates } from './finance';
import { calculate, dueDateFor } from '../../utils/associateRules';
import type { Associate, DemoDatabase } from '../../types/records';
import type { AssociateLedgerEntry, AssociateProfile, AssociateSettlement, SettlementRule, SettlementStatus } from '../../types/associate';

/** FICTIONAL DEMO DATA — Associate (local ISP / MAC partner) agreements and settlements. */

const profiles: Record<string, AssociateProfile & Partial<Associate>> = {
  'AS-201': {
    address: 'House 14, Sector 7, Uttara, Dhaka 1230', tradeLicenceNo: 'DNCC-TL-0412-2024', territory: 'Uttara Sectors 3–7 and Diabari', responsibleExecutiveId: 'u-03',
    backbone: 'IOL', lastMile: 'Associate', sharingBasis: 'Revenue after defined deductions', agreementStart: '2024-02-01T00:00:00+06:00', agreementEnd: '2027-01-31T23:59:00+06:00',
    settlementDay: 10, graceDays: 5, creditLimit: 0, creditDays: 0, depositRequired: 50000, clientIdPrefix: 'UNP', minRenewalDays: 30, maxRenewalDays: 90, vatBearer: 'Subscriber',
    servicesSummary: '420 home broadband subscribers on IOL-billed packages; 2 sub-associates downstream.', status: 'Active', controls: { autoRecharge: true, networkRestricted: false },
    contacts: [{ role: 'Owner', name: 'Mizanur Rahman', phone: '+880 1716-552301', email: 'mizan@uttaranetpoint.demo' }, { role: 'Technical', name: 'Rafiq Hasan', phone: '+880 1817-002144' }],
    terms: '30% of revenue after defined deductions · centralised collection'
  },
  'AS-202': {
    address: 'Station Road, Pahartali, Chattogram 4202', tradeLicenceNo: 'CCC-TL-1180-2023', territory: 'Pahartali, Ak Khan and Foy’s Lake', responsibleExecutiveId: 'u-15',
    backbone: 'IOL', lastMile: 'Associate', revenueSharePct: 35, sharingBasis: 'Collected revenue', agreementStart: '2023-11-01T00:00:00+06:00', agreementEnd: '2026-10-31T23:59:00+06:00',
    settlementDay: 20, graceDays: 15, creditLimit: 150000, creditDays: 30, depositRequired: 100000, clientIdPrefix: 'PCN', minRenewalDays: 30, maxRenewalDays: 60, vatBearer: 'Associate',
    servicesSummary: '610 cable-and-net subscribers; collects directly and keeps a 35% share.', status: 'Suspension Review', controls: { autoRecharge: true, networkRestricted: false },
    contacts: [{ role: 'Owner', name: 'Nurul Absar', phone: '+880 1818-660172' }, { role: 'Billing', name: 'Shahana Parvin', phone: '+880 1819-330045' }],
    terms: '35% of collected revenue · decentralised collection'
  },
  'AS-203': {
    address: 'Zindabazar Point, Sylhet 3100', tradeLicenceNo: 'SCC-TL-0778-2024', territory: 'Zindabazar and Amberkhana', responsibleExecutiveId: 'u-02',
    backbone: 'IOL', lastMile: 'Associate', agreementStart: '2024-06-01T00:00:00+06:00', agreementEnd: '2027-05-31T23:59:00+06:00',
    settlementDay: 10, graceDays: 7, creditLimit: 200000, creditDays: 15, depositRequired: 150000, clientIdPrefix: 'ZLS', minRenewalDays: 30, maxRenewalDays: 180, vatBearer: 'Associate',
    servicesSummary: '500 Mbps IP transit; ~380 downstream subscribers managed by the associate.', status: 'Active', controls: { autoRecharge: true, networkRestricted: false },
    contacts: [{ role: 'Owner', name: 'Delwar Hossain', phone: '+880 1711-509634' }],
    terms: 'Fixed ৳ 1,50,000 per month'
  }
};

const extra: Associate[] = [
{
  id: 'AS-204', name: 'Diabari Net Care', nameBn: 'দিয়াবাড়ি নেট কেয়ার', collectionModel: 'Centralised', terms: '12% of collected revenue · centralised collection', revenueSharePct: 12, subscribers: 160,
  contactName: 'Sohel Rana', contactPhone: '+880 1712-445190', billingAccountId: '', since: '2025-03-01T10:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  parentId: 'AS-201', territory: 'Diabari and Uttara Sector 15', responsibleExecutiveId: 'u-03', backbone: 'IOL', lastMile: 'Associate', sharingBasis: 'Collected revenue',
  agreementStart: '2025-03-01T00:00:00+06:00', agreementEnd: '2027-02-28T23:59:00+06:00', settlementDay: 18, graceDays: 5, creditLimit: 0, creditDays: 0, depositRequired: 25000,
  clientIdPrefix: 'DNC', minRenewalDays: 30, maxRenewalDays: 90, vatBearer: 'Subscriber', servicesSummary: '160 subscribers carved out of Uttara Net Point’s territory.', status: 'Active',
  controls: { autoRecharge: true, networkRestricted: false }, contacts: [{ role: 'Owner', name: 'Sohel Rana', phone: '+880 1712-445190' }]
},
{
  id: 'AS-205', name: 'Turag Home Net', nameBn: 'তুরাগ হোম নেট', collectionModel: 'Centralised', terms: '5% of invoiced revenue · centralised collection', revenueSharePct: 5, subscribers: 54,
  contactName: 'Kawsar Ahmed', contactPhone: '+880 1913-207761', billingAccountId: '', since: '2026-07-01T10:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  parentId: 'AS-204', territory: 'Turag riverside blocks', responsibleExecutiveId: 'u-14', backbone: 'IOL', lastMile: 'Shared', sharingBasis: 'Invoiced revenue',
  agreementStart: '2026-07-01T00:00:00+06:00', agreementEnd: '2027-06-30T23:59:00+06:00', settlementDay: 18, graceDays: 5, creditLimit: 0, creditDays: 0, depositRequired: 10000,
  clientIdPrefix: 'THN', minRenewalDays: 30, maxRenewalDays: 60, vatBearer: 'Subscriber', servicesSummary: '54 subscribers; third tier under Diabari Net Care.', status: 'Active',
  controls: { autoRecharge: true, networkRestricted: false }, contacts: [{ role: 'Owner', name: 'Kawsar Ahmed', phone: '+880 1913-207761' }]
}];


export const associateList: Associate[] = [...baseAssociates.map((a) => ({ ...a, ...profiles[a.id] })), ...extra];

export const settlementRules: SettlementRule[] = [
{ id: 'SR-001', kind: 'Tax', label: 'VAT on internet service', method: 'Percent of revenue', value: 5, effectiveFrom: '2024-01-01T00:00:00+06:00', createdById: 'u-10', createdAt: '2024-01-01T10:00:00+06:00' },
{ id: 'SR-002', kind: 'Discount', label: 'Promotional discounts', method: 'Percent of revenue', value: 1.5, effectiveFrom: '2025-07-01T00:00:00+06:00', createdById: 'u-09', createdAt: '2025-06-25T10:00:00+06:00' },
{ id: 'SR-003', kind: 'OTC', label: 'Connection fees retained by IOL', method: 'Fixed per settlement', value: 4000, effectiveFrom: '2025-01-01T00:00:00+06:00', createdById: 'u-09', createdAt: '2024-12-20T10:00:00+06:00' },
{ id: 'SR-004', kind: 'Direct cost', label: 'Upstream bandwidth cost', method: 'Per subscriber', value: 120, effectiveFrom: '2025-01-01T00:00:00+06:00', createdById: 'u-10', createdAt: '2024-12-20T10:00:00+06:00' },
{ id: 'SR-005', associateId: 'AS-202', kind: 'Refund', label: 'Subscriber refunds (back-dated)', method: 'Fixed per settlement', value: 2500, effectiveFrom: '2026-08-01T00:00:00+06:00', createdById: 'u-09', createdAt: '2026-10-12T15:20:00+06:00' }];


const asc = (id: string) => associateList.find((a) => a.id === id)!;

function settle(
id: string, associateId: string, period: string, inputs: AssociateSettlement['inputs'], status: SettlementStatus, extra: Partial<AssociateSettlement> = {}, ruleFilter?: (r: SettlementRule) => boolean)
: AssociateSettlement {
  const a = asc(associateId);
  const rules = ruleFilter ? settlementRules.filter(ruleFilter) : settlementRules;
  const calc = calculate({ settlementRules: rules } as DemoDatabase, a, period, inputs, extra.declaration?.amount);
  return {
    id, associateId, period, model: a.collectionModel, inputs, ...calc, calculatedAt: extra.calculatedAt ?? `${period}-28T10:00:00+06:00`, status, dueDate: dueDateFor(a, period),
    remittances: [], disputes: [], history: [], ...extra
  };
}

const h = (at: string, byId: string, detail: string) => ({ at, byId, detail });

export const associateSettlements: AssociateSettlement[] = [
settle('ASM-2026-0011', 'AS-204', '2026-09', { invoiced: 51200, collected: 48000, subscribers: 160 }, 'Draft', {
  calculatedAt: '2026-10-14T16:00:00+06:00', history: [h('2026-10-14T16:00:00+06:00', 'u-09', 'Draft created for Sep 2026')]
}),
settle('ASM-2026-0010', 'AS-202', '2026-09', { invoiced: 189000, collected: 0, subscribers: 604 }, 'Draft', {
  declaration: { amount: 172000, reference: 'Declaration PCN-SEP-26', at: '2026-10-08T12:00:00+06:00' }, calculatedAt: '2026-10-13T11:00:00+06:00',
  history: [h('2026-10-13T11:00:00+06:00', 'u-09', 'Draft created for Sep 2026 · declaration ৳ 1,72,000 (not a remittance)')]
}),
settle('ASM-2026-0009', 'AS-201', '2026-09', { invoiced: 132000, collected: 126000, subscribers: 420 }, 'Reviewed', {
  approvalId: 'AP-2026-0105', calculatedAt: '2026-10-14T17:30:00+06:00',
  history: [h('2026-10-14T17:30:00+06:00', 'u-09', 'Draft created for Sep 2026'), h('2026-10-15T09:30:00+06:00', 'u-09', 'Reviewed by Moushumi Akter')]
}),
settle('ASM-2026-0008', 'AS-203', '2026-09', { invoiced: 0, collected: 0, subscribers: 380 }, 'Approved', {
  history: [h('2026-10-01T10:00:00+06:00', 'u-09', 'Draft created for Sep 2026'), h('2026-10-01T11:00:00+06:00', 'u-09', 'Reviewed by Moushumi Akter'), h('2026-10-02T10:00:00+06:00', 'u-10', 'Approved — receivable ৳ 1,57,500. Figures are now locked.')]
}),
settle('ASM-2026-0007', 'AS-202', '2026-08', { invoiced: 194000, collected: 0, subscribers: 610 }, 'Approved', {
  declaration: { amount: 180000, reference: 'Declaration PCN-AUG-26', at: '2026-09-06T12:00:00+06:00' }, calculatedAt: '2026-09-08T10:00:00+06:00',
  remittances: [
  { id: 'ASM-2026-0007-R1', amount: 70000, at: '2026-09-19T14:00:00+06:00', reference: 'DBBL dep. 4471209', recordedById: 'u-09', verified: true, verifiedById: 'u-10', verifiedAt: '2026-09-21T11:00:00+06:00' },
  { id: 'ASM-2026-0007-R2', amount: 20000, at: '2026-10-13T16:10:00+06:00', reference: 'bKash TrxID 9KP31LQ2', recordedById: 'u-09', verified: false }],

  disputes: [{ id: 'ASM-2026-0007-D1', amount: 12000, reason: 'Associate says 40 subscribers were disconnected mid-August after a fibre cut and should not count in full.', raisedAt: '2026-09-25T12:00:00+06:00', raisedById: 'u-09', status: 'Open' }],
  history: [h('2026-09-08T10:00:00+06:00', 'u-09', 'Draft created for Aug 2026 · declaration ৳ 1,80,000 (not a remittance)'), h('2026-09-09T10:00:00+06:00', 'u-09', 'Reviewed by Moushumi Akter'), h('2026-09-10T15:00:00+06:00', 'u-10', 'Approved — receivable ৳ 1,17,000. Figures are now locked.')]
}, (r) => r.id !== 'SR-005'),
settle('ASM-2026-0006', 'AS-203', '2026-08', { invoiced: 0, collected: 0, subscribers: 380 }, 'Reconciled', {
  paidAt: '2026-09-09T12:00:00+06:00', remittances: [{ id: 'ASM-2026-0006-R1', amount: 157500, at: '2026-09-09T12:00:00+06:00', reference: 'EBL TT 88213', recordedById: 'u-09', verified: true, verifiedById: 'u-10', verifiedAt: '2026-09-10T10:00:00+06:00' }],
  history: [h('2026-09-02T10:00:00+06:00', 'u-10', 'Approved'), h('2026-09-10T10:00:00+06:00', 'u-09', 'Reconciled against the bank statement')]
}),
settle('ASM-2026-0005', 'AS-201', '2026-08', { invoiced: 129000, collected: 124500, subscribers: 418 }, 'Reconciled', {
  paidAt: '2026-09-09T15:00:00+06:00', paymentReference: 'BEFTN 20260909-1182',
  history: [h('2026-09-05T10:00:00+06:00', 'u-10', 'Approved'), h('2026-09-09T15:00:00+06:00', 'u-09', 'Paid'), h('2026-09-12T10:00:00+06:00', 'u-09', 'Reconciled against the bank statement')]
})];


const byId = (id: string) => associateSettlements.find((s) => s.id === id)!;
let n = 0;
const entry = (associateId: string, bucket: AssociateLedgerEntry['bucket'], amount: number, at: string, description: string, settlementId?: string): AssociateLedgerEntry => ({
  id: `AL-${String(++n).padStart(5, '0')}`, associateId, bucket, amount, at, description, settlementId, byId: 'u-09'
});

export const associateLedger: AssociateLedgerEntry[] = [
entry('AS-201', 'Security Deposit', 50000, '2024-02-01T10:00:00+06:00', 'Agreement deposit · cheque 551203'),
entry('AS-201', 'Collection', byId('ASM-2026-0005').payout, '2026-09-05T10:00:00+06:00', 'Aug 2026 share payable to associate', 'ASM-2026-0005'),
entry('AS-201', 'Collection', -byId('ASM-2026-0005').payout, '2026-09-09T15:00:00+06:00', 'Aug 2026 share paid · BEFTN 20260909-1182', 'ASM-2026-0005'),
entry('AS-202', 'Security Deposit', 100000, '2023-11-01T10:00:00+06:00', 'Agreement deposit · pay order 30091'),
entry('AS-202', 'Advance', 20000, '2026-08-02T10:00:00+06:00', 'Advance against future receivables · DBBL 4401187'),
entry('AS-202', 'Due', byId('ASM-2026-0007').receivable, '2026-09-10T15:00:00+06:00', 'Aug 2026 receivable due to IOL', 'ASM-2026-0007'),
entry('AS-202', 'Due', -70000, '2026-09-21T11:00:00+06:00', 'Verified remittance DBBL dep. 4471209', 'ASM-2026-0007'),
entry('AS-203', 'Security Deposit', 150000, '2024-06-01T10:00:00+06:00', 'Agreement deposit · bank guarantee BG-2207'),
entry('AS-203', 'Due', byId('ASM-2026-0006').receivable, '2026-09-02T10:00:00+06:00', 'Aug 2026 fixed monthly amount due to IOL', 'ASM-2026-0006'),
entry('AS-203', 'Due', -byId('ASM-2026-0006').receivable, '2026-09-10T10:00:00+06:00', 'Verified remittance EBL TT 88213', 'ASM-2026-0006'),
entry('AS-203', 'Due', byId('ASM-2026-0008').receivable, '2026-10-02T10:00:00+06:00', 'Sep 2026 fixed monthly amount due to IOL', 'ASM-2026-0008'),
entry('AS-204', 'Security Deposit', 25000, '2025-03-01T10:00:00+06:00', 'Agreement deposit'),
entry('AS-205', 'Security Deposit', 10000, '2026-07-01T10:00:00+06:00', 'Agreement deposit')];