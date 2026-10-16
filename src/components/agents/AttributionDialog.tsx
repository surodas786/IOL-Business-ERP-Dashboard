import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { demoNow, dhakaInputValue, formatDhakaDate, fromDhakaInput } from '../../utils/format';
import { userName } from '../../utils/relations';
import { currentAttribution } from '../../utils/agentRules';

export const SALES_ROLES = ['salesExecutive', 'accountManager', 'businessHead'];

/** Records a new agent + customer + salesperson link. Customers already attributed are blocked. */
export function AttributionDialog({ agentId, onClose }: {agentId?: string;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [agent, setAgent] = useState(agentId ?? '');
  const [customer, setCustomer] = useState('');
  const [sp, setSp] = useState('');
  const [from, setFrom] = useState(dhakaInputValue(demoNow().toISOString()));
  const [note, setNote] = useState('');
  const cur = customer ? currentAttribution(db, customer) : undefined;
  const conflict = cur && (cur.agentId !== agent || cur.salespersonId !== sp);
  const agentName = (id: string) => db.salesAgents.find((a) => a.id === id)?.name ?? id;

  return (
    <CrmDialog
      title="Attribute a customer"
      description="One agent and one salesperson per customer. The same agent can work with different salespeople on different customers."
      onClose={onClose}
      submitLabel="Record attribution"
      submitDisabled={!agent || !customer || !sp || !!cur}
      onSubmit={() => runAction({ type: 'AGT_ADD_ATTRIBUTION', agentId: agent, customerId: customer, salespersonId: sp, effectiveFrom: fromDhakaInput(from, '00:00'), note }) && onClose()}>
      
      <FormField label="Agent" htmlFor="at-agent" required>
        <select id="at-agent" className={fieldInput} value={agent} disabled={!!agentId} onChange={(e) => setAgent(e.target.value)}>
          <option value="">Choose…</option>
          {db.salesAgents.filter((a) => a.status === 'Active').map((a) =>
          <option key={a.id} value={a.id}>
              {a.name}
            </option>
          )}
        </select>
      </FormField>
      <FormField
        label="Customer"
        htmlFor="at-cust"
        required
        error={cur ? `Already attributed to ${agentName(cur.agentId)} with ${userName(cur.salespersonId)} since ${formatDhakaDate(cur.effectiveFrom)}.${conflict ? ' Request a reassignment from the Attributions list instead.' : ''}` : undefined}>
        
        <select id="at-cust" className={fieldInput} value={customer} onChange={(e) => setCustomer(e.target.value)}>
          <option value="">Choose…</option>
          {db.customers.filter((c) => c.segment !== 'Associate').map((c) =>
          <option key={c.id} value={c.id}>
              {c.name}
            </option>
          )}
        </select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Salesperson" htmlFor="at-sp" required>
          <select id="at-sp" className={fieldInput} value={sp} onChange={(e) => setSp(e.target.value)}>
            <option value="">Choose…</option>
            {db.users.filter((u) => u.status === 'Active' && SALES_ROLES.includes(u.role)).map((u) =>
            <option key={u.id} value={u.id}>
                {u.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Effective from" htmlFor="at-from" required>
          <input id="at-from" type="date" className={fieldInput} value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Note" htmlFor="at-note">
        <textarea id="at-note" rows={2} className={fieldTextarea} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </CrmDialog>);

}