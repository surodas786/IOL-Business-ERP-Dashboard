import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { ItemWarehouseFields } from './ItemWarehouseFields';
import { LinkPicker } from './LinkPicker';
import { SerialEntry } from './SerialEntry';
import { TECHNICIANS } from '../../utils/installationRules';
import { WAREHOUSES, isSerial } from '../../utils/inventoryRules';
import type { StockLinks } from '../../utils/stockOps';

export function IssueDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [sku, setSku] = useState(db.inventoryItems[0]?.sku ?? '');
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [qty, setQty] = useState('');
  const [serials, setSerials] = useState<string[]>([]);
  const [links, setLinks] = useState<StockLinks>({});
  const [tech, setTech] = useState('');
  const [note, setNote] = useState('');
  const serial = isSerial(db, sku);
  const q = Number(qty);
  const job = links.jobId ? db.installationJobs.find((j) => j.id === links.jobId) : undefined;
  const technician = tech || job?.technicianName || '';
  const inStock = db.equipmentUnits.filter((u) => u.sku === sku && u.warehouse === warehouse && u.status === 'In Stock').map((u) => u.serial);
  const linked = !!(links.jobId || links.workOrderId || links.serviceChangeId);

  return (
    <CrmDialog
      size="lg"
      title="Issue stock to a technician"
      description="Issue reduces warehouse on-hand. Stock reserved for this job is used first; stock reserved for other work cannot be issued."
      onClose={onClose}
      submitLabel="Issue"
      submitDisabled={!q || !linked || !technician || serial && serials.length !== q}
      onSubmit={() => runAction({ type: 'INV_ISSUE', sku, warehouse, quantity: q, serials: serial ? serials : [], technicianName: technician, links, note }) && onClose()}>
      
      <ItemWarehouseFields sku={sku} warehouse={warehouse} quantity={qty} onSku={(v) => {setSku(v);setSerials([]);}} onWarehouse={(v) => {setWarehouse(v);setSerials([]);}} onQuantity={setQty} warehouseLabel="From warehouse" />
      <div className="grid gap-4 sm:grid-cols-2">
        <LinkPicker value={links} onChange={setLinks} required />
        <FormField label="Technician" htmlFor="is-tech" required help={job?.technicianName ? `Defaults to ${job.technicianName} on ${job.id}` : undefined}>
          <select id="is-tech" className={fieldInput} value={technician} onChange={(e) => setTech(e.target.value)}>
            <option value="">Choose…</option>
            {TECHNICIANS.map((t) =>
            <option key={t.name}>{t.name}</option>
            )}
          </select>
        </FormField>
      </div>
      {serial && <SerialEntry id="is-serials" value={serials} onChange={setSerials} expected={q} suggestions={inStock} />}
      <FormField label="Note" htmlFor="is-note">
        <textarea id="is-note" rows={2} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}