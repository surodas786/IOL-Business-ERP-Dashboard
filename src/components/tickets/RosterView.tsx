import React from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { branches } from '../../data/branches';
import { technicianProfiles } from '../../data/supportConfig';
import { canEditRoster, todayKey } from '../../utils/ticketRules';
import { AdminPanel, tdClass, thClass } from '../admin/AdminPanel';
import { SHIFTS, type Shift } from '../../types/ticket';

const SHIFT_TONE: Record<Shift, string> = {
  Day: 'bg-emerald-50 text-status-ok',
  Evening: 'bg-blue-50 text-status-info',
  Night: 'bg-indigo-50 text-indigo-700',
  'On call': 'bg-amber-50 text-status-warning',
  Off: 'bg-slate-50 text-slate-500',
  Leave: 'bg-rose-50 text-status-critical'
};
const HOURS: Record<Shift, string> = { Day: '09:00–17:00', Evening: '14:00–22:00', Night: '22:00–06:00', 'On call': 'Reachable by phone', Off: '', Leave: '' };

export function RosterView() {
  const { db } = useData();
  const { role, branchFilter } = useSession();
  const runAction = useRunAction();
  const edit = canEditRoster(role);
  const today = todayKey();
  const days = Array.from(new Set(db.dutyRoster.map((r) => r.date))).sort();
  const techs = technicianProfiles.filter((p) => branchFilter === 'all' || p.branchId === branchFilter);
  const dayLabel = (d: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

  return (
    <AdminPanel
      title="Duty roster"
      description={edit ? 'Change a shift from its cell. Off and Leave block assignment that day.' : 'Maintained by the Technical Supervisor. Off and Leave block assignment that day.'}
      actions={
      <ul className="flex flex-wrap gap-2 text-[11px] text-slate-600">
          {SHIFTS.filter((s) => HOURS[s]).map((s) =>
        <li key={s}>
              <span className="font-semibold">{s}</span> {HOURS[s]}
            </li>
        )}
        </ul>
      }>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr>
              <th className={thClass}>Technician</th>
              {days.map((d) =>
              <th key={d} className={`${thClass} ${d === today ? 'text-slate-900' : ''}`}>
                  {dayLabel(d)}
                  {d === today && <span className="ml-1 normal-case text-primary">· today</span>}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {techs.map((p) =>
            <tr key={p.name}>
                <td className={tdClass}>
                  <span className="block font-semibold text-slate-900">{p.name}</span>
                  <span className="text-[11px] text-slate-500">{branches.find((b) => b.id === p.branchId)?.name}</span>
                </td>
                {days.map((d) => {
                const e = db.dutyRoster.find((r) => r.technicianName === p.name && r.date === d);
                const s = e?.shift;
                return (
                  <td key={d} className={`${tdClass} ${d === today ? 'bg-slate-50' : ''}`}>
                      {edit ?
                    <select
                      aria-label={`${p.name} on ${d}`}
                      className={`h-7 w-full rounded border-0 px-1.5 text-[11.5px] font-semibold ${s ? SHIFT_TONE[s] : 'bg-white text-slate-400'}`}
                      value={s ?? ''}
                      onChange={(ev) => runAction({ type: 'TKT_SET_SHIFT', technicianName: p.name, date: d, shift: ev.target.value as Shift })}>
                      
                          {!s && <option value="">—</option>}
                          {SHIFTS.map((x) =>
                      <option key={x}>{x}</option>
                      )}
                        </select> :

                    <span className={`inline-block rounded px-1.5 py-0.5 text-[11.5px] font-semibold ${s ? SHIFT_TONE[s] : 'text-slate-400'}`}>{s ?? '—'}</span>
                    }
                      {e?.note && <span className="mt-0.5 block text-[10.5px] text-slate-500">{e.note}</span>}
                    </td>);

              })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>);

}