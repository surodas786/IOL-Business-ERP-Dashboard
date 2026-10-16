import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { customerName } from '../../utils/relations';
import { demoNow, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { itemOf } from '../../utils/inventoryRules';
import type { EquipmentUnit } from '../../types/inventory';

/** Records where an issued unit was deployed when it is not closed through an installation job. */
export function InstallDialog({ unit: u, onClose }: {unit: EquipmentUnit;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const services = db.connections.filter((c) => c.status !== 'Disconnected' && (!u.customerId || c.customerId === u.customerId));
  const [connectionId, setConnectionId] = useState(u.connectionId ?? '');
  const [deployedAt, setDeployedAt] = useState(dhakaInputValue(demoNow().toISOString()));

  return (
    <CrmDialog
      title={`Record deployment of ${u.serial}`}
      description={`${itemOf(db, u.sku)?.name ?? u.sku} · issued to ${u.technicianName ?? 'technician'}. Jobs record this automatically when marked done.`}
      onClose={onClose}
      submitLabel="Record installation"
      submitDisabled={!connectionId}
      onSubmit={() => runAction({ type: 'INV_INSTALL', serial: u.serial, connectionId, deployedAt: fromDhakaInput(deployedAt, '12:00') }) && onClose()}>
      
      <FormField label="Installed at service" htmlFor="in-conn" required>
        <select id="in-conn" className={fieldInput} value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
          <option value="">Choose…</option>
          {services.map((c) =>
          <option key={c.id} value={c.id}>
              {c.id} — {customerName(db, c.customerId)}
            </option>
          )}
        </select>
      </FormField>
      <FormField label="Deployment date" htmlFor="in-date" required help="Starts the usable-life clock for the expected replacement date.">
        <input id="in-date" type="date" className={fieldInput} value={deployedAt} onChange={(e) => setDeployedAt(e.target.value)} />
      </FormField>
    </CrmDialog>);

}