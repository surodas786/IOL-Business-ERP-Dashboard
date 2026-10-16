import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { branches } from '../../data/branches';
import { neededSkill, onDuty, rankTechnicians } from '../../utils/ticketRules';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { LoadBar } from './LoadBar';
import { SUPPORT_TEAMS, type SupportTeam } from '../../types/ticket';
import type { Ticket } from '../../types/records';

const zoneName = (id: string) => branches.flatMap((b) => b.zones).find((z) => z.id === id)?.name ?? id;

/** Assign team and technician, showing zone coverage, skills, today's shift and workload. */
export function AssignTicketDialog({ ticket: t, onClose }: {ticket: Ticket;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const options = rankTechnicians(db, t);
  const [tech, setTech] = useState(t.assigneeName ?? options.find((o) => onDuty(o.shift))?.profile.name ?? '');
  const [team, setTeam] = useState<SupportTeam>(t.team ?? options.find((o) => o.profile.name === tech)?.profile.team ?? 'Field Team');
  const [note, setNote] = useState('');
  const need = neededSkill(t);

  return (
    <CrmDialog
      size="lg"
      title={t.assigneeName ? `Reassign ${t.id}` : `Assign ${t.id}`}
      description={`${zoneName(t.zoneId)} · ${t.category ?? 'No category'}${need ? ` · needs ${need}` : ''}. Ranked by zone, skill, today’s shift and load.`}
      onClose={onClose}
      submitLabel={t.assigneeName ? 'Reassign' : 'Assign'}
      submitDisabled={!tech}
      onSubmit={() => runAction({ type: 'TKT_ASSIGN', ticketId: t.id, team, technicianName: tech, note }) && onClose()}>
      
      <FormField label="Team" htmlFor="as-team" required>
        <select id="as-team" className={fieldInput} value={team} onChange={(e) => setTeam(e.target.value as SupportTeam)}>
          {SUPPORT_TEAMS.map((x) =>
          <option key={x}>{x}</option>
          )}
        </select>
      </FormField>
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">
          Technician<span className="ml-0.5 text-status-critical">*</span>
        </legend>
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {options.map((o) => {
            const available = onDuty(o.shift);
            const selected = tech === o.profile.name;
            return (
              <li key={o.profile.name}>
                <label className={`grid cursor-pointer gap-2 px-3 py-2.5 transition-colors duration-150 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-center ${selected ? 'bg-primary-soft' : 'hover:bg-slate-50'} ${available ? '' : 'cursor-not-allowed opacity-60'}`}>
                  <span className="flex min-w-0 items-start gap-2.5">
                    <input type="radio" name="as-tech" className="mt-1 accent-primary" checked={selected} disabled={!available} onChange={() => {setTech(o.profile.name);setTeam(o.profile.team);}} />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-slate-900">
                        {o.profile.name} <span className="font-normal text-slate-500">· {o.profile.team}</span>
                      </span>
                      <span className="block text-[11.5px] text-slate-600">
                        <span className={o.zoneMatch ? 'font-semibold text-status-ok' : o.branchMatch ? '' : 'text-status-warning'}>
                          {o.profile.zoneIds.map(zoneName).join(', ')}
                          {o.zoneMatch ? ' · covers this zone' : o.branchMatch ? ' · same branch' : ' · other branch'}
                        </span>
                      </span>
                      <span className="block text-[11.5px] text-slate-600">
                        {o.profile.skills.map((s, i) =>
                        <span key={s} className={s === need ? 'font-semibold text-status-ok' : ''}>
                            {i > 0 && ' · '}
                            {s}
                          </span>
                        )}
                      </span>
                      <span className={`block text-[11px] ${available ? 'text-slate-500' : 'font-semibold text-status-critical'}`}>Today: {o.shift ?? 'not rostered'}{available ? '' : ' — cannot be assigned'}</span>
                    </span>
                  </span>
                  <span className="pl-6 sm:pl-0">
                    <LoadBar points={o.load.points} capacity={o.load.capacity} />
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {o.load.tickets.length} ticket{o.load.tickets.length === 1 ? '' : 's'} · {o.load.jobs} job{o.load.jobs === 1 ? '' : 's'}
                    </span>
                  </span>
                </label>
              </li>);

          })}
        </ul>
      </fieldset>
      <FormField label="Dispatch note" htmlFor="as-note">
        <input id="as-note" className={fieldInput} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </FormField>
      {!t.firstResponseAt && <p className="text-[11.5px] text-slate-500">Assigning does not count as the first response — record the response separately.</p>}
    </CrmDialog>);

}