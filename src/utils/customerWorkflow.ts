import { roles } from '../data/roles';
import { branches } from '../data/branches';
import { nextId, userName } from './relations';
import {
  canApproveCorrection,
  canEditProfile,
  canRequestCorrection,
  correctionsOpen,
  currentSnapshot,
  customerInvoices,
  customerQuotations,
  fieldValue,
  isLocked,
  profileStage,
  segmentFor } from
'./customerProfile';
import type { BranchId } from '../types/erp';
import type { Customer, DemoDatabase, EntityRef } from '../types/records';
import { FIELD_LABEL, RESTRICTED_FIELDS, type CorrectableField, type CustomerContact, type CustomerProfileCategory } from '../types/customer';
import type { Actor, WorkflowResult } from './workflow';

export interface ProfileDraft {
  name: string;
  nameBn: string;
  category: CustomerProfileCategory;
  registeredAddress: string;
  tradeLicenceNo: string;
  tin: string;
  branchId: BranchId;
  zoneId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export type CustomerAction =
{type: 'CUST_SAVE_DRAFT';customerId?: string;draft: ProfileDraft;} |
{type: 'CUST_SUBMIT_PROFILE';customerId: string;stage: 'Survey' | 'Negotiation';} |
{type: 'CUST_ADD_CONTACT';customerId: string;contact: Omit<CustomerContact, 'id'>;} |
{type: 'CUST_REQUEST_CORRECTION';customerId: string;field: CorrectableField;proposedValue: string;reason: string;} |
{type: 'CUST_DECIDE_CORRECTION';correctionId: string;decision: 'Approved' | 'Rejected';note: string;};

export function isCustomerAction(a: {type: string;}): a is CustomerAction {
  return a.type.startsWith('CUST_');
}

export function validateProfileDraft(d: ProfileDraft, creating: boolean): Partial<Record<keyof ProfileDraft, string>> {
  const e: Partial<Record<keyof ProfileDraft, string>> = {};
  if (d.name.trim().length < 3) e.name = 'Enter the legal name.';
  if (!d.registeredAddress.trim()) e.registeredAddress = 'Enter the registered address.';
  if (!branches.some((b) => b.id === d.branchId && b.zones.some((z) => z.id === d.zoneId))) e.zoneId = 'Choose a zone in the selected branch.';
  if (creating && !d.contactName.trim()) e.contactName = 'Add the primary contact.';
  if (creating && !/^\+?880?\s?1\d{3}[-\s]?\d{6}$/.test(d.contactPhone.trim()) && !/^01\d{9}$/.test(d.contactPhone.replace(/[-\s]/g, '')))
  e.contactPhone = 'Use a Bangladesh mobile number, e.g. 01711-330245.';
  if (d.contactEmail && !/^\S+@\S+\.\S+$/.test(d.contactEmail)) e.contactEmail = 'Check the email address.';
  return e;
}

export function applyCustomerAction(db: DemoDatabase, action: CustomerAction, actor: Actor, at: string): WorkflowResult {
  const fail = (message: string): WorkflowResult => ({ db, message, ok: false });
  const user = db.users.find((u) => u.id === actor.id);
  const role = roles.find((r) => r.id === user?.role);
  if (!user || !role || !role.modules.includes('customers')) return fail('Your role doesn’t include Customers.');

  const d: DemoDatabase = structuredClone(db);
  const ok = (message: string): WorkflowResult => ({ db: d, message, ok: true });
  const ref = (id: string): EntityRef => ({ type: 'customer', id });
  const audit = (act: string, summary: string, entity: EntityRef, related: EntityRef[] = []) =>
  d.auditEvents.unshift({ id: nextId(d.auditEvents, 'AE-', 5), at, actorName: actor.name, actorId: actor.id, action: act, summary, entity, related });
  const notify = (title: string, detail: string, c: Customer, requires?: ('manageSalesTeam' | 'manageWorkOrders')[]) =>
  d.notifications.unshift({ id: nextId(d.notifications, 'NT-', 4), at, readBy: [actor.id], title, detail, module: 'customers', branchId: c.branchId, entity: ref(c.id), requires });
  const get = (id: string) => d.customers.find((c) => c.id === id);

  switch (action.type) {
    case 'CUST_SAVE_DRAFT':{
        if (!canEditProfile(role)) return fail('Your role can’t create or edit customer profiles.');
        const dr = action.draft;
        const err = Object.values(validateProfileDraft(dr, !action.customerId))[0];
        if (err) return fail(err);
        if (action.customerId) {
          const c = get(action.customerId);
          if (!c) return fail('Customer not found.');
          if (isLocked(d, c)) return fail('This profile is locked. Use “Request correction at Work Order stage”.');
          Object.assign(c, {
            name: dr.name.trim(), nameBn: dr.nameBn.trim(), category: dr.category, segment: segmentFor(dr.category), registeredAddress: dr.registeredAddress.trim(),
            tradeLicenceNo: dr.tradeLicenceNo.trim() || undefined, tin: dr.tin.trim() || undefined, branchId: dr.branchId, zoneId: dr.zoneId
          });
          audit('Draft profile edited', `${c.name} — draft details updated`, ref(c.id));
          return ok('Draft profile saved.');
        }
        const id = nextId(d.customers, 'CU-', 4);
        d.customers.push({
          id, name: dr.name.trim(), nameBn: dr.nameBn.trim(), segment: segmentFor(dr.category), category: dr.category, accountManagerId: user.id, status: 'Prospect', since: at,
          profileStage: 'Draft', registeredAddress: dr.registeredAddress.trim(), tradeLicenceNo: dr.tradeLicenceNo.trim() || undefined, tin: dr.tin.trim() || undefined,
          contacts: [{ id: `${id}-c1`, role: 'Primary', name: dr.contactName.trim(), designation: '', phone: dr.contactPhone.trim(), email: dr.contactEmail.trim() }],
          documents: [], branchId: dr.branchId, zoneId: dr.zoneId
        });
        audit('Draft profile created', `${dr.name.trim()} (${dr.category})`, ref(id));
        return ok(`Draft profile ${id} created. Core fields stay editable until it is submitted.`);
      }

    case 'CUST_SUBMIT_PROFILE':{
        const c = get(action.customerId);
        if (!c) return fail('Customer not found.');
        if (!canEditProfile(role)) return fail('Your role can’t submit customer profiles.');
        if (c.profileStage !== 'Draft') return fail('This profile has already been submitted.');
        if (!c.registeredAddress) return fail('Add the registered address before submitting.');
        c.profileStage = action.stage;
        c.submittedAt = at;
        audit(`Profile submitted into ${action.stage}`, `${c.name} — legal name, category, registered address, licence/TIN and location are now locked`, ref(c.id));
        notify(`Customer profile submitted into ${action.stage}`, `${c.name} · core fields locked`, c);
        return ok(`Submitted into ${action.stage}. Core identity, location and category fields are now locked.`);
      }

    case 'CUST_ADD_CONTACT':{
        const c = get(action.customerId);
        if (!c) return fail('Customer not found.');
        if (!canEditProfile(role) && !role.permissions.includes('assignTickets')) return fail('Your role can’t add contacts.');
        const ct = action.contact;
        if (!ct.name.trim() || !ct.phone.trim() && !ct.email.trim()) return fail('A contact needs a name and a phone number or email.');
        if (ct.role === 'Billing' && !role.permissions.includes('viewFinancials') && !role.permissions.includes('manageWorkOrders')) return fail('Billing contacts are maintained by Accounts or Back Office.');
        if (!c.contacts) c.contacts = [];
        const all = d.customers.flatMap((x) => x.contacts ?? []);
        c.contacts.push({ ...ct, id: nextId(all, 'CC-', 4), name: ct.name.trim() });
        audit('Contact added', `${ct.role} contact ${ct.name.trim()} added to ${c.name}`, ref(c.id));
        return ok(`${ct.role} contact added. Contacts aren’t locked fields.`);
      }

    case 'CUST_REQUEST_CORRECTION':{
        const c = get(action.customerId);
        if (!c) return fail('Customer not found.');
        if (!canRequestCorrection(role)) return fail('Your role can’t request profile corrections.');
        if (!isLocked(d, c)) return fail('Draft profiles can be edited directly.');
        if (!correctionsOpen(d, c)) return fail(`Corrections open at the Work Order stage. This profile is at ${profileStage(d, c)}.`);
        if (RESTRICTED_FIELDS.includes(action.field) && !role.permissions.some((p) => p === 'manageWorkOrders' || p === 'manageSalesTeam' || p === 'recordCollection'))
        return fail('Identity numbers are restricted for your role.');
        const oldValue = fieldValue(c, action.field);
        const proposed = action.proposedValue.trim();
        if (!proposed) return fail('Enter the proposed value.');
        if (proposed === oldValue) return fail('The proposed value is the same as the current value.');
        if (action.reason.trim().length < 15) return fail('Give a reason of at least 15 characters, with the supporting document.');
        if (d.profileCorrections.some((p) => p.customerId === c.id && p.field === action.field && p.status === 'Pending')) return fail(`A ${FIELD_LABEL[action.field].toLowerCase()} correction is already awaiting approval.`);
        const id = nextId(d.profileCorrections, 'PC-', 4);
        d.profileCorrections.unshift({ id, customerId: c.id, field: action.field, oldValue, proposedValue: proposed, reason: action.reason.trim(), requestedById: user.id, requestedAt: at, status: 'Pending', branchId: c.branchId, zoneId: c.zoneId });
        audit('Correction requested', `${id} · ${c.name} · ${FIELD_LABEL[action.field]}: “${oldValue}” → “${proposed}”`, ref(c.id));
        notify('Profile correction awaiting approval', `${c.name} · ${FIELD_LABEL[action.field]} · requested by ${user.name}`, c, ['manageSalesTeam']);
        return ok(`Correction ${id} sent for approval. The profile keeps its current value until approved.`);
      }

    case 'CUST_DECIDE_CORRECTION':{
        const pc = d.profileCorrections.find((p) => p.id === action.correctionId);
        if (!pc || pc.status !== 'Pending') return fail('This correction has already been decided.');
        if (!canApproveCorrection(role)) return fail('Only Management or the Business Head can approve profile corrections.');
        if (pc.requestedById === user.id) return fail('You can’t approve a correction you requested.');
        if (pc.returned) return fail('This correction was returned to the requester. Wait for it to be resubmitted.');
        if (action.note.trim().length < 10) return fail('A comment of at least 10 characters is required for every decision.');
        const c = get(pc.customerId);
        if (!c) return fail('Customer not found.');
        pc.status = action.decision;
        pc.decidedById = user.id;
        pc.decidedAt = at;
        pc.decisionNote = action.note.trim() || undefined;

        if (action.decision === 'Approved') {
          // Freeze historical documents first, so they keep the identity they were issued under.
          const frozen: string[] = [];
          customerQuotations(d, c).forEach((q) => {
            if (!q.customerSnapshot) q.customerSnapshot = currentSnapshot(c, q.createdAt);
            frozen.push(q.id);
          });
          d.workOrders.filter((w) => w.customerId === c.id).forEach((w) => {
            if (!w.customerSnapshot) w.customerSnapshot = currentSnapshot(c, w.createdAt);
            frozen.push(w.id);
          });
          customerInvoices(d, c).forEach((i) => {
            if (!i.customerSnapshot) i.customerSnapshot = currentSnapshot(c, i.issuedAt);
            frozen.push(i.id);
          });
          pc.frozenDocs = frozen;
          if (pc.field === 'category') {
            c.category = pc.proposedValue as CustomerProfileCategory;
            c.segment = segmentFor(c.category);
          } else {
            (c as unknown as Record<string, string>)[pc.field] = pc.proposedValue;
          }
        }
        const verb = action.decision.toLowerCase();
        audit(`Correction ${verb}`, `${pc.id} · ${c.name} · ${FIELD_LABEL[pc.field]}${action.decision === 'Approved' ? ` now “${pc.proposedValue}”; ${pc.frozenDocs?.length ?? 0} documents keep their issued snapshot` : ''}${pc.decisionNote ? ` — ${pc.decisionNote}` : ''}`, ref(c.id));
        notify(`Profile correction ${verb}`, `${c.name} · ${FIELD_LABEL[pc.field]} · requested by ${userName(pc.requestedById)}`, c);
        return ok(action.decision === 'Approved' ? `Correction approved. Quotations, work orders and invoices keep their original snapshot.` : 'Correction rejected.');
      }
  }
}