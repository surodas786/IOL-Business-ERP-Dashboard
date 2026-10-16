import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { canAccessModule, inUserScope } from '../../utils/access';
import { AccessDenied } from '../shell/AccessDenied';
import { linkBtn } from '../admin/AdminPanel';
import type { BranchId } from '../../types/erp';

interface Props {
  back: {to: string;label: string;};
  record?: {branchId: BranchId | null;};
  notFound: string;
  children: React.ReactNode;
}

/** Access, scope and not-found handling shared by invoice, receipt and statement pages. */
export function BillingDetailFrame({ back, record, notFound, children }: Props) {
  const { user, role } = useSession();
  if (!canAccessModule(role, 'billing')) return <AccessDenied title="Billing and Collections" module="billing" />;
  if (!record || !inUserScope(user, record.branchId)) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{record ? 'This record is outside your branch scope.' : notFound}</p>
        <Link to={back.to} className={`${linkBtn} mt-2 inline-block`}>
          {back.label}
        </Link>
      </div>);

  }
  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> {back.label}
      </Link>
      {children}
    </div>);

}