import React, { useState } from 'react';
import { AlertTriangleIcon, SearchIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useWarehouseScope } from '../../hooks/useWarehouseScope';
import { itemOf, stockPosition } from '../../utils/inventoryRules';
import { inputClass } from '../admin/FormField';
import { tdClass, thClass } from '../admin/AdminPanel';
import { FilterPills } from '../billing/FilterPills';

const COLS: {key: 'onHand' | 'reserved' | 'available' | 'withTechnician' | 'installed' | 'returned' | 'damaged';label: string;hint: string;}[] = [
{ key: 'onHand', label: 'On hand', hint: 'Physically in the warehouse' },
{ key: 'reserved', label: 'Reserved', hint: 'Held for jobs; still on hand' },
{ key: 'available', label: 'Available', hint: 'On hand minus reserved' },
{ key: 'withTechnician', label: 'With technicians', hint: 'Issued, not yet installed or returned' },
{ key: 'installed', label: 'Installed', hint: 'Deployed at customer sites' },
{ key: 'returned', label: 'Returned', hint: 'Received back and inspected (cumulative)' },
{ key: 'damaged', label: 'Damaged / lost', hint: 'Written off after inspection or approved adjustment' }];


export function StockView() {
  const { db } = useData();
  const { warehouses } = useWarehouseScope();
  const [wh, setWh] = useState<string>('all');
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const shown = wh === 'all' ? warehouses : warehouses.filter((w) => w === wh);
  const s = q.trim().toLowerCase();
  const rows = db.stockItems.
  filter((x) => shown.includes(x.warehouse) && (!s || `${x.sku} ${x.name}`.toLowerCase().includes(s))).
  map((x) => {
    const item = itemOf(db, x.sku);
    const pos = stockPosition(db, x);
    return { x, item, pos, low: !!item && pos.available <= item.reorderLevel };
  }).
  filter((r) => !lowOnly || r.low).
  sort((a, b) => a.x.name.localeCompare(b.x.name) || a.x.warehouse.localeCompare(b.x.warehouse));
  const lowCount = rows.filter((r) => r.low).length;

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
        <FilterPills label="Warehouse" options={[{ id: 'all', label: 'All warehouses' }, ...warehouses.map((w) => ({ id: w, label: w.replace(' Warehouse', '') }))]} value={wh} onChange={setWh} />
        <div className="relative ml-auto min-w-[220px]">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input aria-label="Search items" placeholder="Item or SKU…" className={`${inputClass} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          At or below reorder level
        </label>
      </div>
      {lowCount > 0 && !lowOnly &&
      <p className="flex items-center gap-2 border-b border-slate-100 bg-amber-50 px-4 py-2 text-[12px] text-slate-800">
          <AlertTriangleIcon className="h-3.5 w-3.5 text-status-warning" aria-hidden /> {lowCount} stock line{lowCount === 1 ? '' : 's'} at or below the reorder level. Purchasing itself is outside this demo.
        </p>
      }
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px]">
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              <th className={thClass}>Warehouse</th>
              {COLS.map((c) =>
              <th key={c.key} title={c.hint} className={`${thClass} text-right ${c.key === 'available' ? 'text-slate-600' : ''}`}>
                  {c.label}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ x, item, pos, low }) =>
            <tr key={x.id}>
                <td className={tdClass}>
                  <span className="block font-semibold text-slate-900">{x.name}</span>
                  <span className="font-mono text-[10.5px] text-slate-400">{x.sku}</span>
                  <span className="ml-2 text-[10.5px] text-slate-500">{item?.tracking === 'Serial' ? 'Serial-tracked' : 'Quantity'}</span>
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>{x.warehouse.replace(' Warehouse', '')}</td>
                {COLS.map((c) =>
              <td key={c.key} className={`${tdClass} text-right tabular-nums ${c.key === 'available' ? `font-bold ${low ? 'text-status-warning' : 'text-slate-900'}` : pos[c.key] === 0 ? 'text-slate-300' : ''}`}>
                    {pos[c.key].toLocaleString('en-IN')}
                    {c.key === 'onHand' && <span className="ml-0.5 text-[10px] text-slate-400">{x.unit}</span>}
                    {c.key === 'returned' && pos.awaitingInspection > 0 && <span className="block text-[10px] font-semibold text-status-warning">+{pos.awaitingInspection} to inspect</span>}
                  </td>
              )}
              </tr>
            )}
            {rows.length === 0 &&
            <tr>
                <td colSpan={COLS.length + 2} className={`${tdClass} py-8 text-center text-slate-500`}>
                  No stock lines match.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">Reservations reduce available, never on-hand. Issues reduce on-hand. Returns are restocked only after inspection.</p>
    </section>);

}