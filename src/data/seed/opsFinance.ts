import type { OpsExpense, RecurringPayment } from '../../types/approvals';

export const recurringPayments: RecurringPayment[] = [
{ id: 'RP-01', category: 'Office rent', payee: 'Karim Properties — Uttara Branch Office', amount: 185000, branchId: 'dhaka-north', dueDay: 18, startPeriod: '2026-01', active: true, note: 'Rent agreement until Dec 2027' },
{ id: 'RP-02', category: 'Upstream / vendor payment', payee: 'Summit Communications (IIG bandwidth)', amount: 640000, branchId: 'dhaka-south', dueDay: 20, startPeriod: '2026-01', active: true },
{ id: 'RP-03', category: 'Office rent', payee: 'Agrabad Tower Ltd — Chattogram Office', amount: 120000, branchId: 'chattogram', dueDay: 10, startPeriod: '2026-01', active: true },
{ id: 'RP-04', category: 'Salary payment', payee: 'Sylhet branch staff (bank sheet)', amount: 410000, branchId: 'sylhet', dueDay: 28, startPeriod: '2026-01', active: true, note: 'Payment record only — amounts come from HR. No payroll calculation here.' }];


export const opsExpenses: OpsExpense[] = [
{
  id: 'OF-2026-0041', category: 'Office rent', payee: 'Agrabad Tower Ltd — Chattogram Office', amount: 120000, branchId: 'chattogram', period: '2026-10', description: 'October rent for 6th floor branch office as per agreement.', evidence: [{ name: 'rent-invoice-oct.pdf', sizeKb: 210 }], evidenceRef: 'AT/INV/1026',
  status: 'Paid', requestedById: 'u-09', requestedAt: '2026-10-05T11:00:00+06:00', decidedById: 'u-10', decidedAt: '2026-10-06T10:00:00+06:00', recurringId: 'RP-03',
  payment: { reference: 'CHQ 448812', method: 'Cheque', paidAt: '2026-10-08T12:00:00+06:00', paidById: 'u-09' },
  history: [
  { at: '2026-10-05T11:00:00+06:00', byId: 'u-09', byName: 'Moushumi Akter', action: 'Submitted', comment: 'October rent for 6th floor branch office as per agreement.' },
  { at: '2026-10-06T10:00:00+06:00', byId: 'u-10', byName: 'Finance Approver', action: 'Approved', comment: 'Matches agreement and last month’s amount.', rule: { name: 'Operational payment — Finance Approver', approverRoles: ['financeApprover'], requiredPermission: 'approveFinancial', condition: 'Any amount', capturedAt: '2026-10-06T10:00:00+06:00' } }]

},
{
  id: 'OF-2026-0044', category: 'Upstream / vendor payment', payee: 'Fiber@Home (NTTN last-mile, Sept)', amount: 286500, branchId: 'dhaka-south', period: '2026-09', description: 'NTTN charges for September per vendor statement, 42 links.', evidence: [{ name: 'fah-statement-sep.pdf', sizeKb: 540 }], evidenceRef: 'FAH/STMT/0926',
  status: 'Approved', requestedById: 'u-09', requestedAt: '2026-10-09T15:00:00+06:00', decidedById: 'u-10', decidedAt: '2026-10-10T11:30:00+06:00',
  history: [
  { at: '2026-10-09T15:00:00+06:00', byId: 'u-09', byName: 'Moushumi Akter', action: 'Submitted', comment: 'NTTN charges for September per vendor statement, 42 links.' },
  { at: '2026-10-10T11:30:00+06:00', byId: 'u-10', byName: 'Finance Approver', action: 'Approved', comment: 'Link count reconciled with NOC list.', rule: { name: 'Operational payment — Finance Approver', approverRoles: ['financeApprover'], requiredPermission: 'approveFinancial', condition: 'Any amount', capturedAt: '2026-10-10T11:30:00+06:00' } }]

},
{
  id: 'OF-2026-0046', category: 'Emergency medical allowance', payee: 'Jahid Hasan (Field Technician)', amount: 15000, branchId: 'dhaka-north', period: '2026-10', description: 'Hospital bill after pole fall during fibre splicing on 11 Oct.', evidence: [], evidenceRef: '',
  status: 'Returned', requestedById: 'u-09', requestedAt: '2026-10-13T10:00:00+06:00', returned: { at: '2026-10-14T09:15:00+06:00', byId: 'u-10', comment: 'Please attach the hospital bill and supervisor incident note.' },
  history: [
  { at: '2026-10-13T10:00:00+06:00', byId: 'u-09', byName: 'Moushumi Akter', action: 'Submitted', comment: 'Hospital bill after pole fall during fibre splicing on 11 Oct.' },
  { at: '2026-10-14T09:15:00+06:00', byId: 'u-10', byName: 'Finance Approver', action: 'Returned', comment: 'Please attach the hospital bill and supervisor incident note.' }]

},
{
  id: 'OF-2026-0047', category: 'Salary payment', payee: 'Chattogram branch staff (bank sheet)', amount: 520000, branchId: 'chattogram', period: '2026-09', description: 'September salary transfer as per HR-approved bank sheet. Payment record only.', evidence: [{ name: 'hr-bank-sheet-sep.xlsx', sizeKb: 48 }], evidenceRef: 'HR/SAL/0926/CTG',
  status: 'Pending Approval', requestedById: 'u-09', requestedAt: '2026-10-14T16:30:00+06:00',
  history: [{ at: '2026-10-14T16:30:00+06:00', byId: 'u-09', byName: 'Moushumi Akter', action: 'Submitted', comment: 'September salary transfer as per HR-approved bank sheet. Payment record only.' }]
},
{
  id: 'OF-2026-0048', category: 'Entertainment', payee: 'Mezbaan Restaurant', amount: 8400, branchId: 'dhaka-north', period: '2026-10', description: 'Lunch with Meghna Textiles IT team during negotiation meeting.', evidence: [{ name: 'mezbaan-bill.jpg', sizeKb: 320 }], evidenceRef: 'Bill 7731',
  status: 'Pending Approval', requestedById: 'u-09', requestedAt: '2026-10-15T09:00:00+06:00',
  history: [{ at: '2026-10-15T09:00:00+06:00', byId: 'u-09', byName: 'Moushumi Akter', action: 'Submitted', comment: 'Lunch with Meghna Textiles IT team during negotiation meeting.' }]
},
{
  id: 'OF-2026-0043', category: 'Conveyance', payee: 'Pathao Business (Oct 1–10)', amount: 6200, branchId: 'dhaka-south', period: '2026-10', description: 'Corporate ride account for support visits, first ten days.', evidence: [{ name: 'pathao-statement.pdf', sizeKb: 90 }], evidenceRef: 'PB-OCT-01',
  status: 'Rejected', requestedById: 'u-09', requestedAt: '2026-10-11T12:00:00+06:00', decidedById: 'u-10', decidedAt: '2026-10-12T10:00:00+06:00',
  history: [
  { at: '2026-10-11T12:00:00+06:00', byId: 'u-09', byName: 'Moushumi Akter', action: 'Submitted', comment: 'Corporate ride account for support visits, first ten days.' },
  { at: '2026-10-12T10:00:00+06:00', byId: 'u-10', byName: 'Finance Approver', action: 'Rejected', comment: 'Already claimed by staff through individual conveyance claims — duplicate.' }]

},
{
  id: 'OF-2026-0049', category: 'Other approved expense', payee: 'BTRC (licence renewal fee)', amount: 50000, branchId: 'dhaka-south', period: '2026-10', description: 'ISP Category A licence renewal fee, receipt from BTRC portal.', evidence: [{ name: 'btrc-challan.pdf', sizeKb: 130 }], evidenceRef: 'BTRC/2026/8812',
  status: 'Paid', requestedById: 'u-09', requestedAt: '2026-10-02T11:00:00+06:00', decidedById: 'u-10', decidedAt: '2026-10-02T15:00:00+06:00',
  payment: { reference: 'BEFTN 20261003-5521', method: 'BEFTN', paidAt: '2026-10-03T11:00:00+06:00', paidById: 'u-09' },
  history: [
  { at: '2026-10-02T11:00:00+06:00', byId: 'u-09', byName: 'Moushumi Akter', action: 'Submitted', comment: 'ISP Category A licence renewal fee, receipt from BTRC portal.' },
  { at: '2026-10-02T15:00:00+06:00', byId: 'u-10', byName: 'Finance Approver', action: 'Approved', comment: 'Statutory fee, challan verified.' }]

}];