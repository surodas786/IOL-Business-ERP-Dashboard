import type { ApprovalRule } from '../../types/admin';
import type { Approval, ServiceChange } from '../../types/records';

// FICTIONAL DEMO DATA — all companies, people, IDs and amounts are invented.

export const serviceChanges: ServiceChange[] = [
{
  id: 'SC-2026-0057', customerId: 'CU-1007', connectionId: 'CN-50140', type: 'Discontinuation', fromValue: 'Internet 10 Mbps · Radio · Showroom & Office', toValue: 'Service ended',
  reason: 'Customer relocating office outside IOL coverage', requestedAt: '2026-10-12T12:30:00+06:00', requestedById: 'u-05', requestedDate: '2026-10-31T23:59:00+06:00', effectiveDate: '2026-10-31T23:59:00+06:00',
  status: 'Approved', fromMrc: 8500,
  technicalImpact: { byId: 'u-06', at: '2026-10-12T13:30:00+06:00', impact: 'Shut radio link at Zindabazar PoP; retrieve LiteBeam, PoE and ONT; release VLAN 4140 and /30.' },
  commercialImpact: { byId: 'u-04', at: '2026-10-12T13:45:00+06:00', summary: 'Contract term ended — no early-termination fee. Final prepaid invoice covers October; refund any advance.' },
  approvalId: 'AP-2026-0170', decidedById: 'u-02', decidedAt: '2026-10-12T14:30:00+06:00', workOrderId: 'WO-2026-0151',
  clearances: { technical: { status: 'Pending', checks: {} }, accounts: { status: 'Pending', checks: {} } },
  branchId: 'sylhet', zoneId: 'zindabazar'
},
{
  id: 'SC-2026-0061', customerId: 'CU-1002', connectionId: 'CN-50121', type: 'Upgrade', fromValue: '50 Mbps Internet', toValue: '100 Mbps',
  reason: 'ERP rollout at Head Office needs more headroom', requestedAt: '2026-10-14T17:05:00+06:00', requestedById: 'u-04', requestedDate: '2026-11-01T00:00:00+06:00',
  status: 'Requested', fromMrc: 32000, toMrc: 52000, fromBandwidth: 50, toBandwidth: 100, costBearer: 'IOL', equipmentCost: 38000, upgradeCharge: 10000, recurringCostDelta: 9000,
  commercialImpact: { byId: 'u-04', at: '2026-10-14T17:05:00+06:00', summary: 'MRC ৳ 32,000 → ৳ 52,000 from the effective date; ৳ 10,000 one-time upgrade charge. IOL funds a 10G SFP+ and media converter.' },
  branchId: 'dhaka-south', zoneId: 'motijheel'
},
{
  id: 'SC-2026-0063', customerId: 'CU-1002', connectionId: 'CN-50124', type: 'Upgrade', fromValue: 'CCTV — 8 cameras', toValue: 'CCTV — 12 cameras',
  reason: 'Four cameras added at the loading bay', requestedAt: '2026-10-10T11:00:00+06:00', requestedById: 'u-04', requestedDate: '2026-11-16T00:00:00+06:00', effectiveDate: '2026-11-16T00:00:00+06:00',
  status: 'Implemented', fromMrc: 6500, toMrc: 9000, fromBandwidth: 0, toBandwidth: 0, costBearer: 'Customer', upgradeCharge: 0, recurringCostDelta: 0,
  technicalImpact: { byId: 'u-06', at: '2026-10-10T15:00:00+06:00', impact: 'NVR has 4 free channels; extra PoE switch ports available.', capacityValidated: true },
  commercialImpact: { byId: 'u-04', at: '2026-10-10T11:00:00+06:00', summary: 'Cameras supplied by customer. MRC ৳ 6,500 → ৳ 9,000 from 16 Nov (customer asked to start after their audit).' },
  approvalId: 'AP-2026-0171', decidedById: 'u-02', decidedAt: '2026-10-11T10:00:00+06:00',
  evidence: { byId: 'u-06', at: '2026-10-13T18:00:00+06:00', doneAt: '2026-10-13T16:30:00+06:00', notes: 'Four cameras mounted and added to NVR; recording verified for 2 hours.', files: ['loading-bay-cams.jpg', 'nvr-channel-test.pdf'] },
  branchId: 'dhaka-south', zoneId: 'motijheel'
},
{
  id: 'SC-2026-0065', customerId: 'CU-1003', connectionId: 'CN-50130', type: 'Shifting', fromValue: 'Green Valley Complex, Road 12, Sector 7, Uttara, Dhaka 1230', toValue: 'Green Valley — Management Office, House 21, Road 14, Sector 7, Uttara, Dhaka 1230',
  reason: 'Owners’ committee moving the building feed to the new management office', requestedAt: '2026-10-13T11:20:00+06:00', requestedById: 'u-04', requestedDate: '2026-10-25T10:00:00+06:00',
  status: 'Pending Approval', fromMrc: 42000, fromSiteId: 'ST-2004',
  destination: { name: 'Green Valley — Management Office', address: 'House 21, Road 14, Sector 7, Uttara, Dhaka 1230', contactName: 'Kamal Uddin (Manager)', contactPhone: '+880 1712-774310' },
  relocationCharge: 8000, costBearer: 'IOL', equipmentCost: 6500, equipmentMovement: 'ONT and building OLT feed moved; 180 m new drop fibre (IOL-supplied).', interruptionHours: 6, recurringCostDelta: 0,
  technicalImpact: { byId: 'u-06', at: '2026-10-14T12:00:00+06:00', impact: '180 m fibre from the Uttara-7 splitter; riser access needs building permission.', feasibility: 'Feasible with conditions' },
  commercialImpact: { byId: 'u-04', at: '2026-10-13T11:20:00+06:00', summary: 'MRC unchanged. ৳ 8,000 relocation charge recovers the new drop fibre.' },
  approvalId: 'AP-2026-0172', branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'SC-2026-0066', customerId: 'CU-1002', connectionId: 'CN-50122', type: 'Temporary Stop', fromValue: 'Internet 30 Mbps · Fibre · Rolling Mill', toValue: 'Stopped 5 Oct 2026 – expected 17 Oct 2026',
  reason: 'Rolling mill annual maintenance shutdown', requestedAt: '2026-09-28T10:00:00+06:00', requestedById: 'u-04', requestedDate: '2026-10-05T00:00:00+06:00', effectiveDate: '2026-10-05T00:00:00+06:00',
  status: 'Stopped', fromMrc: 18000, expectedResumption: '2026-10-17T10:00:00+06:00', continuingCharge: 4000, reminderAt: '2026-10-15T10:00:00+06:00',
  technicalImpact: { byId: 'u-06', at: '2026-09-29T11:00:00+06:00', impact: 'Port administratively down; ONT stays on site; VLAN 1122 kept reserved.' },
  commercialImpact: { byId: 'u-04', at: '2026-09-28T10:00:00+06:00', summary: 'Port retention ৳ 4,000/month while stopped instead of ৳ 18,000.' },
  approvalId: 'AP-2026-0173', decidedById: 'u-02', decidedAt: '2026-09-30T09:30:00+06:00',
  evidence: { byId: 'u-06', at: '2026-10-05T09:15:00+06:00', doneAt: '2026-10-05T09:00:00+06:00', notes: 'Port shut on core switch; customer informed by phone.', files: ['port-admin-down.png'] },
  branchId: 'dhaka-south', zoneId: 'jatrabari'
},
{
  id: 'SC-2026-0067', customerId: 'CU-1008', connectionId: 'CN-50150', type: 'Downgrade', fromValue: '1000 Mbps IP Transit', toValue: '600 Mbps',
  reason: 'Associate moving part of its subscribers to a second upstream', requestedAt: '2026-10-11T15:00:00+06:00', requestedById: 'u-04', requestedDate: '2026-11-01T00:00:00+06:00',
  status: 'Pending Approval', fromMrc: 96000, toMrc: 62000, fromBandwidth: 1000, toBandwidth: 600, costBearer: 'No new equipment', recurringCostDelta: -21000,
  technicalImpact: { byId: 'u-06', at: '2026-10-12T10:00:00+06:00', impact: 'Rate-limit change on the core router; no site visit.', capacityValidated: true, capacityNote: 'Frees 400 Mbps of Chattogram upstream.' },
  commercialImpact: { byId: 'u-04', at: '2026-10-11T15:00:00+06:00', summary: 'MRC ৳ 96,000 → ৳ 62,000; upstream cost falls by about ৳ 21,000/month.' },
  approvalId: 'AP-2026-0174', branchId: 'chattogram', zoneId: 'pahartali'
}];


export const serviceChangeApprovals: Approval[] = [
{ id: 'AP-2026-0170', type: 'Service Change', title: 'Discontinuation SC-2026-0057 — Surma Tea Traders', detail: 'Service stop 31 Oct 2026', amount: 0, entity: { type: 'serviceChange', id: 'SC-2026-0057' }, related: [{ type: 'customer', id: 'CU-1007' }, { type: 'connection', id: 'CN-50140' }], requestedById: 'u-05', requestedAt: '2026-10-12T13:45:00+06:00', requiredPermission: 'approveQuotation', status: 'Approved', decidedById: 'u-02', decidedAt: '2026-10-12T14:30:00+06:00', serviceChangeId: 'SC-2026-0057', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'AP-2026-0171', type: 'Service Change', title: 'Upgrade SC-2026-0063 — Rahman Steel Works', detail: 'CCTV 8 → 12 cameras', amount: 2500, entity: { type: 'serviceChange', id: 'SC-2026-0063' }, related: [{ type: 'customer', id: 'CU-1002' }, { type: 'connection', id: 'CN-50124' }], requestedById: 'u-04', requestedAt: '2026-10-10T15:00:00+06:00', requiredPermission: 'approveQuotation', status: 'Approved', decidedById: 'u-02', decidedAt: '2026-10-11T10:00:00+06:00', serviceChangeId: 'SC-2026-0063', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'AP-2026-0172', type: 'Service Change', title: 'Shifting SC-2026-0065 — Green Valley Apartments', detail: 'To Management Office, Road 14 · requested 25 Oct 2026 · proposed payback Recovered upfront', amount: 8000, entity: { type: 'serviceChange', id: 'SC-2026-0065' }, related: [{ type: 'customer', id: 'CU-1003' }, { type: 'connection', id: 'CN-50130' }], requestedById: 'u-04', requestedAt: '2026-10-14T12:00:00+06:00', requiredPermission: 'approveQuotation', status: 'Pending', serviceChangeId: 'SC-2026-0065', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'AP-2026-0173', type: 'Service Change', title: 'Temporary stop SC-2026-0066 — Rahman Steel Works', detail: 'Rolling Mill · 5–17 Oct 2026', amount: 4000, entity: { type: 'serviceChange', id: 'SC-2026-0066' }, related: [{ type: 'customer', id: 'CU-1002' }, { type: 'connection', id: 'CN-50122' }], requestedById: 'u-04', requestedAt: '2026-09-29T11:00:00+06:00', requiredPermission: 'approveQuotation', status: 'Approved', decidedById: 'u-02', decidedAt: '2026-09-30T09:30:00+06:00', serviceChangeId: 'SC-2026-0066', branchId: 'dhaka-south', zoneId: 'jatrabari' },
{ id: 'AP-2026-0174', type: 'Service Change', title: 'Downgrade SC-2026-0067 — Pahartali Cable & Net', detail: '1000 → 600 Mbps · requested 1 Nov 2026', amount: 34000, entity: { type: 'serviceChange', id: 'SC-2026-0067' }, related: [{ type: 'customer', id: 'CU-1008' }, { type: 'connection', id: 'CN-50150' }], requestedById: 'u-04', requestedAt: '2026-10-12T10:00:00+06:00', requiredPermission: 'approveQuotation', status: 'Pending', serviceChangeId: 'SC-2026-0067', branchId: 'chattogram', zoneId: 'pahartali' }];


export const serviceChangeApprovalRules: ApprovalRule[] = [
{ id: 'AR-40', name: 'Service change (shifting, upgrade, downgrade, stop, discontinuation)', approvalType: 'Service Change', comparator: 'any', requiredPermission: 'approveQuotation', approverRoles: ['businessHead', 'management'], slaHours: 24, enforcedInDemo: true }];


/** Connection states that follow from the seeded changes. */
export const connectionStatusOverrides: Record<string, 'Temporarily Stopped'> = {
  'CN-50122': 'Temporarily Stopped'
};