import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { CrmDialog } from '../crm/CrmDialog';
import { FormField } from '../admin/FormField';
import { fieldInput } from '../field/fieldStyles';
import { formatBDT } from '../../utils/format';
import { calculate } from '../../utils/associateRules';

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

export function NewSettlementDialog({ associateId, onClose }: {associateId?: string;onClose: () => void;}) {
  const { db } = useData();
  const runAction = useRunAction();
  const [id, setId] = useState(associateId ?? db.associates[0]?.id ?? '');
  const [period, setPeriod] = useState('2026-09');
  const [invoiced, setInvoiced] = useState('');
  const [collected, setCollected] = useState('');
  const [subs, setSubs] = useState('');
  const [declared, setDeclared] = useState('');
  const [declRef, setDeclRef] = useState('');
  const a = db.associates.find((x) => x.id === id);
  const decentral = a?.collectionModel === 'Decentralised';
  const fixed = a?.collectionModel === 'Fixed Monthly';
  const inputs = { invoiced: num(invoiced), collected: num(collected), subscribers: num(subs) };
  const preview = a ? calculate(db, a, period, inputs, decentral ? num(declared) : undefined) : null;

  return (
    <CrmDialog
      size="lg"
      title="Draft a settlement"
      description="The draft is calculated from the agreement and the rules in force for the month. It can be recalculated until it is reviewed."
      onClose={onClose}
      submitLabel="Create draft"
      submitDisabled={!a || !period || decentral && (!num(declared) || declRef.trim().length < 4)}
      onSubmit={() =>
      runAction({ type: 'ASC_CREATE_SETTLEMENT', associateId: id, period, ...inputs, declaration: decentral ? { amount: num(declared), reference: declRef.trim() } : undefined }) && onClose()
      }>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Associate" htmlFor="ns-a" required>
          <select id="ns-a" className={fieldInput} value={id} onChange={(e) => setId(e.target.value)} disabled={!!associateId}>
            {db.associates.map((x) =>
            <option key={x.id} value={x.id}>
                {x.name} — {x.collectionModel}
              </option>
            )}
          </select>
        </FormField>
        <FormField label="Month" htmlFor="ns-p" required>
          <input id="ns-p" type="month" className={fieldInput} value={period} onChange={(e) => setPeriod(e.target.value)} />
        </FormField>
        {!fixed &&
        <>
            <FormField label="Invoiced revenue (BDT)" htmlFor="ns-inv">
              <input id="ns-inv" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={invoiced} onChange={(e) => setInvoiced(e.target.value)} />
            </FormField>
            {!decentral &&
          <FormField label="Collected by IOL (BDT)" htmlFor="ns-col">
                <input id="ns-col" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={collected} onChange={(e) => setCollected(e.target.value)} />
              </FormField>
          }
          </>
        }
        <FormField label="Active subscribers" htmlFor="ns-subs">
          <input id="ns-subs" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={subs} onChange={(e) => setSubs(e.target.value)} />
        </FormField>
        {decentral &&
        <>
            <FormField label="Collections declared by associate (BDT)" htmlFor="ns-dec" required help="A declaration is not a verified remittance.">
              <input id="ns-dec" inputMode="numeric" className={`${fieldInput} tabular-nums`} value={declared} onChange={(e) => setDeclared(e.target.value)} />
            </FormField>
            <FormField label="Declaration reference" htmlFor="ns-decref" required>
              <input id="ns-decref" className={fieldInput} value={declRef} onChange={(e) => setDeclRef(e.target.value)} placeholder="Signed statement number" />
            </FormField>
          </>
        }
      </div>
      {preview &&
      <div className="rounded-md bg-slate-50 px-3 py-2.5 text-[12px]">
          <p className="mb-1 font-semibold text-slate-700">Preview</p>
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 tabular-nums">
            {preview.lines.map((l, i) =>
          <React.Fragment key={i}>
                <dt className="text-slate-600">{l.label}</dt>
                <dd className="text-right text-slate-900">{formatBDT(l.amount)}</dd>
              </React.Fragment>
          )}
          </dl>
        </div>
      }
    </CrmDialog>);

}