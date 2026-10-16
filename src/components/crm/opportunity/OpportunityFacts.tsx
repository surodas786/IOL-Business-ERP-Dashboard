import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useRecordDrawer } from '../../../contexts/RecordDrawerContext';
import { useSession } from '../../../contexts/SessionContext';
import { hasPermission } from '../../../utils/access';
import { extensionCount } from '../../../utils/crmRules';
import { formatBDT, formatDhaka, formatDhakaDate } from '../../../utils/format';
import { branchName, userName, zoneName } from '../../../utils/relations';
import { AdminPanel, linkBtn } from '../../admin/AdminPanel';
import type { Lead, Opportunity } from '../../../types/records';

interface OpportunityFactsProps {
  opportunity: Opportunity;
  lead: Lead;
  canEdit: boolean;
  onChangeDate: () => void;
}

/** Organisation, contact, service and commercial facts captured for the opportunity. */
export function OpportunityFacts({ opportunity: o, lead, canEdit, onChangeDate }: OpportunityFactsProps) {
  const { db } = useData();
  const { role } = useSession();
  const { openRecord } = useRecordDrawer();
  const pipe = hasPermission(role, 'viewPipeline');
  const margin = hasPermission(role, 'viewMargins');
  const agent = db.salesAgents.find((a) => a.id === (o.agentId ?? lead.agentId));
  const customer = db.customers.find((c) => c.id === o.customerId);
  const ext = extensionCount(o);

  return (
    <AdminPanel title="Details">
      <Group title="Organisation and contact">
        <Fact label="Organisation">
          {lead.company}
          {lead.companyBn && <span lang="bn" className="block text-[11.5px] text-slate-500">{lead.companyBn}</span>}
        </Fact>
        <Fact label="Category">{lead.category}</Fact>
        <Fact label="Contact">
          {lead.contactName}
          {lead.contactDesignation && <span className="text-slate-500">, {lead.contactDesignation}</span>}
        </Fact>
        <Fact label="Phone">{lead.contactPhone ? <a className="text-primary hover:text-primary-hover" href={`tel:${lead.contactPhone.replace(/[\s-]/g, '')}`}>{lead.contactPhone}</a> : '—'}</Fact>
        <Fact label="Email">{lead.contactEmail ? <a className="break-all text-primary hover:text-primary-hover" href={`mailto:${lead.contactEmail}`}>{lead.contactEmail}</a> : '—'}</Fact>
        <Fact label="Address">{lead.address || '—'}</Fact>
        {customer &&
        <Fact label="Customer">
            <button type="button" className="text-left font-semibold text-primary hover:text-primary-hover" onClick={() => openRecord({ type: 'customer', id: customer.id })}>
              {customer.id} · {customer.name}
            </button>
            <span className="block text-[11px] text-slate-500">{o.expansion}</span>
          </Fact>
        }
      </Group>

      <Group title="Requested service">
        <Fact label="Service">
          {o.bandwidthMbps} Mbps {o.serviceType}
        </Fact>
        <Fact label="Service site">
          {o.siteName}
          <span className="block text-[11.5px] text-slate-500">{o.siteAddress}</span>
        </Fact>
        {pipe && <Fact label="Expected MRC">{formatBDT(o.expectedMrc)} / month</Fact>}
        {pipe && <Fact label="One-time">{formatBDT(o.otc)}</Fact>}
        {pipe && <Fact label="Annual value">{formatBDT(o.expectedMrc * 12)}</Fact>}
        {margin && o.marginPct > 0 && <Fact label="Margin">{o.marginPct}%</Fact>}
      </Group>

      <Group title="Source and ownership">
        <Fact label="Source">
          {lead.source}
          {agent && <span className="block text-[11.5px] text-slate-500">Agent: {agent.name}</span>}
          {lead.referral && <span className="block text-[11.5px] text-slate-500">Referred by {lead.referral}</span>}
        </Fact>
        <Fact label="Branch · zone">
          {branchName(o.branchId)} · {zoneName(o.zoneId)}
        </Fact>
        <Fact label="Sales owner">{userName(o.ownerId)}</Fact>
        <Fact label="Created">{formatDhaka(o.createdAt, { year: true })}</Fact>
      </Group>

      <Group title="Decision">
        <Fact label="Expected">
          <span className="flex flex-wrap items-center gap-x-2">
            {formatDhakaDate(o.expectedDecisionDate)}
            {canEdit && (o.status === 'Open' || o.status === 'Stalled') &&
            <button type="button" className={linkBtn} onClick={onChangeDate}>
                Change
              </button>
            }
          </span>
          {ext > 0 && <span className={`block text-[11px] ${ext >= 2 ? 'font-semibold text-status-warning' : 'text-slate-500'}`}>Extended {ext} time{ext === 1 ? '' : 's'}</span>}
        </Fact>
        {o.decisionDateHistory.length > 0 &&
        <ol className="col-span-full space-y-1 rounded bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            {[...o.decisionDateHistory].reverse().map((c) =>
          <li key={c.at}>
                <span className="font-semibold text-slate-800">
                  {formatDhakaDate(c.from)} → {formatDhakaDate(c.to)}
                </span>{' '}
                · {c.reason} · {userName(c.byId)}, {formatDhaka(c.at)}
              </li>
          )}
          </ol>
        }
      </Group>
    </AdminPanel>);

}

function Group({ title, children }: {title: string;children: React.ReactNode;}) {
  return (
    <div className="border-t border-slate-100 px-4 py-3 first:border-t-0">
      <h3 className="mb-2 text-[11px] font-semibold text-slate-500">{title}</h3>
      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5">{children}</dl>
    </div>);

}

function Fact({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <>
      <dt className="text-[11.5px] text-slate-500">{label}</dt>
      <dd className="min-w-0 text-[12.5px] text-slate-800">{children}</dd>
    </>);

}