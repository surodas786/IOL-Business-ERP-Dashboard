import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { branches } from '../../data/branches';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { userName } from '../../utils/relations';
import { ancestors, availableAllotment, childrenOf } from '../../utils/associateRules';
import { AdminPanel } from '../admin/AdminPanel';
import type { Associate } from '../../types/records';

function Fact({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] text-slate-800">{children}</dd>
    </div>);

}

export function ProfileFacts({ associate: a, money }: {associate: Associate;money: boolean;}) {
  const { db } = useData();
  const branch = branches.find((b) => b.id === a.branchId);
  const chain = ancestors(db, a.id).reverse();
  const kids = childrenOf(db, a.id);

  return (
    <div className="space-y-3">
      <AdminPanel title="Agreement">
        <dl className="grid gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Collection model">{a.collectionModel}</Fact>
          {money && <Fact label="Sharing">{a.collectionModel === 'Fixed Monthly' ? `${formatBDT(a.fixedMonthly ?? 0)} per month` : `${a.revenueSharePct}% of ${a.sharingBasis?.toLowerCase()}`}</Fact>}
          <Fact label="Agreement">{a.agreementStart ? `${formatDhakaDate(a.agreementStart)} – ${formatDhakaDate(a.agreementEnd!)}` : '—'}</Fact>
          <Fact label="Settlement deadline">{a.settlementDay ? `Day ${a.settlementDay} of the following month · ${a.graceDays ?? 0} days grace` : '—'}</Fact>
          {money && <Fact label="Credit">{a.creditLimit ? `${formatBDT(a.creditLimit)} · ${a.creditDays} days` : 'No credit'}</Fact>}
          {money && <Fact label="Security deposit required">{formatBDT(a.depositRequired ?? 0)}</Fact>}
          <Fact label="VAT cost borne by">{a.vatBearer ?? '—'}</Fact>
          <Fact label="Renewal window">{a.minRenewalDays ? `${a.minRenewalDays}–${a.maxRenewalDays} days` : '—'}</Fact>
          <Fact label="Client ID prefix">
            <span className="font-mono">{a.clientIdPrefix ?? '—'}</span>
          </Fact>
          <Fact label="Backbone / last mile">{`${a.backbone ?? '—'} / ${a.lastMile ?? '—'}`}</Fact>
          <Fact label="Services and downstream clients">{a.servicesSummary || `${a.subscribers} subscribers`}</Fact>
        </dl>
      </AdminPanel>
      <AdminPanel title="Identity, territory and hierarchy">
        <dl className="grid gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Address">{a.address || '—'}</Fact>
          <Fact label="Trade licence">{a.tradeLicenceNo || '—'}</Fact>
          <Fact label="Territory">{`${a.territory ?? '—'} · ${branch?.zones.find((z) => z.id === a.zoneId)?.name ?? ''}, ${branch?.name ?? ''}`}</Fact>
          <Fact label="Responsible executive">{userName(a.responsibleExecutiveId)}</Fact>
          <Fact label="Reports to">
            {chain.length ?
            chain.map((p, i) =>
            <React.Fragment key={p.id}>
                  {i > 0 && ' → '}
                  <Link to={`/associates/records/${p.id}`} className="font-semibold text-primary hover:text-primary-hover">
                    {p.name}
                  </Link>
                </React.Fragment>
            ) :

            'IOL directly'
            }
          </Fact>
          <Fact label="Sub-associates">
            {kids.length ?
            <>
                {kids.map((k, i) =>
              <React.Fragment key={k.id}>
                    {i > 0 && ', '}
                    <Link to={`/associates/records/${k.id}`} className="font-semibold text-primary hover:text-primary-hover">
                      {k.name}
                    </Link>
                    {money && k.revenueSharePct ? ` (${k.revenueSharePct}%)` : ''}
                  </React.Fragment>
              )}
                {money && <span className="block text-[11px] text-slate-500">{availableAllotment(db, a.id)}% of allotment still available</span>}
              </> :

            'None'
            }
          </Fact>
          <Fact label="Contacts">
            {(a.contacts ?? [{ role: 'Owner', name: a.contactName, phone: a.contactPhone }]).map((c) =>
            <span key={`${c.role}-${c.name}`} className="block">
                {c.name} <span className="text-slate-500">· {c.role} · {c.phone}</span>
              </span>
            )}
          </Fact>
        </dl>
      </AdminPanel>
    </div>);

}