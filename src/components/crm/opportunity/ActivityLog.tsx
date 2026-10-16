import React, { useState } from 'react';
import { PaperclipIcon, PlusIcon } from 'lucide-react';
import { formatDhaka } from '../../../utils/format';
import { userName } from '../../../utils/relations';
import { AdminPanel, secondaryBtn } from '../../admin/AdminPanel';
import type { Opportunity } from '../../../types/records';

type Tab = 'communications' | 'history' | 'attachments';

interface ActivityLogProps {
  opportunity: Opportunity;
  canEdit: boolean;
  onLog: () => void;
  onAttach: () => void;
}

/** Communication history, stage/ownership history and attachments. */
export function ActivityLog({ opportunity: o, canEdit, onLog, onAttach }: ActivityLogProps) {
  const [tab, setTab] = useState<Tab>('communications');
  const comms = [...o.communications].reverse();
  const history = [...o.history].reverse();
  const tabs: {id: Tab;label: string;n: number;}[] = [
  { id: 'communications', label: 'Communications', n: o.communications.length },
  { id: 'history', label: 'History', n: o.history.length },
  { id: 'attachments', label: 'Attachments', n: o.attachments.length }];


  return (
    <AdminPanel
      title="Activity"
      actions={
      canEdit &&
      <>
            <button type="button" className={secondaryBtn} onClick={onAttach}>
              <PaperclipIcon className="h-3.5 w-3.5" aria-hidden /> Attach
            </button>
            <button type="button" className={secondaryBtn} onClick={onLog}>
              <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Log communication
            </button>
          </>

      }>
      
      <div role="tablist" aria-label="Activity" className="flex gap-1 border-b border-slate-200 px-3 pt-2">
        {tabs.map((t) =>
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          className={`-mb-px border-b-2 px-2.5 pb-2 text-[12px] font-semibold transition-colors duration-150 ${tab === t.id ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          
            {t.label} <span className="font-normal text-slate-400">{t.n}</span>
          </button>
        )}
      </div>

      {tab === 'communications' && (
      comms.length === 0 ?
      <Empty text="No communication recorded yet. Logging one is required before this can become a Prospect, unless interest is recorded." /> :

      <ol className="divide-y divide-slate-100">
            {comms.map((c) =>
        <li key={c.id} className="px-4 py-2.5">
                <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{c.channel}</span>
                  <span>{formatDhaka(c.at, { year: true })}</span>
                  <span>· {userName(c.byId)}</span>
                  {c.interest && <span className="rounded bg-emerald-50 px-1.5 text-[10px] font-semibold text-status-ok">Interest shown</span>}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-800">{c.summary}</p>
              </li>
        )}
          </ol>)
      }

      {tab === 'history' && (
      history.length === 0 ?
      <Empty text="No history yet." /> :

      <ol className="relative mx-4 my-3 space-y-3 border-l border-slate-200 pl-4">
            {history.map((h, i) =>
        <li key={`${h.at}-${i}`} className="relative">
                <span className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${h.kind === 'Lost' ? 'bg-status-critical' : h.kind === 'Stalled' ? 'bg-status-warning' : 'bg-primary'}`} aria-hidden />
                <p className="text-[12.5px] text-slate-800">
                  <span className="font-semibold">{h.kind}</span> · {h.detail}
                </p>
                {h.reason && <p className="text-[11.5px] italic text-slate-600">Reason: {h.reason}</p>}
                <p className="text-[10.5px] text-slate-400">
                  {userName(h.byId)} · {formatDhaka(h.at, { year: true })}
                </p>
              </li>
        )}
          </ol>)
      }

      {tab === 'attachments' && (
      o.attachments.length === 0 ?
      <Empty text="No attachments." /> :

      <ul className="divide-y divide-slate-100">
            {o.attachments.map((a) =>
        <li key={a.id} className="flex items-center gap-2.5 px-4 py-2">
                <PaperclipIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-800">{a.name}</span>
                <span className="whitespace-nowrap text-[11px] text-slate-500">
                  {a.sizeKb >= 1024 ? `${(a.sizeKb / 1024).toFixed(1)} MB` : `${a.sizeKb} KB`} · {userName(a.byId)} · {formatDhaka(a.uploadedAt)}
                </span>
              </li>
        )}
          </ul>)
      }
    </AdminPanel>);

}

function Empty({ text }: {text: string;}) {
  return <p className="px-4 py-6 text-[12px] text-slate-500">{text}</p>;
}