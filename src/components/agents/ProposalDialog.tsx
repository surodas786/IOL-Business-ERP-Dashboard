import React from 'react';
import { useData } from '../../contexts/DataContext';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { userName } from '../../utils/relations';
import { usesMrc, usesOtc } from '../../utils/agentRules';
import { SALES_ROLES } from './AttributionDialog';
import { EffectSummary } from './EffectSummary';
import { useProposalForm } from './useProposalForm';
import { CANCELLATION_TREATMENTS, QUALIFYING_EVENTS, type CommissionBasis } from '../../types/agent';

const BASES: CommissionBasis[] = ['MRC', 'OTC', 'MRC + OTC'];

function Section({ title, children }: {title: string;children: React.ReactNode;}) {
  return (
    <fieldset className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
      <legend className="mb-2 text-[11.5px] font-bold text-slate-900">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>);

}

export function ProposalDialog({ agentId, onClose }: {agentId?: string;onClose: () => void;}) {
  const { db } = useData();
  const { state: s, set, attribution, workOrders, connections, effect, conflict, selfConflict, ready, submit } = useProposalForm(agentId, onClose);
  const pct = (v: string) => v.replace(/[^\d.]/g, '');
  const agentName = (id: string) => db.salesAgents.find((a) => a.id === id)?.name ?? id;

  return (
    <CrmDialog
      size="lg"
      title="Commission proposal"
      description="Sent to the Business Head (Sales Head) — the only authority that can approve, revise or reject commission rates. You cannot decide a proposal you prepare."
      onClose={onClose}
      submitLabel={s.selfSale ? 'Record Self-Sale' : 'Submit for approval'}
      submitDisabled={!ready}
      onSubmit={submit}>
      
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Sale type" className="grid gap-2 sm:grid-cols-2">
          {[
          { v: false, l: 'Agent-sourced', d: 'An agent introduced the customer and earns commission.' },
          { v: true, l: 'Self-Sale', d: 'Sold directly by IOL staff. No agent commission.' }].
          map((o) =>
          <label key={o.l} className={`cursor-pointer rounded-md border px-3 py-2 transition-colors duration-150 ${s.selfSale === o.v ? 'border-primary bg-primary-soft' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name="pp-kind" className="sr-only" checked={s.selfSale === o.v} onChange={() => set.setSelfSale(o.v)} />
              <span className="block text-[12.5px] font-semibold text-slate-900">{o.l}</span>
              <span className="block text-[11.5px] text-slate-500">{o.d}</span>
            </label>
          )}
        </div>

        <Section title="Agent, customer and salesperson">
          {!s.selfSale &&
          <FormField label="Agent" htmlFor="pp-agent" required>
              <select id="pp-agent" className={fieldInput} value={s.agentId} onChange={(e) => set.chooseAgent(e.target.value)} disabled={!!attribution}>
                <option value="">Choose…</option>
                {db.salesAgents.filter((a) => a.status === 'Active').map((a) =>
              <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
              )}
              </select>
            </FormField>
          }
          <FormField
            label="Customer"
            htmlFor="pp-cust"
            required
            error={selfConflict ? `Attributed to ${agentName(attribution!.agentId)}. Request a reassignment before recording a Self-Sale.` : conflict ? `Attributed to ${agentName(attribution!.agentId)} with ${userName(attribution!.salespersonId)} — a reassignment is needed first.` : undefined}
            help={attribution && !conflict && !selfConflict ? `Attributed to ${agentName(attribution.agentId)} with ${userName(attribution.salespersonId)}.` : !attribution && !s.selfSale && s.customerId ? 'No attribution yet — one is recorded with this proposal.' : undefined}>
            
            <select id="pp-cust" className={fieldInput} value={s.customerId} onChange={(e) => set.chooseCustomer(e.target.value)}>
              <option value="">Choose…</option>
              {db.customers.filter((c) => c.segment !== 'Associate').map((c) =>
              <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              )}
            </select>
          </FormField>
          <FormField label="Salesperson" htmlFor="pp-sp" required>
            <select id="pp-sp" className={fieldInput} value={s.salespersonId} disabled={!!attribution && !s.selfSale} onChange={(e) => set.setSalespersonId(e.target.value)}>
              <option value="">Choose…</option>
              {db.users.filter((u) => u.status === 'Active' && SALES_ROLES.includes(u.role)).map((u) =>
              <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              )}
            </select>
          </FormField>
          <FormField label="Work order to lock into" htmlFor="pp-wo" help="Optional now — can be linked after approval.">
            <select id="pp-wo" className={fieldInput} value={s.workOrderId} onChange={(e) => set.chooseWorkOrder(e.target.value)} disabled={!s.customerId}>
              <option value="">None yet</option>
              {workOrders.map((w) =>
              <option key={w.id} value={w.id}>
                  {w.id} · {w.type}
                </option>
              )}
            </select>
          </FormField>
        </Section>

        {!s.selfSale &&
        <>
            <Section title="Calculation base and rates">
              <FormField label="Commission basis" htmlFor="pp-basis" required>
                <select id="pp-basis" className={fieldInput} value={s.basis} onChange={(e) => set.setBasis(e.target.value as CommissionBasis)}>
                  {BASES.map((b) =>
                <option key={b}>{b}</option>
                )}
                </select>
              </FormField>
              <FormField label="Arrangement" htmlFor="pp-arr" required help={usesMrc(s.basis) ? undefined : 'OTC commission is always paid once.'}>
                <select id="pp-arr" className={fieldInput} value={s.arrangement} disabled={!usesMrc(s.basis)} onChange={(e) => set.setArrangement(e.target.value as 'One-time' | 'Recurring')}>
                  <option value="One-time">One-time (first month MRC)</option>
                  <option value="Recurring">Recurring (monthly)</option>
                </select>
              </FormField>
              {usesMrc(s.basis) &&
            <>
                  <FormField label="MRC base (BDT)" htmlFor="pp-mrc" required>
                    <div className="flex gap-2">
                      <input id="pp-mrc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={s.mrc} onChange={(e) => set.setMrc(e.target.value)} />
                      {connections.length > 0 &&
                  <select aria-label="Take MRC from connection" className={`${fieldInput} w-36`} value={s.connectionId} onChange={(e) => set.chooseConnection(e.target.value)}>
                          <option value="">From service…</option>
                          {connections.map((c) =>
                    <option key={c.id} value={c.id}>
                              {c.id}
                            </option>
                    )}
                        </select>
                  }
                    </div>
                  </FormField>
                  <FormField label="Proposed MRC rate (%)" htmlFor="pp-mp" required>
                    <input id="pp-mp" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={s.mrcPct} onChange={(e) => set.setMrcPct(pct(e.target.value))} />
                  </FormField>
                </>
            }
              {usesOtc(s.basis) &&
            <>
                  <FormField label="OTC base (BDT)" htmlFor="pp-otc" required>
                    <input id="pp-otc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={s.otc} onChange={(e) => set.setOtc(e.target.value)} />
                  </FormField>
                  <FormField label="Proposed OTC rate (%)" htmlFor="pp-op" required>
                    <input id="pp-op" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={s.otcPct} onChange={(e) => set.setOtcPct(pct(e.target.value))} />
                  </FormField>
                </>
            }
              {s.arrangement === 'Recurring' && usesMrc(s.basis) &&
            <FormField label="Recurring duration (months)" htmlFor="pp-months" required help="2–60 months.">
                  <input id="pp-months" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={s.months} onChange={(e) => set.setMonths(e.target.value.replace(/\D/g, ''))} />
                </FormField>
            }
            </Section>

            <Section title="Qualifying event and cancellation">
              <FormField label="Qualifying event" htmlFor="pp-ev" required help="Nothing accrues until this is confirmed.">
                <select id="pp-ev" className={fieldInput} value={s.event} onChange={(e) => set.setEvent(e.target.value as typeof s.event)}>
                  {QUALIFYING_EVENTS.map((x) =>
                <option key={x}>{x}</option>
                )}
                </select>
              </FormField>
              <FormField label="Cancellation / refund treatment" htmlFor="pp-ct" required>
                <select id="pp-ct" className={fieldInput} value={s.treatment} onChange={(e) => set.setTreatment(e.target.value as typeof s.treatment)}>
                  {CANCELLATION_TREATMENTS.map((x) =>
                <option key={x}>{x}</option>
                )}
                </select>
              </FormField>
              {s.treatment.startsWith('Reverse unpaid and') &&
            <FormField label="Clawback window (months after the event)" htmlFor="pp-cb" required>
                  <input id="pp-cb" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={s.clawback} onChange={(e) => set.setClawback(e.target.value.replace(/\D/g, ''))} />
                </FormField>
            }
            </Section>
          </>
        }

        <Section title="Validity">
          <FormField label="Valid from" htmlFor="pp-vf" required>
            <input id="pp-vf" type="date" className={fieldInput} value={s.validFrom} onChange={(e) => set.setValidFrom(e.target.value)} />
          </FormField>
          <FormField label="Valid to" htmlFor="pp-vt" required help={s.selfSale ? undefined : 'The qualifying event must happen in this window, inside the agent’s agreement.'}>
            <input id="pp-vt" type="date" className={fieldInput} value={s.validTo} onChange={(e) => set.setValidTo(e.target.value)} />
          </FormField>
        </Section>

        {!s.selfSale && effect.total > 0 && <EffectSummary effect={effect} />}
      </div>
    </CrmDialog>);

}