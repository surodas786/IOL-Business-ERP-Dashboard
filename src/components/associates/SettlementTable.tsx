import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { DUE_LABEL, disputedAmount, dueState, periodLabel, shortfall, unverifiedRemitted } from '../../utils/associateRules';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import type { AssociateSettlement } from '../../types/associate';

interface Props {
  rows: AssociateSettlement[];
  showAssociate?: boolean;
  showMoney: boolean;
  empty?: string;
}

/** Settlements with their workflow status and due position. */
export function SettlementTable({ rows, showAssociate = true, showMoney, empty = 'No settlements.' }: Props) {
  const { db } = useData();
  const navigate = useNavigate();
  const name = (id: string) => db.associates.find((a) => a.id === id)?.name ?? id;

  return (
    <CustomerTable<AssociateSettlement>
      minWidth={showMoney ? 980 : 720}
      rows={rows}
      rowKey={(s) => s.id}
      onOpen={(s) => navigate(`/associates/settlements/${s.id}`)}
      empty={empty}
      columns={[
      { label: 'Settlement', cell: (s) => <span><span className="block font-semibold text-slate-900">{periodLabel(s.period)}</span><span className="font-mono text-[10.5px] text-slate-400">{s.id}</span></span> },
      ...(showAssociate ? [{ label: 'Associate', cell: (s: AssociateSettlement) => <span><span className="block font-semibold text-slate-800">{name(s.associateId)}</span><span className="text-[11px] text-slate-500">{s.model}</span></span> }] : []),
      ...(showMoney ?
      [
      {
        label: 'Amount',
        align: 'right' as const,
        cell: (s: AssociateSettlement) =>
        <span className="tabular-nums">
                    <span className="block font-semibold text-slate-900">{formatBDT(s.payout || s.receivable)}</span>
                    <span className="text-[11px] text-slate-500">{s.payout ? 'IOL pays associate' : 'Associate owes IOL'}</span>
                  </span>

      },
      {
        label: 'Position',
        cell: (s: AssociateSettlement) =>
        s.receivable && ['Approved', 'Paid/Remitted'].includes(s.status) ?
        <span className="text-[11.5px] tabular-nums">
                      {shortfall(s) > 0 ? <span className="block font-semibold text-status-critical">Shortfall {formatBDT(shortfall(s))}</span> : <span className="block text-status-ok">Fully verified</span>}
                      {unverifiedRemitted(s) > 0 && <span className="block text-slate-500">{formatBDT(unverifiedRemitted(s))} unverified</span>}
                      {disputedAmount(s) > 0 && <span className="block text-status-warning">{formatBDT(disputedAmount(s))} disputed</span>}
                    </span> :

        <span className="text-[11.5px] text-slate-400">—</span>

      }] :

      []),
      {
        label: 'Due',
        cell: (s) => {
          const a = db.associates.find((x) => x.id === s.associateId)!;
          const st = dueState(a, s);
          return (
            <span className="whitespace-nowrap text-[11.5px]">
                {formatDhakaDate(s.dueDate)}
                {st !== 'upcoming' && st !== 'settled' &&
              <span className="mt-0.5 block">
                    <StatusBadge status={DUE_LABEL[st]} />
                  </span>
              }
              </span>);

        }
      },
      { label: 'Status', cell: (s) => <StatusBadge status={s.status} /> }]
      } />);


}