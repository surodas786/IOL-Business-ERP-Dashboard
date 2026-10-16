import React from 'react';
import { CheckIcon, LockIcon } from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useSession } from '../../../contexts/SessionContext';
import { AdminPanel } from '../../admin/AdminPanel';
import { CorrectionsPanel } from '../CorrectionsPanel';
import { hasPermission } from '../../../utils/access';
import { formatBDT, formatCount, formatDhaka, formatDhakaDate } from '../../../utils/format';
import { accountOutstanding, branchName, userName, zoneName } from '../../../utils/relations';
import { canViewIdentity, connectionProduct, fieldValue, profileStage } from '../../../utils/customerProfile';
import { CORRECTABLE_FIELDS, FIELD_LABEL, RESTRICTED_FIELDS, type ProfileStage } from '../../../types/customer';
import type { Customer } from '../../../types/records';

const STAGES: ProfileStage[] = ['Draft', 'Survey', 'Negotiation', 'Work Order', 'Active'];

export function OverviewTab({ customer: c }: {customer: Customer;}) {
  const { db } = useData();
  const { role } = useSession();
  const stage = profileStage(db, c);
  const locked = stage !== 'Draft';
  const fin = hasPermission(role, 'viewFinancials');
  const conns = db.connections.filter((x) => x.customerId === c.id);
  const active = conns.filter((x) => x.status === 'Active');
  const bas = db.billingAccounts.filter((b) => b.customerId === c.id);
  const sites = db.sites.filter((s) => s.customerId === c.id);
  const openTickets = db.tickets.filter((t) => t.customerId === c.id && t.status !== 'Resolved' && t.status !== 'Closed').length;
  const idx = STAGES.indexOf(stage);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        <AdminPanel
          title="Core profile"
          description={locked ? `Locked since submission into ${c.profileStage === 'Draft' ? stage : c.profileStage ?? stage}${c.submittedAt ? ` on ${formatDhakaDate(c.submittedAt)}` : ''}. Changes need an approved correction.` : 'Draft — these fields can be edited until the profile is submitted.'}>
          
          <ol aria-label="Profile stage" className="grid grid-cols-5 gap-1 border-b border-slate-100 px-4 py-3">
            {STAGES.map((s, i) =>
            <li key={s} className="min-w-0">
                <span className={`block h-1 rounded-full ${i <= idx ? 'bg-primary' : 'bg-slate-200'}`} aria-hidden />
                <span className={`mt-1 flex items-center gap-1 truncate text-[10.5px] font-semibold ${i === idx ? 'text-slate-900' : i < idx ? 'text-slate-600' : 'text-slate-400'}`}>
                  {i < idx && <CheckIcon className="h-3 w-3 text-primary" aria-hidden />}
                  {s}
                </span>
              </li>
            )}
          </ol>
          <dl className="grid gap-x-6 sm:grid-cols-2">
            {CORRECTABLE_FIELDS.map((f) => {
              const restricted = RESTRICTED_FIELDS.includes(f) && !canViewIdentity(role);
              const v = fieldValue(c, f);
              return (
                <div key={f} className="border-b border-slate-100 px-4 py-2.5">
                  <dt className="flex items-center gap-1 text-[11px] text-slate-500">
                    {locked && <LockIcon className="h-3 w-3" aria-label="Locked" />}
                    {FIELD_LABEL[f]}
                  </dt>
                  <dd lang={f === 'nameBn' ? 'bn' : undefined} className={`mt-0.5 text-[13px] ${restricted ? 'italic text-slate-400' : 'text-slate-900'}`}>
                    {restricted ? 'Restricted for your role' : v || '—'}
                  </dd>
                </div>);

            })}
            <div className="border-b border-slate-100 px-4 py-2.5">
              <dt className="flex items-center gap-1 text-[11px] text-slate-500">
                {locked && <LockIcon className="h-3 w-3" aria-label="Locked" />}
                Branch · zone
              </dt>
              <dd className="mt-0.5 text-[13px] text-slate-900">
                {branchName(c.branchId)} · {zoneName(c.zoneId)}
              </dd>
            </div>
            <div className="border-b border-slate-100 px-4 py-2.5">
              <dt className="text-[11px] text-slate-500">Account manager</dt>
              <dd className="mt-0.5 text-[13px] text-slate-900">{userName(c.accountManagerId)}</dd>
            </div>
          </dl>
        </AdminPanel>
        <CorrectionsPanel customer={c} />
      </div>

      <AdminPanel title="At a glance" description={`Customer since ${formatDhaka(c.since, { year: true }).split(',')[0]}`}>
        <dl className="divide-y divide-slate-100 text-[12.5px]">
          <Row label="Sites" value={formatCount(sites.length)} />
          <Row label="Service connections" value={`${conns.length} (${active.length} active)`} />
          <Row label="Products" value={Array.from(new Set(conns.map(connectionProduct))).join(', ') || '—'} />
          <Row label="Billing accounts" value={bas.length === 0 ? '—' : bas.length === 1 ? '1 · consolidated' : `${bas.length} · separate`} />
          {fin && <Row label="Active MRC" value={formatBDT(active.reduce((s, x) => s + x.mrc, 0))} strong />}
          {fin && <Row label="Outstanding" value={formatBDT(bas.reduce((s, b) => s + accountOutstanding(db, b.id), 0))} />}
          <Row label="Open tickets" value={formatCount(openTickets)} />
        </dl>
        {!fin && <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">Billing values are hidden for {role.label}.</p>}
      </AdminPanel>
    </div>);

}

function Row({ label, value, strong }: {label: string;value: string;strong?: boolean;}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'font-bold text-slate-900' : 'text-slate-800'}`}>{value}</dd>
    </div>);

}