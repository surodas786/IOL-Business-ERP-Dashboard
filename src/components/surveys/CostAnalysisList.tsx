import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSession } from '../../contexts/SessionContext';
import { inUserScope } from '../../utils/access';
import { formatBDT } from '../../utils/format';
import { commercialFor, computeCost, paybackLabel, surveyContext, surveyLabel } from '../../utils/surveyRules';
import { AdminPanel } from '../admin/AdminPanel';
import { StatusBadge } from '../records/StatusBadge';
import { CustomerTable } from '../customers/CustomerTable';
import type { Survey } from '../../types/records';

/** Sales / Business Head view of installation investment and payback across surveys with a BOM. */
export function CostAnalysisList() {
  const { db } = useData();
  const { user, branchFilter } = useSession();
  const navigate = useNavigate();
  const rows = db.surveys.
  filter((s) => inUserScope(user, s.branchId) && (branchFilter === 'all' || s.branchId === branchFilter)).
  filter((s) => (s.bom ?? []).length > 0).
  map((s) => ({ s, b: computeCost(s.bom ?? [], commercialFor(db, s)) })).
  sort((a, b) => (a.b.paybackMonths ?? 999) - (b.b.paybackMonths ?? 999));

  return (
    <AdminPanel
      title="Installation cost analysis"
      description="Proposed demo formula — awaiting Finance confirmation. Net installation investment = company-funded installation cost − net OTC recovery; payback = investment ÷ positive monthly contribution."
      actions={<StatusBadge status="Awaiting IOL confirmation" />}>
      
      <CustomerTable<{s: Survey;b: ReturnType<typeof computeCost>;}>
        minWidth={900}
        rows={rows}
        rowKey={(r) => r.s.id}
        onOpen={(r) => navigate(`/surveys/records/${r.s.id}/cost`)}
        empty="No surveys with a bill of materials yet."
        columns={[
        { label: 'Survey', cell: ({ s }) => <span><span className="block font-semibold text-slate-900">{surveyContext(db, s).name}</span><span className="block text-[11px] text-slate-500">{s.id} · {s.siteLabel}</span></span> },
        { label: 'Status', cell: ({ s }) => <StatusBadge status={surveyLabel(s)} /> },
        { label: 'Company-funded cost', align: 'right', cell: ({ b }) => formatBDT(b.companyFundedInstall) },
        { label: 'Net OTC recovery', align: 'right', cell: ({ b }) => formatBDT(b.netOtcRecovery) },
        { label: 'Net investment', align: 'right', cell: ({ b }) => <span className="font-semibold text-slate-900">{formatBDT(b.netInvestment)}</span> },
        { label: 'Monthly contribution', align: 'right', cell: ({ b }) => <span className={b.monthlyContribution <= 0 ? 'font-semibold text-status-critical' : ''}>{formatBDT(b.monthlyContribution)}</span> },
        { label: 'Payback', align: 'right', cell: ({ b }) => <span className={`font-semibold ${b.paybackMonths === null ? 'text-status-critical' : 'text-slate-900'}`}>{paybackLabel(b)}</span> }]
        } />
      
    </AdminPanel>);

}