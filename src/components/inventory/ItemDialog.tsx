import React, { useState } from 'react';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput, fieldTextarea } from '../field/fieldStyles';
import { ITEM_CATEGORIES, type InventoryItem, type ItemCategory, type TrackingMode } from '../../types/inventory';

const BLANK: InventoryItem = { sku: '', name: '', category: 'CPE', unit: 'pc', tracking: 'Serial', returnable: true, usableLifeMonths: 60, reorderLevel: 0, active: true };

export function ItemDialog({ item, onClose }: {item?: InventoryItem;onClose: () => void;}) {
  const runAction = useRunAction();
  const [f, setF] = useState<InventoryItem>(item ?? BLANK);
  const set = <K extends keyof InventoryItem,>(k: K, v: InventoryItem[K]) => setF((p) => ({ ...p, [k]: v }));
  const serial = f.tracking === 'Serial';

  return (
    <CrmDialog
      size="lg"
      title={item ? `Edit ${item.sku}` : 'New item'}
      description="Serial-tracked equipment is counted per unit with a serial number. Quantity-based consumables are counted in their unit."
      onClose={onClose}
      submitLabel={item ? 'Save item' : 'Add item'}
      submitDisabled={!f.sku.trim() || f.name.trim().length < 3}
      onSubmit={() => runAction({ type: 'INV_SAVE_ITEM', item: { ...f, usableLifeMonths: serial ? f.usableLifeMonths : undefined, unit: serial ? 'pc' : f.unit }, isNew: !item }) && onClose()}>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="SKU" htmlFor="it-sku" required help="Letters, numbers and hyphens. Cannot change later.">
          <input id="it-sku" className={`${fieldInput} font-mono uppercase`} value={f.sku} disabled={!!item} onChange={(e) => set('sku', e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Name" htmlFor="it-name" required>
          <input id="it-name" className={fieldInput} value={f.name} onChange={(e) => set('name', e.target.value)} />
        </FormField>
        <FormField label="Category" htmlFor="it-cat">
          <select id="it-cat" className={fieldInput} value={f.category} onChange={(e) => set('category', e.target.value as ItemCategory)}>
            {ITEM_CATEGORIES.map((c) =>
            <option key={c}>{c}</option>
            )}
          </select>
        </FormField>
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-semibold text-slate-700">Tracking</legend>
          <div className="flex gap-4 text-[12.5px]">
            {(['Serial', 'Quantity'] as TrackingMode[]).map((t) =>
            <label key={t} className="flex items-center gap-2">
                <input type="radio" name="it-track" className="accent-primary" checked={f.tracking === t} onChange={() => set('tracking', t)} />
                {t === 'Serial' ? 'Serial-tracked equipment' : 'Quantity-based consumable'}
              </label>
            )}
          </div>
        </fieldset>
        {serial ?
        <FormField label="Estimated usable life (months)" htmlFor="it-life" required help="Used to work out the expected replacement date after deployment.">
            <input id="it-life" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.usableLifeMonths ?? ''} onChange={(e) => set('usableLifeMonths', Number(e.target.value.replace(/\D/g, '')) || undefined)} />
          </FormField> :

        <FormField label="Unit" htmlFor="it-unit" required help="e.g. m, pc, set, roll">
            <input id="it-unit" className={fieldInput} value={f.unit} onChange={(e) => set('unit', e.target.value)} />
          </FormField>
        }
        <FormField label="Reorder level (available)" htmlFor="it-ro" help="Flagged per warehouse when available falls to this level.">
          <input id="it-ro" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={f.reorderLevel} onChange={(e) => set('reorderLevel', Number(e.target.value.replace(/\D/g, '')) || 0)} />
        </FormField>
      </div>
      <div className="flex flex-wrap gap-5 text-[12.5px] text-slate-800">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={f.returnable} onChange={(e) => set('returnable', e.target.checked)} />
          Returnable to IOL when a service ends
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={f.active} onChange={(e) => set('active', e.target.checked)} />
          Active (can be received and issued)
        </label>
      </div>
      <FormField label="Description" htmlFor="it-desc">
        <textarea id="it-desc" rows={2} className={fieldTextarea} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </FormField>
    </CrmDialog>);

}