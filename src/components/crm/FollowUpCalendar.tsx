import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useCrmData, type CrmFilters } from '../../hooks/useCrmData';
import { dhakaInputValue, demoNow, formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';

type EventKind = 'Follow-up' | 'Decision date' | 'Clarification' | 'Submission';

interface CalEvent {
  key: string;
  day: string; // YYYY-MM-DD in Dhaka
  at: string;
  kind: EventKind;
  title: string;
  detail: string;
  to: string;
  overdue: boolean;
}

const KIND_STYLE: Record<EventKind, string> = {
  'Follow-up': 'bg-primary-soft text-slate-800 border-l-primary',
  'Decision date': 'bg-indigo-50 text-slate-800 border-l-indigo-600',
  Clarification: 'bg-amber-50 text-slate-800 border-l-amber-600',
  Submission: 'bg-rose-50 text-slate-800 border-l-rose-700'
};

const WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function FollowUpCalendar({ filters }: {filters: CrmFilters;}) {
  const { opportunities, tenders, leadOf } = useCrmData(filters);
  const navigate = useNavigate();
  const today = dhakaInputValue(demoNow().toISOString());
  const nowIso = demoNow().toISOString();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);

  const events = useMemo(() => {
    const list: CalEvent[] = [];
    opportunities.forEach((o) => {
      const org = leadOf(o).company;
      if (o.status === 'Open' && o.nextActionDue)
      list.push({ key: `f-${o.id}`, day: dhakaInputValue(o.nextActionDue), at: o.nextActionDue, kind: 'Follow-up', title: org, detail: `${o.nextAction} · ${userName(o.ownerId)}`, to: `/sales-crm/opportunities/${o.id}`, overdue: o.nextActionDue < nowIso });
      if (o.status === 'Open' || o.status === 'Stalled')
      list.push({ key: `d-${o.id}`, day: dhakaInputValue(o.expectedDecisionDate), at: o.expectedDecisionDate, kind: 'Decision date', title: org, detail: `Expected decision · ${o.title}`, to: `/sales-crm/opportunities/${o.id}`, overdue: false });
    });
    tenders.
    filter((t) => t.submissionStatus === 'Preparing').
    forEach((t) => {
      list.push({ key: `c-${t.id}`, day: dhakaInputValue(t.clarificationDeadline), at: t.clarificationDeadline, kind: 'Clarification', title: t.reference, detail: `Clarification deadline · ${t.issuingOrganisation}`, to: `/sales-crm/tenders/${t.id}`, overdue: t.clarificationDeadline < nowIso });
      list.push({ key: `s-${t.id}`, day: dhakaInputValue(t.submissionDeadline), at: t.submissionDeadline, kind: 'Submission', title: t.reference, detail: `Submission deadline · ${t.issuingOrganisation}`, to: `/sales-crm/tenders/${t.id}`, overdue: t.submissionDeadline < nowIso });
    });
    return list.sort((a, b) => a.at.localeCompare(b.at));
  }, [opportunities, tenders, leadOf, nowIso]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    events.forEach((e) => m.set(e.day, [...(m.get(e.day) ?? []), e]));
    return m;
  }, [events]);

  const cells = useMemo(() => {
    const [y, mo] = month.split('-').map(Number);
    const first = new Date(Date.UTC(y, mo - 1, 1));
    const offset = (first.getUTCDay() + 1) % 7; // week starts Saturday
    const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const out: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= days; d++) out.push(`${month}-${String(d).padStart(2, '0')}`);
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const shift = (n: number) => {
    const [y, mo] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const overdue = events.filter((e) => e.overdue);
  const dayEvents = byDay.get(selected) ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-label="Follow-up calendar">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <h2 className="min-w-[120px] text-center text-[13.5px] font-bold text-slate-900">{monthLabel}</h2>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => {setMonth(today.slice(0, 7));setSelected(today);}} className="ml-1 rounded-md border border-slate-200 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50">
            Today
          </button>
          <ul className="ml-auto flex flex-wrap gap-3 text-[10.5px] text-slate-500">
            {(Object.keys(KIND_STYLE) as EventKind[]).map((k) =>
            <li key={k} className="flex items-center gap-1">
                <span className={`h-2.5 w-1 rounded-sm border-l-[3px] ${KIND_STYLE[k]}`} aria-hidden />
                {k}
              </li>
            )}
          </ul>
        </header>
        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7">
            {WEEKDAYS.map((w) =>
            <div key={w} className="border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.03em] text-slate-400">
                {w}
              </div>
            )}
            {cells.map((day, i) => {
              if (!day) return <div key={`x-${i}`} className="min-h-[96px] border-b border-r border-slate-100 bg-slate-50/50" />;
              const list = byDay.get(day) ?? [];
              const isToday = day === today;
              const isSel = day === selected;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-pressed={isSel}
                  aria-label={`${day}, ${list.length} items`}
                  className={`flex min-h-[96px] flex-col items-stretch gap-0.5 border-b border-r border-slate-100 px-1.5 py-1 text-left transition-colors duration-100 ${isSel ? 'bg-primary-soft/60' : 'hover:bg-slate-50'}`}>
                  
                  <span className={`mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] font-semibold ${isToday ? 'bg-primary text-white' : 'text-slate-600'}`}>{Number(day.slice(-2))}</span>
                  {list.slice(0, 3).map((e) =>
                  <span key={e.key} className={`truncate rounded-sm border-l-[3px] px-1 py-px text-[10px] leading-tight ${KIND_STYLE[e.kind]} ${e.overdue ? 'font-semibold text-status-critical' : ''}`}>
                      {e.title}
                    </span>
                  )}
                  {list.length > 3 && <span className="px-1 text-[10px] font-semibold text-slate-500">+{list.length - 3} more</span>}
                </button>);

            })}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <AgendaList
          title={new Date(`${selected}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })}
          empty="Nothing scheduled."
          events={dayEvents}
          onOpen={(to) => navigate(to)} />
        
        <AgendaList title={`Overdue (${overdue.length})`} empty="No overdue follow-ups or deadlines." events={overdue} onOpen={(to) => navigate(to)} tone="critical" />
      </aside>
    </div>);

}

function AgendaList({ title, empty, events, onOpen, tone }: {title: string;empty: string;events: CalEvent[];onOpen: (to: string) => void;tone?: 'critical';}) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white" aria-label={title}>
      <h3 className={`border-b border-slate-200 px-4 py-2.5 text-[13px] font-bold ${tone ? 'text-status-critical' : 'text-slate-900'}`}>{title}</h3>
      {events.length === 0 ?
      <p className="px-4 py-5 text-[12px] text-slate-500">{empty}</p> :

      <ul className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
          {events.map((e) =>
        <li key={e.key}>
              <button type="button" onClick={() => onOpen(e.to)} className="block w-full px-4 py-2 text-left transition-colors duration-100 hover:bg-slate-50">
                <span className="flex items-center justify-between gap-2 text-[10.5px] text-slate-500">
                  <span className="font-semibold">{e.kind}</span>
                  <span className={e.overdue ? 'font-semibold text-status-critical' : ''}>{formatDhaka(e.at)}</span>
                </span>
                <span className="block text-[12.5px] font-semibold text-slate-900">{e.title}</span>
                <span className="block text-[11px] leading-snug text-slate-600">{e.detail}</span>
              </button>
            </li>
        )}
        </ul>
      }
    </section>);

}