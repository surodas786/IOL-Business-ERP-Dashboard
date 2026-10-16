import React from 'react';
import { useData } from '../../contexts/DataContext';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { WAREHOUSES, itemOf, stockOf, stockPosition } from '../../utils/inventoryRules';

interface Props {
  sku: string;
  warehouse: string;
  quantity: string;
  onSku: (v: string) => void;
  onWarehouse: (v: string) => void;
  onQuantity: (v: string) => void;
  warehouseLabel?: string;
}

/** Item, warehouse and quantity with the live position, so the user sees what is available before submitting. */
export function ItemWarehouseFields({ sku, warehouse, quantity, onSku, onWarehouse, onQuantity, warehouseLabel = 'Warehouse' }: Props) {
  const { db } = useData();
  const item = itemOf(db, sku);
  const stock = stockOf(db, sku, warehouse);
  const pos = stock ? stockPosition(db, stock) : undefined;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Item" htmlFor="iw-item" required className="sm:col-span-2">
          <select id="iw-item" className={fieldInput} value={sku} onChange={(e) => onSku(e.target.value)}>
            {db.inventoryItems.
            filter((i) => i.active).
            map((i) =>
            <option key={i.sku} value={i.sku}>
                  {i.name} ({i.sku})
                </option>
            )}
          </select>
        </FormField>
        <FormField label={`Quantity${item ? ` (${item.unit})` : ''}`} htmlFor="iw-qty" required>
          <input id="iw-qty" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={quantity} onChange={(e) => onQuantity(e.target.value.replace(/\D/g, ''))} />
        </FormField>
        <FormField label={warehouseLabel} htmlFor="iw-wh" required className="sm:col-span-3">
          <select id="iw-wh" className={fieldInput} value={warehouse} onChange={(e) => onWarehouse(e.target.value)}>
            {WAREHOUSES.map((w) =>
            <option key={w}>{w}</option>
            )}
          </select>
        </FormField>
      </div>
      <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] tabular-nums text-slate-600">
        {pos ?
        <>
            On hand <span className="font-semibold text-slate-900">{pos.onHand}</span> · reserved {pos.reserved} · available <span className="font-semibold text-slate-900">{pos.available}</span> {item?.unit}
          </> :

        `No ${item?.name ?? 'stock'} held at ${warehouse}.`
        }
      </p>
    </>);

}