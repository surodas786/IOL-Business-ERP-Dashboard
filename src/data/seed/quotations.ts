import type { ApprovalRule } from '../../types/admin';
import type { Approval, AuditEvent, Quotation, StoredNotification } from '../../types/records';
import type { EquipmentTerm, QuotationTerms, QuotePolicy, TaxTreatment } from '../../types/quotation';

// FICTIONAL DEMO DATA — prices, terms and references are invented. Tax rates are illustrative and deliberately unset.

export const taxTreatments: TaxTreatment[] = [
{ id: 'TX-01', label: 'Tax exclusive', basis: 'Exclusive', ratePct: null, note: 'Tax added on top of quoted prices. Rate to be configured by Finance — no statutory rate is assumed in this demo.' },
{ id: 'TX-02', label: 'Tax inclusive', basis: 'Inclusive', ratePct: null, note: 'Quoted prices include tax. Rate to be configured by Finance.' },
{ id: 'TX-03', label: 'Exempt — certificate on file', basis: 'Exempt', ratePct: 0, note: 'Use only with a valid exemption certificate recorded in Customer documents.' }];


export const quotePolicy: QuotePolicy = { standardCreditDays: 30, minAdvanceMonths: 1, status: 'Awaiting IOL confirmation' };

export const quoteApprovalRules: ApprovalRule[] = [
{ id: 'AR-09', name: 'Special pricing (MRC below rate card)', approvalType: 'Special Pricing', comparator: 'any', requiredPermission: 'approveQuotation', approverRoles: ['management'], slaHours: 24, enforcedInDemo: true },
{ id: 'AR-10', name: 'Reduced OTC', approvalType: 'OTC Reduction', comparator: 'any', requiredPermission: 'approveQuotation', approverRoles: ['businessHead', 'management'], slaHours: 24, enforcedInDemo: true },
{ id: 'AR-11', name: 'Exceptional credit terms', approvalType: 'Credit Terms', comparator: 'any', requiredPermission: 'approveFinancial', approverRoles: ['financeApprover'], slaHours: 48, enforcedInDemo: true },
{ id: 'AR-12', name: 'Agent commission terms on quotation', approvalType: 'Agent Commission Terms', comparator: 'any', requiredPermission: 'approveAgentCommission', approverRoles: ['businessHead'], slaHours: 48, enforcedInDemo: true, note: 'Business Head (Sales Head) only. Payout of earned commission stays with the Finance Approver.' },
{ id: 'AR-13', name: 'Advance exception', approvalType: 'Advance Exception', comparator: 'any', requiredPermission: 'approveFinancial', approverRoles: ['financeApprover'], slaHours: 24, enforcedInDemo: true },
{ id: 'AR-14', name: 'Work order revision or cancellation', approvalType: 'Work Order Change', comparator: 'any', requiredPermission: 'approveQuotation', approverRoles: ['businessHead', 'management'], slaHours: 24, enforcedInDemo: true }];


const ont = (id: string): EquipmentTerm => ({ id, item: 'Huawei EG8145V5 ONT', ownership: 'IOL-owned · returnable', returnCondition: 'Return within 15 days of disconnection in working order; replacement charged at ৳ 4,800 if lost or damaged.' });
const router = (id: string): EquipmentTerm => ({ id, item: 'MikroTik RB4011 router', ownership: 'IOL-owned · returnable', returnCondition: 'Return on disconnection; replacement charged at ৳ 21,500 if lost or damaged.' });
const fibre = (id: string): EquipmentTerm => ({ id, item: 'Drop / aerial fibre to the premises', ownership: 'IOL-owned · consumed', returnCondition: 'Not returnable; remains IOL infrastructure.' });

function terms(t: Partial<QuotationTerms> & Pick<QuotationTerms, 'siteName' | 'siteAddress' | 'bandwidthMbps' | 'description' | 'mrc' | 'otc' | 'validUntil' | 'marginPct'>): QuotationTerms {
  return {
    serviceType: 'Dedicated Internet', listMrc: t.mrc, listOtc: t.otc, advanceRequired: t.mrc, securityDeposit: 10000, billingTerm: 'Prepaid', creditDays: 0, taxTreatmentId: 'TX-01',
    contractMonths: 24, leadTimeDays: 10, equipment: [ont('EQ-1'), fibre('EQ-2')], agentCommission: 0,
    ...t
  };
}

const v1 = (t: QuotationTerms, at: string, by: string, approvedAt: string) => ({ version: 1, status: 'Approved' as const, terms: t, reason: 'Initial quotation', createdAt: at, createdById: by, submittedAt: at, approvedAt });

/** Version history and release data merged onto the base quotation records. */
export const quotationDetails: Record<string, Partial<Quotation>> = {
  'QT-2026-0371': {
    version: 1, surveyId: 'SV-2026-0905', workOrderId: 'WO-2026-0131',
    versions: [v1(terms({ siteId: 'ST-2007', siteName: 'Diagnostic Centre', siteAddress: 'Plot 7, Section 10, Mirpur, Dhaka 1216', bandwidthMbps: 40, description: 'Dedicated Internet 40 Mbps, fibre, 1:1', mrc: 22500, otc: 15000, advanceRequired: 22500, validUntil: '2026-10-14T23:59:00+06:00', marginPct: 34, agentId: 'SA-301', agentCommission: 18000 }), '2026-09-14T15:00:00+06:00', 'u-03', '2026-09-15T11:00:00+06:00')],
    acceptance: { version: 1, method: 'Purchase order', reference: 'MDC/PO/2026/118', fileName: 'MDC_PO_118.pdf', acceptedByName: 'Dr. Nazmul Haque', acceptedAt: '2026-09-24T12:00:00+06:00', recordedById: 'u-03', recordedAt: '2026-09-24T15:00:00+06:00' },
    advance: { state: 'Verified', reference: 'DBBL deposit 24-09-2026 #551208', verifiedById: 'u-09', verifiedAt: '2026-09-25T11:00:00+06:00' },
    validation: { byId: 'u-05', at: '2026-09-25T12:00:00+06:00', note: 'Trade licence and site address checked.' }
  },
  'QT-2026-0396': {
    version: 1, surveyId: 'SV-2026-0918', workOrderId: 'WO-2026-0144',
    versions: [v1(terms({ siteId: 'ST-2005', siteName: 'Agrabad Office', siteAddress: '5th Floor, 104 Agrabad C/A, Chattogram 4100', bandwidthMbps: 20, description: 'Dedicated Internet 20 Mbps, fibre, 1:1', mrc: 14000, otc: 8000, advanceRequired: 0, securityDeposit: 5000, billingTerm: 'Postpaid', creditDays: 30, validUntil: '2026-10-12T23:59:00+06:00', marginPct: 33, leadTimeDays: 7 }), '2026-09-12T17:00:00+06:00', 'u-02', '2026-09-13T10:15:00+06:00')],
    acceptance: { version: 1, method: 'Signed quotation', reference: 'Signed copy received 14 Sep', fileName: 'PVL_signed_QT0396.pdf', acceptedByName: 'Faisal Chowdhury', acceptedAt: '2026-09-14T16:00:00+06:00', recordedById: 'u-02', recordedAt: '2026-09-14T17:00:00+06:00' },
    validation: { byId: 'u-05', at: '2026-09-19T15:00:00+06:00', note: '' }
  },
  'QT-2026-0402': {
    version: 1, surveyId: 'SV-2026-0924', workOrderId: 'WO-2026-0149',
    versions: [v1(terms({ siteId: 'ST-2006', siteName: 'Head Office', siteAddress: '31 Sheikh Mujib Road, Agrabad, Chattogram 4100', bandwidthMbps: 10, description: 'Dedicated Internet 10 Mbps, fibre', mrc: 9000, otc: 8000, advanceRequired: 9000, securityDeposit: 5000, validUntil: '2026-10-24T23:59:00+06:00', marginPct: 31, leadTimeDays: 12 }), '2026-09-24T13:00:00+06:00', 'u-02', '2026-09-25T10:00:00+06:00')],
    acceptance: { version: 1, method: 'Email confirmation', reference: 'Email from Anwar Hossain, 29 Sep 10:12', acceptedByName: 'Anwar Hossain', acceptedAt: '2026-09-29T10:12:00+06:00', recordedById: 'u-02', recordedAt: '2026-09-29T11:00:00+06:00' },
    advance: { state: 'Verified', reference: 'City Bank deposit #CB-77120', verifiedById: 'u-09', verifiedAt: '2026-10-02T12:00:00+06:00' },
    validation: { byId: 'u-05', at: '2026-10-03T10:00:00+06:00', note: '' }
  },
  'QT-2026-0418': {
    version: 2, surveyId: 'SV-2026-0932',
    versions: [
    {
      version: 1, status: 'Superseded', reason: 'Initial quotation', createdAt: '2026-10-08T15:00:00+06:00', createdById: 'u-03',
      terms: terms({ siteName: 'Konabari factory', siteAddress: 'Kashimpur Road, Konabari, Gazipur 1751', bandwidthMbps: 100, description: 'Dedicated Internet 100 Mbps, fibre, 1:1, /29 IPv4 block', mrc: 90000, otc: 51000, advanceRequired: 90000, securityDeposit: 20000, contractMonths: 36, leadTimeDays: 14, validUntil: '2026-11-07T23:59:00+06:00', marginPct: 41, equipment: [ont('EQ-1'), router('EQ-2'), fibre('EQ-3'), { id: 'EQ-4', item: 'Fortigate 60F firewall', ownership: 'Customer-owned', returnCondition: 'Customer supplied; IOL does not take ownership.' }] })
    },
    {
      version: 2, status: 'Pending Approval', reason: 'Customer asked to match a competitor offer; 36-month term retained.', createdAt: '2026-10-13T16:00:00+06:00', createdById: 'u-03', submittedAt: '2026-10-13T16:10:00+06:00',
      terms: terms({ siteName: 'Konabari factory', siteAddress: 'Kashimpur Road, Konabari, Gazipur 1751', bandwidthMbps: 100, description: 'Dedicated Internet 100 Mbps, fibre, 1:1, /29 IPv4 block', listMrc: 90000, listOtc: 51000, mrc: 85000, otc: 45000, advanceRequired: 85000, securityDeposit: 20000, contractMonths: 36, leadTimeDays: 14, validUntil: '2026-11-12T23:59:00+06:00', marginPct: 38, equipment: [ont('EQ-1'), router('EQ-2'), fibre('EQ-3'), { id: 'EQ-4', item: 'Fortigate 60F firewall', ownership: 'Customer-owned', returnCondition: 'Customer supplied; IOL does not take ownership.' }] }),
      routes: [
      { kind: 'Quotation', why: 'Commercial approval of MRC and terms', amount: 85000 },
      { kind: 'Special Pricing', why: 'MRC ৳ 85,000 is 6% below the rate card (৳ 90,000)', amount: 5000 },
      { kind: 'OTC Reduction', why: 'OTC ৳ 45,000 is below the standard ৳ 51,000', amount: 6000 }]

    }],

    advance: { state: 'Awaiting verification' }
  },
  'QT-2026-0421': {
    version: 1, surveyId: 'SV-2026-0947',
    versions: [
    {
      version: 1, status: 'Approved', reason: 'Initial quotation', createdAt: '2026-10-09T15:00:00+06:00', createdById: 'u-15', submittedAt: '2026-10-09T15:10:00+06:00', approvedAt: '2026-10-10T12:30:00+06:00',
      terms: terms({ siteName: 'Terminal office', siteAddress: 'Bandar Road, Agrabad, Chattogram 4100', bandwidthMbps: 100, description: 'Dedicated Internet 100 Mbps, fibre + NTTN backup path', listMrc: 90000, listOtc: 34500, mrc: 68000, otc: 40000, advanceRequired: 68000, securityDeposit: 20000, contractMonths: 36, leadTimeDays: 18, validUntil: '2026-11-08T23:59:00+06:00', marginPct: 35, equipment: [ont('EQ-1'), router('EQ-2'), fibre('EQ-3'), { id: 'EQ-4', item: 'Partner backup last mile', ownership: 'Partner-owned', returnCondition: 'Remains with the NTTN partner.' }] }),
      routes: [
      { kind: 'Quotation', why: 'Commercial approval of MRC and terms', amount: 68000 },
      { kind: 'Special Pricing', why: 'MRC ৳ 68,000 is 24% below the rate card (৳ 90,000)', amount: 22000 }]

    }],

    acceptance: { version: 1, method: 'Email confirmation', reference: 'Email from Rezaul Karim, 14 Oct 18:05', acceptedByName: 'Rezaul Karim', acceptedAt: '2026-10-14T18:05:00+06:00', recordedById: 'u-15', recordedAt: '2026-10-15T09:10:00+06:00' },
    advance: { state: 'Awaiting verification' }
  },
  'QT-2026-0422': {
    version: 1,
    versions: [
    {
      version: 1, status: 'Pending Approval', reason: 'Initial quotation', createdAt: '2026-10-14T12:00:00+06:00', createdById: 'u-15', submittedAt: '2026-10-14T12:20:00+06:00',
      terms: terms({ siteName: 'Factory', siteAddress: 'Plot 9, Block K, Halishahar, Chattogram 4216', bandwidthMbps: 50, description: 'Dedicated Internet 50 Mbps, fibre, 1:1', listMrc: 45000, listOtc: 31500, mrc: 30000, otc: 32000, advanceRequired: 30000, securityDeposit: 10000, contractMonths: 24, leadTimeDays: 12, validUntil: '2026-11-13T23:59:00+06:00', marginPct: 36, agentId: 'SA-302', agentCommission: 24000 }),
      routes: [
      { kind: 'Quotation', why: 'Commercial approval of MRC and terms', amount: 30000 },
      { kind: 'Special Pricing', why: 'MRC ৳ 30,000 is 33% below the rate card (৳ 45,000)', amount: 15000 },
      { kind: 'Agent Commission Terms', why: 'Agent commission ৳ 24,000 — Business Head (Sales Head) authority only', amount: 24000 }]

    }],

    advance: { state: 'Awaiting verification' }
  }
};

export const newQuotations: Quotation[] = [
{ id: 'QT-2026-0421', opportunityId: 'OP-2026-0162', description: '', mrc: 0, otc: 0, marginPct: 0, status: 'Approved', preparedById: 'u-15', createdAt: '2026-10-09T15:00:00+06:00', validUntil: '', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'QT-2026-0422', opportunityId: 'OP-2026-0215', description: '', mrc: 0, otc: 0, marginPct: 0, status: 'Pending Approval', preparedById: 'u-15', createdAt: '2026-10-14T12:00:00+06:00', validUntil: '', branchId: 'chattogram', zoneId: 'pahartali' }];


export const quoteApprovals: Approval[] = [
{ id: 'AP-2026-0090', type: 'Quotation', title: 'Quotation — QT-2026-0371 v1 · Mirpur Diagnostic Centre', detail: 'Commercial approval of MRC and terms', amount: 22500, entity: { type: 'quotation', id: 'QT-2026-0371' }, related: [{ type: 'opportunity', id: 'OP-2026-0189' }], requestedById: 'u-03', requestedAt: '2026-09-14T15:00:00+06:00', requiredPermission: 'approveQuotation', status: 'Approved', decidedById: 'u-02', decidedAt: '2026-09-15T10:30:00+06:00', quotationVersion: 1, branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'AP-2026-0091', type: 'Agent Commission Terms', title: 'Agent Commission Terms — QT-2026-0371 v1 · Mirpur Diagnostic Centre', detail: 'Karim Molla · 80% of first-month MRC · ৳ 18,000', amount: 18000, entity: { type: 'quotation', id: 'QT-2026-0371' }, related: [{ type: 'salesAgent', id: 'SA-301' }], requestedById: 'u-03', requestedAt: '2026-09-14T15:00:00+06:00', requiredPermission: 'approveAgentCommission', status: 'Approved', decidedById: 'u-02', decidedAt: '2026-09-15T11:00:00+06:00', quotationVersion: 1, branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'AP-2026-0106', type: 'Quotation', title: 'Quotation — QT-2026-0421 v1 · Karnaphuli Freight Terminal', detail: 'Commercial approval of MRC and terms', amount: 68000, entity: { type: 'quotation', id: 'QT-2026-0421' }, related: [{ type: 'opportunity', id: 'OP-2026-0162' }], requestedById: 'u-15', requestedAt: '2026-10-09T15:10:00+06:00', requiredPermission: 'approveQuotation', status: 'Approved', decidedById: 'u-01', decidedAt: '2026-10-10T12:00:00+06:00', quotationVersion: 1, branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'AP-2026-0107', type: 'Special Pricing', title: 'Special Pricing — QT-2026-0421 v1 · Karnaphuli Freight Terminal', detail: 'MRC ৳ 68,000 is 24% below the rate card (৳ 90,000)', amount: 22000, entity: { type: 'quotation', id: 'QT-2026-0421' }, related: [{ type: 'opportunity', id: 'OP-2026-0162' }], requestedById: 'u-15', requestedAt: '2026-10-09T15:10:00+06:00', requiredPermission: 'approveQuotation', status: 'Approved', decidedById: 'u-01', decidedAt: '2026-10-10T12:30:00+06:00', quotationVersion: 1, branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'AP-2026-0110', type: 'Special Pricing', title: 'Special Pricing — QT-2026-0418 v2 · Meghna Textiles Ltd', detail: 'MRC ৳ 85,000 is 6% below the rate card (৳ 90,000)', amount: 5000, entity: { type: 'quotation', id: 'QT-2026-0418' }, related: [{ type: 'opportunity', id: 'OP-2026-0207' }], requestedById: 'u-03', requestedAt: '2026-10-13T16:10:00+06:00', requiredPermission: 'approveQuotation', status: 'Pending', quotationVersion: 2, branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'AP-2026-0111', type: 'OTC Reduction', title: 'OTC Reduction — QT-2026-0418 v2 · Meghna Textiles Ltd', detail: 'OTC ৳ 45,000 is below the standard ৳ 51,000', amount: 6000, entity: { type: 'quotation', id: 'QT-2026-0418' }, related: [{ type: 'opportunity', id: 'OP-2026-0207' }], requestedById: 'u-03', requestedAt: '2026-10-13T16:10:00+06:00', requiredPermission: 'approveQuotation', status: 'Pending', quotationVersion: 2, branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'AP-2026-0112', type: 'Quotation', title: 'Quotation — QT-2026-0422 v1 · Halishahar Garments Ltd', detail: 'Commercial approval of MRC and terms', amount: 30000, entity: { type: 'quotation', id: 'QT-2026-0422' }, related: [{ type: 'opportunity', id: 'OP-2026-0215' }], requestedById: 'u-15', requestedAt: '2026-10-14T12:20:00+06:00', requiredPermission: 'approveQuotation', status: 'Pending', quotationVersion: 1, branchId: 'chattogram', zoneId: 'pahartali' },
{ id: 'AP-2026-0113', type: 'Special Pricing', title: 'Special Pricing — QT-2026-0422 v1 · Halishahar Garments Ltd', detail: 'MRC ৳ 30,000 is 33% below the rate card (৳ 45,000)', amount: 15000, entity: { type: 'quotation', id: 'QT-2026-0422' }, related: [{ type: 'opportunity', id: 'OP-2026-0215' }], requestedById: 'u-15', requestedAt: '2026-10-14T12:20:00+06:00', requiredPermission: 'approveQuotation', status: 'Pending', quotationVersion: 1, branchId: 'chattogram', zoneId: 'pahartali' },
{ id: 'AP-2026-0114', type: 'Agent Commission Terms', title: 'Agent Commission Terms — QT-2026-0422 v1 · Halishahar Garments Ltd', detail: 'Shirin Akter · 80% of first-month MRC · ৳ 24,000', amount: 24000, entity: { type: 'quotation', id: 'QT-2026-0422' }, related: [{ type: 'salesAgent', id: 'SA-302' }, { type: 'opportunity', id: 'OP-2026-0215' }], requestedById: 'u-15', requestedAt: '2026-10-14T12:20:00+06:00', requiredPermission: 'approveAgentCommission', status: 'Pending', quotationVersion: 1, branchId: 'chattogram', zoneId: 'pahartali' }];


export const quoteNotifications: StoredNotification[] = [
{ id: 'NT-0040', title: 'Agent commission terms awaiting Business Head', detail: 'QT-2026-0422 · Halishahar Garments · ৳ 24,000', at: '2026-10-14T12:20:00+06:00', module: 'quotations', branchId: 'chattogram', requires: ['viewCommissions'], entity: { type: 'approval', id: 'AP-2026-0114' }, readBy: [] },
{ id: 'NT-0041', title: 'Customer accepted quotation', detail: 'QT-2026-0421 · Karnaphuli Freight Terminal', at: '2026-10-15T09:10:00+06:00', module: 'quotations', branchId: 'chattogram', requires: ['manageWorkOrders'], entity: { type: 'quotation', id: 'QT-2026-0421' }, readBy: [] }];


export const quoteAudit: AuditEvent[] = [
{ id: 'AE-00063', at: '2026-10-15T09:10:00+06:00', actorName: 'Jubayer Ahmed', actorId: 'u-15', action: 'Customer acceptance recorded', summary: 'QT-2026-0421 v1 · Email confirmation · by Rezaul Karim', entity: { type: 'quotation', id: 'QT-2026-0421' }, related: [{ type: 'opportunity', id: 'OP-2026-0162' }] },
{ id: 'AE-00062', at: '2026-10-14T12:20:00+06:00', actorName: 'Jubayer Ahmed', actorId: 'u-15', action: 'Quotation submitted', summary: 'QT-2026-0422 v1 routed to Quotation, Special Pricing, Agent Commission Terms', entity: { type: 'quotation', id: 'QT-2026-0422' }, related: [{ type: 'opportunity', id: 'OP-2026-0215' }, { type: 'salesAgent', id: 'SA-302' }] },
{ id: 'AE-00061', at: '2026-10-13T16:00:00+06:00', actorName: 'Tanvir Hasan', actorId: 'u-03', action: 'Quotation revised', summary: 'QT-2026-0418 v1 → v2 — Customer asked to match a competitor offer. v1 terms kept unchanged.', entity: { type: 'quotation', id: 'QT-2026-0418' }, related: [{ type: 'opportunity', id: 'OP-2026-0207' }] },
{ id: 'AE-00060', at: '2026-10-10T12:30:00+06:00', actorName: 'Farhana Rahman', actorId: 'u-01', action: 'Quotation terms locked', summary: 'QT-2026-0421 v1 approved by all required authorities — financial and technical terms locked', entity: { type: 'quotation', id: 'QT-2026-0421' }, related: [{ type: 'opportunity', id: 'OP-2026-0162' }] }];