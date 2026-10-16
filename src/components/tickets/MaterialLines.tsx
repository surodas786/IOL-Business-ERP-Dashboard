import React from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { stockOf, stockPosition, warehouseForBranch } from '../../utils/inventoryRules';
import { inputClass } from '../admin/FormField';
import { linkBtn } from '../admin/AdminPanel';
import type { Ticket } from '../../types/records';

export interface MaterialDraft {
  key: number;
  sku: string;
  source: 'Technician stock' | 'Warehouse';
  quantity: string;
  serials: string[];
}

/** Materials used on the ticket, drawn from the technician's issued stock or issued now from the branch warehouse. */
export function MaterialLines({ ticket: t, lines, onChange }: {ticket: Ticket;lines: MaterialDraft[];onChange: (l: MaterialDraft[]) => void;}) {
  const { db } = useData();
  const warehouse = warehouseForBranch(t.branchId);
  const items = db.inventoryItems.filter((i) => i.active);
  const set = (key: number, patch: Partial<MaterialDraft>) => onChange(lines.map((l) => l.key === key ? { ...l, ...patch } : l));

  return (
    <div className="space-y-2">
      {lines.map((l) => {
        const item = items.find((i) => i.sku === l.sku);
        const serial = item?.tracking === 'Serial';
        const st = stockOf(db, l.sku, warehouse);
        const pos = st ? stockPosition(db, st) : undefined;
        const pool = serial ?
        db.equipmentUnits.filter((u) => u.sku === l.sku && (l.source === 'Technician stock' ? u.status === 'Issued' && u.technicianName === t.assigneeName : u.status === 'In Stock' && u.warehouse === warehouse)) :
        [];
        const availableQty = l.source === 'Technician stock' ? pos?.withTechnician ?? 0 : pos?.available ?? 0;
        return (
          <div key={l.key} className="rounded-md border border-slate-200 p-2.5">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px_90px_auto] sm:items-center">
              <select aria-label="Item" className={inputClass} value={l.sku} onChange={(e) => set(l.key, { sku: e.target.value, serials: [], quantity: '1' })}>
                <option value="">Choose item…</option>
                {items.map((i) =>
                <option key={i.sku} value={i.sku}>
                    {i.name} ({i.tracking === 'Serial' ? 'serial' : i.unit})
                  </option>
                )}
              </select>
              <select aria-label="Source" className={inputClass} value={l.source} onChange={(e) => set(l.key, { source: e.target.value as MaterialDraft['source'], serials: [] })}>
                <option value="Technician stock">From {t.assigneeName ?? 'technician'}’s stock</option>
                <option value="Warehouse">Issue now from {warehouse}</option>
              </select>
              {serial ?
              <span className="text-[11.5px] tabular-nums text-slate-600">{l.serials.length} selected</span> :

              <input aria-label="Quantity" inputMode="decimal" className={`${inputClass} tabular-nums`} value={l.quantity} onChange={(e) => set(l.key, { quantity: e.target.value.replace(/[^\d.]/g, '') })} />
              }
              <button type="button" aria-label="Remove line" className="justify-self-end rounded p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700" onClick={() => onChange(lines.filter((x) => x.key !== l.key))}>
                <Trash2Icon className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {item && !serial &&
            <p className="mt-1.5 text-[11px] text-slate-500">
                {l.source === 'Technician stock' ? `${availableQty} ${item.unit} recorded as with technicians from ${warehouse}` : `${availableQty} ${item.unit} available (on hand less reserved) at ${warehouse}`}
              </p>
            }
            {serial &&
            <div className="mt-2">
                {pool.length ?
              <div role="group" aria-label="Serials" className="flex flex-wrap gap-1.5">
                    {pool.map((u) => {
                  const on = l.serials.includes(u.serial);
                  return (
                    <label key={u.id} className={`inline-flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors duration-150 ${on ? 'border-primary bg-primary-soft text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={() => set(l.key, { serials: on ? l.serials.filter((s) => s !== u.serial) : [...l.serials, u.serial] })} />
                          {u.serial}
                        </label>);

                })}
                  </div> :

              <p className="text-[11px] text-status-warning">{l.source === 'Technician stock' ? `No ${item?.name} serials are issued to ${t.assigneeName}. Choose “Issue now from warehouse”.` : `No ${item?.name} in stock at ${warehouse}.`}</p>
              }
              </div>
            }
          </div>);

      })}
      <button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={() => onChange([...lines, { key: Date.now(), sku: '', source: 'Technician stock', quantity: '1', serials: [] }])}>
        <PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add material
      </button>
    </div>);

}