import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { fromDhakaInput } from '../../utils/format';
import { userName } from '../../utils/relations';
import { MIN_REASON } from '../../utils/agentRules';
import { SALES_ROLES } from './AttributionDialog';
import type { AgentAttribution } from '../../types/agent';

/** Requests a change of agent and/or salesperson. Takes effect only after Business Head approval. */
export function ReassignDialog({ attribution: a, onClose }: {attribution: AgentAttribution;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [agent, setAgent] = useState(a.agentId);
  const [sp, setSp] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const c = db.customers.find((x) => x.id === a.customerId);
  const same = agent === a.agentId && sp === a.salespersonId;

  return (
    <CrmDialog
      title={`Request reassignment — ${c?.name ?? a.customerId}`}
      description={`Currently ${db.salesAgents.find((x) => x.id === a.agentId)?.name} with ${userName(a.salespersonId)}. The Business Head (Sales Head) must approve; the current attribution stays in history.`}
      onClose={onClose}
      submitLabel="Send for approval"
      submitDisabled={!sp || !date || same || reason.trim().length < MIN_REASON}
      onSubmit={() => runAction({ type: 'AGT_REQUEST_REASSIGNMENT', attributionId: a.id, toAgentId: agent, toSalespersonId: sp, effectiveDate: fromDhakaInput(date, '00:00'), reason }) && onClose()}>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="New agent" htmlFor="ra-agent" required>
          <select id="ra-agent" className={fieldInput} value={agent} onChange={(e) => setAgent(e.target.value)}>
            {db.salesAgents.filter((x) => x.status === 'Active').map((x) =>
            <option key={x.id} value={x.id}>
                {x.name}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="New salesperson" htmlFor="ra-sp" required error={same ? 'Choose a different agent or salesperson.' : undefined}>
          <select id="ra-sp" className={fieldInput} value={sp} onChange={(e) => setSp(e.target.value)}>
            <option value="">Choose…</option>
            {db.users.filter((u) => u.status === 'Active' && SALES_ROLES.includes(u.role)).map((u) =>
            <option key={u.id} value={u.id}>
                {u.name}
              </option>
            )}
          </select>
        </FormField>
      </div>
      <FormField label="Effective date" htmlFor="ra-date" required help="Commission earned before this date stays with the original attribution.">
        <input id="ra-date" type="date" className={fieldInput} value={date} onChange={(e) => setDate(e.target.value)} />
      </FormField>
      <FormField label="Reason" htmlFor="ra-reason" required help={`At least ${MIN_REASON} characters.`}>
        <textarea id="ra-reason" rows={3} className={fieldTextarea} value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
    </CrmDialog>);

}