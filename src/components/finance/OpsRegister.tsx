import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { centreItems } from '../../utils/approvalCentre';
import { canPayOps } from '../../utils/opsFinanceWorkflow';
import { periodLabel } from '../../utils/opsFinanceRules';
import { formatBDT, formatDhaka } from '../../utils/format';
import { branchName } from '../../utils/relations';
import { StatusBadge } from '../records/StatusBadge';
import { linkBtn, tdClass, thClass } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import { ApprovalDetail } from '../approvals/ApprovalDetail';
import { PayOpsDialog } from './PayOpsDialog';
import { OPS_CATEGORIES, type OpsCategory, type OpsExpense, type OpsStatus } from '../../types/approvals';

const STATUSES: OpsStatus[] = ['Pending Approval', 'Returned', 'Approved', 'Paid', 'Rejected'];

export function OpsRegister() {
  const { db } = useData();
  const { user, role, branchFilter } = useSession();
  const [params, setParams] = useSearchParams();
  const [cat, setCat] = useState<OpsCategory | 'all'>('all');
  const [status, setStatus] = useState<OpsStatus | 'all'>('all');
  const [paying, setPaying] = useState<OpsExpense | null>(null);
  const rows = db.opsExpenses.filter((e) => (branchFilter === 'all' || e.branchId === branchFilter) && (cat === 'all' || e.category === cat) && (status === 'all' || e.status === status));
  const selectedId = params.get('id');
  const item = useMemo(() => selectedId ? centreItems(db).find((i) => i.key === `ops:${selectedId}`) : undefined, [db, selectedId]);
  const select = (id: string | null) => {
    const n = new URLSearchParams(params);
    if (id) n.set('id', id);else
    n.delete('id');
    setParams(n, { replace: true });
  };
  const total = (s: OpsStatus) => rows.filter((e) => e.status === s).reduce((t, e) => t + e.amount, 0);

  return (
    <div className={`grid gap-3 ${item ? 'xl:grid-cols-[minmax(0,1fr)_420px]' : ''}`}>
      <div className="min-w-0 space-y-3">
        <dl className="flex flex-wrap gap-x-8 gap-y-2 rounded-md border border-slate-200 bg-white px-4 py-3">
          {(['Pending Approval', 'Approved', 'Paid'] as OpsStatus[]).map((s) =>
          <div key={s}>
              <dt className="text-[11.5px] font-semibold text-slate-500">{s === 'Approved' ? 'Approved, not paid' : s}</dt>
              <dd className={`text-[18px] font-bold tabular-nums ${s === 'Approved' && total(s) ? 'text-status-warning' : 'text-slate-900'}`}>{formatBDT(total(s))}</dd>
            </div>
          )}
        </dl>
        <div className="rounded-md border border-slate-200 bg-white">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-3 py-2.5">
            <label className="sr-only" htmlFor="or-cat">Category</label>
            <select id="or-cat" className={`${inputClass} w-auto`} value={cat} onChange={(e) => setCat(e.target.value as OpsCategory | 'all')}>
              <option value="all">All categories</option>
              {OPS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className="sr-only" htmlFor="or-st">Status</label>
            <select id="or-st" className={`${inputClass} w-auto`} value={status} onChange={(e) => setStatus(e.target.value as OpsStatus | 'all')}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  {['Payment', 'Payee', 'Branch · period', 'Amount', 'Evidence', 'Status', 'Payment reference', ''].map((h) =>
                  <th key={h} className={thClass}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((e) =>
                <tr key={e.id} className={selectedId === e.id ? 'bg-primary-soft' : ''}>
                    <td className={tdClass}>
                      <button type="button" className="text-left" onClick={() => select(e.id)}>
                        <span className="block font-mono text-[11px] text-primary">{e.id}</span>
                        <span className="block text-[11.5px] text-slate-600">{e.category}</span>
                      </button>
                    </td>
                    <td className={tdClass}>{e.payee}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{branchName(e.branchId)} · {periodLabel(e.period)}</td>
                    <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{formatBDT(e.amount)}</td>
                    <td className={`${tdClass} text-[11.5px]`}>{e.evidence.length ? `${e.evidence.length} file${e.evidence.length === 1 ? '' : 's'}` : ''}{e.evidenceRef ? `${e.evidence.length ? ' · ' : ''}${e.evidenceRef}` : ''}{!e.evidence.length && !e.evidenceRef && <span className="text-status-warning">Missing</span>}</td>
                    <td className={tdClass}><StatusBadge status={e.status} /></td>
                    <td className={`${tdClass} text-[11.5px]`}>{e.payment ? <>{e.payment.method} {e.payment.reference}<span className="block text-slate-500">{formatDhaka(e.payment.paidAt)}</span></> : '—'}</td>
                    <td className={`${tdClass} text-right`}>
                      {e.status === 'Approved' && canPayOps(role.permissions) &&
                    <button type="button" className={linkBtn} disabled={e.decidedById === user.id} title={e.decidedById === user.id ? 'The approver cannot record payment' : undefined} onClick={() => setPaying(e)}>
                          Record payment
                        </button>
                    }
                    </td>
                  </tr>
                )}
                {!rows.length &&
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-slate-500">No payments match.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {item &&
      <div className="xl:sticky xl:top-3 xl:h-[calc(100vh-140px)]">
          <ApprovalDetail item={item} onClose={() => select(null)} />
        </div>
      }
      <AnimatePresence>{paying && <PayOpsDialog key="p" expense={paying} onClose={() => setPaying(null)} />}</AnimatePresence>
    </div>);

}