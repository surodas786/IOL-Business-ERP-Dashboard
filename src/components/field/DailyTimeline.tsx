import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, PaperclipIcon, ReceiptIcon } from 'lucide-react';
import { useFieldData } from '../../hooks/useFieldData';
import { useRecordDrawer } from '../../contexts/RecordDrawerContext';
import { StatusBadge } from '../records/StatusBadge';
import { dhakaDayAt, dhakaInputValue, demoNow, formatDhaka, formatDhakaDate } from '../../utils/format';
import { recordName, userName } from '../../utils/relations';
import { followUpOverdue } from '../../utils/fieldRules';

type Entry = {id: string;at: string;kind: 'visit' | 'due';visitId: string;};

/** One day of field activity across the people the viewer can see. */
export function DailyTimeline() {
  const { db, visits } = useFieldData();
  const { openRecord } = useRecordDrawer();
  const today = dhakaInputValue(demoNow().toISOString());
  const [day, setDay] = useState(today);
  const shift = (n: number) => setDay(dhakaInputValue(dhakaDayAt(`${day}T12:00:00+06:00`, n)));

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    visits.forEach((v) => {
      if (dhakaInputValue(v.at) === day) list.push({ id: `v-${v.id}`, at: v.at, kind: 'visit', visitId: v.id });
      if (v.nextActionDue && !v.followUpDoneAt && dhakaInputValue(v.nextActionDue) === day) list.push({ id: `d-${v.id}`, at: v.nextActionDue, kind: 'due', visitId: v.id });
    });
    return list.sort((a, b) => a.at.localeCompare(b.at));
  }, [visits, day]);

  const people = new Set(entries.filter((e) => e.kind === 'visit').map((e) => visits.find((v) => v.id === e.visitId)?.userId)).size;
  const visitCount = entries.filter((e) => e.kind === 'visit').length;

  return (
    <section aria-label="Daily activity timeline" className="rounded-md border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous day" onClick={() => shift(-1)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <input type="date" aria-label="Day" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className="h-8 rounded-md border border-slate-200 px-2 text-[12.5px] text-slate-800" />
          <button type="button" aria-label="Next day" disabled={day >= today} onClick={() => shift(1)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          {day !== today &&
          <button type="button" onClick={() => setDay(today)} className="ml-1 text-[11.5px] font-semibold text-primary hover:text-primary-hover">
              Today
            </button>
          }
        </div>
        <p className="text-[11.5px] text-slate-500">
          {formatDhakaDate(`${day}T12:00:00+06:00`)} · {visitCount} visit{visitCount === 1 ? '' : 's'} by {people} {people === 1 ? 'person' : 'people'}
        </p>
      </header>

      {entries.length === 0 ?
      <p className="px-4 py-10 text-center text-[12.5px] text-slate-500">No visits or follow-ups on this day.</p> :

      <ol className="px-4 py-3">
          {entries.map((e, i) => {
          const v = visits.find((x) => x.id === e.visitId)!;
          const last = i === entries.length - 1;
          const time = formatDhaka(e.at).split(', ')[1];
          return (
            <li key={e.id} className="grid grid-cols-[64px_16px_1fr] gap-x-2">
                <span className="pt-2 text-right text-[11.5px] font-semibold tabular-nums text-slate-500">{time}</span>
                <span className="relative flex justify-center">
                  {!last && <span className="absolute bottom-0 top-4 w-px bg-slate-200" aria-hidden />}
                  <span className={`relative mt-3 h-2 w-2 rounded-full ${e.kind === 'due' ? followUpOverdue(v) ? 'bg-status-critical' : 'bg-status-warning' : 'bg-primary'}`} aria-hidden />
                </span>
                <button type="button" onClick={() => openRecord({ type: 'fieldVisit', id: v.id })} className="mb-1 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-slate-50">
                  {e.kind === 'visit' ?
                <>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[13px] font-semibold text-slate-900">{recordName(db, v.subject)}</span>
                        <StatusBadge status={v.outcome} />
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-slate-600">
                        {userName(v.userId)} · {v.purpose} · {v.durationMin} min · met {v.peopleMet}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] text-slate-700">{v.notes}</span>
                      <span className="mt-1 flex flex-wrap gap-3 text-[10.5px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3" aria-hidden />
                          {v.location}
                        </span>
                        {v.attachments.length > 0 &&
                    <span className="inline-flex items-center gap-1">
                            <PaperclipIcon className="h-3 w-3" aria-hidden />
                            {v.attachments.length}
                          </span>
                    }
                        {v.claimId &&
                    <span className="inline-flex items-center gap-1">
                            <ReceiptIcon className="h-3 w-3" aria-hidden />
                            {v.claimId}
                          </span>
                    }
                      </span>
                    </> :

                <>
                      <span className="text-[12.5px] font-semibold text-slate-900">Follow-up due: {v.nextAction}</span>
                      <span className="mt-0.5 block text-[11.5px] text-slate-600">
                        {userName(v.userId)} · {recordName(db, v.subject)} · from visit {v.id}
                      </span>
                    </>
                }
                </button>
              </li>);

        })}
        </ol>
      }
    </section>);

}