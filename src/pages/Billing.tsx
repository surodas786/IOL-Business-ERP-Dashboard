import React from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule } from '../utils/access';
import { billingViews } from '../data/billingViews';
import { AccessDenied } from '../components/shell/AccessDenied';
import { BillingPending } from '../components/billing/BillingPending';
import { BillingRuns } from '../components/billing/BillingRuns';
import { InvoiceList } from '../components/billing/InvoiceList';
import { ReceiptList } from '../components/billing/ReceiptList';
import { PaymentVerification } from '../components/billing/PaymentVerification';
import { StatementsList } from '../components/billing/StatementsList';
import { DueAllowView } from '../components/billing/DueAllowView';
import { AdjustmentsView } from '../components/billing/AdjustmentsView';

export function Billing() {
  const { view } = useParams();
  const { role } = useSession();
  if (!canAccessModule(role, 'billing')) return <AccessDenied title="Billing and Collections" module="billing" />;
  const current = view ? billingViews.find((v) => v.id === view) : billingViews[0];
  if (!current) return <Navigate to="/billing" replace />;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">Billing and Collections</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">Invoices come from approved work order terms and billing commencement · only verified receipts change balances · BDT · Asia/Dhaka · fictional demo data</p>
      </div>
      <nav aria-label="Billing views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {billingViews.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'pending' ? '/billing' : `/billing/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${isActive || v.id === current.id && !view ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
          }>
          
            {v.label}
          </NavLink>
        )}
      </nav>
      {current.id === 'pending' && <BillingPending />}
      {current.id === 'runs' && <BillingRuns />}
      {current.id === 'invoices' && <InvoiceList />}
      {current.id === 'receipts' && <ReceiptList />}
      {current.id === 'verification' && <PaymentVerification />}
      {current.id === 'statements' && <StatementsList />}
      {current.id === 'due-allow' && <DueAllowView />}
      {current.id === 'adjustments' && <AdjustmentsView />}
    </div>);

}