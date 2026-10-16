import React, { useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatBDT, formatDhakaDate } from '../../utils/format';
import { AdminPanel, tdClass, thClass } from '../admin/AdminPanel';
import { fieldInput } from '../field/fieldStyles';

export function VendorPricesView({ initialSku }: {initialSku?: string;}) {
  const { db } = useData();
  const priced = db.inventoryItems.filter((i) => db.vendorPrices.some((p) => p.sku === i.sku));
  const [sku, setSku] = useState(initialSku ?? priced[0]?.sku ?? '');
  const item = db.inventoryItems.find((i) => i.sku === sku);
  const history = db.vendorPrices.filter((p) => p.sku === sku).sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  const lowest = Math.min(...history.map((p) => p.unitPrice));
  const vendorName = (id: string) => db.vendors.find((v) => v.id === id)?.name ?? id;
  const latestByVendor = Array.from(new Set(history.map((p) => p.vendorId))).map((v) => history.find((p) => p.vendorId === v)!);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm">
          <label htmlFor="vp-item" className="mb-1.5 block text-[12px] font-semibold text-slate-700">
            Item
          </label>
          <select id="vp-item" className={fieldInput} value={sku} onChange={(e) => setSku(e.target.value)}>
            {priced.map((i) =>
            <option key={i.sku} value={i.sku}>
                {i.name} ({i.sku})
              </option>
            )}
          </select>
        </div>
        <p className="flex items-center gap-1.5 pb-2 text-[11.5px] text-slate-500">
          <InfoIcon className="h-3.5 w-3.5" aria-hidden /> Price points come from receipts. Purchase orders, vendor onboarding and payments are outside the demo.
        </p>
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AdminPanel title={`Purchase history · ${item?.name ?? ''}`} description="Newest first. Change is against the previous purchase of this item.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr>
                  <th className={thClass}>Purchase date</th>
                  <th className={thClass}>Vendor</th>
                  <th className={`${thClass} text-right`}>Quantity</th>
                  <th className={`${thClass} text-right`}>Unit price</th>
                  <th className={`${thClass} text-right`}>Change</th>
                  <th className={thClass}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p, i) => {
                  const prev = history[i + 1];
                  const delta = prev ? (p.unitPrice - prev.unitPrice) / prev.unitPrice * 100 : null;
                  return (
                    <tr key={p.id}>
                      <td className={`${tdClass} whitespace-nowrap`}>{formatDhakaDate(p.purchasedAt)}</td>
                      <td className={tdClass}>{vendorName(p.vendorId)}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {p.quantity.toLocaleString('en-IN')} <span className="text-[10.5px] text-slate-400">{item?.unit}</span>
                      </td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums ${p.unitPrice === lowest ? 'text-status-ok' : 'text-slate-900'}`}>
                        {formatBDT(p.unitPrice)}
                        {p.unitPrice === lowest && <span className="block text-[10px] font-normal">Lowest paid</span>}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums ${delta === null ? 'text-slate-300' : delta > 0 ? 'text-status-critical' : delta < 0 ? 'text-status-ok' : ''}`}>
                        {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
                      </td>
                      <td className={`${tdClass} font-mono text-[11px]`}>{p.reference}</td>
                    </tr>);

                })}
              </tbody>
            </table>
          </div>
        </AdminPanel>
        <AdminPanel title="Bulk pricing by vendor" description="Latest quoted price breaks from each vendor.">
          <ul className="divide-y divide-slate-100">
            {latestByVendor.map((p) =>
            <li key={p.vendorId} className="px-4 py-3">
                <p className="text-[12.5px] font-semibold text-slate-900">{vendorName(p.vendorId)}</p>
                <p className="text-[11px] text-slate-500">As of {formatDhakaDate(p.purchasedAt)}</p>
                {p.breaks.length ?
              <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 text-[12px]">
                    {p.breaks.map((b) =>
                <React.Fragment key={b.minQty}>
                        <dt className="text-slate-600">
                          {b.minQty.toLocaleString('en-IN')}+ {item?.unit}
                        </dt>
                        <dd className="text-right font-semibold tabular-nums text-slate-900">{formatBDT(b.unitPrice)}</dd>
                      </React.Fragment>
                )}
                  </dl> :

              <p className="mt-1 text-[12px] text-slate-500">No price breaks quoted.</p>
              }
              </li>
            )}
          </ul>
        </AdminPanel>
      </div>
    </div>);

}