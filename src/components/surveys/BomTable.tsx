import React, { useState } from 'react';
import { PackageIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { AdminPanel, linkBtn, primaryBtn, secondaryBtn, tdClass, thClass } from '../admin/AdminPanel';
import { inputClass } from '../admin/FormField';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { availableStock, canEditTechnical, canReserveStock, lineQuantities, stockFor, unreserved, warehouseFor } from '../../utils/surveyRules';
import { OWNERSHIP_OPTIONS, SUPPLY_OPTIONS, type BomLine, type Ownership, type SupplyResponsibility } from '../../types/survey';
import type { Survey } from '../../types/records';

const cell = `${inputClass} h-8 text-[12px]`;

export function BomTable({ survey: s }: {survey: Survey;}) {
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const warehouse = warehouseFor(s);
  const editable = canEditTechnical(s, user, role);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<BomLine[]>(s.bom ?? []);
  const lines = editing ? rows : s.bom ?? [];
  const catalogue = db.stockItems.filter((x) => x.warehouse === warehouse);
  const reserver = canReserveStock(role) && s.status === 'Approved';

  const update = (id: string, patch: Partial<BomLine>) => setRows((p) => p.map((l) => l.id === id ? { ...l, ...patch } : l));
  const pickItem = (id: string, sku: string) => {
    const st = catalogue.find((x) => x.sku === sku);
    if (st) update(id, { sku: st.sku, item: st.name, unit: st.unit, unitCost: st.unitCost, pricedAt: st.pricedAt, supply: 'IOL stock' });else
    update(id, { sku: undefined, item: '', unitCost: 0, supply: 'IOL purchase' });
  };
  const addLine = () => {
    const first = catalogue[0];
    setRows((p) => [
    ...p,
    {
      id: `BL-${s.id.slice(-4)}-${Date.now().toString(36)}`, sku: first?.sku, item: first?.name ?? '', quantity: 1, unit: first?.unit ?? 'pc', unitCost: first?.unitCost ?? 0,
      pricedAt: first?.pricedAt ?? new Date().toISOString(), supply: first ? 'IOL stock' : 'IOL purchase', ownership: 'IOL-owned · consumed', reservedQty: 0
    }]
    );
  };
  const save = () => {
    if (runAction({ type: 'SURVEY_SAVE_TECH', surveyId: s.id, tech: s.tech ?? {}, bom: rows })) setEditing(false);
  };

  return (
    <AdminPanel
      title="Bill of materials"
      description={`Estimate from the survey, checked against ${warehouse}. An estimate never reduces physical stock — only reservations, issues and returns by Inventory change stock figures.`}
      actions={
      editing ?
      <>
            <button type="button" className={secondaryBtn} onClick={() => {setRows(s.bom ?? []);setEditing(false);}}>
              Discard
            </button>
            <button type="button" className={primaryBtn} onClick={save}>
              Save BOM
            </button>
          </> :

      editable &&
      <button type="button" className={secondaryBtn} onClick={() => {setRows(s.bom ?? []);setEditing(true);}}>
              Edit BOM
            </button>


      }>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              <th className={`${thClass} text-right`}>Estimated</th>
              <th className={`${thClass} text-right`}>Available stock</th>
              <th className={`${thClass} text-right`}>Est. unit cost · priced</th>
              <th className={thClass}>Supply</th>
              <th className={thClass}>Ownership · returnability</th>
              <th className={`${thClass} text-right`}>Reserved</th>
              <th className={`${thClass} text-right`}>Issued</th>
              <th className={`${thClass} text-right`}>Installed</th>
              <th className={`${thClass} text-right`}>Returned</th>
              {(editing || reserver) && <th className={thClass}><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 &&
            <tr>
                <td colSpan={11} className={`${tdClass} py-8 text-center text-slate-500`}>
                  {s.status === 'Not Feasible' ? 'No materials — site not feasible.' : 'No BOM lines yet.'}
                </td>
              </tr>
            }
            {lines.map((l) => {
              const st = stockFor(db, l.sku, warehouse);
              const q = lineQuantities(db, s, l);
              const short = st && l.supply === 'IOL stock' && availableStock(st) < unreserved(db, s, l);
              return (
                <tr key={l.id}>
                  <td className={tdClass}>
                    {editing ?
                    <div className="flex min-w-[240px] flex-col gap-1">
                        <select aria-label="Stock item" className={cell} value={l.sku ?? ''} onChange={(e) => pickItem(l.id, e.target.value)}>
                          {catalogue.map((c) =>
                        <option key={c.sku} value={c.sku}>
                              {c.name}
                            </option>
                        )}
                          <option value="">Other item (not stocked)</option>
                        </select>
                        {!l.sku && <input aria-label="Item description" className={cell} value={l.item} onChange={(e) => update(l.id, { item: e.target.value })} placeholder="Describe the item" />}
                      </div> :

                    <span>
                        <span className="block font-semibold text-slate-900">{l.item}</span>
                        <span className="block text-[10.5px] text-slate-400">{l.sku ?? 'Not a stock item'}</span>
                      </span>
                    }
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {editing ?
                    <span className="inline-flex items-center gap-1">
                        <input aria-label="Quantity" inputMode="decimal" className={`${cell} w-20 text-right`} value={l.quantity} onChange={(e) => update(l.id, { quantity: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} />
                        {l.sku ? <span className="w-8 text-left text-[11px] text-slate-500">{l.unit}</span> : <input aria-label="Unit" className={`${cell} w-14`} value={l.unit} onChange={(e) => update(l.id, { unit: e.target.value })} />}
                      </span> :

                    `${l.quantity.toLocaleString('en-IN')} ${l.unit}`
                    }
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {st ?
                    <span className={short ? 'font-semibold text-status-critical' : ''}>
                        {availableStock(st).toLocaleString('en-IN')} {st.unit}
                        <span className="block text-[10.5px] font-normal text-slate-400">
                          {st.onHand.toLocaleString('en-IN')} on hand · {st.reserved.toLocaleString('en-IN')} reserved
                        </span>
                      </span> :

                    <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {editing ?
                    <input aria-label="Unit cost" inputMode="decimal" className={`${cell} w-24 text-right`} value={l.unitCost} onChange={(e) => update(l.id, { unitCost: Number(e.target.value.replace(/[^\d.]/g, '')) || 0, pricedAt: new Date().toISOString() })} /> :

                    <span>
                        {formatBDT(l.unitCost)}
                        <span className="block text-[10.5px] text-slate-400">{formatDhakaDate(l.pricedAt)}</span>
                      </span>
                    }
                  </td>
                  <td className={tdClass}>
                    {editing ?
                    <select aria-label="Supply responsibility" className={cell} value={l.supply} onChange={(e) => update(l.id, { supply: e.target.value as SupplyResponsibility })}>
                        {SUPPLY_OPTIONS.map((o) =>
                      <option key={o}>{o}</option>
                      )}
                      </select> :

                    l.supply
                    }
                  </td>
                  <td className={tdClass}>
                    {editing ?
                    <select aria-label="Ownership" className={cell} value={l.ownership} onChange={(e) => update(l.id, { ownership: e.target.value as Ownership })}>
                        {OWNERSHIP_OPTIONS.map((o) =>
                      <option key={o}>{o}</option>
                      )}
                      </select> :

                    <span className="text-[11.5px]">{l.ownership}</span>
                    }
                  </td>
                  <Qty v={q.reserved} unit={l.unit} />
                  <Qty v={q.issued} unit={l.unit} />
                  <Qty v={q.installed} unit={l.unit} />
                  <Qty v={q.returned} unit={l.unit} />
                  {(editing || reserver) &&
                  <td className={tdClass}>
                      {editing ?
                    <button type="button" aria-label={`Remove ${l.item || 'line'}`} onClick={() => setRows((p) => p.filter((x) => x.id !== l.id))} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-status-critical">
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button> :

                    l.sku &&
                    l.supply === 'IOL stock' &&
                    unreserved(db, s, l) > 0 &&
                    <button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={() => runAction({ type: 'SURVEY_RESERVE', surveyId: s.id, lineId: l.id })}>
                            <PackageIcon className="h-3 w-3" aria-hidden /> Reserve {unreserved(db, s, l).toLocaleString('en-IN')}
                          </button>

                    }
                    </td>
                  }
                </tr>);

            })}
          </tbody>
        </table>
      </div>
      {editing &&
      <div className="border-t border-slate-100 px-4 py-2.5">
          <button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={addLine}>
            <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add line
          </button>
        </div>
      }
      <p className="border-t border-slate-100 px-4 py-2 text-[10.5px] text-slate-400">
        Estimated = survey quantity · Reserved = held by Inventory, still on hand · Issued = moved to the installation job · Installed = issued less returned on completed jobs · Returned = brought back to stock.
      </p>
    </AdminPanel>);

}

function Qty({ v, unit }: {v: number;unit: string;}) {
  return <td className={`${tdClass} text-right tabular-nums ${v === 0 ? 'text-slate-300' : ''}`}>{v === 0 ? '0' : `${v.toLocaleString('en-IN')} ${unit}`}</td>;
}