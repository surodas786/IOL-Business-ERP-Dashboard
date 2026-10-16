import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { roleLabel } from '../../utils/relations';
import { FormField, inputClass } from './FormField';
import type { DemoUser } from '../../types/erp';

interface DeactivateUserDialogProps {
  user: DemoUser;
  onClose: () => void;
}

export function DeactivateUserDialog({ user, onClose }: DeactivateUserDialogProps) {
  const { db } = useData();
  const runAction = useRunAction();
  const candidates = db.users.filter((u) => u.status === 'Active' && u.id !== user.id);
  const [successorId, setSuccessorId] = useState(() => candidates.some((c) => c.id === user.managerId) ? user.managerId! : candidates[0]?.id ?? '');

  const preview = useMemo(() => {
    const leads = db.leads.filter((l) => l.ownerId === user.id && (l.status === 'New' || l.status === 'Qualified')).length;
    const opps = db.opportunities.filter((o) => o.ownerId === user.id && (o.status === 'Open' || o.status === 'Stalled')).length;
    const accounts = db.customers.filter((c) => c.accountManagerId === user.id && c.status !== 'Disconnected').length;
    const reports = db.users.filter((u) => u.managerId === user.id && u.id !== successorId).length;
    const history =
    db.leads.filter((l) => l.ownerId === user.id && (l.status === 'Converted' || l.status === 'Lost')).length +
    db.opportunities.filter((o) => o.ownerId === user.id && o.status !== 'Open' && o.status !== 'Stalled').length +
    db.quotations.filter((q) => q.preparedById === user.id).length +
    db.approvals.filter((a) => a.requestedById === user.id || a.decidedById === user.id).length +
    db.auditEvents.filter((e) => e.actorId === user.id).length;
    return { leads, opps, accounts, reports, history };
  }, [db, user.id, successorId]);

  const confirm = () => {
    if (runAction({ type: 'ADMIN_DEACTIVATE_USER', userId: user.id, successorId })) onClose();
  };

  const rows: [string, number][] = [
  ['Open leads', preview.leads],
  ['Open opportunities', preview.opps],
  ['Customer accounts managed', preview.accounts],
  ['Direct reports', preview.reports]];


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div className="absolute inset-0 bg-slate-900/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose} aria-hidden />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-title"
        className="relative w-full max-w-md rounded-md bg-white p-5 shadow-xl"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
        
        <h2 id="deactivate-title" className="text-[15px] font-bold text-slate-900">
          Deactivate {user.name}?
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
          {user.name} ({roleLabel(user.role)}) will no longer be able to sign in. Open work moves to a successor; closed and historical records keep
          {` ${user.name}`} as the original owner.
        </p>
        <FormField label="Successor for open work" htmlFor="successor" className="mt-4">
          <select id="successor" className={inputClass} value={successorId} onChange={(e) => setSuccessorId(e.target.value)}>
            {candidates.map((c) =>
            <option key={c.id} value={c.id}>
                {c.name} · {roleLabel(c.role)}
              </option>
            )}
          </select>
        </FormField>
        <dl className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200 text-[12px]">
          {rows.map(([label, count]) =>
          <div key={label} className="flex justify-between px-3 py-1.5">
              <dt className="text-slate-600">{label}</dt>
              <dd className="font-semibold text-slate-900">{count} → successor</dd>
            </div>
          )}
          <div className="flex justify-between bg-slate-50 px-3 py-1.5">
            <dt className="text-slate-600">Historical records and audit entries</dt>
            <dd className="font-semibold text-slate-900">{preview.history} kept as-is</dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!successorId}
            className="h-8 rounded-md bg-status-critical px-3 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-rose-800 disabled:opacity-50">
            
            Deactivate and hand over
          </button>
        </div>
      </motion.div>
    </div>);

}