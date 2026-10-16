import React, { useState } from 'react';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import type { Opportunity } from '../../types/records';

/** Sales request for a site survey on an opportunity. Bangla or English accepted. */
export function RequestSurveyDialog({ opportunity: o, onClose }: {opportunity: Opportunity;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const lead = db.leads.find((l) => l.id === o.leadId);
  const [d, setD] = useState({
    siteLabel: o.siteName,
    address: o.siteAddress,
    siteContactName: lead?.contactName ?? '',
    siteContactPhone: lead?.contactPhone ?? '',
    accessInstructions: '',
    notes: ''
  });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((p) => ({ ...p, [k]: e.target.value }));
  const ready = d.address.trim() && d.siteContactName.trim() && d.siteContactPhone.trim() && d.accessInstructions.trim();

  return (
    <CrmDialog
      title="Request site survey"
      description={`${o.title} · ${o.serviceType} · ${o.bandwidthMbps} Mbps. Back Office reviews the request before a technician is assigned.`}
      onClose={onClose}
      submitLabel="Submit request"
      submitDisabled={!ready}
      onSubmit={() => runAction({ type: 'SURVEY_REQUEST', draft: { opportunityId: o.id, ...d } }) && onClose()}>
      
      <FormField label="Site name" htmlFor="sr-site">
        <input id="sr-site" className={fieldInput} value={d.siteLabel} onChange={set('siteLabel')} />
      </FormField>
      <FormField label="Site address" htmlFor="sr-addr" required>
        <textarea id="sr-addr" rows={2} className={fieldTextarea} value={d.address} onChange={set('address')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Site contact" htmlFor="sr-cn" required>
          <input id="sr-cn" className={fieldInput} value={d.siteContactName} onChange={set('siteContactName')} />
        </FormField>
        <FormField label="Contact phone" htmlFor="sr-cp" required>
          <input id="sr-cp" type="tel" inputMode="tel" className={fieldInput} value={d.siteContactPhone} onChange={set('siteContactPhone')} placeholder="+880 17XX-XXXXXX" />
        </FormField>
      </div>
      <FormField label="Access instructions" htmlFor="sr-acc" required help="Gate pass, rooftop key, working hours, who to ask for.">
        <textarea id="sr-acc" rows={3} className={fieldTextarea} value={d.accessInstructions} onChange={set('accessInstructions')} />
      </FormField>
      <FormField label="Notes for the survey team" htmlFor="sr-notes">
        <textarea id="sr-notes" rows={2} className={fieldTextarea} value={d.notes} onChange={set('notes')} />
      </FormField>
    </CrmDialog>);

}