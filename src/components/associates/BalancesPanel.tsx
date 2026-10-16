import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { BUCKETS, balances, canPrepareSettlement } from '../../utils/associateRules';
import { AdminPanel, linkBtn } from '../admin/AdminPanel';
import { LedgerDialog } from './LedgerDialog';
import type { Associate } from '../../types/records';
import type { LedgerBucket } from '../../types/associate';

const HINT: Record<LedgerBucket, string> = {
  Advance: 'Paid by the associate ahead of settlements',
  Due: 'Owed by the associate to IOL',
  Collection: 'Approved share IOL owes the associate',
  'Security Deposit': 'Held under the agreement'
};

export function BalancesPanel({ associate: a }: {associate: Associate;}) {
  const { db } = useData();
  const { role } = useSession();
  const [open, setOpen] = useState(false);
  const [bucket, setBucket] = useState<LedgerBucket | 'all'>('all');
  const b = balances(db, a.id);
  const entries = db.associateLedger.filter((l) => l.associateId === a.id && (bucket === 'all' || l.bucket === bucket)).sort((x, y) => y.at.localeCompare(x.at));
  const depositGap = (a.depositRequired ?? 0) - b['Security Deposit'];

  return (
    <AdminPanel
      title="Balances"
      description="Four separate balances — never netted against each other automatically."
      actions={
      canPrepareSettlement(role) &&
      <button type="button" className={linkBtn} onClick={() => setOpen(true)}>
            Record advance or deposit
          </button>

      }>
      
      <div className="grid grid-cols-2 border-b border-slate-100 lg:grid-cols-4">
        {BUCKETS.map((k) =>
        <button
          key={k}
          type="button"
          aria-pressed={bucket === k}
          onClick={() => setBucket(bucket === k ? 'all' : k)}
          className={`border-r border-slate-100 px-4 py-3 text-left transition-colors duration-150 last:border-r-0 ${bucket === k ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}>
          
            <span className="block text-[11px] font-semibold text-slate-500">{k}</span>
            <span className={`block text-[17px] font-bold tabular-nums ${k === 'Due' && b.Due > 0 ? 'text-status-critical' : 'text-slate-900'}`}>{formatBDT(b[k])}</span>
            <span className="block text-[10.5px] leading-snug text-slate-500">{k === 'Security Deposit' && depositGap > 0 ? `${formatBDT(depositGap)} short of required` : HINT[k]}</span>
          </button>
        )}
      </div>
      <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
        {entries.map((l) =>
        <li key={l.id} className="flex items-baseline justify-between gap-3 px-4 py-2 text-[12px]">
            <span className="min-w-0">
              <span className="text-slate-800">{l.description}</span>
              <span className="block text-[11px] text-slate-500">
                {l.bucket} · {formatDhakaDate(l.at)}
                {l.settlementId ? ` · ${l.settlementId}` : ''}
              </span>
            </span>
            <span className={`shrink-0 font-semibold tabular-nums ${l.amount < 0 ? 'text-slate-500' : 'text-slate-900'}`}>
              {l.amount < 0 ? '−' : '+'}
              {formatBDT(Math.abs(l.amount))}
            </span>
          </li>
        )}
        {entries.length === 0 && <li className="px-4 py-6 text-center text-[12px] text-slate-500">No entries.</li>}
      </ul>
      <AnimatePresence>{open && <LedgerDialog key="l" associateId={a.id} onClose={() => setOpen(false)} />}</AnimatePresence>
    </AdminPanel>);

}