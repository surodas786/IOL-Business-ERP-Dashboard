import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { formatBDT } from '../../utils/format';
import { changePayback } from '../../utils/serviceChangeRules';
import type { ServiceChange } from '../../types/records';
import type { CostBearer } from '../../types/serviceChange';

const str = (n?: number) => n === undefined ? '' : String(n);
const num = (v: string) => v.trim() === '' ? undefined : Number(v);
const digits = (v: string) => v.replace(/[^\d]/g, '');

export function CommercialDialog({ change: s, onClose }: {change: ServiceChange;onClose: () => void;}) {
  const runAction = useRunAction();
  const tariff = s.type === 'Upgrade' || s.type === 'Downgrade';
  const bearerApplies = tariff || s.type === 'Shifting';
  const [summary, setSummary] = useState(s.commercialImpact?.summary ?? '');
  const [toMrc, setToMrc] = useState(str(s.toMrc));
  const [costBearer, setCostBearer] = useState<CostBearer>(s.costBearer ?? 'No new equipment');
  const [equipmentCost, setEquipmentCost] = useState(str(s.equipmentCost));
  const [upgradeCharge, setUpgradeCharge] = useState(str(s.upgradeCharge));
  const [recurring, setRecurring] = useState(str(s.recurringCostDelta));
  const [relocation, setRelocation] = useState(str(s.relocationCharge));
  const [continuing, setContinuing] = useState(str(s.continuingCharge));
  const preview = changePayback({ ...s, toMrc: num(toMrc), costBearer, equipmentCost: num(equipmentCost), upgradeCharge: num(upgradeCharge), recurringCostDelta: num(recurring), relocationCharge: num(relocation) });

  return (
    <CrmDialog
      size="lg"
      title="Commercial impact"
      description="Locked once the change is sent for approval. Billing follows the approved effective date."
      onClose={onClose}
      submitLabel="Save commercial impact"
      submitDisabled={summary.trim().length < 10 || tariff && !num(toMrc)}
      onSubmit={() =>
      runAction({
        type: 'SC_COMMERCIAL', id: s.id, summary, toMrc: num(toMrc), costBearer: bearerApplies ? costBearer : undefined, equipmentCost: num(equipmentCost), upgradeCharge: num(upgradeCharge),
        recurringCostDelta: num(recurring), relocationCharge: num(relocation), continuingCharge: num(continuing)
      }) && onClose()
      }>
      
      <div className="grid gap-4 sm:grid-cols-2">
        {tariff &&
        <FormField label="Revised MRC (BDT)" htmlFor="cm-mrc" required help={`Currently ${formatBDT(s.fromMrc ?? 0)}`}>
            <input id="cm-mrc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={toMrc} onChange={(e) => setToMrc(digits(e.target.value))} />
          </FormField>
        }
        {bearerApplies &&
        <FormField label="Cost bearer" htmlFor="cm-bearer" required>
            <select id="cm-bearer" className={fieldInput} value={costBearer} onChange={(e) => setCostBearer(e.target.value as CostBearer)}>
              <option>No new equipment</option>
              <option value="IOL">IOL funds it</option>
              <option value="Customer">Customer pays</option>
            </select>
          </FormField>
        }
        {bearerApplies && costBearer === 'IOL' &&
        <FormField label="Equipment cost IOL funds (BDT)" htmlFor="cm-eq" required>
            <input id="cm-eq" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={equipmentCost} onChange={(e) => setEquipmentCost(digits(e.target.value))} />
          </FormField>
        }
        {tariff &&
        <FormField label="One-time change charge (BDT)" htmlFor="cm-otc">
            <input id="cm-otc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={upgradeCharge} onChange={(e) => setUpgradeCharge(digits(e.target.value))} />
          </FormField>
        }
        {tariff &&
        <FormField label="Recurring delivery cost change / month" htmlFor="cm-rc" help="Minus for savings">
            <input id="cm-rc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={recurring} onChange={(e) => setRecurring(e.target.value.replace(/[^\d-]/g, ''))} />
          </FormField>
        }
        {s.type === 'Shifting' &&
        <FormField label="Relocation charge (BDT)" htmlFor="cm-rel">
            <input id="cm-rel" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={relocation} onChange={(e) => setRelocation(digits(e.target.value))} />
          </FormField>
        }
        {s.type === 'Temporary Stop' &&
        <FormField label="Continuing charge while stopped (BDT / month)" htmlFor="cm-cc">
            <input id="cm-cc" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={continuing} onChange={(e) => setContinuing(digits(e.target.value))} />
          </FormField>
        }
      </div>
      {preview.applies &&
      <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
          Proposed payback: <span className="font-semibold">{preview.label}</span> — net investment {formatBDT(preview.investment)}, monthly contribution change {formatBDT(preview.contribution)}. Formula awaiting Finance confirmation.
        </p>
      }
      <FormField label="Commercial impact summary" htmlFor="cm-sum" required help="At least 10 characters. Seen by the approver.">
        <textarea id="cm-sum" rows={3} className={fieldTextarea} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </FormField>
    </CrmDialog>);

}