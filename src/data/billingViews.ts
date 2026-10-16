export type BillingViewId = 'pending' | 'runs' | 'invoices' | 'receipts' | 'verification' | 'statements' | 'due-allow' | 'adjustments';

export const billingViews: {id: BillingViewId;label: string;}[] = [
{ id: 'pending', label: 'Billing Pending' },
{ id: 'runs', label: 'Billing Runs' },
{ id: 'invoices', label: 'Invoices' },
{ id: 'receipts', label: 'Receipts' },
{ id: 'verification', label: 'Payment Verification' },
{ id: 'statements', label: 'Customer Statements' },
{ id: 'due-allow', label: 'Due Allow' },
{ id: 'adjustments', label: 'Adjustments and Credit Notes' }];