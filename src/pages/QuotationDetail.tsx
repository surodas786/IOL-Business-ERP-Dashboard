import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon, LockIcon, PencilIcon, PrinterIcon, SendIcon, FilePlus2Icon, BanIcon } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useRunAction } from '../hooks/useRunAction';
import { hasPermission, inUserScope } from '../utils/access';
import { formatDhaka } from '../utils/format';
import { userName } from '../utils/relations';
import { canOpenQuotePage, currentVersion, quoteName, quoteNextStep } from '../utils/quoteRules';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StatusBadge } from '../components/records/StatusBadge';
import { linkBtn, primaryBtn, secondaryBtn } from '../components/admin/AdminPanel';
import { QuoteTermsView } from '../components/quotations/QuoteTermsView';
import { VersionHistory } from '../components/quotations/VersionHistory';
import { ReleaseChecklist } from '../components/quotations/ReleaseChecklist';
import { QuoteApprovalsPanel } from '../components/quotations/QuoteApprovalsPanel';
import { QuoteEditorDialog } from '../components/quotations/QuoteEditorDialog';
import { AcceptanceDialog } from '../components/quotations/AcceptanceDialog';
import { ReasonDialog } from '../components/quotations/ReasonDialog';
import { PrintPreview } from '../components/quotations/PrintPreview';
import { QuotePrintDocument } from '../components/quotations/QuotePrintDocument';

type Dialog = 'edit' | 'revise' | 'accept' | 'cancel' | 'exception' | 'print' | null;

export function QuotationDetail() {
  const { id } = useParams();
  const { db } = useData();
  const { user, role } = useSession();
  const runAction = useRunAction();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<number | null>(null);

  if (!canOpenQuotePage(role)) return <AccessDenied title="Quotations and Work Orders" module="quotations" />;
  const q = db.quotations.find((x) => x.id === id);
  if (!q || !inUserScope(user, q.branchId) || !q.versions?.length) {
    return (
      <div className="px-4 py-10 text-center lg:px-5">
        <p className="text-[13px] text-slate-600">{q && !inUserScope(user, q.branchId) ? 'This quotation is outside your branch scope.' : 'Quotation not found.'}</p>
        <Link to="/quotations" className={`${linkBtn} mt-2 inline-block`}>
          Back to quotations
        </Link>
      </div>);

  }

  const cur = currentVersion(q)!;
  const shownNo = selected ?? cur.version;
  const shown = q.versions.find((v) => v.version === shownNo) ?? cur;
  const previous = q.versions.find((v) => v.version === shown.version - 1);
  const prepare = hasPermission(role, 'createQuotation');
  const approver = hasPermission(role, 'approveQuotation');
  const open = q.status !== 'Cancelled' && !q.workOrderId;
  const opp = db.opportunities.find((o) => o.id === q.opportunityId);
  const lead = db.leads.find((l) => l.id === opp?.leadId);
  const canCancel = open && (q.status === 'Approved' ? approver : prepare || approver);

  return (
    <div className="px-4 pb-10 pt-4 lg:px-5">
      <Link to="/quotations" className="mb-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden /> Quotations
      </Link>

      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-slate-400">
            {q.id} · v{cur.version} · {q.opportunityId}
          </p>
          <h1 className="text-[19px] font-bold leading-snug text-slate-900">{quoteName(db, q)}</h1>
          <p className="text-[12.5px] text-slate-600">
            {cur.terms.siteName} · {cur.terms.serviceType} {cur.terms.bandwidthMbps} Mbps · prepared by {userName(q.preparedById)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={q.status === 'Accepted' ? 'Released' : q.status} />
            <span className="text-[11.5px] text-slate-500">{quoteNextStep(db, q)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryBtn} onClick={() => setDialog('print')}>
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> Print preview
          </button>
          {open && prepare && cur.status === 'Draft' &&
          <>
              <button type="button" className={secondaryBtn} onClick={() => setDialog('edit')}>
                <PencilIcon className="h-3.5 w-3.5" aria-hidden /> Edit draft
              </button>
              <button type="button" className={primaryBtn} onClick={() => runAction({ type: 'QUOTE_SUBMIT', quotationId: q.id })}>
                <SendIcon className="h-3.5 w-3.5" aria-hidden /> Submit for approval
              </button>
            </>
          }
          {open && prepare && cur.status !== 'Draft' &&
          <button type="button" className={secondaryBtn} onClick={() => setDialog('revise')}>
              <FilePlus2Icon className="h-3.5 w-3.5" aria-hidden /> Revise
            </button>
          }
          {canCancel &&
          <button type="button" className={`${secondaryBtn} text-status-critical`} onClick={() => setDialog('cancel')}>
              <BanIcon className="h-3.5 w-3.5" aria-hidden /> Cancel quotation
            </button>
          }
        </div>
      </header>

      {q.status === 'Cancelled' && q.cancelReason &&
      <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12.5px] text-slate-800">
          <span className="font-semibold">Cancelled:</span> {q.cancelReason}
        </p>
      }
      {q.workOrderId &&
      <p className="mb-3 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[12.5px] text-slate-700">
          Released as{' '}
          <Link to={`/quotations/wo/${q.workOrderId}`} className="font-semibold text-primary hover:text-primary-hover">
            {q.workOrderId}
          </Link>
          . Terms are locked; changes go through a work order revision.
        </p>
      }

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <section aria-label={`Terms of version ${shown.version}`} className="rounded-md border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
              <div>
                <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900">
                  Terms — v{shown.version}
                  {shown.status !== 'Draft' && <LockIcon className="h-3.5 w-3.5 text-slate-400" aria-label="Locked" />}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {shown.status === 'Draft' ? 'Draft — editable until submitted' : `${shown.status} · read-only`}
                  {previous && ' · rows changed from the previous version are highlighted'}
                </p>
              </div>
              {shown.version !== cur.version &&
              <button type="button" className={linkBtn} onClick={() => setSelected(null)}>
                  Back to current v{cur.version}
                </button>
              }
            </header>
            <QuoteTermsView terms={shown.terms} previous={previous?.terms} />
          </section>

          <section aria-label="Customer acceptance" className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <h2 className="text-[13px] font-bold text-slate-900">Customer acceptance evidence</h2>
            {q.acceptance ?
            <dl className="mt-1.5 grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] text-slate-500">Version accepted</dt>
                  <dd className={q.acceptance.version === cur.version ? 'text-slate-900' : 'font-semibold text-status-warning'}>
                    v{q.acceptance.version}
                    {q.acceptance.version !== cur.version && ` — not the current v${cur.version}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Method</dt>
                  <dd>{q.acceptance.method}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Evidence</dt>
                  <dd>
                    {q.acceptance.reference}
                    {q.acceptance.fileName && <span className="block text-[11px] text-slate-500">{q.acceptance.fileName}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Accepted by</dt>
                  <dd>
                    {q.acceptance.acceptedByName} · {formatDhaka(q.acceptance.acceptedAt, { year: true })}
                    <span className="block text-[11px] text-slate-500">Recorded by {userName(q.acceptance.recordedById)}</span>
                  </dd>
                </div>
              </dl> :

            <p className="mt-1 text-[12px] text-slate-500">{cur.status === 'Approved' ? 'Not recorded yet.' : 'Can be recorded once the current version is approved.'}</p>
            }
          </section>
        </div>

        <aside className="space-y-3">
          <ReleaseChecklist quotation={q} onRecordAcceptance={() => setDialog('accept')} onRequestException={() => setDialog('exception')} />
          <QuoteApprovalsPanel quotation={q} version={shown.version} />
          <VersionHistory versions={q.versions} selected={shown.version} onSelect={setSelected} />
        </aside>
      </div>

      <AnimatePresence>
        {dialog === 'edit' && <QuoteEditorDialog key="edit" mode={{ kind: 'edit', quotationId: q.id }} initial={cur.terms} customerId={q.customerId} onClose={() => setDialog(null)} />}
        {dialog === 'revise' &&
        <QuoteEditorDialog
          key="revise"
          mode={{ kind: 'revise', quotationId: q.id, fromVersion: cur.version }}
          initial={structuredClone(cur.terms)}
          customerId={q.customerId}
          onClose={() => {
            setDialog(null);
            setSelected(null);
          }} />

        }
        {dialog === 'accept' && <AcceptanceDialog key="accept" quotationId={q.id} version={cur.version} defaultContact={lead?.contactName} onClose={() => setDialog(null)} />}
        {dialog === 'cancel' &&
        <ReasonDialog
          key="cancel"
          title={`Cancel ${q.id}`}
          description="Pending approvals are withdrawn. Every version is kept for audit."
          label="Reason for cancellation"
          submitLabel="Cancel quotation"
          tone="danger"
          onSubmit={(reason) => runAction({ type: 'QUOTE_CANCEL', quotationId: q.id, reason })}
          onClose={() => setDialog(null)} />

        }
        {dialog === 'exception' &&
        <ReasonDialog
          key="exception"
          title="Request advance exception"
          description="Sent to the Finance Approver. Release stays blocked until it is approved or the advance is verified."
          label="Why should the work order proceed without the advance?"
          submitLabel="Send for approval"
          onSubmit={(reason) => runAction({ type: 'QUOTE_REQUEST_ADVANCE_EXCEPTION', quotationId: q.id, reason })}
          onClose={() => setDialog(null)} />

        }
        {dialog === 'print' &&
        <PrintPreview key="print" title={`${q.id} v${shown.version} — quotation`} note="Customer copy · no margin or commission · fictional demo data" onClose={() => setDialog(null)}>
            <QuotePrintDocument quotation={q} version={shown} />
          </PrintPreview>
        }
      </AnimatePresence>
    </div>);

}