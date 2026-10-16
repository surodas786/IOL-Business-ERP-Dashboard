import { salesAgents as baseAgents } from './finance';
import type { Approval, SalesAgent } from '../../types/records';
import type { ApprovalRule } from '../../types/admin';
import type { AgentAttribution, AgentProfile, AgentSettlement, AttributionReassignment, CommissionAccrual, CommissionProposal } from '../../types/agent';

/** FICTIONAL DEMO DATA — sales agents, attributions and commissions. */

const profiles: Record<string, AgentProfile & Partial<SalesAgent>> = {
  'SA-301': {
    nid: '1992 2615 0448 731', email: 'karim.molla@agents.demo', address: 'House 22, Road 4, Section 6, Mirpur, Dhaka 1216', territory: 'Mirpur, Pallabi and Dhanmondi',
    agreementStart: '2025-01-01T00:00:00+06:00', agreementEnd: '2026-12-31T23:59:00+06:00', standardBasis: 'MRC', standardArrangement: 'One-time', standardMrcPct: 80, standardOtcPct: 0, standardMonths: 1,
    payment: { method: 'Bank transfer', accountName: 'Md. Karim Molla', accountNumber: '1071510045821', bankName: 'Dutch-Bangla Bank PLC', branchName: 'Mirpur 10', routingNo: '090262728', updatedAt: '2025-01-03T11:00:00+06:00', updatedById: 'u-09' },
    commissionRule: 'Standard: 80% of first-month MRC (each deal approved separately)', createdAt: '2025-01-01T10:00:00+06:00'
  },
  'SA-302': {
    nid: '1988 1532 7790 214', email: 'shirin.akter@agents.demo', address: 'Lane 3, Halishahar H-Block, Chattogram 4216', territory: 'Chattogram — Halishahar, Agrabad, Pahartali',
    agreementStart: '2025-04-01T00:00:00+06:00', agreementEnd: '2027-03-31T23:59:00+06:00', standardBasis: 'MRC + OTC', standardArrangement: 'Recurring', standardMrcPct: 5, standardOtcPct: 10, standardMonths: 12,
    payment: { method: 'bKash', accountName: 'Shirin Akter', accountNumber: '01819305587', updatedAt: '2025-04-02T10:00:00+06:00', updatedById: 'u-09' },
    commissionRule: 'Standard: 5% of MRC × 12 months + 10% of OTC', createdAt: '2025-04-01T10:00:00+06:00'
  }
};

export const agentList: SalesAgent[] = [
...baseAgents.map((a) => ({ ...a, ...profiles[a.id] })),
{
  id: 'SA-303', name: 'Abdul Hannan', nameBn: 'আব্দুল হান্নান', phone: '+880 1712-904377', commissionRule: 'Standard: 60% of first-month MRC', activations: 0, commissionApprovedYtd: 0, status: 'Active',
  branchId: 'sylhet', zoneId: 'zindabazar', territory: 'Sylhet city — Zindabazar and Amberkhana', agreementStart: '2026-10-01T00:00:00+06:00', agreementEnd: '2027-09-30T23:59:00+06:00',
  standardBasis: 'MRC', standardArrangement: 'One-time', standardMrcPct: 60, standardOtcPct: 0, standardMonths: 1, createdAt: '2026-10-01T10:00:00+06:00'
}];


export const agentAttributions: AgentAttribution[] = [
{ id: 'AT-0001', agentId: 'SA-301', customerId: 'CU-1003', salespersonId: 'u-14', effectiveFrom: '2026-06-10T10:00:00+06:00', createdById: 'u-05', createdAt: '2026-06-10T10:00:00+06:00' },
{ id: 'AT-0002', agentId: 'SA-302', customerId: 'CU-1007', salespersonId: 'u-02', effectiveFrom: '2026-05-20T10:00:00+06:00', createdById: 'u-05', createdAt: '2026-05-20T10:00:00+06:00' },
{ id: 'AT-0003', agentId: 'SA-301', customerId: 'CU-1006', salespersonId: 'u-03', effectiveFrom: '2026-09-03T12:00:00+06:00', createdById: 'u-05', createdAt: '2026-09-03T12:00:00+06:00' },
{ id: 'AT-0004', agentId: 'SA-302', customerId: 'CU-1004', salespersonId: 'u-15', effectiveFrom: '2026-08-20T10:00:00+06:00', effectiveTo: '2026-10-09T23:59:00+06:00', supersededById: 'AT-0005', createdById: 'u-05', createdAt: '2026-08-20T10:00:00+06:00' },
{ id: 'AT-0005', agentId: 'SA-302', customerId: 'CU-1004', salespersonId: 'u-02', effectiveFrom: '2026-10-10T00:00:00+06:00', createdById: 'u-02', createdAt: '2026-10-09T16:00:00+06:00', reassignmentId: 'RA-2026-0001', note: 'Jubayer moved to the bank segment; Business Head takes the account through activation.' },
{ id: 'AT-0006', agentId: 'SA-302', customerId: 'CU-1011', salespersonId: 'u-15', effectiveFrom: '2026-10-06T11:00:00+06:00', createdById: 'u-05', createdAt: '2026-10-06T11:00:00+06:00' },
{ id: 'AT-0007', agentId: 'SA-301', customerId: 'CU-1010', salespersonId: 'u-14', effectiveFrom: '2026-10-14T15:00:00+06:00', createdById: 'u-05', createdAt: '2026-10-14T15:00:00+06:00' }];


export const attributionReassignments: AttributionReassignment[] = [
{
  id: 'RA-2026-0002', attributionId: 'AT-0007', customerId: 'CU-1010', fromAgentId: 'SA-301', fromSalespersonId: 'u-14', toAgentId: 'SA-301', toSalespersonId: 'u-03', effectiveDate: '2026-11-01T00:00:00+06:00',
  reason: 'Sadia is on leave in November; Tanvir already covers Karim’s Mirpur accounts.', requestedById: 'u-05', requestedAt: '2026-10-15T09:10:00+06:00', status: 'Pending Approval', approvalId: 'AP-2026-0121'
},
{
  id: 'RA-2026-0001', attributionId: 'AT-0004', customerId: 'CU-1004', fromAgentId: 'SA-302', fromSalespersonId: 'u-15', toAgentId: 'SA-302', toSalespersonId: 'u-02', effectiveDate: '2026-10-10T00:00:00+06:00',
  reason: 'Jubayer moved to the bank segment; Business Head takes the account through activation.', requestedById: 'u-05', requestedAt: '2026-10-08T14:00:00+06:00', status: 'Approved', decidedById: 'u-02', decidedAt: '2026-10-09T16:00:00+06:00', decisionNote: 'Approved'
}];


const h = (at: string, byId: string, detail: string) => ({ at, byId, detail });

export const commissionProposals: CommissionProposal[] = [
{
  id: 'CP-2026-0013', agentId: 'SA-302', selfSale: false, customerId: 'CU-1011', salespersonId: 'u-15', attributionId: 'AT-0006', basis: 'MRC + OTC', arrangement: 'Recurring', months: 6, mrc: 35000, otc: 25000,
  proposedMrcPct: 6, proposedOtcPct: 10, qualifyingEvent: 'First invoice paid', cancellationTreatment: 'Reverse unpaid and recover paid within clawback window', clawbackMonths: 6,
  validFrom: '2026-10-14T00:00:00+06:00', validTo: '2027-01-31T23:59:00+06:00', status: 'Pending Approval', preparedById: 'u-05', preparedAt: '2026-10-14T16:20:00+06:00', approvalId: 'AP-2026-0120', revisions: [],
  history: [h('2026-10-14T16:20:00+06:00', 'u-05', 'Submitted by Sabina Yasmin')]
},
{
  id: 'CP-2026-0014', selfSale: true, customerId: 'CU-1005', salespersonId: 'u-02', workOrderId: 'WO-2026-0149', quotationId: 'QT-2026-0402', basis: 'MRC', arrangement: 'One-time', months: 1, mrc: 9000, otc: 0,
  proposedMrcPct: 0, proposedOtcPct: 0, approvedMrcPct: 0, approvedOtcPct: 0, qualifyingEvent: 'Service activation', cancellationTreatment: 'Reverse unpaid accruals only', clawbackMonths: 0,
  validFrom: '2026-10-02T00:00:00+06:00', validTo: '2026-12-31T23:59:00+06:00', status: 'Self-Sale', preparedById: 'u-05', preparedAt: '2026-10-03T10:00:00+06:00', revisions: [],
  history: [h('2026-10-03T10:00:00+06:00', 'u-05', 'Self-Sale recorded by Sabina Yasmin — no agent commission'), h('2026-10-03T10:00:00+06:00', 'u-05', 'Self-Sale (no commission) locked into WO-2026-0149')]
},
{
  id: 'CP-2026-0012', agentId: 'SA-302', selfSale: false, customerId: 'CU-1004', salespersonId: 'u-02', attributionId: 'AT-0005', workOrderId: 'WO-2026-0144', quotationId: 'QT-2026-0396', connectionId: 'CN-50188',
  basis: 'MRC + OTC', arrangement: 'Recurring', months: 12, mrc: 14000, otc: 20000, proposedMrcPct: 5, proposedOtcPct: 10, approvedMrcPct: 4, approvedOtcPct: 10, qualifyingEvent: 'Service activation',
  cancellationTreatment: 'Reverse unpaid and recover paid within clawback window', clawbackMonths: 6, validFrom: '2026-10-10T00:00:00+06:00', validTo: '2026-12-31T23:59:00+06:00', status: 'Approved',
  preparedById: 'u-05', preparedAt: '2026-10-10T10:00:00+06:00', decidedById: 'u-02', decidedAt: '2026-10-10T15:00:00+06:00', decisionNote: 'MRC is below rate card; recurring share reduced to keep payback within target.',
  revisions: [{ field: 'MRC %', from: 5, to: 4, reason: 'MRC is below rate card; recurring share reduced to keep payback within target.', byId: 'u-02', at: '2026-10-10T15:00:00+06:00' }],
  event: { at: '2026-10-12T18:10:00+06:00', evidence: 'CN-50188 activation record', confirmedById: 'u-05', confirmedAt: '2026-10-13T10:00:00+06:00' },
  history: [
  h('2026-10-10T10:00:00+06:00', 'u-05', 'Submitted by Sabina Yasmin'),
  h('2026-10-10T15:00:00+06:00', 'u-02', 'Approved — 4% of MRC × 12 months + 10% of OTC (revised)'),
  h('2026-10-10T15:00:00+06:00', 'u-02', '4% of MRC × 12 months + 10% of OTC locked into WO-2026-0144'),
  h('2026-10-13T10:00:00+06:00', 'u-05', 'Service activation confirmed for 12 Oct 2026 (CN-50188 activation record) — commission accrued for Oct 2026')]

},
{
  id: 'CP-2026-0011', agentId: 'SA-301', selfSale: false, customerId: 'CU-1006', salespersonId: 'u-03', attributionId: 'AT-0003', workOrderId: 'WO-2026-0131', quotationId: 'QT-2026-0371', connectionId: 'CN-50176',
  basis: 'MRC', arrangement: 'One-time', months: 1, mrc: 22500, otc: 0, proposedMrcPct: 80, proposedOtcPct: 0, approvedMrcPct: 80, approvedOtcPct: 0, qualifyingEvent: 'Service activation',
  cancellationTreatment: 'Reverse unpaid and recover paid within clawback window', clawbackMonths: 3, validFrom: '2026-09-14T00:00:00+06:00', validTo: '2026-12-31T23:59:00+06:00', status: 'Approved',
  preparedById: 'u-03', preparedAt: '2026-09-14T15:00:00+06:00', approvalId: 'AP-2026-0091', decidedById: 'u-02', decidedAt: '2026-09-15T11:00:00+06:00', revisions: [],
  event: { at: '2026-10-02T10:00:00+06:00', evidence: 'CN-50176 activation record', confirmedById: 'u-05', confirmedAt: '2026-10-03T09:30:00+06:00' },
  history: [
  h('2026-09-14T15:00:00+06:00', 'u-03', 'Submitted with QT-2026-0371 v1'),
  h('2026-09-15T11:00:00+06:00', 'u-02', 'Approved — 80% of MRC (first month)'),
  h('2026-09-25T14:00:00+06:00', 'u-05', '80% of MRC (first month) locked into WO-2026-0131'),
  h('2026-10-03T09:30:00+06:00', 'u-05', 'Service activation confirmed for 2 Oct 2026 (CN-50176 activation record) — commission accrued for Oct 2026')]

},
{
  id: 'CP-2026-0009', agentId: 'SA-302', selfSale: false, customerId: 'CU-1007', salespersonId: 'u-02', attributionId: 'AT-0002', basis: 'MRC', arrangement: 'Recurring', months: 12, mrc: 8500, otc: 0,
  proposedMrcPct: 5, proposedOtcPct: 0, approvedMrcPct: 5, approvedOtcPct: 0, qualifyingEvent: 'Customer acceptance', cancellationTreatment: 'Reverse unpaid accruals only', clawbackMonths: 0,
  validFrom: '2026-05-20T00:00:00+06:00', validTo: '2026-07-31T23:59:00+06:00', status: 'Cancelled', preparedById: 'u-05', preparedAt: '2026-05-21T10:00:00+06:00', decidedById: 'u-02', decidedAt: '2026-05-22T12:00:00+06:00', revisions: [],
  event: { at: '2026-06-03T12:00:00+06:00', evidence: 'Signed renewal letter SRT-REN-0603', confirmedById: 'u-05', confirmedAt: '2026-06-04T10:00:00+06:00' },
  cancellation: { at: '2026-10-12T15:00:00+06:00', kind: 'Cancellation', note: 'Customer discontinued service — SC-2026-0057.', byId: 'u-09', recordedAt: '2026-10-12T16:00:00+06:00' },
  history: [
  h('2026-05-21T10:00:00+06:00', 'u-05', 'Submitted by Sabina Yasmin'),
  h('2026-05-22T12:00:00+06:00', 'u-02', 'Approved — 5% of MRC × 12 months'),
  h('2026-06-04T10:00:00+06:00', 'u-05', 'Customer acceptance confirmed for 3 Jun 2026 (Signed renewal letter SRT-REN-0603) — commission accrued for Jun 2026'),
  h('2026-10-12T16:00:00+06:00', 'u-09', 'Cancellation on 12 Oct 2026 — ৳ 850 unpaid reversed. No further accruals.')]

},
{
  id: 'CP-2026-0008', agentId: 'SA-301', selfSale: false, customerId: 'CU-1003', salespersonId: 'u-14', attributionId: 'AT-0001', basis: 'OTC', arrangement: 'One-time', months: 1, mrc: 0, otc: 30000,
  proposedMrcPct: 0, proposedOtcPct: 50, approvedMrcPct: 0, approvedOtcPct: 50, qualifyingEvent: 'Customer acceptance', cancellationTreatment: 'Reverse unpaid accruals only', clawbackMonths: 0,
  validFrom: '2026-06-10T00:00:00+06:00', validTo: '2026-09-30T23:59:00+06:00', status: 'Approved', preparedById: 'u-05', preparedAt: '2026-06-11T10:00:00+06:00', decidedById: 'u-02', decidedAt: '2026-06-12T12:00:00+06:00', revisions: [],
  event: { at: '2026-07-20T12:00:00+06:00', evidence: 'Signed acceptance for building backbone upgrade', confirmedById: 'u-05', confirmedAt: '2026-07-21T10:00:00+06:00' },
  history: [h('2026-06-11T10:00:00+06:00', 'u-05', 'Submitted by Sabina Yasmin'), h('2026-06-12T12:00:00+06:00', 'u-02', 'Approved — 50% of OTC'), h('2026-07-21T10:00:00+06:00', 'u-05', 'Customer acceptance confirmed — commission accrued for Jul 2026')]
}];


const acc = (id: string, proposalId: string, agentId: string, customerId: string, period: string, component: CommissionAccrual['component'], base: number, pct: number, status: CommissionAccrual['status'], extra: Partial<CommissionAccrual> = {}): CommissionAccrual => ({
  id, proposalId, agentId, customerId, period, component, base, pct, amount: Math.round(base * pct / 100), status, accruedAt: `${period}-28T10:00:00+06:00`, ...extra
});
const reversal = { reversedAt: '2026-10-12T16:00:00+06:00', reversalReason: 'Cancellation: Customer discontinued service — SC-2026-0057.' };

export const commissionAccruals: CommissionAccrual[] = [
acc('CA-00001', 'CP-2026-0008', 'SA-301', 'CU-1003', '2026-07', 'OTC', 30000, 50, 'Paid', { settlementId: 'AGS-2026-0004', accruedAt: '2026-07-21T10:00:00+06:00' }),
acc('CA-00002', 'CP-2026-0009', 'SA-302', 'CU-1007', '2026-06', 'MRC', 8500, 5, 'Paid', { settlementId: 'AGS-2026-0005', accruedAt: '2026-06-04T10:00:00+06:00' }),
acc('CA-00003', 'CP-2026-0009', 'SA-302', 'CU-1007', '2026-07', 'MRC', 8500, 5, 'Paid', { settlementId: 'AGS-2026-0005' }),
acc('CA-00004', 'CP-2026-0009', 'SA-302', 'CU-1007', '2026-08', 'MRC', 8500, 5, 'Reversed', reversal),
acc('CA-00005', 'CP-2026-0009', 'SA-302', 'CU-1007', '2026-09', 'MRC', 8500, 5, 'Reversed', reversal),
acc('CA-00006', 'CP-2026-0011', 'SA-301', 'CU-1006', '2026-10', 'MRC', 22500, 80, 'Pending Approval', { settlementId: 'AGS-2026-0007', accruedAt: '2026-10-03T09:30:00+06:00' }),
acc('CA-00007', 'CP-2026-0012', 'SA-302', 'CU-1004', '2026-10', 'OTC', 20000, 10, 'Accrued', { accruedAt: '2026-10-13T10:00:00+06:00' }),
acc('CA-00008', 'CP-2026-0012', 'SA-302', 'CU-1004', '2026-10', 'MRC', 14000, 4, 'Accrued', { accruedAt: '2026-10-13T10:00:00+06:00' })];


export const agentSettlements: AgentSettlement[] = [
{ id: 'AGS-2026-0007', agentId: 'SA-301', accrualIds: ['CA-00006'], amount: 18000, periods: 'Oct 2026', status: 'Pending Approval', preparedById: 'u-09', preparedAt: '2026-10-14T14:40:00+06:00', approvalId: 'AP-2026-0104' },
{
  id: 'AGS-2026-0005', agentId: 'SA-302', accrualIds: ['CA-00002', 'CA-00003'], amount: 850, periods: 'Jun 2026 – Jul 2026', status: 'Paid', preparedById: 'u-09', preparedAt: '2026-08-05T10:00:00+06:00', decidedById: 'u-10', decidedAt: '2026-08-07T11:00:00+06:00',
  payment: { reference: 'bKash TrxID 8LM20QX4', method: 'bKash', paidAt: '2026-08-20T12:00:00+06:00', paidById: 'u-09', toAccount: 'bKash •••• 5587' }
},
{
  id: 'AGS-2026-0004', agentId: 'SA-301', accrualIds: ['CA-00001'], amount: 15000, periods: 'Jul 2026', status: 'Paid', preparedById: 'u-09', preparedAt: '2026-08-02T10:00:00+06:00', decidedById: 'u-10', decidedAt: '2026-08-04T11:00:00+06:00',
  payment: { reference: 'BEFTN 20260812-0441', method: 'Bank transfer', paidAt: '2026-08-12T15:00:00+06:00', paidById: 'u-09', toAccount: 'Bank transfer •••• 5821' }
}];


export const agentApprovals: Approval[] = [
{
  id: 'AP-2026-0120', type: 'Agent Commission Terms', title: 'Commission proposal CP-2026-0013 — Shirin Akter · Meridian Bank PLC — Agrabad Branch', detail: '6% of MRC × 6 months + 10% of OTC · First invoice paid · total ৳ 15,100',
  amount: 15100, entity: { type: 'salesAgent', id: 'SA-302' }, related: [{ type: 'customer', id: 'CU-1011' }], requestedById: 'u-05', requestedAt: '2026-10-14T16:20:00+06:00', requiredPermission: 'approveAgentCommission',
  status: 'Pending', commissionProposalId: 'CP-2026-0013', branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'AP-2026-0121', type: 'Agent Reassignment', title: 'Attribution reassignment RA-2026-0002 — Dhanmondi Dental Care', detail: 'Karim Molla / Sadia Islam → Karim Molla / Tanvir Hasan from 1 Nov 2026',
  amount: 0, entity: { type: 'salesAgent', id: 'SA-301' }, related: [{ type: 'customer', id: 'CU-1010' }], requestedById: 'u-05', requestedAt: '2026-10-15T09:10:00+06:00', requiredPermission: 'approveAgentCommission',
  status: 'Pending', reassignmentId: 'RA-2026-0002', branchId: 'dhaka-south', zoneId: 'dhanmondi'
}];


export const agentApprovalRules: ApprovalRule[] = [
{ id: 'AR-20', name: 'Agent attribution reassignment', approvalType: 'Agent Reassignment', comparator: 'any', requiredPermission: 'approveAgentCommission', approverRoles: ['businessHead'], slaHours: 48, enforcedInDemo: true, note: 'Business Head (Sales Head) only. Historical attribution is preserved.' }];