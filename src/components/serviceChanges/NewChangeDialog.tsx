import React from 'react';
import { InfoIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { formatBDT } from '../../utils/format';
import { nextId } from '../../utils/relations';
import { TYPE_HINT, currentService } from '../../utils/serviceChangeRules';
import { useChangeRequestForm } from './useChangeRequestForm';
import type { CostBearer } from '../../types/serviceChange';

const money = (v: string) => v.replace(/[^\d]/g, '');

export function NewChangeDialog({ onClose, presetCustomerId }: {onClose: () => void;presetCustomerId?: string;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const navigate = useNavigate();
  const f = useChangeRequestForm(presetCustomerId);
  const q = f.query.trim().toLowerCase();
  const matches = f.customers.filter((c) => !q || [c.id, c.name, c.nameBn].join(' ').toLowerCase().includes(q)).slice(0, 8);
  const customer = db.customers.find((c) => c.id === f.customerId);
  const t = f.type;
  const tariff = t === 'Upgrade' || t === 'Downgrade';

  const submit = () => {
    if (!f.input) return;
    // Same id generator the workflow uses, so we can open the new record straight away.
    const id = nextId(db.serviceChanges, 'SC-2026-', 4);
    if (runAction({ type: 'SC_REQUEST', ...f.input })) {
      onClose();
      navigate(`/service-changes/records/${id}`);
    }
  };

  return (
    <CrmDialog size="lg" title="Request a service change" description="Start from an existing customer and one of their services. No new customer profile is created." onClose={onClose} submitLabel="Raise request" submitDisabled={!f.ready} onSubmit={submit}>
      {!customer ?
      <FormField label="Existing customer" htmlFor="sc-cust" required help="Only customers with a live service in your scope are listed.">
          <input id="sc-cust" className={fieldInput} placeholder="Search by name (English or বাংলা) or ID…" value={f.query} onChange={(e) => f.setQuery(e.target.value)} autoFocus />
          <ul className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {matches.map((c) =>
          <li key={c.id}>
                <button type="button" onClick={() => f.setCustomerId(c.id)} className="w-full px-3 py-2 text-left text-[12.5px] transition-colors duration-150 hover:bg-slate-50">
                  <span className="font-semibold text-slate-900">{c.name}</span> <span className="text-slate-500">· {c.id}</span>
                  <span className="block text-[11px] text-slate-500">{c.nameBn}</span>
                </button>
              </li>
          )}
            {matches.length === 0 && <li className="px-3 py-2 text-[12px] text-slate-500">No matching customer with a live service.</li>}
          </ul>
        </FormField> :

      <div className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-3 py-2.5">
          <div>
            <p className="text-[13px] font-semibold text-slate-900">{customer.name}</p>
            <p className="text-[11.5px] text-slate-500">
              {customer.id} · existing profile — the change is recorded here
            </p>
          </div>
          {!presetCustomerId &&
        <button type="button" className="text-[11.5px] font-semibold text-primary hover:text-primary-hover" onClick={() => f.setCustomerId('')}>
              Change
            </button>
        }
        </div>
      }

      {customer &&
      <>
          <FormField label="Service" htmlFor="sc-conn" required>
            <select id="sc-conn" className={fieldInput} value={f.conn?.id ?? ''} onChange={(e) => f.setConnectionId(e.target.value)}>
              {!f.conn && <option value="">Choose a service…</option>}
              {f.services.map((c) =>
            <option key={c.id} value={c.id}>
                  {c.id} — {currentService(db, c)}
                  {c.status !== 'Active' ? ` (${c.status})` : ''}
                </option>
            )}
            </select>
          </FormField>

          {f.conn &&
        <>
              <fieldset>
                <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Requested change</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {f.allowedTypes.map((x) =>
              <label key={x} className={`cursor-pointer rounded-md border px-3 py-2 transition-colors duration-150 ${t === x ? 'border-primary bg-primary-soft' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="sc-type" className="sr-only" checked={t === x} onChange={() => f.setType(x)} />
                      <span className="block text-[12.5px] font-semibold text-slate-900">{x}</span>
                      <span className="block text-[11px] leading-snug text-slate-500">{TYPE_HINT[x]}</span>
                    </label>
              )}
                </div>
                {f.conn.status === 'Temporarily Stopped' && <p className="mt-1.5 text-[11.5px] text-slate-500">This service is temporarily stopped{f.activeStop ? ` (${f.activeStop.id})` : ''}; it can only be resumed or discontinued.</p>}
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t === 'Temporary Stop' ? 'Stop from (requested)' : t === 'Discontinuation' ? 'Requested service stop date' : 'Requested date'} htmlFor="sc-date" required help="The approver sets the effective date.">
                  <input id="sc-date" type="date" className={fieldInput} value={f.requestedDate} onChange={(e) => f.setRequestedDate(e.target.value)} />
                </FormField>
                {tariff &&
            <FormField label="Revised bandwidth (Mbps)" htmlFor="sc-bw" required help={`Currently ${f.conn.bandwidthMbps} Mbps`}>
                    <input id="sc-bw" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.toBandwidth} onChange={(e) => f.setToBandwidth(money(e.target.value))} />
                  </FormField>
            }
                {t === 'Temporary Stop' &&
            <FormField label="Expected resumption" htmlFor="sc-resume" required help="A reminder is raised two days before. Reactivation still needs verification.">
                    <input id="sc-resume" type="date" className={fieldInput} value={f.expectedResumption} onChange={(e) => f.setExpectedResumption(e.target.value)} />
                  </FormField>
            }
              </div>

              {t === 'Shifting' &&
          <fieldset className="space-y-3 rounded-md border border-slate-200 p-3">
                  <legend className="px-1 text-[12px] font-semibold text-slate-700">Destination site</legend>
                  <FormField label="Destination" htmlFor="sc-dest">
                    <select id="sc-dest" className={fieldInput} value={f.destSiteId} onChange={(e) => f.setDestSiteId(e.target.value)}>
                      <option value="">New site for {customer.name}</option>
                      {f.otherSites.map((s) =>
                <option key={s.id} value={s.id}>
                          {s.name} — {s.address}
                        </option>
                )}
                    </select>
                  </FormField>
                  {!f.destSiteId &&
            <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Site name" htmlFor="sc-dn" required>
                        <input id="sc-dn" className={fieldInput} value={f.destName} onChange={(e) => f.setDestName(e.target.value)} />
                      </FormField>
                      <FormField label="Site contact" htmlFor="sc-dc">
                        <input id="sc-dc" className={fieldInput} value={f.destContact} onChange={(e) => f.setDestContact(e.target.value)} />
                      </FormField>
                      <FormField label="Address" htmlFor="sc-da" required className="sm:col-span-2">
                        <input id="sc-da" className={fieldInput} value={f.destAddress} onChange={(e) => f.setDestAddress(e.target.value)} />
                      </FormField>
                      <FormField label="Contact phone" htmlFor="sc-dp">
                        <input id="sc-dp" className={fieldInput} value={f.destPhone} onChange={(e) => f.setDestPhone(e.target.value)} />
                      </FormField>
                    </div>
            }
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Equipment movement" htmlFor="sc-em">
                      <input id="sc-em" className={fieldInput} value={f.equipmentMovement} onChange={(e) => f.setEquipmentMovement(e.target.value)} placeholder="e.g. ONT and router moved, 120 m new drop" />
                    </FormField>
                    <FormField label="Expected interruption (hours)" htmlFor="sc-int">
                      <input id="sc-int" inputMode="numeric" className={fieldInput} value={f.interruptionHours} onChange={(e) => f.setInterruptionHours(money(e.target.value))} />
                    </FormField>
                  </div>
                </fieldset>
          }

              {(tariff || t === 'Shifting') &&
          <FormField label="Who bears new equipment cost?" htmlFor="sc-bearer" required>
                  <select id="sc-bearer" className={fieldInput} value={f.costBearer} onChange={(e) => f.setCostBearer(e.target.value as CostBearer)}>
                    <option>No new equipment</option>
                    <option value="IOL">IOL funds it</option>
                    <option value="Customer">Customer pays</option>
                  </select>
                </FormField>
          }

              {f.fin && t !== 'Resumption' &&
          <fieldset className="space-y-3 rounded-md border border-slate-200 p-3">
                  <legend className="px-1 text-[12px] font-semibold text-slate-700">Commercial impact</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tariff &&
              <FormField label="Revised MRC (BDT)" htmlFor="sc-mrc" required help={`Currently ${formatBDT(f.conn.mrc)}`}>
                        <input id="sc-mrc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.toMrc} onChange={(e) => f.setToMrc(money(e.target.value))} />
                      </FormField>
              }
                    {f.costBearer === 'IOL' && (tariff || t === 'Shifting') &&
              <FormField label="Equipment cost IOL funds (BDT)" htmlFor="sc-eq" required>
                        <input id="sc-eq" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.equipmentCost} onChange={(e) => f.setEquipmentCost(money(e.target.value))} />
                      </FormField>
              }
                    {tariff &&
              <FormField label="One-time change charge (BDT)" htmlFor="sc-otc">
                        <input id="sc-otc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.upgradeCharge} onChange={(e) => f.setUpgradeCharge(money(e.target.value))} />
                      </FormField>
              }
                    {t === 'Shifting' &&
              <FormField label="Relocation charge (BDT)" htmlFor="sc-rel">
                        <input id="sc-rel" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.relocationCharge} onChange={(e) => f.setRelocationCharge(money(e.target.value))} />
                      </FormField>
              }
                    {tariff &&
              <FormField label="Change in recurring delivery cost / month" htmlFor="sc-rc" help="Upstream or NTTN. Use a minus sign for savings.">
                        <input id="sc-rc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.recurringCostDelta} onChange={(e) => f.setRecurringCostDelta(e.target.value.replace(/[^\d-]/g, ''))} />
                      </FormField>
              }
                    {t === 'Temporary Stop' &&
              <FormField label="Continuing charge while stopped (BDT / month)" htmlFor="sc-cc" help="Enter 0 if nothing is charged.">
                        <input id="sc-cc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.continuingCharge} onChange={(e) => f.setContinuingCharge(money(e.target.value))} />
                      </FormField>
              }
                  </div>
                  <FormField label="Commercial impact summary" htmlFor="sc-cs" help="At least 10 characters. Can also be added later before approval.">
                    <textarea id="sc-cs" rows={2} className={fieldTextarea} value={f.commercialSummary} onChange={(e) => f.setCommercialSummary(e.target.value)} />
                  </FormField>
                </fieldset>
          }
              {!f.fin && t !== 'Resumption' &&
          <p className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                  <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Commercial terms are added by the Account Manager or Accounts before approval.
                </p>
          }

              <FormField label="Reason" htmlFor="sc-reason" required help="At least 10 characters. Bangla or English.">
                <textarea id="sc-reason" rows={2} className={fieldTextarea} value={f.reason} onChange={(e) => f.setReason(e.target.value)} />
              </FormField>
            </>
        }
        </>
      }
    </CrmDialog>);

}