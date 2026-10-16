import type { ExpenseClaim, FieldVisit, SalesTarget } from '../../types/field';

// FICTIONAL DEMO DATA — visits, expense claims and targets are invented.
// Location stamps are illustrative; they are never treated as proof of a visit.

export const fieldVisits: FieldVisit[] = [
{
  id: 'VS-2026-0101', userId: 'u-07', at: '2026-10-12T13:30:00+06:00', durationMin: 120, subject: { type: 'customer', id: 'CU-1004' },
  location: '5th Floor, 104 Agrabad C/A, Chattogram 4100', purpose: 'Technical support', peopleMet: 'Faisal Chowdhury (Head of IT)', outcome: 'Positive',
  notes: 'Installation IJ-2026-1098 completed and link tested at 20 Mbps with the customer present.', nextAction: '', nextActionDue: '',
  attachments: [{ name: 'PortView_link_test.pdf', sizeKb: 214 }], photos: 2, claimId: 'EX-2026-0029', createdAt: '2026-10-12T15:40:00+06:00', branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'VS-2026-0102', userId: 'u-04', at: '2026-10-08T11:00:00+06:00', durationMin: 60, subject: { type: 'customer', id: 'CU-1002' },
  location: '88 Motijheel C/A, Dhaka 1000', purpose: 'Account servicing', peopleMet: 'Abdur Rahman (Director)', outcome: 'Positive',
  notes: 'Quarterly review. Customer wants the new Narayanganj warehouse on the same account. রহমান সাহেব ডিসেম্বরের মধ্যে চালু করতে চান।',
  nextAction: 'Visit Narayanganj warehouse with survey team', nextActionDue: '2026-10-13T11:00:00+06:00', followUpDoneAt: '2026-10-13T12:30:00+06:00', followUpNote: 'Visited — see VS-2026-0104',
  attachments: [], photos: 0, createdAt: '2026-10-08T13:00:00+06:00', branchId: 'dhaka-south', zoneId: 'motijheel'
},
{
  id: 'VS-2026-0103', userId: 'u-15', at: '2026-10-09T15:00:00+06:00', durationMin: 75, subject: { type: 'lead', id: 'LD-2026-0249' },
  location: 'Bandar Road, Agrabad, Chattogram 4100', purpose: 'Requirement discussion', peopleMet: 'Rezaul Karim (IT Manager)', outcome: 'Neutral',
  notes: 'Customer wants backup link pricing before taking the proposal to the board.', nextAction: 'Send revised proposal with backup link pricing', nextActionDue: '2026-10-12T17:00:00+06:00',
  attachments: [], photos: 0, claimId: 'EX-2026-0035', createdAt: '2026-10-09T18:10:00+06:00', branchId: 'chattogram', zoneId: 'agrabad',
  geo: { lat: 22.3271, lng: 91.8123, accuracyM: 35, capturedAt: '2026-10-09T15:02:00+06:00', source: 'Demo' }
},
{
  id: 'VS-2026-0104', userId: 'u-04', at: '2026-10-13T11:00:00+06:00', durationMin: 90, subject: { type: 'customer', id: 'CU-1002' },
  location: 'Plot 31, BSCIC Industrial Estate, Narayanganj 1400', purpose: 'Requirement discussion', peopleMet: 'Abdur Rahman (Director), warehouse manager', outcome: 'Positive',
  notes: 'Walked the warehouse. Pole route along the BSCIC road looks possible; survey needed.', nextAction: 'Request feasibility survey for the warehouse', nextActionDue: '2026-10-17T12:00:00+06:00',
  attachments: [], photos: 3, claimId: 'EX-2026-0033', createdAt: '2026-10-13T14:00:00+06:00', branchId: 'dhaka-south', zoneId: 'jatrabari'
},
{
  id: 'VS-2026-0105', userId: 'u-03', at: '2026-10-13T15:00:00+06:00', durationMin: 80, subject: { type: 'lead', id: 'LD-2026-0311' },
  location: 'Kashimpur Road, Konabari, Gazipur 1751', purpose: 'Proposal presentation', peopleMet: 'Shahidul Karim (GM — Administration), factory IT lead', outcome: 'Positive',
  notes: 'Presented the 100 Mbps proposal; customer asked for a /29 IPv4 block to be included.', nextAction: 'Send approved quotation to Shahidul Karim', nextActionDue: '2026-10-16T12:00:00+06:00',
  attachments: [{ name: 'Meghna_proposal_v2.pdf', sizeKb: 1180 }], photos: 0, claimId: 'EX-2026-0041', createdAt: '2026-10-13T18:20:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'VS-2026-0106', userId: 'u-13', at: '2026-10-14T11:00:00+06:00', durationMin: 45, subject: { type: 'customer', id: 'CU-1007' },
  location: 'Zindabazar, Sylhet 3100', purpose: 'Technical support', peopleMet: 'Shop manager', outcome: 'Positive',
  notes: 'Collected ONT for the disconnection request; serial matches the connection record.', nextAction: '', nextActionDue: '',
  attachments: [], photos: 1, createdAt: '2026-10-14T12:10:00+06:00', branchId: 'sylhet', zoneId: 'zindabazar'
},
{
  id: 'VS-2026-0107', userId: 'u-03', at: '2026-10-14T11:30:00+06:00', durationMin: 30, subject: { type: 'lead', id: 'LD-2026-0320' },
  location: 'House 18, Road 11, Banani, Dhaka 1213', purpose: 'Prospecting', peopleMet: 'Building caretaker', outcome: 'Contact unavailable',
  notes: 'Secretary Shirin Sultana was out; left a brochure with the caretaker.', nextAction: 'First call to Shirin Sultana', nextActionDue: '2026-10-15T16:00:00+06:00',
  attachments: [], photos: 0, claimId: 'EX-2026-0041', createdAt: '2026-10-14T12:20:00+06:00', branchId: 'dhaka-north', zoneId: 'gulshan'
},
{
  id: 'VS-2026-0108', userId: 'u-15', at: '2026-10-14T16:00:00+06:00', durationMin: 40, subject: { type: 'customer', id: 'CU-1004' },
  location: '5th Floor, 104 Agrabad C/A, Chattogram 4100', purpose: 'Account servicing', peopleMet: 'Faisal Chowdhury (Head of IT)', outcome: 'Positive',
  notes: 'Post-installation courtesy visit. Customer satisfied; asked when the first invoice will arrive.', nextAction: 'Confirm billing start date with Accounts', nextActionDue: '2026-10-16T12:00:00+06:00',
  attachments: [], photos: 0, createdAt: '2026-10-14T17:30:00+06:00', branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'VS-2026-0109', userId: 'u-14', at: '2026-10-14T15:30:00+06:00', durationMin: 50, subject: { type: 'lead', id: 'LD-2026-0327' },
  location: 'Konabari, Gazipur', purpose: 'Prospecting', peopleMet: 'Shahidul Karim (Administration)', outcome: 'Neutral',
  notes: 'Contact appears to be the same person handled by Tanvir for Meghna Textiles Ltd. Flagged for duplicate review.', nextAction: 'Wait for duplicate review before calling again', nextActionDue: '2026-10-16T11:00:00+06:00',
  attachments: [], photos: 0, claimId: 'EX-2026-0038', createdAt: '2026-10-14T18:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'VS-2026-0110', userId: 'u-03', at: '2026-10-15T09:30:00+06:00', durationMin: 40, subject: { type: 'customer', id: 'CU-1006' },
  location: 'Plot 7, Section 10, Mirpur, Dhaka 1216', purpose: 'Account servicing', peopleMet: 'Dr. Nazmul Haque (Managing Director)', outcome: 'Positive',
  notes: 'First-month check-in. PACS uploads stable. ড. নাজমুল আরও একটি শাখার কথা বলেছেন।', nextAction: 'Share pricing for a second branch in Pallabi', nextActionDue: '2026-10-20T12:00:00+06:00',
  attachments: [], photos: 0, createdAt: '2026-10-15T10:20:00+06:00', branchId: 'dhaka-north', zoneId: 'mirpur',
  geo: { lat: 23.8069, lng: 90.3687, accuracyM: 20, capturedAt: '2026-10-15T09:31:00+06:00', source: 'Demo' }
},
{
  id: 'VS-2026-0111', userId: 'u-14', at: '2026-10-15T10:00:00+06:00', durationMin: 35, subject: { type: 'lead', id: 'LD-2026-0320' },
  location: 'House 18, Road 11, Banani, Dhaka 1213', purpose: 'Requirement discussion', peopleMet: 'Residents’ committee member (Flat 7B)', outcome: 'Positive',
  notes: 'Committee wants one fibre feed with per-flat accounts. Asked me to be point of contact; assignment review raised.', nextAction: 'Share bulk broadband package sheet', nextActionDue: '2026-10-17T15:00:00+06:00',
  attachments: [], photos: 0, claimId: 'EX-2026-0038', createdAt: '2026-10-15T10:35:00+06:00', branchId: 'dhaka-north', zoneId: 'gulshan'
}];


const ev = (at: string, byId: string, action: string, note?: string) => ({ at, byId, action, note });

export const expenseClaims: ExpenseClaim[] = [
{
  id: 'EX-2026-0029', claimantId: 'u-07', status: 'Paid', createdAt: '2026-10-12T16:00:00+06:00', submittedAt: '2026-10-12T16:05:00+06:00',
  decidedById: 'u-06', decidedAt: '2026-10-13T09:30:00+06:00', paidAt: '2026-10-14T15:00:00+06:00', paymentRef: 'bKash disbursement PAY-77412', branchId: 'chattogram', zoneId: 'agrabad',
  lines: [{ id: 'EL-0101', date: '2026-10-12', category: 'Conveyance', amount: 300, purpose: 'CNG Pahartali → Agrabad with tools', relation: 'Customer acquisition', subject: { type: 'customer', id: 'CU-1004' }, visitId: 'VS-2026-0101', noReceiptReason: 'CNG fare, no receipt issued' }],
  adjustments: [],
  history: [ev('2026-10-12T16:05:00+06:00', 'u-07', 'Submitted'), ev('2026-10-13T09:30:00+06:00', 'u-06', 'Approved'), ev('2026-10-14T15:00:00+06:00', 'u-09', 'Paid', 'bKash disbursement PAY-77412')]
},
{
  id: 'EX-2026-0030', claimantId: 'u-13', status: 'Rejected', createdAt: '2026-10-10T18:00:00+06:00', submittedAt: '2026-10-10T18:02:00+06:00',
  decidedById: 'u-06', decidedAt: '2026-10-11T10:00:00+06:00', branchId: 'sylhet', zoneId: 'zindabazar',
  lines: [{ id: 'EL-0102', date: '2026-10-10', category: 'Conveyance', amount: 1800, purpose: 'Microbus Sylhet → Sunamganj', relation: 'Account servicing', receipt: { name: 'microbus_ticket.jpg', sizeKb: 640 } }],
  adjustments: [],
  history: [ev('2026-10-10T18:02:00+06:00', 'u-13', 'Submitted'), ev('2026-10-11T10:00:00+06:00', 'u-06', 'Rejected', 'No job or customer is linked to this trip; it was not an assigned visit.')]
},
{
  id: 'EX-2026-0033', claimantId: 'u-04', status: 'Approved', createdAt: '2026-10-13T14:10:00+06:00', submittedAt: '2026-10-13T17:00:00+06:00',
  decidedById: 'u-02', decidedAt: '2026-10-14T10:15:00+06:00', branchId: 'dhaka-south', zoneId: 'jatrabari',
  lines: [
  { id: 'EL-0103', date: '2026-10-13', category: 'Conveyance', amount: 1450, purpose: 'Ride-share Motijheel ↔ Narayanganj BSCIC', relation: 'Customer acquisition', subject: { type: 'customer', id: 'CU-1002' }, visitId: 'VS-2026-0104', receipt: { name: 'ride_receipt_1310.pdf', sizeKb: 92 } },
  { id: 'EL-0104', date: '2026-10-08', category: 'Conveyance', amount: 260, purpose: 'Rickshaw and bus to Motijheel office', relation: 'Account servicing', subject: { type: 'customer', id: 'CU-1002' }, visitId: 'VS-2026-0102', noReceiptReason: 'Rickshaw and bus fares' }],

  adjustments: [],
  history: [ev('2026-10-13T17:00:00+06:00', 'u-04', 'Submitted'), ev('2026-10-14T10:15:00+06:00', 'u-02', 'Approved')]
},
{
  id: 'EX-2026-0035', claimantId: 'u-15', status: 'Returned', createdAt: '2026-10-09T18:20:00+06:00', submittedAt: '2026-10-10T09:00:00+06:00',
  decidedById: 'u-02', decidedAt: '2026-10-13T11:00:00+06:00', branchId: 'chattogram', zoneId: 'agrabad',
  lines: [
  { id: 'EL-0105', date: '2026-10-09', category: 'Conveyance', amount: 350, purpose: 'CNG to Bandar Road', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0249' }, visitId: 'VS-2026-0103', noReceiptReason: 'CNG fare' },
  { id: 'EL-0106', date: '2026-10-09', category: 'Entertainment', amount: 2400, purpose: 'Working lunch with KFT IT team (3 guests)', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0249' }, visitId: 'VS-2026-0103', noReceiptReason: 'Restaurant bill misplaced' }],

  adjustments: [],
  history: [ev('2026-10-10T09:00:00+06:00', 'u-15', 'Submitted'), ev('2026-10-13T11:00:00+06:00', 'u-02', 'Returned', 'Entertainment needs the restaurant receipt. Please attach it and resubmit.')]
},
{
  id: 'EX-2026-0036', claimantId: 'u-02', status: 'Submitted', createdAt: '2026-10-08T19:00:00+06:00', submittedAt: '2026-10-08T19:05:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  lines: [{ id: 'EL-0107', date: '2026-10-08', category: 'Entertainment', amount: 3500, purpose: 'Tender bid submission — lunch with procurement liaison', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0270' }, receipt: { name: 'lunch_receipt_0810.jpg', sizeKb: 410 } }],
  adjustments: [],
  history: [ev('2026-10-08T19:05:00+06:00', 'u-02', 'Submitted', 'Business Head claim — routed to Finance Approver')]
},
{
  id: 'EX-2026-0038', claimantId: 'u-14', status: 'Draft', createdAt: '2026-10-14T18:05:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  lines: [
  { id: 'EL-0108', date: '2026-10-14', category: 'Conveyance', amount: 680, purpose: 'Bus and CNG Uttara → Konabari', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0327' }, visitId: 'VS-2026-0109', receipt: { name: 'cng_receipt.jpg', sizeKb: 305 } },
  { id: 'EL-0109', date: '2026-10-15', category: 'Entertainment', amount: 1200, purpose: 'Tea and snacks with residents’ committee', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0320' }, visitId: 'VS-2026-0111', receipt: { name: 'cafe_bill_1510.jpg', sizeKb: 288 } }],

  adjustments: [],
  history: []
},
{
  id: 'EX-2026-0041', claimantId: 'u-03', status: 'Submitted', createdAt: '2026-10-13T18:25:00+06:00', submittedAt: '2026-10-14T18:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  lines: [
  { id: 'EL-0110', date: '2026-10-13', category: 'Conveyance', amount: 850, purpose: 'Ride-share Uttara → Konabari and back', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0311' }, visitId: 'VS-2026-0105', receipt: { name: 'ride_1310.pdf', sizeKb: 88 } },
  { id: 'EL-0111', date: '2026-10-13', category: 'Printing & documents', amount: 420, purpose: 'Colour proposal printouts (6 copies)', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0311' }, visitId: 'VS-2026-0105', noReceiptReason: 'Under ৳ 500' },
  { id: 'EL-0112', date: '2026-10-14', category: 'Conveyance', amount: 220, purpose: 'Rickshaw and bus to Banani', relation: 'Customer acquisition', subject: { type: 'lead', id: 'LD-2026-0320' }, visitId: 'VS-2026-0107', noReceiptReason: 'Rickshaw fare' }],

  adjustments: [],
  history: [ev('2026-10-14T18:00:00+06:00', 'u-03', 'Submitted')]
}];


const t = (userId: string, visits: number, wonDeals: number, newMrc: number, collectedCash: number): SalesTarget[] => [
{ id: `TG-${userId}-v`, userId, period: '2026-10', measure: 'visits', target: visits },
{ id: `TG-${userId}-w`, userId, period: '2026-10', measure: 'wonDeals', target: wonDeals },
{ id: `TG-${userId}-m`, userId, period: '2026-10', measure: 'newMrc', target: newMrc },
{ id: `TG-${userId}-c`, userId, period: '2026-10', measure: 'collectedCash', target: collectedCash }];


export const salesTargets: SalesTarget[] = [
...t('u-03', 20, 2, 120000, 60000),
...t('u-14', 15, 1, 50000, 20000),
...t('u-15', 18, 2, 80000, 40000),
...t('u-04', 12, 1, 40000, 150000)];