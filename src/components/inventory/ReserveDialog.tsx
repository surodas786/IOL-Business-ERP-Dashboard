import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldTextarea } from '../field/fieldStyles';
import { ItemWarehouseFields } from './ItemWarehouseFields';
import { LinkPicker } from './LinkPicker';
import { WAREHOUSES } from '../../utils/inventoryRules';
import type { StockLinks } from '../../utils/stockOps';

export function ReserveDialog({ onClose }: {onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [sku, setSku] = useState(db.inventoryItems[0]?.sku ?? '');
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0]);
  const [qty, setQty] = useState('');
  const [links, setLinks] = useState<StockLinks>({});
  const [note, setNote] = useState('');
  const linked = !!(links.jobId || links.workOrderId || links.serviceChangeId);

  return (
    <CrmDialog
      title="Reserve stock"
      description="A reservation holds stock for a job. It reduces available quantity; physical on-hand stays the same until issue."
      onClose={onClose}
      submitLabel="Reserve"
      submitDisabled={!Number(qty) || !linked}
      onSubmit={() => runAction({ type: 'INV_RESERVE', sku, warehouse, quantity: Number(qty), links, note }) && onClose()}>
      
      <ItemWarehouseFields sku={sku} warehouse={warehouse} quantity={qty} onSku={setSku} onWarehouse={setWarehouse} onQuantity={setQty} />
      <LinkPicker value={links} onChange={setLinks} required />
      <FormField label="Note" htmlFor="rs-note">
        <textarea id="rs-note" rows={2} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}