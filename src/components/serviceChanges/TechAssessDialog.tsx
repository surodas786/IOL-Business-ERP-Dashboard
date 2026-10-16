import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import type { ServiceChange } from '../../types/records';
import type { Feasibility } from '../../types/serviceChange';

export function TechAssessDialog({ change: s, onClose }: {change: ServiceChange;onClose: () => void;}) {
  const runAction = useRunAction();
  const tariff = s.type === 'Upgrade' || s.type === 'Downgrade';
  const [impact, setImpact] = useState(s.technicalImpact?.impact ?? '');
  const [capacity, setCapacity] = useState<'' | 'yes' | 'no'>(s.technicalImpact?.capacityValidated === undefined ? '' : s.technicalImpact.capacityValidated ? 'yes' : 'no');
  const [capacityNote, setCapacityNote] = useState(s.technicalImpact?.capacityNote ?? '');
  const [feasibility, setFeasibility] = useState<Feasibility | ''>(s.technicalImpact?.feasibility ?? '');
  const ready = impact.trim().length >= 10 && (!tariff || capacity !== '') && (s.type !== 'Shifting' || feasibility !== '');

  return (
    <CrmDialog
      title={s.type === 'Shifting' ? 'Mini-feasibility and technical impact' : tariff ? 'Capacity validation and technical impact' : 'Technical impact'}
      description="Once technical and commercial assessments are complete, the change goes to Business Head or Management for approval."
      onClose={onClose}
      submitLabel="Save assessment"
      submitDisabled={!ready}
      onSubmit={() =>
      runAction({ type: 'SC_TECH_ASSESS', id: s.id, impact, capacityValidated: tariff ? capacity === 'yes' : undefined, capacityNote, feasibility: s.type === 'Shifting' ? feasibility as Feasibility : undefined }) && onClose()
      }>
      
      {tariff &&
      <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">
            Capacity for {s.toBandwidth} Mbps<span className="ml-0.5 text-status-critical">*</span>
          </legend>
          <div className="flex gap-4 text-[12.5px]">
            {(['yes', 'no'] as const).map((v) =>
          <label key={v} className="flex items-center gap-2">
                <input type="radio" name="cap" className="accent-primary" checked={capacity === v} onChange={() => setCapacity(v)} />
                {v === 'yes' ? 'Validated — port, PoP and upstream available' : 'Not available'}
              </label>
          )}
          </div>
          {capacity === 'no' && <p className="mt-1 text-[11.5px] text-status-critical">The change cannot go for approval until capacity is available.</p>}
        </fieldset>
      }
      {tariff &&
      <FormField label="Capacity note" htmlFor="ta-cn">
          <input id="ta-cn" className={fieldInput} value={capacityNote} onChange={(e) => setCapacityNote(e.target.value)} />
        </FormField>
      }
      {s.type === 'Shifting' &&
      <FormField label="Mini-feasibility at destination" htmlFor="ta-feas" required>
          <select id="ta-feas" className={fieldInput} value={feasibility} onChange={(e) => setFeasibility(e.target.value as Feasibility)}>
            <option value="">Choose…</option>
            <option>Feasible</option>
            <option>Feasible with conditions</option>
            <option>Not Feasible</option>
          </select>
        </FormField>
      }
      <FormField label="Technical impact" htmlFor="ta-impact" required help="Route, equipment, configuration and any downtime. At least 10 characters.">
        <textarea id="ta-impact" rows={3} className={fieldTextarea} value={impact} onChange={(e) => setImpact(e.target.value)} />
      </FormField>
    </CrmDialog>);

}