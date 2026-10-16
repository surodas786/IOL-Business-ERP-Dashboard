import { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRunAction } from '../../hooks/useRunAction';
import { demoNow, dhakaDayAt, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { currentAttribution, financialEffect, usesMrc, usesOtc } from '../../utils/agentRules';
import type { CancellationTreatment, CommissionArrangement, CommissionBasis, QualifyingEvent } from '../../types/agent';

const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0;

export function useProposalForm(initialAgentId: string | undefined, onDone: () => void) {
  const { db } = useData();
  const runAction = useRunAction();
  const [selfSale, setSelfSale] = useState(false);
  const [agentId, setAgentId] = useState(initialAgentId ?? '');
  const [customerId, setCustomerId] = useState('');
  const [salespersonId, setSalespersonId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [basis, setBasis] = useState<CommissionBasis>('MRC');
  const [arrangement, setArrangement] = useState<CommissionArrangement>('One-time');
  const [months, setMonths] = useState('12');
  const [mrc, setMrc] = useState('');
  const [otc, setOtc] = useState('');
  const [mrcPct, setMrcPct] = useState('');
  const [otcPct, setOtcPct] = useState('');
  const [event, setEvent] = useState<QualifyingEvent>('Service activation');
  const [treatment, setTreatment] = useState<CancellationTreatment>('Reverse unpaid accruals only');
  const [clawback, setClawback] = useState('3');
  const [validFrom, setValidFrom] = useState(dhakaInputValue(demoNow().toISOString()));
  const [validTo, setValidTo] = useState(dhakaInputValue(dhakaDayAt(demoNow(), 90)));

  const agent = db.salesAgents.find((a) => a.id === agentId);
  const attribution = customerId ? currentAttribution(db, customerId) : undefined;
  const workOrders = db.workOrders.filter((w) => w.customerId === customerId && !w.commissionLock && w.status !== 'Cancelled');
  const connections = db.connections.filter((c) => c.customerId === customerId);

  /** Agent defaults from the agreement; attribution fixes the salesperson. */
  const chooseAgent = (id: string) => {
    setAgentId(id);
    const a = db.salesAgents.find((x) => x.id === id);
    if (a) {
      if (a.standardBasis) setBasis(a.standardBasis);
      if (a.standardArrangement) setArrangement(a.standardArrangement);
      setMrcPct(a.standardMrcPct ? String(a.standardMrcPct) : '');
      setOtcPct(a.standardOtcPct ? String(a.standardOtcPct) : '');
      if (a.standardMonths && a.standardMonths > 1) setMonths(String(a.standardMonths));
    }
  };
  const chooseCustomer = (id: string) => {
    setCustomerId(id);
    setWorkOrderId('');
    setConnectionId('');
    const cur = currentAttribution(db, id);
    if (cur) {
      setSalespersonId(cur.salespersonId);
      if (!selfSale && cur.agentId !== agentId) chooseAgent(cur.agentId);
    } else setSalespersonId(db.customers.find((c) => c.id === id)?.accountManagerId ?? '');
  };
  const chooseConnection = (id: string) => {
    setConnectionId(id);
    const c = db.connections.find((x) => x.id === id);
    if (c) setMrc(String(c.mrc));
  };
  const chooseWorkOrder = (id: string) => {
    setWorkOrderId(id);
    const t = db.workOrders.find((w) => w.id === id)?.snapshots?.at(-1)?.terms;
    if (t) {
      setMrc(String(t.mrc));
      setOtc(String(t.otc));
    }
  };

  const draft = { basis, arrangement, months: arrangement === 'Recurring' ? num(months) : 1, mrc: num(mrc), otc: num(otc) };
  const effect = useMemo(() => financialEffect(draft, num(mrcPct), num(otcPct)), [basis, arrangement, months, mrc, otc, mrcPct, otcPct]);
  const conflict = !selfSale && attribution && (attribution.agentId !== agentId || attribution.salespersonId !== salespersonId);
  const selfConflict = selfSale && !!attribution;

  const ready =
  !!customerId && !!salespersonId && !!validFrom && !!validTo && !conflict && !selfConflict && (
  selfSale || !!agentId && (!usesMrc(basis) || num(mrc) > 0 && num(mrcPct) > 0) && (!usesOtc(basis) || num(otc) > 0 && num(otcPct) > 0));

  const submit = () =>
  runAction({
    type: 'AGT_SUBMIT_PROPOSAL',
    input: {
      selfSale, agentId: selfSale ? undefined : agentId, customerId, salespersonId, workOrderId: workOrderId || undefined, connectionId: connectionId || undefined,
      quotationId: db.workOrders.find((w) => w.id === workOrderId)?.quotationId, basis, arrangement, months: draft.months, mrc: draft.mrc, otc: draft.otc,
      mrcPct: num(mrcPct), otcPct: num(otcPct), qualifyingEvent: event, cancellationTreatment: treatment, clawbackMonths: num(clawback),
      validFrom: fromDhakaInput(validFrom, '00:00'), validTo: fromDhakaInput(validTo, '23:59')
    }
  }) && onDone();

  return {
    state: { selfSale, agentId, customerId, salespersonId, workOrderId, connectionId, basis, arrangement, months, mrc, otc, mrcPct, otcPct, event, treatment, clawback, validFrom, validTo },
    set: { setSelfSale, chooseAgent, chooseCustomer, setSalespersonId, chooseWorkOrder, chooseConnection, setBasis, setArrangement, setMonths, setMrc, setOtc, setMrcPct, setOtcPct, setEvent, setTreatment, setClawback, setValidFrom, setValidTo },
    agent, attribution, workOrders, connections, effect, conflict, selfConflict, ready, submit
  };
}