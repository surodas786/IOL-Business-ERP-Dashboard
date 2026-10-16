import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { branches } from '../../data/branches';
import { useRunAction } from '../../hooks/useRunAction';
import { dhakaInputValue, fromDhakaInput } from '../../utils/format';
import { availableAllotment, validateProfile } from '../../utils/associateRules';
import type { Associate } from '../../types/records';

export type AssociateDraft = Record<
  'name' | 'nameBn' | 'address' | 'tradeLicenceNo' | 'contactName' | 'contactPhone' | 'territory' | 'responsibleExecutiveId' | 'branchId' | 'zoneId' | 'parentId' |
  'backbone' | 'lastMile' | 'collectionModel' | 'sharingBasis' | 'revenueSharePct' | 'fixedMonthly' | 'agreementStart' | 'agreementEnd' | 'settlementDay' | 'graceDays' |
  'creditLimit' | 'creditDays' | 'depositRequired' | 'clientIdPrefix' | 'minRenewalDays' | 'maxRenewalDays' | 'vatBearer' | 'servicesSummary' | 'subscribers',
  string>;


const s = (v: unknown) => v === undefined || v === null ? '' : String(v);

function toDraft(a?: Associate): AssociateDraft {
  return {
    name: s(a?.name), nameBn: s(a?.nameBn), address: s(a?.address), tradeLicenceNo: s(a?.tradeLicenceNo), contactName: s(a?.contactName), contactPhone: s(a?.contactPhone),
    territory: s(a?.territory), responsibleExecutiveId: s(a?.responsibleExecutiveId), branchId: s(a?.branchId ?? 'dhaka-north'), zoneId: s(a?.zoneId ?? 'uttara'), parentId: s(a?.parentId),
    backbone: s(a?.backbone ?? 'IOL'), lastMile: s(a?.lastMile ?? 'Associate'), collectionModel: s(a?.collectionModel ?? 'Centralised'), sharingBasis: s(a?.sharingBasis ?? 'Collected revenue'),
    revenueSharePct: s(a?.revenueSharePct), fixedMonthly: s(a?.fixedMonthly), agreementStart: dhakaInputValue(a?.agreementStart), agreementEnd: dhakaInputValue(a?.agreementEnd),
    settlementDay: s(a?.settlementDay ?? 10), graceDays: s(a?.graceDays ?? 5), creditLimit: s(a?.creditLimit ?? 0), creditDays: s(a?.creditDays ?? 0), depositRequired: s(a?.depositRequired ?? 0),
    clientIdPrefix: s(a?.clientIdPrefix), minRenewalDays: s(a?.minRenewalDays ?? 30), maxRenewalDays: s(a?.maxRenewalDays ?? 90), vatBearer: s(a?.vatBearer ?? 'Subscriber'),
    servicesSummary: s(a?.servicesSummary), subscribers: s(a?.subscribers ?? 0)
  };
}

const n = (v: string) => v.trim() === '' ? undefined : Number(v);

export function useAssociateForm(existing: Associate | undefined, onDone: () => void) {
  const { db } = useData();
  const runAction = useRunAction();
  const [d, setD] = useState<AssociateDraft>(() => toDraft(existing));
  const [tried, setTried] = useState(false);
  const set = (k: keyof AssociateDraft) => (v: string) =>
  setD((p) => ({ ...p, [k]: v, ...(k === 'branchId' ? { zoneId: branches.find((b) => b.id === v)?.zones[0]?.id ?? '' } : {}) }));

  const build = (): Associate => ({
    ...(existing ?? { id: 'NEW', terms: '', billingAccountId: '', since: new Date().toISOString() }),
    name: d.name.trim(), nameBn: d.nameBn.trim(), address: d.address.trim(), tradeLicenceNo: d.tradeLicenceNo.trim(), contactName: d.contactName.trim(), contactPhone: d.contactPhone.trim(),
    territory: d.territory.trim(), responsibleExecutiveId: d.responsibleExecutiveId, branchId: d.branchId as Associate['branchId'], zoneId: d.zoneId, parentId: d.parentId || undefined,
    backbone: d.backbone as Associate['backbone'], lastMile: d.lastMile as Associate['lastMile'], collectionModel: d.collectionModel as Associate['collectionModel'],
    sharingBasis: d.collectionModel === 'Fixed Monthly' ? undefined : d.sharingBasis as Associate['sharingBasis'],
    revenueSharePct: d.collectionModel === 'Fixed Monthly' ? undefined : n(d.revenueSharePct), fixedMonthly: d.collectionModel === 'Fixed Monthly' ? n(d.fixedMonthly) : undefined,
    agreementStart: d.agreementStart ? fromDhakaInput(d.agreementStart, '00:00') : undefined, agreementEnd: d.agreementEnd ? fromDhakaInput(d.agreementEnd, '23:59') : undefined,
    settlementDay: n(d.settlementDay), graceDays: n(d.graceDays), creditLimit: n(d.creditLimit), creditDays: n(d.creditDays), depositRequired: n(d.depositRequired),
    clientIdPrefix: d.clientIdPrefix.trim().toUpperCase(), minRenewalDays: n(d.minRenewalDays), maxRenewalDays: n(d.maxRenewalDays), vatBearer: d.vatBearer as Associate['vatBearer'],
    servicesSummary: d.servicesSummary.trim(), subscribers: n(d.subscribers) ?? 0,
    contacts: existing?.contacts?.length ? existing.contacts.map((c, i) => i === 0 ? { ...c, name: d.contactName.trim(), phone: d.contactPhone.trim() } : c) : [{ role: 'Owner', name: d.contactName.trim(), phone: d.contactPhone.trim() }]
  });

  const errors = validateProfile(db, build(), !existing);
  const visibleErrors = tried ? errors : {};
  const parentFree = d.parentId ? availableAllotment(db, d.parentId, existing?.id) : null;

  const submit = () => {
    setTried(true);
    if (Object.keys(errors).length) return;
    if (runAction({ type: 'ASC_SAVE_PROFILE', associate: build(), isNew: !existing })) onDone();
  };

  return { d, set, errors: visibleErrors, submit, parentFree };
}