import type { InstallationJob, InventoryMovement, Quotation, WorkOrder } from '../../types/records';

// FICTIONAL DEMO DATA — all companies, people, IDs and amounts are invented.
// Surveys live in ./surveys.ts.

export const quotations: Quotation[] = [
{ id: 'QT-2026-0371', opportunityId: 'OP-2026-0189', customerId: 'CU-1006', description: 'Dedicated Internet 40 Mbps, fibre, 1:1', mrc: 22500, otc: 15000, marginPct: 34, status: 'Accepted', preparedById: 'u-03', createdAt: '2026-09-14T15:00:00+06:00', validUntil: '2026-10-14T23:59:00+06:00', branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'QT-2026-0396', opportunityId: 'OP-2026-0178', customerId: 'CU-1004', description: 'Dedicated Internet 20 Mbps, fibre, 1:1', mrc: 14000, otc: 8000, marginPct: 33, status: 'Accepted', preparedById: 'u-02', createdAt: '2026-09-12T17:00:00+06:00', validUntil: '2026-10-12T23:59:00+06:00', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'QT-2026-0402', opportunityId: 'OP-2026-0183', customerId: 'CU-1005', description: 'Dedicated Internet 10 Mbps, fibre', mrc: 9000, otc: 8000, marginPct: 31, status: 'Accepted', preparedById: 'u-02', createdAt: '2026-09-24T13:00:00+06:00', validUntil: '2026-10-24T23:59:00+06:00', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'QT-2026-0418', opportunityId: 'OP-2026-0207', description: 'Dedicated Internet 100 Mbps, fibre, 1:1, /29 IPv4 block', mrc: 85000, otc: 45000, marginPct: 38, status: 'Pending Approval', preparedById: 'u-03', createdAt: '2026-10-13T16:10:00+06:00', validUntil: '2026-11-12T23:59:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara' }];


export const workOrders: WorkOrder[] = [
{ id: 'WO-2026-0131', type: 'New Connection', customerId: 'CU-1006', siteId: 'ST-2007', quotationId: 'QT-2026-0371', status: 'Completed', createdAt: '2026-09-25T14:00:00+06:00', createdById: 'u-05', branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'WO-2026-0144', type: 'New Connection', customerId: 'CU-1004', siteId: 'ST-2005', quotationId: 'QT-2026-0396', status: 'Completed', createdAt: '2026-09-20T11:00:00+06:00', createdById: 'u-05', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'WO-2026-0149', type: 'New Connection', customerId: 'CU-1005', siteId: 'ST-2006', quotationId: 'QT-2026-0402', status: 'In Progress', createdAt: '2026-10-03T10:30:00+06:00', createdById: 'u-05', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'WO-2026-0151', type: 'Disconnection', customerId: 'CU-1007', siteId: 'ST-2008', serviceChangeId: 'SC-2026-0057', status: 'Open', createdAt: '2026-10-12T15:00:00+06:00', createdById: 'u-05', branchId: 'sylhet', zoneId: 'zindabazar' }];


export const installationJobs: InstallationJob[] = [
{
  id: 'IJ-2026-1079', workOrderId: 'WO-2026-0131', customerId: 'CU-1006', siteId: 'ST-2007', connectionId: 'CN-50176', technicianName: 'Jahid Hasan', scheduledAt: '2026-10-01T11:00:00+06:00', status: 'Closed',
  completedAt: '2026-10-01T16:40:00+06:00', handoverAt: '2026-10-01T16:55:00+06:00', handoverById: 'u-06', customerAcceptedAt: '2026-10-01T16:45:00+06:00',
  verifiedAt: '2026-10-02T10:00:00+06:00', verifiedById: 'u-06', activatedAt: '2026-10-02T10:00:00+06:00', billingCommencedAt: '2026-10-02T10:00:00+06:00', billingReviewedById: 'u-09',
  billingBasis: 'Later of technical verification and customer acceptance',
  materials: 'Huawei EG8145V5 ONT ×1, 420 m drop fibre',
  materialLines: [
  { id: 'IJ-2026-1079-m1', item: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', unit: 'pc', planned: 1, reserved: 0, issued: 1, consumed: 1, returned: 0, serialised: true },
  { id: 'IJ-2026-1079-m2', item: 'Drop fibre, 2-core', sku: 'FBR-DROP-2C', unit: 'm', planned: 450, reserved: 0, issued: 450, consumed: 420, returned: 30 }],

  materialRequests: [
  { id: 'IJ-2026-1079-MR1', kind: 'Issue', lines: [{ materialId: 'IJ-2026-1079-m1', quantity: 1 }, { materialId: 'IJ-2026-1079-m2', quantity: 450 }], status: 'Fulfilled', requestedById: 'u-06', requestedAt: '2026-09-30T16:00:00+06:00', decidedById: 'u-08', decidedAt: '2026-10-01T09:15:00+06:00' },
  { id: 'IJ-2026-1079-MR2', kind: 'Return', lines: [{ materialId: 'IJ-2026-1079-m2', quantity: 30 }], status: 'Fulfilled', requestedById: 'u-06', requestedAt: '2026-10-01T17:10:00+06:00', decidedById: 'u-08', decidedAt: '2026-10-02T10:00:00+06:00' }],

  equipment: [{ id: 'IJ-2026-1079-e1', item: 'Huawei EG8145V5 ONT', serial: 'HWTC-6C11A902', ownership: 'IOL-owned (returnable)' }],
  completion: {
    workPerformed: 'Spliced 420 m drop from Mirpur-10 FDB-07 to 3rd-floor comms room; ONT wall-mounted; WAN and LAN tested; /30 handed off.',
    installedAt: '2026-10-01T16:40:00+06:00', consumed: [{ materialId: 'IJ-2026-1079-m1', quantity: 1 }, { materialId: 'IJ-2026-1079-m2', quantity: 420 }],
    tests: { opticalPowerDbm: -19.4, throughputMbps: 41, latencyMs: 4, packetLossPct: 0, result: 'Pass' },
    photos: [{ name: 'IJ1079-ont-mounted.jpg', sizeKb: 812 }, { name: 'IJ1079-speedtest.png', sizeKb: 204 }],
    acknowledgement: { name: 'Dr. Nazmul Haque', designation: 'Managing Director', method: 'Signed job sheet', at: '2026-10-01T16:45:00+06:00' },
    outstandingIssues: ''
  },
  history: [
  { at: '2026-09-25T14:00:00+06:00', byId: 'u-05', kind: 'Status', detail: 'Created from WO-2026-0131' },
  { at: '2026-09-25T16:00:00+06:00', byId: 'u-06', kind: 'Assignment', detail: 'Assigned to Jahid Hasan' },
  { at: '2026-09-26T10:00:00+06:00', byId: 'u-06', kind: 'Schedule', detail: 'Scheduled for 1 Oct 2026, 11:00 AM' },
  { at: '2026-10-01T16:55:00+06:00', byId: 'u-06', kind: 'Completion', detail: 'Marked done for Jahid Hasan — tests Pass' },
  { at: '2026-10-02T10:00:00+06:00', byId: 'u-06', kind: 'Verification', detail: 'Technically verified; service activated' },
  { at: '2026-10-02T10:00:00+06:00', byId: 'u-09', kind: 'Billing', detail: 'Billing commencement reviewed — starts 2 Oct 2026' }],

  branchId: 'dhaka-north', zoneId: 'mirpur'
},
{
  id: 'IJ-2026-1098', workOrderId: 'WO-2026-0144', customerId: 'CU-1004', siteId: 'ST-2005', connectionId: 'CN-50188', technicianName: 'Rakib Uddin', technicianUserId: 'u-07', scheduledAt: '2026-10-12T10:00:00+06:00', status: 'Verified',
  completedAt: '2026-10-12T15:35:00+06:00', handoverAt: '2026-10-12T15:50:00+06:00', handoverById: 'u-07', customerAcceptedAt: '2026-10-12T15:40:00+06:00',
  verifiedAt: '2026-10-12T18:10:00+06:00', verifiedById: 'u-06', activatedAt: '2026-10-12T18:10:00+06:00', verificationNote: 'Light levels and throughput checked remotely from Agrabad PoP.',
  billingBasis: 'Later of technical verification and customer acceptance',
  materials: 'Huawei EG8145V5 ONT ×1, 330 m drop fibre',
  materialLines: [
  { id: 'IJ-2026-1098-m1', item: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', unit: 'pc', planned: 1, reserved: 0, issued: 1, consumed: 1, returned: 0, serialised: true },
  { id: 'IJ-2026-1098-m2', item: 'Drop fibre, 2-core', sku: 'FBR-DROP-2C', unit: 'm', planned: 350, reserved: 0, issued: 350, consumed: 330, returned: 0 }],

  materialRequests: [
  { id: 'IJ-2026-1098-MR1', kind: 'Issue', lines: [{ materialId: 'IJ-2026-1098-m1', quantity: 1 }, { materialId: 'IJ-2026-1098-m2', quantity: 350 }], status: 'Fulfilled', requestedById: 'u-07', requestedAt: '2026-10-11T17:00:00+06:00', decidedById: 'u-08', decidedAt: '2026-10-12T08:30:00+06:00' }],

  equipment: [{ id: 'IJ-2026-1098-e1', item: 'Huawei EG8145V5 ONT', serial: 'HWTC-91B2D07F', ownership: 'IOL-owned (returnable)' }],
  completion: {
    workPerformed: 'Riser fibre pulled from basement ODF to 5th floor; ONT installed in customer rack; static /30 configured; LAN handed to customer IT.',
    installedAt: '2026-10-12T15:35:00+06:00', consumed: [{ materialId: 'IJ-2026-1098-m1', quantity: 1 }, { materialId: 'IJ-2026-1098-m2', quantity: 330 }],
    tests: { opticalPowerDbm: -21.2, throughputMbps: 20, latencyMs: 6, packetLossPct: 0, result: 'Pass' },
    photos: [{ name: 'IJ1098-rack.jpg', sizeKb: 1104 }],
    acknowledgement: { name: 'Faisal Chowdhury', designation: 'Admin Manager', method: 'Signature on device', at: '2026-10-12T15:40:00+06:00' },
    outstandingIssues: '20 m unused drop fibre still with technician — return pending.'
  },
  history: [
  { at: '2026-09-20T11:00:00+06:00', byId: 'u-05', kind: 'Status', detail: 'Created from WO-2026-0144' },
  { at: '2026-09-21T10:00:00+06:00', byId: 'u-06', kind: 'Assignment', detail: 'Assigned to Rakib Uddin' },
  { at: '2026-10-08T12:00:00+06:00', byId: 'u-06', kind: 'Schedule', detail: 'Scheduled for 12 Oct 2026, 10:00 AM' },
  { at: '2026-10-12T15:50:00+06:00', byId: 'u-07', kind: 'Completion', detail: 'Marked done — handed over; tests Pass' },
  { at: '2026-10-12T18:10:00+06:00', byId: 'u-06', kind: 'Verification', detail: 'Technically verified; service activated' }],

  branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'IJ-2026-1102', workOrderId: 'WO-2026-0149', customerId: 'CU-1005', siteId: 'ST-2006', connectionId: 'CN-50190', technicianName: 'Rakib Uddin', technicianUserId: 'u-07', scheduledAt: '2026-10-15T14:00:00+06:00', status: 'Scheduled',
  billingBasis: 'Later of technical verification and customer acceptance',
  materials: 'Huawei EG8145V5 ONT ×1 (issued), 280 m drop fibre',
  materialLines: [
  { id: 'IJ-2026-1102-m1', item: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', unit: 'pc', planned: 1, reserved: 0, issued: 1, consumed: 0, returned: 0, serialised: true },
  { id: 'IJ-2026-1102-m2', item: 'Drop fibre, 2-core', sku: 'FBR-DROP-2C', unit: 'm', planned: 280, reserved: 280, issued: 0, consumed: 0, returned: 0 },
  { id: 'IJ-2026-1102-m3', item: 'Fibre patch cord SC/APC 3 m', sku: 'PC-SCAPC-3M', unit: 'pc', planned: 2, reserved: 0, issued: 0, consumed: 0, returned: 0 }],

  materialRequests: [
  { id: 'IJ-2026-1102-MR1', kind: 'Reservation', lines: [{ materialId: 'IJ-2026-1102-m2', quantity: 280 }], status: 'Fulfilled', requestedById: 'u-06', requestedAt: '2026-10-04T11:00:00+06:00', decidedById: 'u-08', decidedAt: '2026-10-04T15:00:00+06:00' },
  { id: 'IJ-2026-1102-MR2', kind: 'Issue', lines: [{ materialId: 'IJ-2026-1102-m1', quantity: 1 }], status: 'Fulfilled', requestedById: 'u-07', requestedAt: '2026-10-14T17:30:00+06:00', decidedById: 'u-08', decidedAt: '2026-10-15T08:10:00+06:00' },
  { id: 'IJ-2026-1102-MR3', kind: 'Issue', lines: [{ materialId: 'IJ-2026-1102-m2', quantity: 280 }, { materialId: 'IJ-2026-1102-m3', quantity: 2 }], note: 'Collecting from Chattogram Warehouse at 12:30', status: 'Requested', requestedById: 'u-07', requestedAt: '2026-10-15T08:20:00+06:00' }],

  equipment: [],
  notes: [{ id: 'IJ-2026-1102-n1', at: '2026-10-14T16:05:00+06:00', byId: 'u-07', text: 'Roof key now with building caretaker (Mr. Selim, 01819-552011). Access confirmed for 2 PM.' }],
  history: [
  { at: '2026-10-03T10:30:00+06:00', byId: 'u-05', kind: 'Status', detail: 'Created from WO-2026-0149' },
  { at: '2026-10-03T12:00:00+06:00', byId: 'u-06', kind: 'Assignment', detail: 'Assigned to Rakib Uddin' },
  { at: '2026-10-05T10:00:00+06:00', byId: 'u-06', kind: 'Schedule', detail: 'Scheduled for 9 Oct 2026, 11:00 AM' },
  { at: '2026-10-09T11:40:00+06:00', byId: 'u-07', kind: 'Hold', detail: 'On hold — Building owner / landlord: roof access refused without owner’s written consent · review 13 Oct' },
  { at: '2026-10-14T16:00:00+06:00', byId: 'u-06', kind: 'Hold', detail: 'Hold lifted — consent letter received from building owner' },
  { at: '2026-10-14T16:00:00+06:00', byId: 'u-06', kind: 'Schedule', detail: 'Rescheduled for 15 Oct 2026, 2:00 PM' }],

  branchId: 'chattogram', zoneId: 'agrabad'
}];


export const inventoryMovements: InventoryMovement[] = [
{ id: 'IM-2026-0498', branchId: 'dhaka-north', zoneId: 'mirpur', itemName: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', quantity: 1, unit: 'pc', type: 'Issue', from: 'Dhaka Central Warehouse', to: 'IJ-2026-1079', jobId: 'IJ-2026-1079', serial: 'HWTC-6C11A902', at: '2026-10-01T09:15:00+06:00', byName: 'Shamim Ahmed' },
{ id: 'IM-2026-0499', branchId: 'dhaka-north', zoneId: 'mirpur', itemName: 'Drop fibre, 2-core', sku: 'FBR-DROP-2C', quantity: 450, unit: 'm', type: 'Issue', from: 'Dhaka Central Warehouse', to: 'IJ-2026-1079', jobId: 'IJ-2026-1079', at: '2026-10-01T09:15:00+06:00', byName: 'Shamim Ahmed' },
{ id: 'IM-2026-0502', branchId: 'dhaka-north', zoneId: 'mirpur', itemName: 'Drop fibre, 2-core', sku: 'FBR-DROP-2C', quantity: 30, unit: 'm', type: 'Return', from: 'IJ-2026-1079', to: 'Dhaka Central Warehouse', jobId: 'IJ-2026-1079', at: '2026-10-02T10:00:00+06:00', byName: 'Shamim Ahmed' },
{ id: 'IM-2026-0511', branchId: 'chattogram', zoneId: 'agrabad', itemName: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', quantity: 1, unit: 'pc', type: 'Issue', from: 'Chattogram Warehouse', to: 'IJ-2026-1098', jobId: 'IJ-2026-1098', serial: 'HWTC-91B2D07F', at: '2026-10-12T08:30:00+06:00', byName: 'Shamim Ahmed' },
{ id: 'IM-2026-0512', branchId: 'chattogram', zoneId: 'agrabad', itemName: 'Drop fibre, 2-core', sku: 'FBR-DROP-2C', quantity: 350, unit: 'm', type: 'Issue', from: 'Chattogram Warehouse', to: 'IJ-2026-1098', jobId: 'IJ-2026-1098', at: '2026-10-12T08:30:00+06:00', byName: 'Shamim Ahmed' },
{ id: 'IM-2026-0520', branchId: 'dhaka-south', itemName: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', quantity: 60, unit: 'pc', type: 'Receipt', from: 'Supplier — Huawei Technologies (BD)', to: 'Dhaka Central Warehouse', at: '2026-10-10T13:00:00+06:00', byName: 'Shamim Ahmed' },
{ id: 'IM-2026-0523', branchId: 'sylhet', itemName: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', quantity: 20, unit: 'pc', type: 'Transfer', from: 'Dhaka Central Warehouse', to: 'Sylhet Warehouse', at: '2026-10-14T10:20:00+06:00', byName: 'Shamim Ahmed' },
{ id: 'IM-2026-0526', branchId: 'chattogram', zoneId: 'agrabad', itemName: 'Huawei EG8145V5 ONT', sku: 'ONT-EG8145V5', quantity: 1, unit: 'pc', type: 'Issue', from: 'Chattogram Warehouse', to: 'IJ-2026-1102', jobId: 'IJ-2026-1102', serial: 'HWTC-A44E1B30', at: '2026-10-15T08:10:00+06:00', byName: 'Shamim Ahmed' }];