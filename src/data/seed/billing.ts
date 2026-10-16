import { formatBDT } from '../../utils/format';
import type { ApprovalRule } from '../../types/admin';
import type { Approval, BillingAccount, Invoice, Receipt } from '../../types/records';
import type { BillingAdjustment, BillingPolicy, BillingRun, DueAllow, InvoiceLine } from '../../types/billing';

// FICTIONAL DEMO DATA — all companies, people, IDs and amounts are invented.

export const billingPolicy: BillingPolicy = { prepaidGraceDays: 5, postpaidReviewDays: 30, prorationMethod: 'Actual days in month', status: 'Awaiting IOL confirmation' };

/** Approved billing terms per account (from each work order's Accounts handover). */
export const accountTerms: Record<string, Pick<BillingAccount, 'billingTerm' | 'creditDays'>> = {
  'BA-3002': { billingTerm: 'Postpaid', creditDays: 30 },
  'BA-3003': { billingTerm: 'Prepaid', creditDays: 0 },
  'BA-3004': { billingTerm: 'Postpaid', creditDays: 30 },
  'BA-3005': { billingTerm: 'Postpaid', creditDays: 30 },
  'BA-3006': { billingTerm: 'Postpaid', creditDays: 30 },
  'BA-3007': { billingTerm: 'Prepaid', creditDays: 0 },
  'BA-3008': { billingTerm: 'Postpaid', creditDays: 20 },
  'BA-3009': { billingTerm: 'Prepaid', creditDays: 0 },
  'BA-3010': { billingTerm: 'Prepaid', creditDays: 0 },
  'BA-3011': { billingTerm: 'Prepaid', creditDays: 0 }
};

const TAX_NOTE = 'Tax treatment not configured — no tax applied (illustrative only; no statutory rate assumed)';

function full(inv: string, n: number, connectionId: string, description: string, rate: number, pk: string, dim: number): InvoiceLine {
  return { id: `${inv}-L${n}`, kind: 'MRC', connectionId, description, from: `${pk}-01`, to: `${pk}-${dim}`, days: dim, daysInPeriod: dim, rate, amount: rate, calc: `Full period: ${formatBDT(rate)}` };
}

const rahman = (inv: string, pk: string, dim: number) => [
full(inv, 1, 'CN-50121', 'Dedicated Internet 50 Mbps — Head Office', 32000, pk, dim),
full(inv, 2, 'CN-50122', 'Dedicated Internet 30 Mbps — Jatrabari', 18000, pk, dim),
full(inv, 3, 'CN-50123', 'Data Connectivity 20 Mbps — Agrabad', 12500, pk, dim)];


export const invoiceExtras: Record<string, Partial<Invoice>> = {
  'INV-33281': { kind: 'Recurring', periodKey: '2026-09', billingTerm: 'Prepaid', connectionIds: ['CN-50130'], lines: [full('INV-33281', 1, 'CN-50130', 'Bulk broadband 200 Mbps', 42000, '2026-09', 30)], taxNote: TAX_NOTE, runId: 'BR-2026-09' },
  'INV-33288': { kind: 'Recurring', periodKey: '2026-09', billingTerm: 'Postpaid', connectionIds: ['CN-50121', 'CN-50122', 'CN-50123'], lines: rahman('INV-33288', '2026-09', 30), taxNote: TAX_NOTE, runId: 'BR-2026-09' },
  'INV-33390': { kind: 'Recurring', periodKey: '2026-10', billingTerm: 'Postpaid', connectionIds: ['CN-50121', 'CN-50122', 'CN-50123'], lines: rahman('INV-33390', '2026-10', 31), taxNote: TAX_NOTE, runId: 'BR-2026-10' },
  'INV-33391': {
    kind: 'Recurring', periodKey: '2026-10', billingTerm: 'Prepaid', connectionIds: ['CN-50124', 'CN-50125', 'CN-50126'], taxNote: TAX_NOTE, runId: 'BR-2026-10',
    lines: [full('INV-33391', 1, 'CN-50124', 'CCTV monitoring — Head Office', 6500, '2026-10', 31), full('INV-33391', 2, 'CN-50125', 'Managed LAN — Jatrabari', 4000, '2026-10', 31), full('INV-33391', 3, 'CN-50126', 'Access control — Head Office', 3000, '2026-10', 31)]
  },
  'INV-33398': { kind: 'Recurring', periodKey: '2026-10', billingTerm: 'Prepaid', connectionIds: ['CN-50140'], lines: [full('INV-33398', 1, 'CN-50140', 'Dedicated Internet 10 Mbps', 8500, '2026-10', 31)], taxNote: TAX_NOTE, runId: 'BR-2026-10' },
  'INV-33402': { kind: 'Recurring', periodKey: '2026-10', billingTerm: 'Prepaid', connectionIds: ['CN-50130'], lines: [full('INV-33402', 1, 'CN-50130', 'Bulk broadband 200 Mbps', 42000, '2026-10', 31)], taxNote: TAX_NOTE, runId: 'BR-2026-10' },
  'INV-33405': {
    kind: 'First bill', periodKey: '2026-10', billingTerm: 'Postpaid', connectionIds: ['CN-50176'], taxNote: TAX_NOTE,
    lines: [
    { id: 'INV-33405-L1', kind: 'MRC', connectionId: 'CN-50176', description: 'Dedicated Internet 40 Mbps — from billing commencement', from: '2026-10-02', to: '2026-10-31', days: 30, daysInPeriod: 31, rate: 22500, amount: 21774, calc: `${formatBDT(22500)} × 30/31 days = ${formatBDT(21774)}` },
    { id: 'INV-33405-L2', kind: 'OTC', connectionId: 'CN-50176', description: 'One-time installation charge (approved OTC)', amount: 15000, calc: 'One-time, per approved work order terms' }]

  },
  'INV-33410': { kind: 'Associate', periodKey: '2026-10', billingTerm: 'Postpaid', connectionIds: ['CN-50150'], lines: [full('INV-33410', 1, 'CN-50150', 'IP transit 1 Gbps — IOL share of decentralised collections', 96000, '2026-10', 31)], taxNote: TAX_NOTE, runId: 'BR-2026-10' },
  'INV-33415': { kind: 'Associate', periodKey: '2026-10', billingTerm: 'Prepaid', connectionIds: ['CN-50160'], lines: [{ ...full('INV-33415', 1, 'CN-50160', 'Fixed monthly fee — 500 Mbps IP transit', 150000, '2026-10', 31), calc: `Fixed monthly amount: ${formatBDT(150000)}` }], taxNote: TAX_NOTE, runId: 'BR-2026-10' },
  'INV-33420': {
    kind: 'Associate', periodKey: '2026-10', billingTerm: 'Prepaid', connectionIds: [], taxNote: TAX_NOTE, runId: 'BR-2026-10',
    lines: [{ id: 'INV-33420-L1', kind: 'MRC', description: 'Centralised subscriber billing — 420 Uttara Net Point subscribers', amount: 126000, calc: 'Subscriber billing batch UNP-1015 (420 × ৳ 300)' }]
  }
};

export const receiptExtras: Record<string, Partial<Receipt>> = {
  'RC-2026-0688': { purpose: 'Payment', payer: 'Rahman Steel Works Ltd', collectorName: 'Bank feed (DBBL)', evidence: 'dbbl-tt-77120.pdf', verifiedById: 'u-09' },
  'RC-2026-0702': { purpose: 'Payment', payer: 'Zindabazar Link Solutions', collectorName: 'Bank feed (EBL)', evidence: 'ebl-deposit-55102.jpg', verifiedById: 'u-09' },
  'RC-2026-0712': { purpose: 'Payment', payer: 'Green Valley Apartments Owners’ Committee', collectorName: 'Nusrat Jahan', evidence: 'bkash-9KD82HQ1.png', verifiedById: 'u-09', note: 'Paid as advance; committee asked that it be held until both invoices can be settled together' },
  'RC-2026-0720': { purpose: 'Payment', payer: '420 Uttara Net Point subscribers', collectorName: 'bKash merchant settlement', evidence: 'bkash-batch-UNP-1015.csv', verifiedById: 'u-09' },
  'RC-2026-0726': { purpose: 'Payment', payer: 'Mirpur Diagnostic Centre', collectorName: 'Bank feed (BRAC)', evidence: 'brac-tt-40981.pdf', verifiedById: 'u-09' },
  'RC-2026-0731': { purpose: 'Payment', payer: 'Pahartali Cable & Net (Nurul Absar)', collectorName: 'Associate deposit', evidence: 'citybank-dep-210933.jpg', intendedInvoiceIds: ['INV-33410'], note: 'Partial October remittance; balance ৳ 36,000 promised by 20 Oct' },
  'RC-2026-0733': { purpose: 'Payment', payer: 'Abul Kalam, Surma Tea Traders', collectorName: 'Customer self-payment', evidence: 'bkash-7HJ21KL9.png', intendedInvoiceIds: ['INV-33398'] }
};

export const extraReceipts: Receipt[] = [
{ id: 'RC-2026-0610', billingAccountId: 'BA-3007', amount: 17000, method: 'Bank Deposit', reference: 'Sonali DEP-118230', receivedAt: '2022-05-10T12:00:00+06:00', status: 'Verified', verifiedAt: '2022-05-10T16:00:00+06:00', verifiedById: 'u-09', allocations: [], purpose: 'Security deposit', payer: 'Surma Tea Traders', collectorName: 'Sylhet branch counter', evidence: 'sonali-dep-118230.jpg', note: 'Refundable deposit, two months MRC', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'RC-2026-0640', billingAccountId: 'BA-3003', amount: 84000, method: 'Cheque', reference: 'Dutch-Bangla CHQ 0041872', receivedAt: '2023-06-28T12:00:00+06:00', status: 'Verified', verifiedAt: '2023-07-02T11:00:00+06:00', verifiedById: 'u-09', allocations: [], purpose: 'Security deposit', payer: 'Green Valley Apartments Owners’ Committee', collectorName: 'Nusrat Jahan', evidence: 'dbbl-chq-0041872.jpg', note: 'Refundable deposit, two months MRC', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'RC-2026-0735', billingAccountId: 'BA-3002', amount: 50000, method: 'Cheque', reference: 'Prime Bank CHQ 004521', receivedAt: '2026-10-15T09:40:00+06:00', status: 'Pending Verification', allocations: [], purpose: 'Payment', payer: 'Rahman Steel Works Ltd', collectorName: 'Nusrat Jahan', recordedById: 'u-04', recordedAt: '2026-10-15T09:55:00+06:00', evidence: 'prime-chq-004521.jpg', intendedInvoiceIds: ['INV-33390'], note: 'Part payment for October; treasury will pay the balance after the credit note is decided', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'RC-2026-0736', billingAccountId: 'BA-3011', amount: 13500, method: 'bKash', reference: 'TrxID 9KD82HQ1', receivedAt: '2026-10-15T08:55:00+06:00', status: 'Pending Verification', allocations: [], purpose: 'Payment', payer: 'Mahfuz Alam', collectorName: 'Nusrat Jahan', recordedById: 'u-04', recordedAt: '2026-10-15T09:05:00+06:00', evidence: 'bkash-screenshot.png', intendedInvoiceIds: ['INV-33391'], note: 'Customer forwarded a screenshot by WhatsApp', branchId: 'dhaka-south', zoneId: 'motijheel' }];


export const billingAdjustments: BillingAdjustment[] = [
{ id: 'ADJ-2026-0071', kind: 'Credit note', billingAccountId: 'BA-3002', invoiceId: 'INV-33390', amount: 12600, reason: 'SLA credit for the 3–5 Oct outage at Head Office, per contract schedule B', status: 'Pending', requestedById: 'u-09', requestedAt: '2026-10-14T11:20:00+06:00', approvalId: 'AP-2026-0102', branchId: 'dhaka-south', zoneId: 'motijheel' }];


export const dueAllows: DueAllow[] = [
{ id: 'DA-2026-0009', billingAccountId: 'BA-3003', creditLimit: 90000, reason: 'Owners’ committee collects the quarterly service charge in early October; Kamal Uddin confirmed payment by 10 Oct', validFrom: '2026-09-25T00:00:00+06:00', validUntil: '2026-10-10T23:59:00+06:00', reviewAt: '2026-10-08T10:00:00+06:00', requestedById: 'u-04', requestedAt: '2026-09-24T15:00:00+06:00', status: 'Approved', approvalId: 'AP-2026-0160', decidedById: 'u-10', decidedAt: '2026-09-25T10:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'DA-2026-0011', billingAccountId: 'BA-3002', creditLimit: 150000, reason: 'Group treasury pays monthly in arrears on approved 30-day terms; two-invoice exposure accepted', validFrom: '2026-10-01T00:00:00+06:00', validUntil: '2026-12-31T23:59:00+06:00', reviewAt: '2026-11-15T10:00:00+06:00', requestedById: 'u-04', requestedAt: '2026-09-30T12:00:00+06:00', status: 'Approved', approvalId: 'AP-2026-0161', decidedById: 'u-10', decidedAt: '2026-10-01T09:30:00+06:00', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'DA-2026-0013', billingAccountId: 'BA-3003', creditLimit: 90000, reason: 'Committee meeting moved to 27 Oct; ৳ 25,000 advance already paid. Requesting a short extension instead of suspension review.', validFrom: '2026-10-15T00:00:00+06:00', validUntil: '2026-10-31T23:59:00+06:00', reviewAt: '2026-10-28T10:00:00+06:00', requestedById: 'u-04', requestedAt: '2026-10-14T16:00:00+06:00', status: 'Pending', approvalId: 'AP-2026-0162', branchId: 'dhaka-north', zoneId: 'uttara' }];


export const billingApprovals: Approval[] = [
{ id: 'AP-2026-0160', type: 'Due Allow', title: 'Due allow DA-2026-0009 — Green Valley Apartments', detail: 'Limit ৳ 90,000 · until 10 Oct 2026', amount: 90000, entity: { type: 'billingAccount', id: 'BA-3003' }, related: [{ type: 'customer', id: 'CU-1003' }], requestedById: 'u-04', requestedAt: '2026-09-24T15:00:00+06:00', requiredPermission: 'approveFinancial', status: 'Approved', decidedById: 'u-10', decidedAt: '2026-09-25T10:00:00+06:00', dueAllowId: 'DA-2026-0009', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'AP-2026-0161', type: 'Due Allow', title: 'Due allow DA-2026-0011 — Rahman Steel Works', detail: 'Limit ৳ 1,50,000 · until 31 Dec 2026', amount: 150000, entity: { type: 'billingAccount', id: 'BA-3002' }, related: [{ type: 'customer', id: 'CU-1002' }], requestedById: 'u-04', requestedAt: '2026-09-30T12:00:00+06:00', requiredPermission: 'approveFinancial', status: 'Approved', decidedById: 'u-10', decidedAt: '2026-10-01T09:30:00+06:00', dueAllowId: 'DA-2026-0011', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'AP-2026-0162', type: 'Due Allow', title: 'Due allow DA-2026-0013 — Green Valley Apartments', detail: 'Renewal · limit ৳ 90,000 · until 31 Oct 2026', amount: 90000, entity: { type: 'billingAccount', id: 'BA-3003' }, related: [{ type: 'customer', id: 'CU-1003' }], requestedById: 'u-04', requestedAt: '2026-10-14T16:00:00+06:00', requiredPermission: 'approveFinancial', status: 'Pending', dueAllowId: 'DA-2026-0013', branchId: 'dhaka-north', zoneId: 'uttara' }];


export const billingApprovalRules: ApprovalRule[] = [
{ id: 'AR-30', name: 'Due allow (temporary credit)', approvalType: 'Due Allow', comparator: 'any', requiredPermission: 'approveFinancial', approverRoles: ['financeApprover'], slaHours: 24, enforcedInDemo: true },
{ id: 'AR-31', name: 'Receipt reversal or debit adjustment', approvalType: 'Billing Adjustment', comparator: 'any', requiredPermission: 'approveFinancial', approverRoles: ['financeApprover'], slaHours: 48, enforcedInDemo: true }];


export const billingRuns: BillingRun[] = [
{
  id: 'BR-2026-10', periodKey: '2026-10', runAt: '2026-10-01T10:00:00+06:00', byId: 'u-09', invoiceIds: ['INV-33390', 'INV-33391', 'INV-33398', 'INV-33402', 'INV-33410', 'INV-33415', 'INV-33420'], total: 498500,
  skipped: [
  { billingAccountId: 'BA-3006', connectionId: 'CN-50176', reason: 'Billing not yet commenced at run time — billed on commencement (INV-33405)' },
  { billingAccountId: 'BA-3004', connectionId: 'CN-50188', reason: 'Pending activation at run time' },
  { billingAccountId: 'BA-3005', connectionId: 'CN-50190', reason: 'Pending activation' }]

},
{
  id: 'BR-2026-09', periodKey: '2026-09', runAt: '2026-09-01T10:00:00+06:00', byId: 'u-09', invoiceIds: ['INV-33288', 'INV-33281'], total: 104500,
  skipped: []
}];