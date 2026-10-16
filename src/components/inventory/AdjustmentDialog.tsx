import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';
import { ItemWarehouseFields } from './ItemWarehouseFields';
import { SerialEntry } from './SerialEntry';
import { WAREHOUSES, isSerial } from '../../utils/inventoryRules';
import { ADJUSTMENT_KINDS, type AdjustmentKind } from '../../types/inventory';

const HINT: Record<AdjustmentKind, string> = {
  Damaged: 'Reduces on-hand and records the items as damaged.',
  Lost: 'Reduces on-hand. For serials, also covers units lost with a technician or at a site.',
  Found: 'Adds stock that was missing from the record. New serials only.',
  'Count correction': 'Brings the record in line with a physical count.'
};

export function AdjustmentDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [sku, setSku] = useState(db.inventoryItems[0]?.sku ?? '');
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [qty, setQty] = useState('');
  const [kind, setKind] = useState<AdjustmentKind>('Damaged');
  const [direction, setDirection] = useState<'Increase' | 'Decrease'>('Decrease');
  const [serials, setSerials] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const serial = isSerial(db, sku);
  const q = Number(qty);
  const dir = kind === 'Found' ? 'Increase' : kind === 'Count correction' ? direction : 'Decrease';
  const suggestions = dir === 'Decrease' ? db.equipmentUnits.filter((u) => u.sku === sku && (u.status === 'In Stock' && u.warehouse === warehouse || kind === 'Lost' && ['Issued', 'Receivable'].includes(u.status))).map((u) => u.serial) : [];

  return (
    <CrmDialog
      size="lg"
      title="Request a stock adjustment"
      description="Adjustments need a reason and Finance Approver approval. Stock changes only once approved, and can never go negative or below what is reserved."
      onClose={onClose}
      submitLabel="Send for approval"
      submitDisabled={!q || reason.trim().length < 20 || serial && serials.length !== q}
      onSubmit={() => runAction({ type: 'INV_REQUEST_ADJUSTMENT', sku, warehouse, kind, direction: dir, quantity: q, serials: serial ? serials : [], reason }) && onClose()}>
      
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Type</legend>
        <div className="grid gap-2 sm:grid-cols-4">
          {ADJUSTMENT_KINDS.map((k) =>
          <label key={k} className={`cursor-pointer rounded-md border px-3 py-2 transition-colors duration-150 ${kind === k ? 'border-primary bg-primary-soft' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name="adj-kind" className="sr-only" checked={kind === k} onChange={() => {setKind(k);setSerials([]);}} />
              <span className="block text-[12.5px] font-semibold text-slate-900">{k}</span>
            </label>
          )}
        </div>
        <p className="mt-1.5 text-[11.5px] text-slate-500">{HINT[kind]}</p>
      </fieldset>
      {kind === 'Count correction' &&
      <div className="flex gap-4 text-[12.5px]">
          {(['Decrease', 'Increase'] as const).map((d) =>
        <label key={d} className="flex items-center gap-2">
              <input type="radio" name="adj-dir" className="accent-primary" checked={direction === d} onChange={() => {setDirection(d);setSerials([]);}} />
              {d === 'Decrease' ? 'Fewer than recorded' : 'More than recorded'}
            </label>
        )}
        </div>
      }
      <ItemWarehouseFields sku={sku} warehouse={warehouse} quantity={qty} onSku={(v) => {setSku(v);setSerials([]);}} onWarehouse={(v) => {setWarehouse(v);setSerials([]);}} onQuantity={setQty} />
      {serial && <SerialEntry id="adj-serials" value={serials} onChange={setSerials} expected={q} suggestions={suggestions} />}
      <FormField label="Reason" htmlFor="adj-reason" required help="At least 20 characters. Seen by the approver and kept in the audit history.">
        <textarea id="adj-reason" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
    </CrmDialog>);

}