import React from 'react';

type Tone = 'critical' | 'warning' | 'ok' | 'info' | 'neutral';

const TONES: Record<Tone, string[]> = {
  critical: ['Cancelled', 'Exception rejected', 'Blocked', 'Overdue', 'Rejected', 'Negative', 'Urgent', 'Disconnected', 'Not Feasible', 'Lost', 'Fail', 'Reversed', 'Revoked', 'Exception Rejected', 'Damaged', 'Suspended', 'Past grace — suspension review', 'Expired', 'Customer disputes', 'On Leave'],
  warning: ['Awaiting verification', 'Exception requested', 'Awaiting acknowledgement', 'Pending', 'Pending Approval', 'Pending Verification', 'Awaiting Clearance', 'Unpaid', 'Partially Paid', 'Open', 'Requested', 'Pending Activation', 'Disconnection Pending', 'Completed — awaiting billing', 'High', 'Awaiting IOL confirmation', 'Stalled', 'Preparing', 'Returned', 'Neutral', 'Rescheduled', 'Submitted for Technical Review', 'Awaiting assignment', 'Feasible with conditions', 'Bypass pending', 'Pending Assignment', 'On Hold', 'Work Completed', 'Temporarily Stopped', 'Stopped', 'Service Stopped', 'Exception Requested', 'Awaiting Inspection', 'Receivable', 'Suspension Review', 'Due soon', 'Confirmation pending', 'Customer unreachable', 'On call'],
  ok: ['Exception approved', 'Acknowledged', 'Ready to release', 'Released', 'Approved', 'Accepted', 'Paid', 'Verified', 'Active', 'Completed', 'Resolved', 'Billed', 'Won', 'Converted', 'Cleared', 'Completed — Feasible', 'Receipt', 'Return', 'Confirmed', 'Closed Won', 'Positive', 'Feasible', 'Approved — Feasible', 'Bypass approved', 'Closed', 'Fulfilled', 'Pass', 'Implemented', 'Resumed', 'Exception Approved', 'Installed', 'In Stock', 'Inspected', 'Paid/Remitted', 'Reconciled', 'Settled', 'Confirmed by customer', 'Day', 'Evening', 'Night'],
  info: ['Scheduled', 'In Progress', 'Assigned', 'Onboarding', 'Work Order Raised', 'Negotiation', 'Quotation', 'Survey', 'Qualified', 'New', 'Issue', 'Transfer', 'Qualification', 'Suspect', 'Prospect', 'Work Order', 'Submitted', 'Duplicate review', 'Back Office Review', 'Reviewed', 'Draft', 'Accrued', 'Self-Sale', 'Ended'],
  neutral: []
};

const CLASSES: Record<Tone, string> = {
  critical: 'bg-rose-50 text-status-critical ring-rose-200',
  warning: 'bg-amber-50 text-status-warning ring-amber-200',
  ok: 'bg-emerald-50 text-status-ok ring-emerald-200',
  info: 'bg-blue-50 text-status-info ring-blue-200',
  neutral: 'bg-slate-50 text-slate-600 ring-slate-200'
};

export function toneFor(status: string): Tone {
  for (const tone of Object.keys(TONES) as Tone[]) {
    if (TONES[tone].includes(status)) return tone;
  }
  return 'neutral';
}

export function StatusBadge({ status }: {status: string;}) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded px-1.5 py-px text-[10.5px] font-semibold ring-1 ring-inset ${CLASSES[toneFor(status)]}`}>
      {status}
    </span>);

}