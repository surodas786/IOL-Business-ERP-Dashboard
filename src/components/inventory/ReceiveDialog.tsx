import React, { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { linkBtn } from '../admin/AdminPanel';
import { SerialEntry } from './SerialEntry';
import { WAREHOUSES, itemOf } from '../../utils/inventoryRules';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';

const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0;

export function ReceiveDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const items = db.inventoryItems.filter((i) => i.active);
  const [sku, setSku] = useState(items[0]?.sku ?? '');
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [qty, setQty] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [price, setPrice] = useState('');
  const [reference, setReference] = useState('');
  const [receivedAt, setReceivedAt] = useState(dhakaInputValue(demoNow().toISOString(), true));
  const [breaks, setBreaks] = useState<{minQty: string;unitPrice: string;}[]>([]);
  const item = itemOf(db, sku);
  const serial = item?.tracking === 'Serial';
  const q = num(qty);

  return (
    <CrmDialog
      size="lg"
      title="Receive stock"
      description="Records goods received against a delivery challan or GRN. Purchase orders and vendor payments are outside this demo."
      onClose={onClose}
      submitLabel="Receive into stock"
      submitDisabled={!item || q <= 0 || !vendorId || !num(price) || reference.trim().length < 4 || serial && serials.length !== q}
      onSubmit={() =>
      runAction({
        type: 'INV_RECEIVE', sku, warehouse, quantity: q, serials: serial ? serials : [], vendorId, unitPrice: num(price), reference, receivedAt: fromDhakaInput(receivedAt),
        breaks: breaks.map((b) => ({ minQty: num(b.minQty), unitPrice: num(b.unitPrice) }))
      }) && onClose()
      }>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Item" htmlFor="rc-item" required>
          <select id="rc-item" className={fieldInput} value={sku} onChange={(e) => {setSku(e.target.value);setSerials([]);}}>
            {items.map((i) =>
            <option key={i.sku} value={i.sku}>
                {i.name} ({i.sku})
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Into warehouse" htmlFor="rc-wh" required>
          <select id="rc-wh" className={fieldInput} value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
            {WAREHOUSES.map((w) =>
            <option key={w}>{w}</option>
            )}
          </select>
        </FormField>
        <FormField label={`Quantity${item ? ` (${item.unit})` : ''}`} htmlFor="rc-qty" required>
          <input id="rc-qty" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} />
        </FormField>
        <FormField label="Vendor" htmlFor="rc-vendor" required>
          <select id="rc-vendor" className={fieldInput} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Choose…</option>
            {db.vendors.map((v) =>
            <option key={v.id} value={v.id}>
                {v.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Unit purchase price (BDT)" htmlFor="rc-price" required>
          <input id="rc-price" inputMode="decimal" className={`${fieldInput} tabular-nums`} value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} />
        </FormField>
        <FormField label="Challan / GRN number" htmlFor="rc-ref" required>
          <input id="rc-ref" className={fieldInput} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="GRN-DHK-2026-0420" />
        </FormField>
        <FormField label="Received at" htmlFor="rc-at" required>
          <input id="rc-at" type="datetime-local" className={fieldInput} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
        </FormField>
      </div>
      {serial && <SerialEntry id="rc-serials" value={serials} onChange={setSerials} expected={q} label="Serial numbers received" />}
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Vendor bulk price breaks (optional)</legend>
        <div className="space-y-2">
          {breaks.map((b, i) =>
          <div key={i} className="flex items-center gap-2">
              <input aria-label="From quantity" inputMode="numeric" placeholder="From qty" className={`${fieldInput} w-32 tabular-nums`} value={b.minQty} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, minQty: e.target.value.replace(/\D/g, '') } : x))} />
              <input aria-label="Unit price" inputMode="decimal" placeholder="Unit price" className={`${fieldInput} w-36 tabular-nums`} value={b.unitPrice} onChange={(e) => setBreaks(breaks.map((x, j) => j === i ? { ...x, unitPrice: e.target.value.replace(/[^\d.]/g, '') } : x))} />
              <button type="button" aria-label="Remove price break" onClick={() => setBreaks(breaks.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <button type="button" className={`${linkBtn} inline-flex items-center gap-1`} onClick={() => setBreaks([...breaks, { minQty: '', unitPrice: '' }])}>
            <PlusIcon className="h-3 w-3" aria-hidden /> Add price break
          </button>
        </div>
      </fieldset>
    </CrmDialog>);

}