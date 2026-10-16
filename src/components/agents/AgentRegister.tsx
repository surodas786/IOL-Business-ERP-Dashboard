import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useScopedAgents } from '../../hooks/useScopedAgents';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { canSeeCommission, totals } from '../../utils/agentRules';
import { inputClass } from '../admin/FormField';
import { CustomerTable } from '../customers/CustomerTable';
import { StatusBadge } from '../records/StatusBadge';
import type { SalesAgent } from '../../types/records';

export function AgentRegister() {
  const { role } = useSession();
  const navigate = useNavigate();
  const { agents, attributions, accruals } = useScopedAgents();
  const money = canSeeCommission(role);
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const rows = agents.filter((a) => !s || `${a.id} ${a.name} ${a.nameBn} ${a.phone} ${a.territory ?? ''}`.toLowerCase().includes(s)).sort((a, b) => a.name.localeCompare(b.name));
  const active = (id: string) => attributions.filter((x) => x.agentId === id && !x.effectiveTo).length;
  const salespeople = (id: string) => new Set(attributions.filter((x) => x.agentId === id && !x.effectiveTo).map((x) => x.salespersonId)).size;

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <p className="text-[12px] text-slate-500">{rows.length} agent{rows.length === 1 ? '' : 's'}</p>
        <div className="relative ml-auto min-w-[240px]">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search agents" placeholder="Name (English or বাংলা), phone, territory…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <CustomerTable<SalesAgent>
        minWidth={money ? 1000 : 780}
        rows={rows}
        rowKey={(a) => a.id}
        onOpen={(a) => navigate(`/sales-agents/records/${a.id}`)}
        empty="No agents match."
        columns={[
        { label: 'Agent', cell: (a) => <span><span className="block font-semibold text-slate-900">{a.name}</span><span className="text-[11px] text-slate-500">{a.nameBn} · {a.id}</span></span> },
        { label: 'Phone and territory', cell: (a) => <span className="text-[11.5px]">{a.phone}<span className="block text-slate-500">{a.territory ?? '—'}</span></span> },
        { label: 'Agreement', cell: (a) => <span className="whitespace-nowrap text-[11.5px]">{a.agreementStart ? `${formatDhakaDate(a.agreementStart)} – ${formatDhakaDate(a.agreementEnd!)}` : '—'}</span> },
        { label: 'Customers', align: 'right', cell: (a) => <span className="tabular-nums">{active(a.id)}<span className="block text-[11px] text-slate-500">with {salespeople(a.id)} salesperson{salespeople(a.id) === 1 ? '' : 's'}</span></span> },
        ...(money ?
        [
        {
          label: 'Unpaid commission',
          align: 'right' as const,
          cell: (a: SalesAgent) => {
            const t = totals(accruals.filter((x) => x.agentId === a.id));
            const open = t.Accrued + t.Pending + t.Approved;
            return <span className={`tabular-nums ${open > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{formatBDT(open)}<span className="block text-[11px] font-normal text-slate-500">paid {formatBDT(t.Paid)}</span></span>;
          }
        }] :

        []),
        { label: 'Status', cell: (a) => <StatusBadge status={a.status} /> }]
        } />
      
    </section>);

}