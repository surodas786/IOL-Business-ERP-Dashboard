import { canSeeCost } from '../utils/inventoryRules';
import type { Role } from '../types/erp';

export type InventoryViewId = 'stock' | 'items' | 'receipts' | 'reservations' | 'issues' | 'transfers' | 'returns' | 'adjustments' | 'equipment' | 'prices';

export const inventoryViews: {id: InventoryViewId;label: string;visible: (r: Role) => boolean;}[] = [
{ id: 'stock', label: 'Stock by warehouse', visible: () => true },
{ id: 'items', label: 'Item master', visible: () => true },
{ id: 'receipts', label: 'Receipts', visible: () => true },
{ id: 'reservations', label: 'Reservations', visible: () => true },
{ id: 'issues', label: 'Issues', visible: () => true },
{ id: 'transfers', label: 'Transfers', visible: () => true },
{ id: 'returns', label: 'Returns', visible: () => true },
{ id: 'adjustments', label: 'Adjustments', visible: () => true },
{ id: 'equipment', label: 'Customer equipment', visible: () => true },
{ id: 'prices', label: 'Vendor price history', visible: canSeeCost }];