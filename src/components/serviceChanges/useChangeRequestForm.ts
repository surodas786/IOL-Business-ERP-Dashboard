import { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { inUserScope } from '../../utils/access';
import { demoNow, dhakaDayAt, dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { canSeeCommercial } from '../../utils/serviceChangeRules';
import type { ChangeRequestInput } from '../../utils/serviceChangeWorkflow';
import type { CostBearer, ServiceChangeType } from '../../types/serviceChange';

const num = (v: string) => v.trim() === '' ? undefined : Number(v);

/** Form state for raising a service change against an existing customer and service. */
export function useChangeRequestForm(presetCustomerId?: string) {
  const { db } = useData();
  const { user, role } = useSession();
  const now = demoNow().toISOString();
  const fin = canSeeCommercial(role);

  const customers = useMemo(
    () => db.customers.filter((c) => inUserScope(user, c.branchId) && db.connections.some((x) => x.customerId === c.id && x.status !== 'Disconnected' && x.status !== 'Pending Activation')),
    [db, user]
  );
  const [customerId, setCustomerId] = useState(presetCustomerId && customers.some((c) => c.id === presetCustomerId) ? presetCustomerId : '');
  const [query, setQuery] = useState('');
  const services = db.connections.filter((x) => x.customerId === customerId && x.status !== 'Disconnected' && x.status !== 'Pending Activation');
  const [connectionId, setConnectionId] = useState('');
  const conn = services.find((x) => x.id === connectionId) ?? (services.length === 1 ? services[0] : undefined);
  const stopped = conn?.status === 'Temporarily Stopped';
  const activeStop = conn ? db.serviceChanges.find((s) => s.connectionId === conn.id && s.type === 'Temporary Stop' && s.status === 'Stopped') : undefined;

  const [type, setType] = useState<ServiceChangeType>('Upgrade');
  const allowedTypes: ServiceChangeType[] = stopped ? ['Resumption', 'Discontinuation'] : ['Shifting', 'Upgrade', 'Downgrade', 'Temporary Stop', 'Discontinuation'];
  const effType: ServiceChangeType = allowedTypes.includes(type) ? type : allowedTypes[0];

  const [reason, setReason] = useState('');
  const [requestedDate, setRequestedDate] = useState(dhakaInputValue(dhakaDayAt(now, 7)));
  const [toBandwidth, setToBandwidth] = useState('');
  const [toMrc, setToMrc] = useState('');
  const [costBearer, setCostBearer] = useState<CostBearer>('No new equipment');
  const [equipmentCost, setEquipmentCost] = useState('');
  const [upgradeCharge, setUpgradeCharge] = useState('');
  const [recurringCostDelta, setRecurringCostDelta] = useState('');
  const [destSiteId, setDestSiteId] = useState('');
  const [destName, setDestName] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [destContact, setDestContact] = useState('');
  const [destPhone, setDestPhone] = useState('');
  const [relocationCharge, setRelocationCharge] = useState('');
  const [equipmentMovement, setEquipmentMovement] = useState('');
  const [interruptionHours, setInterruptionHours] = useState('');
  const [expectedResumption, setExpectedResumption] = useState(dhakaInputValue(dhakaDayAt(now, 30)));
  const [continuingCharge, setContinuingCharge] = useState('');
  const [commercialSummary, setCommercialSummary] = useState('');

  const otherSites = db.sites.filter((s) => s.customerId === customerId && s.id !== conn?.siteId);

  const input: ChangeRequestInput | null = conn ?
  {
    customerId, connectionId: conn.id, type: effType, reason, requestedDate: fromDhakaInput(requestedDate, effType === 'Discontinuation' ? '23:59' : '00:00'),
    toBandwidth: num(toBandwidth), toMrc: num(toMrc), costBearer, equipmentCost: num(equipmentCost), upgradeCharge: num(upgradeCharge), recurringCostDelta: num(recurringCostDelta),
    destination: effType === 'Shifting' ? { siteId: destSiteId || undefined, name: destName, address: destAddress, contactName: destContact, contactPhone: destPhone } : undefined,
    relocationCharge: num(relocationCharge), equipmentMovement, interruptionHours: num(interruptionHours),
    expectedResumption: effType === 'Temporary Stop' ? fromDhakaInput(expectedResumption, '10:00') : undefined,
    continuingCharge: num(continuingCharge), commercialSummary, stopChangeId: effType === 'Resumption' ? activeStop?.id : undefined
  } :
  null;

  const ready = !!input && reason.trim().length >= 10 && (effType !== 'Shifting' || !!destSiteId || destName.trim() && destAddress.trim()) && (effType !== 'Upgrade' && effType !== 'Downgrade' || !!num(toBandwidth));

  return {
    fin, customers, customerId, setCustomerId: (id: string) => {setCustomerId(id);setConnectionId('');}, query, setQuery,
    services, conn, setConnectionId, activeStop, allowedTypes, type: effType, setType,
    reason, setReason, requestedDate, setRequestedDate, toBandwidth, setToBandwidth, toMrc, setToMrc, costBearer, setCostBearer,
    equipmentCost, setEquipmentCost, upgradeCharge, setUpgradeCharge, recurringCostDelta, setRecurringCostDelta,
    otherSites, destSiteId, setDestSiteId, destName, setDestName, destAddress, setDestAddress, destContact, setDestContact, destPhone, setDestPhone,
    relocationCharge, setRelocationCharge, equipmentMovement, setEquipmentMovement, interruptionHours, setInterruptionHours,
    expectedResumption, setExpectedResumption, continuingCharge, setContinuingCharge, commercialSummary, setCommercialSummary,
    input, ready
  };
}