import { branches } from '../data/branches';
import { fromDhakaInput } from './format';
import type { BranchId } from '../types/erp';
import type { CommunicationChannel, CustomerCategory, ExpansionType } from '../types/crm';
import type { DemoDatabase, LeadSource, ServiceType } from '../types/records';

export interface LeadDraft {
  company: string;
  companyBn: string;
  category: CustomerCategory;
  customerId: string;
  expansion: ExpansionType;
  contactName: string;
  contactDesignation: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  siteName: string;
  siteAddress: string;
  serviceType: ServiceType;
  bandwidthMbps: string;
  source: LeadSource;
  agentId: string;
  referral: string;
  branchId: BranchId | '';
  zoneId: string;
  ownerId: string;
  expectedMrc: string;
  otc: string;
  expectedDecisionDate: string;
  nextAction: string;
  nextActionDue: string;
  firstNote: string;
  firstNoteChannel: CommunicationChannel;
  interest: boolean;
  isTender: boolean;
  tenderReference: string;
  tenderTitle: string;
  clarificationDeadline: string;
  submissionDeadline: string;
}

export type LeadDraftErrors = Partial<Record<keyof LeadDraft, string>>;

export const SERVICE_TYPES: ServiceType[] = ['Dedicated Internet', 'Broadband', 'IP Transit', 'Data Connectivity'];

export function emptyLeadDraft(ownerId: string, branchId: BranchId | null): LeadDraft {
  return {
    company: '',
    companyBn: '',
    category: 'Corporate',
    customerId: '',
    expansion: 'New customer',
    contactName: '',
    contactDesignation: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    siteName: '',
    siteAddress: '',
    serviceType: 'Dedicated Internet',
    bandwidthMbps: '',
    source: 'Direct',
    agentId: '',
    referral: '',
    branchId: branchId ?? '',
    zoneId: '',
    ownerId,
    expectedMrc: '',
    otc: '',
    expectedDecisionDate: '',
    nextAction: '',
    nextActionDue: '',
    firstNote: '',
    firstNoteChannel: 'Call',
    interest: false,
    isTender: false,
    tenderReference: '',
    tenderTitle: '',
    clarificationDeadline: '',
    submissionDeadline: ''
  };
}

const num = (v: string) => Number(v.replace(/,/g, ''));

export function validateLeadDraft(db: DemoDatabase, d: LeadDraft, nowIso: string): LeadDraftErrors {
  const e: LeadDraftErrors = {};
  if (d.expansion !== 'New customer' && !d.customerId) e.customerId = 'Choose the existing customer.';
  if (!d.company.trim()) e.company = 'Enter the organisation name.';
  if (!d.contactName.trim()) e.contactName = 'Enter a contact name, even if provisional.';
  if (d.contactPhone && !/^(\+?880|0)1[3-9]\d{8}$/.test(d.contactPhone.replace(/[\s-]/g, ''))) e.contactPhone = 'Use a Bangladesh mobile number, e.g. +880 1712-345678.';
  if (d.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contactEmail)) e.contactEmail = 'Enter a valid email address.';
  if (!d.siteAddress.trim()) e.siteAddress = 'Enter the service site address.';
  if (!(num(d.bandwidthMbps) > 0)) e.bandwidthMbps = 'Enter the requested bandwidth.';
  if (d.source === 'Sales Agent' && !d.agentId) e.agentId = 'Choose the sales agent.';
  if (d.source === 'Referral' && !d.referral.trim()) e.referral = 'Who referred this customer?';
  if (!d.branchId) e.branchId = 'Choose a branch.';
  const branch = branches.find((b) => b.id === d.branchId);
  if (d.branchId && !branch?.zones.some((z) => z.id === d.zoneId)) e.zoneId = 'Choose a zone in this branch.';
  if (!db.users.some((u) => u.id === d.ownerId && u.status === 'Active')) e.ownerId = 'Choose an active sales owner.';
  if (!(num(d.expectedMrc) > 0)) e.expectedMrc = 'Enter the expected monthly value.';
  if (!d.expectedDecisionDate) e.expectedDecisionDate = 'Enter the expected decision date.';
  if (!d.nextAction.trim()) e.nextAction = 'Every opportunity needs a next action.';
  if (!d.nextActionDue) e.nextActionDue = 'When is the next action due?';else
  if (fromDhakaInput(d.nextActionDue) < nowIso) e.nextActionDue = 'The next action can’t be due in the past.';
  if (d.isTender) {
    if (!d.tenderReference.trim()) e.tenderReference = 'Enter the tender reference.';
    if (!d.submissionDeadline) e.submissionDeadline = 'Enter the submission deadline.';
    if (d.clarificationDeadline && d.submissionDeadline && d.clarificationDeadline > d.submissionDeadline)
    e.clarificationDeadline = 'Clarification must close before submission.';
  }
  return e;
}

export function parseAmount(v: string): number {
  return num(v) || 0;
}