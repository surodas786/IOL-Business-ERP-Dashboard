import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2Icon, CircleIcon, MinusCircleIcon, XCircleIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { hasPermission } from '../../utils/access';
import { checklistGaps, currentVersion, quoteSurvey, releaseChecklist } from '../../utils/quoteRules';
import { linkBtn, primaryBtn } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import type { Quotation } from '../../types/records';
import type { ChecklistItem } from '../../types/quotation';

interface Props {
  quotation: Quotation;
  onRecordAcceptance: () => void;
  onRequestException: () => void;
}

/** Work order release conditions, each with the action the active role can take to clear it. */
export function ReleaseChecklist({ quotation: q, onRecordAcceptance, onRequestException }: Props) {
  const { db } = useData();
  const { role } = useSession();
  const runAction = useRunAction();
  const [advRef, setAdvRef] = useState('');
  const items = releaseChecklist(db, q);
  const gaps = checklistGaps(items);
  const v = currentVersion(q);
  const survey = quoteSurvey(db, q);
  const sales = hasPermission(role, 'createQuotation') || hasPermission(role, 'manageWorkOrders');
  const released = !!q.workOrderId;
  const closed = released || q.status === 'Cancelled';

  const actionFor = (i: ChecklistItem): React.ReactNode => {
    if (i.ok || closed) return null;
    switch (i.key) {
      case 'customerSite':
        return hasPermission(role, 'manageWorkOrders') ?
        <button type="button" className={linkBtn} onClick={() => runAction({ type: 'QUOTE_VALIDATE_SITE', quotationId: q.id, note: '' })}>
            Mark validated
          </button> :

        <span className="text-[11px] text-slate-400">Back Office</span>;

      case 'survey':
        return survey && role.modules.includes('surveys') ?
        <Link to={`/surveys/records/${survey.id}`} className={linkBtn}>
            Open {survey.id}
          </Link> :

        <span className="text-[11px] text-slate-400">Technical review</span>;

      case 'acceptance':
        return v?.status === 'Approved' && sales ?
        <button type="button" className={linkBtn} onClick={onRecordAcceptance}>
            Record acceptance
          </button> :

        <span className="text-[11px] text-slate-400">{v?.status === 'Approved' ? 'Sales' : 'After approval'}</span>;

      case 'advance':
        if (hasPermission(role, 'recordCollection') && q.advance?.state !== 'Exception requested') {
          return (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (runAction({ type: 'QUOTE_VERIFY_ADVANCE', quotationId: q.id, reference: advRef })) setAdvRef('');
              }}>
              
              <input aria-label="Bank or receipt reference" placeholder="Bank / receipt ref." className={`${inputClass} h-7 w-36 text-[11.5px]`} value={advRef} onChange={(e) => setAdvRef(e.target.value)} />
              <button type="submit" className={linkBtn} disabled={!advRef.trim()}>
                Verify
              </button>
            </form>);

        }
        if (sales && q.advance?.state !== 'Exception requested') {
          return (
            <button type="button" className={linkBtn} onClick={onRequestException}>
              Request exception
            </button>);

        }
        return <span className="text-[11px] text-slate-400">{q.advance?.state === 'Exception requested' ? 'Finance Approver' : 'Accounts'}</span>;
      case 'commission':
        return <span className="text-[11px] text-slate-400">Business Head</span>;
      case 'commercial':
        return <span className="text-[11px] text-slate-400">{v?.status === 'Draft' ? 'Submit first' : 'Approvers'}</span>;
      default:
        return null;
    }
  };

  return (
    <section aria-label="Work order release checklist" className="rounded-md border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h2 className="text-[13px] font-bold text-slate-900">Work order release checklist</h2>
        <p className="text-[11px] text-slate-500">
          {released ? `Released as ${q.workOrderId}` : closed ? 'Quotation cancelled' : gaps.length ? `${gaps.length} of ${items.length} conditions open — release is blocked` : 'All conditions met'}
        </p>
      </header>
      <ul className="divide-y divide-slate-100">
        {items.map((i) => {
          const Icon = !i.applicable ? MinusCircleIcon : i.ok ? CheckCircle2Icon : closed ? CircleIcon : XCircleIcon;
          return (
            <li key={i.key} className="flex items-start gap-2.5 px-4 py-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${!i.applicable ? 'text-slate-300' : i.ok ? 'text-status-ok' : closed ? 'text-slate-300' : 'text-status-critical'}`} aria-label={!i.applicable ? 'Not applicable' : i.ok ? 'Met' : 'Missing'} />
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] font-semibold ${i.applicable ? 'text-slate-900' : 'text-slate-500'}`}>{i.label}</p>
                <p className="text-[11px] text-slate-500">{i.detail}</p>
              </div>
              <div className="shrink-0 pt-0.5">{actionFor(i)}</div>
            </li>);

        })}
      </ul>
      {!closed &&
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2.5">
          <p className="text-[11px] text-slate-500">Releasing locks the approved terms, survey parameters and BOM as snapshot v1 and sends separate Technical and Accounts handovers.</p>
          {hasPermission(role, 'manageWorkOrders') ?
        <button type="button" className={primaryBtn} disabled={gaps.length > 0} title={gaps.length ? 'Clear every condition first' : undefined} onClick={() => runAction({ type: 'CONVERT_QUOTATION', quotationId: q.id })}>
              Release work order
            </button> :

        <span className="text-[11px] text-slate-400">Back Office releases the work order</span>
        }
        </footer>
      }
      {released &&
      <footer className="border-t border-slate-200 px-4 py-2.5">
          <Link to={`/quotations/wo/${q.workOrderId}`} className={linkBtn}>
            Open work order {q.workOrderId}
          </Link>
        </footer>
      }
    </section>);

}