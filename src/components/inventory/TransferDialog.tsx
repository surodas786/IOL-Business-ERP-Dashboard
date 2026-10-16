import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { ItemWarehouseFields } from './ItemWarehouseFields';
import { SerialEntry } from './SerialEntry';
import { WAREHOUSES, isSerial } from '../../utils/inventoryRules';

export function TransferDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [sku, setSku] = useState(db.inventoryItems[0]?.sku ?? '');
  const [from, setFrom] = useState(WAREHOUSES[0]);
  const [to, setTo] = useState(WAREHOUSES[1] ?? WAREHOUSES[0]);
  const [qty, setQty] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const serial = isSerial(db, sku);
  const q = Number(qty);
  const inStock = db.equipmentUnits.filter((u) => u.sku === sku && u.warehouse === from && u.status === 'In Stock').map((u) => u.serial);

  return (
    <CrmDialog
      size="lg"
      title="Transfer between warehouses"
      description="Only available stock can move — reserved quantity stays where it is held."
      onClose={onClose}
      submitLabel="Transfer"
      submitDisabled={!q || from === to || reference.trim().length < 4 || serial && serials.length !== q}
      onSubmit={() => runAction({ type: 'INV_TRANSFER', sku, from, to, quantity: q, serials: serial ? serials : [], reference, note }) && onClose()}>
      
      <ItemWarehouseFields sku={sku} warehouse={from} quantity={qty} onSku={(v) => {setSku(v);setSerials([]);}} onWarehouse={(v) => {setFrom(v);setSerials([]);}} onQuantity={setQty} warehouseLabel="From warehouse" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="To warehouse" htmlFor="tr-to" required error={from === to ? 'Choose a different warehouse.' : undefined}>
          <select id="tr-to" className={fieldInput} value={to} onChange={(e) => setTo(e.target.value)}>
            {WAREHOUSES.map((w) =>
            <option key={w}>{w}</option>
            )}
          </select>
        </FormField>
        <FormField label="Transfer note number" htmlFor="tr-ref" required>
          <input id="tr-ref" className={fieldInput} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TN-2026-0091" />
        </FormField>
      </div>
      {serial && <SerialEntry id="tr-serials" value={serials} onChange={setSerials} expected={q} suggestions={inStock} />}
      <FormField label="Note" htmlFor="tr-note">
        <input id="tr-note" className={fieldInput} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}