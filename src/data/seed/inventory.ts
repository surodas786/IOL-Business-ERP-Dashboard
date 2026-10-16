import type { ApprovalRule } from '../../types/admin';
import type { Approval, InventoryMovement } from '../../types/records';
import type { StockItem } from '../../types/survey';
import type { EquipmentUnit, InventoryItem, StockAdjustment, StockReservation, StockReturn, Vendor, VendorPrice } from '../../types/inventory';

// FICTIONAL DEMO DATA — all vendors, serials, people and prices are invented.

const DHK = 'Dhaka Central Warehouse';
const CTG = 'Chattogram Warehouse';
const SYL = 'Sylhet Warehouse';

export const inventoryItems: InventoryItem[] = [
{ sku: 'ONT-EG8145V5', name: 'Huawei EG8145V5 ONT', category: 'CPE', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 60, reorderLevel: 10, description: 'GPON ONT with Wi-Fi 5 for business internet', active: true },
{ sku: 'ONT-MA5671', name: 'Huawei MA5671 ONT', category: 'CPE', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 60, reorderLevel: 2, description: 'SFP ONT stick for building OLT feeds', active: true },
{ sku: 'SFP-1G-LX', name: '1G SFP LX module', category: 'Optics', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 48, reorderLevel: 4, active: true },
{ sku: 'RTR-MT-RB4011', name: 'MikroTik RB4011 router', category: 'Network equipment', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 60, reorderLevel: 1, active: true },
{ sku: 'RAD-UBNT-LBE5AC', name: 'Ubiquiti LiteBeam 5AC Gen2', category: 'Network equipment', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 48, reorderLevel: 2, description: 'Point-to-point radio with PoE injector', active: true },
{ sku: 'CAM-HIK-2CD', name: 'Hikvision 4MP IP camera', category: 'Security & CCTV', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 48, reorderLevel: 4, active: true },
{ sku: 'NVR-HIK-16', name: 'Hikvision 16-channel NVR', category: 'Security & CCTV', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 60, reorderLevel: 1, active: true },
{ sku: 'FBR-DROP-2C', name: 'Drop fibre, 2-core', category: 'Fibre & cable', unit: 'm', tracking: 'Quantity', returnable: false, reorderLevel: 1500, active: true },
{ sku: 'FBR-ADSS-12C', name: 'ADSS aerial fibre, 12-core', category: 'Fibre & cable', unit: 'm', tracking: 'Quantity', returnable: false, reorderLevel: 1000, active: true },
{ sku: 'PC-SCAPC-3M', name: 'Fibre patch cord SC/APC 3 m', category: 'Fibre & cable', unit: 'pc', tracking: 'Quantity', returnable: false, reorderLevel: 20, active: true },
{ sku: 'SPL-CLOSURE-24', name: 'Splice closure, 24F', category: 'Passive & hardware', unit: 'pc', tracking: 'Quantity', returnable: false, reorderLevel: 4, active: true },
{ sku: 'HW-POLE-CLAMP', name: 'Pole clamp set', category: 'Passive & hardware', unit: 'set', tracking: 'Quantity', returnable: false, reorderLevel: 30, active: true },
{ sku: 'RACK-9U', name: '9U wall rack', category: 'Passive & hardware', unit: 'pc', tracking: 'Quantity', returnable: false, reorderLevel: 1, active: true }];


/** Counters added to the warehouse stock rows seeded with surveys. */
export const stockExtras: Record<string, Partial<StockItem>> = {
  'STK-DHK-DROP': { installed: 420, returnedTotal: 30 },
  'STK-CTG-DROP': { withTechnician: 20, installed: 330 }
};

const priced = '2026-10-10T13:00:00+06:00';
export const extraStockItems: StockItem[] = [
{ id: 'STK-DHK-MA5671', sku: 'ONT-MA5671', name: 'Huawei MA5671 ONT', unit: 'pc', warehouse: DHK, onHand: 4, reserved: 0, unitCost: 3900, pricedAt: priced },
{ id: 'STK-DHK-LBE', sku: 'RAD-UBNT-LBE5AC', name: 'Ubiquiti LiteBeam 5AC Gen2', unit: 'pc', warehouse: DHK, onHand: 3, reserved: 0, unitCost: 9800, pricedAt: priced },
{ id: 'STK-SYL-LBE', sku: 'RAD-UBNT-LBE5AC', name: 'Ubiquiti LiteBeam 5AC Gen2', unit: 'pc', warehouse: SYL, onHand: 2, reserved: 0, unitCost: 9800, pricedAt: priced },
{ id: 'STK-DHK-CAM', sku: 'CAM-HIK-2CD', name: 'Hikvision 4MP IP camera', unit: 'pc', warehouse: DHK, onHand: 10, reserved: 0, unitCost: 6400, pricedAt: priced },
{ id: 'STK-DHK-NVR', sku: 'NVR-HIK-16', name: 'Hikvision 16-channel NVR', unit: 'pc', warehouse: DHK, onHand: 1, reserved: 0, unitCost: 24500, pricedAt: priced },
{ id: 'STK-DHK-PC', sku: 'PC-SCAPC-3M', name: 'Fibre patch cord SC/APC 3 m', unit: 'pc', warehouse: DHK, onHand: 140, reserved: 0, unitCost: 210, pricedAt: priced, damaged: 4 },
{ id: 'STK-CTG-PC', sku: 'PC-SCAPC-3M', name: 'Fibre patch cord SC/APC 3 m', unit: 'pc', warehouse: CTG, onHand: 30, reserved: 0, unitCost: 210, pricedAt: priced },
{ id: 'STK-SYL-PC', sku: 'PC-SCAPC-3M', name: 'Fibre patch cord SC/APC 3 m', unit: 'pc', warehouse: SYL, onHand: 25, reserved: 0, unitCost: 210, pricedAt: priced }];


/* ---------- serial units ---------- */
let seq = 0;
const nextEq = () => `EQ-${String(++seq).padStart(5, '0')}`;
const BRANCH: Record<string, EquipmentUnit['branchId']> = { [DHK]: 'dhaka-south', [CTG]: 'chattogram', [SYL]: 'sylhet' };

function inStock(sku: string, warehouse: string, prefix: string, count: number, receivedAt: string, vendorId: string, unitCost: number): EquipmentUnit[] {
  return Array.from({ length: count }, (_, i) => ({
    id: nextEq(), sku, serial: `${prefix}${String(i + 1).padStart(4, '0')}`, status: 'In Stock' as const, ownership: 'IOL-owned' as const, warehouse, branchId: BRANCH[warehouse],
    receivedAt, vendorId, unitCost, history: [{ at: receivedAt, byName: 'Shamim Ahmed', event: 'Received', detail: `Into ${warehouse}` }]
  }));
}

function deployed(p: Partial<EquipmentUnit> & Pick<EquipmentUnit, 'sku' | 'serial' | 'ownership' | 'warehouse' | 'branchId' | 'customerId' | 'siteId' | 'connectionId' | 'deployedAt'>): EquipmentUnit {
  return {
    id: nextEq(), status: 'Installed', ...p,
    history: [
    ...(p.warehouse ? [{ at: p.deployedAt!, byName: 'Shamim Ahmed', event: 'Issued', detail: p.jobId ? `For ${p.jobId}` : 'For installation' }] : []),
    { at: p.deployedAt!, byName: 'Arif Chowdhury', event: 'Installed', detail: `At ${p.connectionId} · ${p.ownership}` },
    ...(p.history ?? [])]

  } as EquipmentUnit;
}

export const equipmentUnits: EquipmentUnit[] = [
...inStock('ONT-EG8145V5', DHK, 'HWTC-DK', 58, '2026-10-10T13:00:00+06:00', 'VN-01', 4800),
...inStock('ONT-EG8145V5', CTG, 'HWTC-CT', 6, '2026-08-20T12:00:00+06:00', 'VN-01', 4950),
...inStock('ONT-EG8145V5', SYL, 'HWTC-SY', 20, '2026-10-14T10:20:00+06:00', 'VN-01', 4800),
...inStock('SFP-1G-LX', DHK, 'SFPLX-D', 22, '2026-07-08T11:00:00+06:00', 'VN-03', 1900),
...inStock('SFP-1G-LX', CTG, 'SFPLX-C', 4, '2026-07-08T11:00:00+06:00', 'VN-03', 1900),
...inStock('SFP-1G-LX', SYL, 'SFPLX-S', 2, '2026-07-08T11:00:00+06:00', 'VN-03', 1900),
...inStock('RTR-MT-RB4011', CTG, 'MT4011-C', 1, '2026-04-22T12:00:00+06:00', 'VN-03', 21500),
...inStock('ONT-MA5671', DHK, 'HWMA-DK', 4, '2026-03-18T12:00:00+06:00', 'VN-01', 3900),
...inStock('RAD-UBNT-LBE5AC', DHK, 'UBNT-LBE-D', 3, '2026-06-11T12:00:00+06:00', 'VN-03', 9800),
...inStock('RAD-UBNT-LBE5AC', SYL, 'UBNT-LBE-S', 2, '2026-06-11T12:00:00+06:00', 'VN-03', 9800),
...inStock('CAM-HIK-2CD', DHK, 'HKV-CAM-D', 10, '2026-09-16T12:00:00+06:00', 'VN-04', 6400),
...inStock('NVR-HIK-16', DHK, 'HKV-NVR-D', 1, '2026-09-16T12:00:00+06:00', 'VN-04', 24500),

// Rahman Steel Works
deployed({ sku: 'ONT-EG8145V5', serial: 'HWTC-7A21C4E9', ownership: 'IOL-owned', warehouse: DHK, branchId: 'dhaka-south', customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50121', deployedAt: '2021-03-20T12:00:00+06:00', unitCost: 5600 }),
deployed({ sku: 'ONT-EG8145V5', serial: 'HWTC-7A21D0B3', ownership: 'IOL-owned', warehouse: DHK, branchId: 'dhaka-south', customerId: 'CU-1002', siteId: 'ST-2002', connectionId: 'CN-50122', deployedAt: '2022-08-11T12:00:00+06:00', unitCost: 5400 }),
deployed({ sku: 'ONT-EG8145V5', serial: 'HWTC-80F3A112', ownership: 'IOL-owned', warehouse: CTG, branchId: 'chattogram', customerId: 'CU-1002', siteId: 'ST-2003', connectionId: 'CN-50123', deployedAt: '2024-01-15T12:00:00+06:00', unitCost: 5200 }),
...Array.from({ length: 8 }, (_, i) =>
deployed({ sku: 'CAM-HIK-2CD', serial: `HKV-CAM-RS${String(i + 101)}`, ownership: 'Rented' as const, warehouse: DHK, branchId: 'dhaka-south', customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50124', deployedAt: '2025-02-01T12:00:00+06:00', unitCost: 6800 })
),
deployed({ sku: 'NVR-HIK-16', serial: 'HKV-NVR-RS021', ownership: 'Rented', warehouse: DHK, branchId: 'dhaka-south', customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50124', deployedAt: '2025-02-01T12:00:00+06:00', unitCost: 26000 }),
...Array.from({ length: 4 }, (_, i) => ({
  id: nextEq(), sku: 'CAM-HIK-2CD', serial: `CUST-RSW-CAM${i + 1}`, status: 'Installed' as const, ownership: 'Customer-owned' as const, warehouse: '', branchId: 'dhaka-south' as const,
  customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50124', serviceChangeId: 'SC-2026-0063', deployedAt: '2026-10-13T16:30:00+06:00',
  history: [{ at: '2026-10-13T18:00:00+06:00', byName: 'Arif Chowdhury', event: 'Registered', detail: 'Customer-supplied camera added at loading bay (SC-2026-0063)' }]
})),
// Green Valley Apartments
deployed({ sku: 'ONT-MA5671', serial: 'HWTC-5C9E2214', ownership: 'IOL-owned', warehouse: DHK, branchId: 'dhaka-north', customerId: 'CU-1003', siteId: 'ST-2004', connectionId: 'CN-50130', deployedAt: '2023-07-05T12:00:00+06:00', unitCost: 4100 }),
// Surma Tea Traders — discontinuation approved, equipment due back
deployed({
  sku: 'ONT-EG8145V5', serial: 'HWTC-3D8C5512', ownership: 'IOL-owned', warehouse: SYL, branchId: 'sylhet', customerId: 'CU-1007', siteId: 'ST-2008', connectionId: 'CN-50140', deployedAt: '2022-05-15T12:00:00+06:00', unitCost: 5400,
  status: 'Receivable', receivableSince: '2026-10-12T14:30:00+06:00', serviceChangeId: 'SC-2026-0057',
  history: [{ at: '2026-10-12T14:30:00+06:00', byName: 'Mahbubul Alam', event: 'Receivable', detail: 'Due back to IOL — discontinuation SC-2026-0057' }]
}),
deployed({
  sku: 'RAD-UBNT-LBE5AC', serial: 'UBNT-LBE-F09A2C', ownership: 'IOL-owned', warehouse: SYL, branchId: 'sylhet', customerId: 'CU-1007', siteId: 'ST-2008', connectionId: 'CN-50140', deployedAt: '2022-05-15T12:00:00+06:00', unitCost: 11200,
  status: 'Receivable', receivableSince: '2026-10-12T14:30:00+06:00', serviceChangeId: 'SC-2026-0057',
  history: [{ at: '2026-10-12T14:30:00+06:00', byName: 'Mahbubul Alam', event: 'Receivable', detail: 'Due back to IOL — discontinuation SC-2026-0057' }]
}),
// Associates and customer-owned routers
{ id: nextEq(), sku: 'NON-STOCK', itemName: 'Juniper MX104 router', serial: 'JN-MX104-PCN01', status: 'Installed', ownership: 'Customer-owned', warehouse: '', branchId: 'chattogram', customerId: 'CU-1008', siteId: 'ST-2009', connectionId: 'CN-50150', deployedAt: '2023-11-05T12:00:00+06:00', history: [{ at: '2023-11-05T12:00:00+06:00', byName: 'Arif Chowdhury', event: 'Registered', detail: 'Customer BGP router recorded at handover' }] },
{ id: nextEq(), sku: 'NON-STOCK', itemName: 'MikroTik CCR2004 router', serial: 'ZLS-CCR-0091', status: 'Installed', ownership: 'Associate-owned', ownerName: 'Zindabazar Link Solutions', warehouse: '', branchId: 'sylhet', customerId: 'CU-1009', siteId: 'ST-2010', connectionId: 'CN-50160', deployedAt: '2024-06-05T12:00:00+06:00', history: [{ at: '2024-06-05T12:00:00+06:00', byName: 'Arif Chowdhury', event: 'Registered', detail: 'Associate-owned edge router at Lamabazar POP' }] },
// Recent installations
deployed({ sku: 'ONT-EG8145V5', serial: 'HWTC-6C11A902', ownership: 'IOL-owned', warehouse: DHK, branchId: 'dhaka-north', customerId: 'CU-1006', siteId: 'ST-2007', connectionId: 'CN-50176', jobId: 'IJ-2026-1079', workOrderId: 'WO-2026-0131', deployedAt: '2026-10-01T16:40:00+06:00', unitCost: 4950, vendorId: 'VN-01' }),
deployed({ sku: 'ONT-EG8145V5', serial: 'HWTC-91B2D07F', ownership: 'IOL-owned', warehouse: CTG, branchId: 'chattogram', customerId: 'CU-1004', siteId: 'ST-2005', connectionId: 'CN-50188', jobId: 'IJ-2026-1098', workOrderId: 'WO-2026-0144', deployedAt: '2026-10-12T15:35:00+06:00', unitCost: 4950, vendorId: 'VN-01' }),
{
  id: nextEq(), sku: 'ONT-EG8145V5', serial: 'HWTC-A44E1B30', status: 'Issued', ownership: 'IOL-owned', warehouse: CTG, branchId: 'chattogram', technicianName: 'Rakib Uddin',
  jobId: 'IJ-2026-1102', workOrderId: 'WO-2026-0149', customerId: 'CU-1005', connectionId: 'CN-50190', receivedAt: '2026-08-20T12:00:00+06:00', vendorId: 'VN-01', unitCost: 4950,
  history: [
  { at: '2026-08-20T12:00:00+06:00', byName: 'Shamim Ahmed', event: 'Received', detail: `Into ${CTG}` },
  { at: '2026-10-15T08:10:00+06:00', byName: 'Shamim Ahmed', event: 'Issued', detail: 'To Rakib Uddin for IJ-2026-1102' }]

},
// Faulty optic swapped during a ticket — waiting for inspection
{
  id: nextEq(), sku: 'SFP-1G-LX', serial: 'SFPLX-7731', status: 'Awaiting Inspection', ownership: 'IOL-owned', warehouse: DHK, branchId: 'dhaka-south', customerId: 'CU-1002', connectionId: 'CN-50121', deployedAt: '2024-03-02T12:00:00+06:00',
  history: [
  { at: '2024-03-02T12:00:00+06:00', byName: 'Arif Chowdhury', event: 'Installed', detail: 'At CN-50121 PoP handoff' },
  { at: '2026-10-14T16:20:00+06:00', byName: 'Shamim Ahmed', event: 'Returned', detail: 'Customer site — swapped during link fault; awaiting inspection' }]

}];


export const stockReservations: StockReservation[] = [
{ id: 'RS-2026-0032', sku: 'HW-POLE-CLAMP', warehouse: CTG, quantity: 6, issued: 0, status: 'Active', workOrderId: 'WO-2026-0149', customerId: 'CU-1005', note: 'Pole work on Sheikh Mujib Road', at: '2026-10-04T15:05:00+06:00', byName: 'Shamim Ahmed', branchId: 'chattogram' },
{ id: 'RS-2026-0031', sku: 'FBR-DROP-2C', warehouse: CTG, quantity: 280, issued: 0, status: 'Active', jobId: 'IJ-2026-1102', workOrderId: 'WO-2026-0149', customerId: 'CU-1005', connectionId: 'CN-50190', at: '2026-10-04T15:00:00+06:00', byName: 'Shamim Ahmed', branchId: 'chattogram' },
{ id: 'RS-2026-0030', sku: 'SFP-1G-LX', warehouse: DHK, quantity: 2, issued: 0, status: 'Released', workOrderId: 'WO-2026-0131', customerId: 'CU-1006', at: '2026-09-26T11:00:00+06:00', byName: 'Shamim Ahmed', releasedReason: 'Customer chose the copper handoff; optics not needed', releasedAt: '2026-09-29T10:00:00+06:00', branchId: 'dhaka-south' },
{ id: 'RS-2026-0029', sku: 'FBR-DROP-2C', warehouse: DHK, quantity: 450, issued: 450, status: 'Fulfilled', jobId: 'IJ-2026-1079', workOrderId: 'WO-2026-0131', customerId: 'CU-1006', connectionId: 'CN-50176', at: '2026-09-27T10:00:00+06:00', byName: 'Shamim Ahmed', branchId: 'dhaka-south' }];


export const stockReturns: StockReturn[] = [
{ id: 'RT-2026-0042', sku: 'PC-SCAPC-3M', warehouse: DHK, quantity: 12, serials: [], source: 'Technician (unused)', fromName: 'Jahid Hasan — van stock count', receivedAt: '2026-10-15T09:10:00+06:00', receivedBy: 'Shamim Ahmed', status: 'Awaiting Inspection', branchId: 'dhaka-south' },
{ id: 'RT-2026-0041', sku: 'SFP-1G-LX', warehouse: DHK, quantity: 1, serials: ['SFPLX-7731'], source: 'Customer site', fromName: 'Arif Chowdhury — swapped during link fault', customerId: 'CU-1002', connectionId: 'CN-50121', receivedAt: '2026-10-14T16:20:00+06:00', receivedBy: 'Shamim Ahmed', status: 'Awaiting Inspection', branchId: 'dhaka-south' },
{
  id: 'RT-2026-0038', sku: 'FBR-DROP-2C', warehouse: DHK, quantity: 30, serials: [], source: 'Technician (unused)', fromName: 'Jahid Hasan', jobId: 'IJ-2026-1079', customerId: 'CU-1006', connectionId: 'CN-50176',
  receivedAt: '2026-10-02T09:40:00+06:00', receivedBy: 'Shamim Ahmed', status: 'Inspected', inspection: { at: '2026-10-02T10:00:00+06:00', byName: 'Shamim Ahmed', good: 30, damaged: 0, notes: 'Single coil, no kinks.' }, branchId: 'dhaka-south'
}];


export const stockAdjustments: StockAdjustment[] = [
{ id: 'SA-2026-0013', sku: 'ONT-EG8145V5', warehouse: SYL, kind: 'Lost', direction: 'Decrease', quantity: 1, serials: ['HWTC-SY0007'], reason: 'Not found in the Sylhet cage count on 14 Oct. Transfer note for IM-2026-0523 lists 20 units; carton seal was intact on arrival.', requestedById: 'u-08', requestedAt: '2026-10-14T17:30:00+06:00', status: 'Pending Approval', approvalId: 'AP-2026-0183', branchId: 'sylhet' },
{ id: 'SA-2026-0012', sku: 'SPL-CLOSURE-24', warehouse: DHK, kind: 'Damaged', direction: 'Decrease', quantity: 1, serials: [], reason: 'Closure housing cracked when the rack was moved at Dhaka Central; seal cannot be restored.', requestedById: 'u-08', requestedAt: '2026-10-14T11:00:00+06:00', status: 'Pending Approval', approvalId: 'AP-2026-0182', branchId: 'dhaka-south' },
{ id: 'SA-2026-0009', sku: 'HW-POLE-CLAMP', warehouse: SYL, kind: 'Count correction', direction: 'Decrease', quantity: 3, serials: [], reason: 'Quarterly count found 25 sets against 28 on record; shortfall traced to Lamabazar pole work that was never logged.', requestedById: 'u-08', requestedAt: '2026-10-05T12:00:00+06:00', status: 'Approved', approvalId: 'AP-2026-0181', decidedById: 'u-10', decidedAt: '2026-10-06T10:00:00+06:00', branchId: 'sylhet' }];


export const inventoryApprovals: Approval[] = [
{ id: 'AP-2026-0183', type: 'Stock Adjustment', title: 'Stock adjustment SA-2026-0013 — ONT lost at Sylhet', detail: 'Lost · −1 Huawei EG8145V5 ONT (HWTC-SY0007)', amount: 4800, entity: { type: 'approval', id: 'AP-2026-0183' }, related: [], requestedById: 'u-08', requestedAt: '2026-10-14T17:30:00+06:00', requiredPermission: 'approveFinancial', status: 'Pending', stockAdjustmentId: 'SA-2026-0013', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'AP-2026-0182', type: 'Stock Adjustment', title: 'Stock adjustment SA-2026-0012 — Dhaka Central Warehouse', detail: 'Damaged · −1 Splice closure, 24F', amount: 2600, entity: { type: 'approval', id: 'AP-2026-0182' }, related: [], requestedById: 'u-08', requestedAt: '2026-10-14T11:00:00+06:00', requiredPermission: 'approveFinancial', status: 'Pending', stockAdjustmentId: 'SA-2026-0012', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'AP-2026-0181', type: 'Stock Adjustment', title: 'Stock adjustment SA-2026-0009 — Sylhet Warehouse', detail: 'Count correction · −3 Pole clamp set', amount: 1050, entity: { type: 'approval', id: 'AP-2026-0181' }, related: [], requestedById: 'u-08', requestedAt: '2026-10-05T12:00:00+06:00', requiredPermission: 'approveFinancial', status: 'Approved', decidedById: 'u-10', decidedAt: '2026-10-06T10:00:00+06:00', stockAdjustmentId: 'SA-2026-0009', branchId: 'sylhet', zoneId: 'zindabazar' }];


export const inventoryApprovalRules: ApprovalRule[] = [
{ id: 'AR-50', name: 'Stock adjustment (damage, loss, count correction)', approvalType: 'Stock Adjustment', comparator: 'any', requiredPermission: 'approveFinancial', approverRoles: ['financeApprover'], slaHours: 48, enforcedInDemo: true }];


/** Extra detail on seeded movements, plus movements created by seeded adjustments. */
export const movementExtras: Record<string, Partial<InventoryMovement>> = {
  'IM-2026-0498': { workOrderId: 'WO-2026-0131', customerId: 'CU-1006', connectionId: 'CN-50176', technicianName: 'Jahid Hasan', to: 'Jahid Hasan' },
  'IM-2026-0499': { workOrderId: 'WO-2026-0131', customerId: 'CU-1006', connectionId: 'CN-50176', technicianName: 'Jahid Hasan', to: 'Jahid Hasan', reservationId: 'RS-2026-0029' },
  'IM-2026-0502': { customerId: 'CU-1006', connectionId: 'CN-50176', returnId: 'RT-2026-0038', from: 'Jahid Hasan' },
  'IM-2026-0511': { workOrderId: 'WO-2026-0144', customerId: 'CU-1004', connectionId: 'CN-50188', technicianName: 'Rakib Uddin', to: 'Rakib Uddin' },
  'IM-2026-0512': { workOrderId: 'WO-2026-0144', customerId: 'CU-1004', connectionId: 'CN-50188', technicianName: 'Rakib Uddin', to: 'Rakib Uddin' },
  'IM-2026-0520': { branchId: 'dhaka-south', from: 'Huawei Technologies (Bangladesh) Ltd', vendorId: 'VN-01', reference: 'GRN-DHK-2026-0412', unitPrice: 4800 },
  'IM-2026-0523': { reference: 'TN-2026-0088', note: 'Carton count 20 on dispatch' },
  'IM-2026-0526': { workOrderId: 'WO-2026-0149', customerId: 'CU-1005', connectionId: 'CN-50190', technicianName: 'Rakib Uddin', to: 'Rakib Uddin', serials: ['HWTC-A44E1B30'] }
};

export const extraMovements: InventoryMovement[] = [
{ id: 'IM-2026-0490', branchId: 'sylhet', itemName: 'Pole clamp set', sku: 'HW-POLE-CLAMP', quantity: 3, unit: 'set', type: 'Adjustment', from: SYL, to: 'Count correction', adjustmentId: 'SA-2026-0009', note: 'Approved by Kamrul Islam', at: '2026-10-06T10:00:00+06:00', byName: 'Kamrul Islam' }];


export const vendors: Vendor[] = [
{ id: 'VN-01', name: 'Huawei Technologies (Bangladesh) Ltd', contactName: 'Rezaul Karim', phone: '+880 1713-004512' },
{ id: 'VN-02', name: 'Optix Fibre Supplies Ltd', contactName: 'Mamun Hossain', phone: '+880 1819-447120' },
{ id: 'VN-03', name: 'Techno Network Solutions', contactName: 'Sharmin Akter', phone: '+880 1711-662094' },
{ id: 'VN-04', name: 'Secure Vision BD', contactName: 'Habibur Rahman', phone: '+880 1715-390218' },
{ id: 'VN-05', name: 'Bengal Hardware & Cable Co.', contactName: 'Alamgir Kabir', phone: '+880 1816-205733' }];


const br = (...p: [number, number][]) => p.map(([minQty, unitPrice]) => ({ minQty, unitPrice }));
export const vendorPrices: VendorPrice[] = [
{ id: 'VP-0101', vendorId: 'VN-01', sku: 'ONT-EG8145V5', purchasedAt: '2025-11-12T12:00:00+06:00', quantity: 40, unitPrice: 5100, reference: 'GRN-DHK-2025-0377', breaks: br([1, 5300], [50, 4950], [100, 4800]) },
{ id: 'VP-0102', vendorId: 'VN-01', sku: 'ONT-EG8145V5', purchasedAt: '2026-03-18T12:00:00+06:00', quantity: 80, unitPrice: 4950, reference: 'GRN-DHK-2026-0151', breaks: br([1, 5200], [50, 4950], [100, 4750]) },
{ id: 'VP-0103', vendorId: 'VN-03', sku: 'ONT-EG8145V5', purchasedAt: '2026-06-02T12:00:00+06:00', quantity: 20, unitPrice: 5050, reference: 'GRN-CTG-2026-0098', breaks: br([1, 5050], [30, 4900]) },
{ id: 'VP-0104', vendorId: 'VN-01', sku: 'ONT-EG8145V5', purchasedAt: '2026-10-10T13:00:00+06:00', quantity: 60, unitPrice: 4800, reference: 'GRN-DHK-2026-0412', breaks: br([1, 5150], [50, 4800], [100, 4650]) },
{ id: 'VP-0111', vendorId: 'VN-01', sku: 'ONT-MA5671', purchasedAt: '2026-03-18T12:00:00+06:00', quantity: 10, unitPrice: 3900, reference: 'GRN-DHK-2026-0151', breaks: br([1, 4100], [10, 3900]) },
{ id: 'VP-0201', vendorId: 'VN-02', sku: 'FBR-DROP-2C', purchasedAt: '2025-12-04T12:00:00+06:00', quantity: 8000, unitPrice: 19.5, reference: 'GRN-DHK-2025-0402', breaks: br([1000, 21], [5000, 19.5], [10000, 18.5]) },
{ id: 'VP-0202', vendorId: 'VN-02', sku: 'FBR-DROP-2C', purchasedAt: '2026-05-14T12:00:00+06:00', quantity: 10000, unitPrice: 18, reference: 'GRN-DHK-2026-0233', breaks: br([1000, 20], [5000, 18.5], [10000, 18]) },
{ id: 'VP-0203', vendorId: 'VN-05', sku: 'FBR-DROP-2C', purchasedAt: '2026-08-21T12:00:00+06:00', quantity: 4000, unitPrice: 19, reference: 'GRN-CTG-2026-0141', breaks: br([1000, 19.5], [4000, 19]) },
{ id: 'VP-0211', vendorId: 'VN-02', sku: 'FBR-ADSS-12C', purchasedAt: '2026-02-09T12:00:00+06:00', quantity: 6000, unitPrice: 64, reference: 'GRN-DHK-2026-0088', breaks: br([1000, 68], [5000, 64]) },
{ id: 'VP-0212', vendorId: 'VN-02', sku: 'FBR-ADSS-12C', purchasedAt: '2026-09-03T12:00:00+06:00', quantity: 5000, unitPrice: 62, reference: 'GRN-SYL-2026-0061', breaks: br([1000, 66], [5000, 62]) },
{ id: 'VP-0221', vendorId: 'VN-02', sku: 'PC-SCAPC-3M', purchasedAt: '2026-05-14T12:00:00+06:00', quantity: 200, unitPrice: 210, reference: 'GRN-DHK-2026-0233', breaks: br([50, 240], [200, 210]) },
{ id: 'VP-0231', vendorId: 'VN-02', sku: 'SPL-CLOSURE-24', purchasedAt: '2026-01-20T12:00:00+06:00', quantity: 20, unitPrice: 2750, reference: 'GRN-DHK-2026-0031', breaks: br([1, 2900], [20, 2750]) },
{ id: 'VP-0232', vendorId: 'VN-02', sku: 'SPL-CLOSURE-24', purchasedAt: '2026-07-08T12:00:00+06:00', quantity: 15, unitPrice: 2600, reference: 'GRN-DHK-2026-0302', breaks: br([1, 2800], [10, 2600]) },
{ id: 'VP-0241', vendorId: 'VN-05', sku: 'HW-POLE-CLAMP', purchasedAt: '2026-03-02T12:00:00+06:00', quantity: 200, unitPrice: 350, reference: 'GRN-DHK-2026-0117', breaks: br([50, 380], [200, 350]) },
{ id: 'VP-0251', vendorId: 'VN-03', sku: 'SFP-1G-LX', purchasedAt: '2026-02-11T12:00:00+06:00', quantity: 30, unitPrice: 2050, reference: 'GRN-DHK-2026-0092', breaks: br([1, 2200], [20, 2050]) },
{ id: 'VP-0252', vendorId: 'VN-03', sku: 'SFP-1G-LX', purchasedAt: '2026-07-08T11:00:00+06:00', quantity: 20, unitPrice: 1900, reference: 'GRN-DHK-2026-0301', breaks: br([1, 2100], [20, 1900], [50, 1750]) },
{ id: 'VP-0261', vendorId: 'VN-03', sku: 'RTR-MT-RB4011', purchasedAt: '2026-04-22T12:00:00+06:00', quantity: 3, unitPrice: 21500, reference: 'GRN-CTG-2026-0071', breaks: br([1, 21500], [5, 20800]) },
{ id: 'VP-0271', vendorId: 'VN-03', sku: 'RAD-UBNT-LBE5AC', purchasedAt: '2026-06-11T12:00:00+06:00', quantity: 6, unitPrice: 9800, reference: 'GRN-DHK-2026-0270', breaks: br([1, 10200], [5, 9800]) },
{ id: 'VP-0281', vendorId: 'VN-04', sku: 'CAM-HIK-2CD', purchasedAt: '2025-01-15T12:00:00+06:00', quantity: 12, unitPrice: 6800, reference: 'GRN-DHK-2025-0012', breaks: br([1, 7200], [10, 6800]) },
{ id: 'VP-0282', vendorId: 'VN-04', sku: 'CAM-HIK-2CD', purchasedAt: '2026-09-16T12:00:00+06:00', quantity: 14, unitPrice: 6400, reference: 'GRN-DHK-2026-0388', breaks: br([1, 6900], [10, 6400], [25, 6100]) },
{ id: 'VP-0283', vendorId: 'VN-04', sku: 'NVR-HIK-16', purchasedAt: '2026-09-16T12:00:00+06:00', quantity: 1, unitPrice: 24500, reference: 'GRN-DHK-2026-0388', breaks: br([1, 24500], [3, 23500]) }];