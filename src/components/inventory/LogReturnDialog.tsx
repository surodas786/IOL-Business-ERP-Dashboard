import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { ItemWarehouseFields } from './ItemWarehouseFields';
import { LinkPicker } from './LinkPicker';
import { SerialEntry } from './SerialEntry';
import { WAREHOUSES, isSerial } from '../../utils/inventoryRules';
import type { StockLinks } from '../../utils/stockOps';
import type { ReturnSource } from '../../types/inventory';

const SOURCES: ReturnSource[] = ['Technician (unused)', 'Customer site'];

export function LogReturnDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [sku, setSku] = useState(db.inventoryItems[0]?.sku ?? '');
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [qty, setQty] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [source, setSource] = useState<ReturnSource>('Technician (unused)');
  const [fromName, setFromName] = useState('');
  const [links, setLinks] = useState<StockLinks>({});
  const serial = isSerial(db, sku);
  const q = Number(qty);
  const candidates = db.equipmentUnits.
  filter((u) => u.sku === sku && (source === 'Technician (unused)' ? u.status === 'Issued' : ['Installed', 'Receivable'].includes(u.status) && u.ownership !== 'Customer-owned' && u.ownership !== 'Associate-owned')).
  map((u) => u.serial);

  return (
    <CrmDialog
      size="lg"
      title="Log a return"
      description="Logs items physically handed back. Nothing is added to stock until the return is inspected."
      onClose={onClose}
      submitLabel="Log return"
      submitDisabled={!q || !fromName.trim() || serial && serials.length !== q}
      onSubmit={() => runAction({ type: 'INV_LOG_RETURN', sku, warehouse, quantity: q, serials: serial ? serials : [], source, fromName, links }) && onClose()}>
      
      <fieldset>
        <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Returned from</legend>
        <div className="flex flex-wrap gap-4 text-[12.5px]">
          {SOURCES.map((s) =>
          <label key={s} className="flex items-center gap-2">
              <input type="radio" name="lr-src" className="accent-primary" checked={source === s} onChange={() => {setSource(s);setSerials([]);}} />
              {s}
            </label>
          )}
        </div>
      </fieldset>
      <ItemWarehouseFields sku={sku} warehouse={warehouse} quantity={qty} onSku={(v) => {setSku(v);setSerials([]);}} onWarehouse={setWarehouse} onQuantity={setQty} warehouseLabel="Receiving warehouse" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Handed back by" htmlFor="lr-from" required>
          <input id="lr-from" className={fieldInput} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Technician or customer contact" />
        </FormField>
        <LinkPicker value={links} onChange={setLinks} help="Optional — link to the job or service change." />
      </div>
      {serial && <SerialEntry id="lr-serials" value={serials} onChange={setSerials} expected={q} suggestions={candidates} />}
    </CrmDialog>);

}