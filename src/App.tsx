import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DataProvider } from './contexts/DataContext';
import { SessionProvider } from './contexts/SessionContext';
import { RecordDrawerProvider } from './contexts/RecordDrawerContext';
import { AppShell } from './components/shell/AppShell';
import { Dashboard } from './pages/Dashboard';
import { ModuleWorkspace } from './pages/ModuleWorkspace';
import { Administration } from './pages/Administration';
import { SalesCrm } from './pages/SalesCrm';
import { OpportunityDetail } from './pages/OpportunityDetail';
import { TenderDetail } from './pages/TenderDetail';
import { FieldActivities } from './pages/FieldActivities';
import { Customers } from './pages/Customers';
import { CustomerDetail } from './pages/CustomerDetail';
import { Surveys } from './pages/Surveys';
import { SurveyDetail } from './pages/SurveyDetail';
import { Quotations } from './pages/Quotations';
import { QuotationDetail } from './pages/QuotationDetail';
import { WorkOrderDetail } from './pages/WorkOrderDetail';
import { SalesAgents } from './pages/SalesAgents';
import { SupportTickets } from './pages/SupportTickets';
import { Approvals } from './pages/Approvals';
import { Reports } from './pages/Reports';
import { OperationalFinance } from './pages/OperationalFinance';
import { TicketDetail } from './pages/TicketDetail';
import { SalesAgentDetail } from './pages/SalesAgentDetail';
import { CommissionProposalDetail } from './pages/CommissionProposalDetail';
import { Installations } from './pages/Installations';
import { InstallationJobDetail } from './pages/InstallationJobDetail';
import { Billing } from './pages/Billing';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { ReceiptDetail } from './pages/ReceiptDetail';
import { BillingStatement } from './pages/BillingStatement';
import { ServiceChanges } from './pages/ServiceChanges';
import { Inventory } from './pages/Inventory';
import { Associates } from './pages/Associates';
import { AssociateDetail } from './pages/AssociateDetail';
import { AssociateSettlementDetail } from './pages/AssociateSettlementDetail';
import { ServiceChangeDetail } from './pages/ServiceChangeDetail';

export function App() {
  return (
    <DataProvider>
      <SessionProvider>
        <RecordDrawerProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="administration" element={<Administration />} />
                <Route path="administration/:section" element={<Administration />} />
                <Route path="sales-crm" element={<SalesCrm />} />
                <Route path="sales-crm/opportunities/:id" element={<OpportunityDetail />} />
                <Route path="sales-crm/tenders/:id" element={<TenderDetail />} />
                <Route path="sales-crm/:view" element={<SalesCrm />} />
                <Route path="field-activities" element={<FieldActivities />} />
                <Route path="field-activities/:view" element={<FieldActivities />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetail />} />
                <Route path="customers/:id/:tab" element={<CustomerDetail />} />
                <Route path="surveys" element={<Surveys />} />
                <Route path="surveys/records/:id" element={<SurveyDetail />} />
                <Route path="surveys/records/:id/:tab" element={<SurveyDetail />} />
                <Route path="surveys/:view" element={<Surveys />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="quotations/records/:id" element={<QuotationDetail />} />
                <Route path="quotations/wo/:id" element={<WorkOrderDetail />} />
                <Route path="quotations/:view" element={<Quotations />} />
                <Route path="installations" element={<Installations />} />
                <Route path="installations/jobs/:id" element={<InstallationJobDetail />} />
                <Route path="installations/:view" element={<Installations />} />
                <Route path="billing" element={<Billing />} />
                <Route path="billing/invoice/:id" element={<InvoiceDetail />} />
                <Route path="billing/receipt/:id" element={<ReceiptDetail />} />
                <Route path="billing/statement/:id" element={<BillingStatement />} />
                <Route path="billing/:view" element={<Billing />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="inventory/:view" element={<Inventory />} />
                <Route path="support-tickets" element={<SupportTickets />} />
                <Route path="support-tickets/records/:id" element={<TicketDetail />} />
                <Route path="support-tickets/:view" element={<SupportTickets />} />
                <Route path="sales-agents" element={<SalesAgents />} />
                <Route path="sales-agents/records/:id" element={<SalesAgentDetail />} />
                <Route path="sales-agents/proposals/:id" element={<CommissionProposalDetail />} />
                <Route path="sales-agents/:view" element={<SalesAgents />} />
                <Route path="associates" element={<Associates />} />
                <Route path="associates/records/:id" element={<AssociateDetail />} />
                <Route path="associates/settlements/:id" element={<AssociateSettlementDetail />} />
                <Route path="associates/:view" element={<Associates />} />
                <Route path="service-changes" element={<ServiceChanges />} />
                <Route path="service-changes/records/:id" element={<ServiceChangeDetail />} />
                <Route path="service-changes/:view" element={<ServiceChanges />} />
                <Route path="reports" element={<Reports />} />
                <Route path="reports/:group" element={<Reports />} />
                <Route path="approvals" element={<Approvals />} />
                <Route path="approvals/:view" element={<Approvals />} />
                <Route path="operational-finance" element={<OperationalFinance />} />
                <Route path="operational-finance/:view" element={<OperationalFinance />} />
                <Route path=":moduleSlug" element={<ModuleWorkspace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" richColors closeButton />
        </RecordDrawerProvider>
      </SessionProvider>
    </DataProvider>);

}