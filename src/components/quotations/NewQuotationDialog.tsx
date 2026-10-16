import React, { useMemo, useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { inUserScope } from '../../utils/access';
import { demoNow } from '../../utils/format';
import { recordName } from '../../utils/relations';
import { defaultTerms } from '../../utils/quoteDraft';
import { QuoteEditorDialog } from './QuoteEditorDialog';

/** Pick an open opportunity, then prepare its quotation with terms pre-filled from the opportunity and survey. */
export function NewQuotationDialog({ onClose, opportunityId }: {onClose: () => void;opportunityId?: string;}) {
  const { db } = useData();
  const { user } = useSession();
  const eligible = useMemo(
    () =>
    db.opportunities.filter(
      (o) => o.status === 'Open' && inUserScope(user, o.branchId) && !db.quotations.some((q) => q.opportunityId === o.id && !['Cancelled', 'Rejected', 'Accepted'].includes(q.status))
    ),
    [db, user]
  );
  const [pick, setPick] = useState(opportunityId ?? eligible[0]?.id ?? '');
  const [confirmed, setConfirmed] = useState(!!opportunityId);
  const opp = db.opportunities.find((o) => o.id === pick);

  if (confirmed && opp) {
    return <QuoteEditorDialog mode={{ kind: 'create', opportunityId: opp.id }} initial={defaultTerms(db, opp, demoNow().toISOString())} customerId={opp.customerId} onClose={onClose} />;
  }

  return (
    <CrmDialog title="New quotation" description="Quotations are prepared against an existing opportunity. One open quotation per opportunity — revise it instead of creating another." onClose={onClose} submitLabel="Continue" submitDisabled={!opp} onSubmit={() => setConfirmed(true)}>
      {eligible.length === 0 ?
      <p className="text-[12.5px] text-slate-600">Every open opportunity in your scope already has an open quotation.</p> :

      <FormField label="Opportunity" htmlFor="nq-opp" help={opp ? `${opp.serviceType} ${opp.bandwidthMbps} Mbps · ${opp.siteName}` : undefined}>
          <select id="nq-opp" className={fieldInput} value={pick} onChange={(e) => setPick(e.target.value)}>
            {eligible.map((o) =>
          <option key={o.id} value={o.id}>
                {o.id} — {recordName(db, { type: 'lead', id: o.leadId })}
              </option>
          )}
          </select>
        </FormField>
      }
    </CrmDialog>);

}