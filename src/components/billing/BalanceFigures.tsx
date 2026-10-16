import React from 'react';
import { formatBDT } from '../../utils/format';
import type { Balances } from '../../utils/billingCalc';

/** Due, advance and security deposit are always shown as separate balances. */
export function BalanceFigures({ b }: {b: Balances;}) {
  const items: {label: string;value: number;tone: string;note: string;}[] = [
  { label: 'Due', value: b.due, tone: b.due > 0 ? 'text-status-critical' : 'text-slate-900', note: 'Unpaid invoices' },
  { label: 'Advance', value: b.advance, tone: b.advance > 0 ? 'text-status-warning' : 'text-slate-900', note: 'Verified, not yet allocated' },
  { label: 'Security deposit', value: b.deposit, tone: 'text-slate-900', note: 'Held; never used for monthly charges' },
  { label: 'Unverified claims', value: b.pendingClaims, tone: 'text-slate-500', note: 'Not counted until Accounts verifies' }];

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {items.map((i) =>
      <div key={i.label}>
          <dt className="text-[11px] font-semibold text-slate-500">{i.label}</dt>
          <dd className={`text-[17px] font-bold tabular-nums ${i.tone}`}>{formatBDT(i.value)}</dd>
          <dd className="text-[10.5px] text-slate-400">{i.note}</dd>
        </div>
      )}
    </dl>);

}