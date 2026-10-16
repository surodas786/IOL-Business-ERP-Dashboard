import type { Role } from '../types/erp';
import { hasPermission } from '../utils/access';

export type QuotationViewId = 'quotations' | 'work-orders' | 'settings';

export const quotationViews: {id: QuotationViewId;label: string;visible: (r: Role) => boolean;}[] = [
{ id: 'quotations', label: 'Quotations', visible: () => true },
{ id: 'work-orders', label: 'Work orders', visible: () => true },
{ id: 'settings', label: 'Tax and thresholds', visible: (r) => hasPermission(r, 'approveQuotation') || hasPermission(r, 'approveFinancial') || hasPermission(r, 'createQuotation') }];