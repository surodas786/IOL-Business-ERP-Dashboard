export interface GuideScenario {
  title: string;
  steps: string;
  asUser: string;
  path: string;
}

export const demoScenarios: GuideScenario[] = [
{ title: 'Lead to billing', steps: 'New lead → survey request → quotation and approvals → Work Order release → installation job → verification → billing run.', asUser: 'Sales Executive, then Technical Supervisor, then Accounts Officer', path: '/sales-crm' },
{ title: 'Agent-sourced deal', steps: 'Commission proposal (Business Head only can decide) → qualifying event confirmed → accrual → settlement approved by Finance → payment.', asUser: 'Sales Executive, Business Head, Accounts Officer', path: '/sales-agents' },
{ title: 'Associate settlement', steps: 'Declared collection → settlement Draft → Reviewed → Approved → verified remittance → Reconciled. A declaration is never a remittance.', asUser: 'Accounts Officer, Finance Approver', path: '/associates' },
{ title: 'Upgrade', steps: 'Service change request → technical and commercial assessment → approval with effective date → implementation evidence → billing from the effective date.', asUser: 'Account Manager, Technical Supervisor, Business Head', path: '/service-changes' },
{ title: 'Disconnection', steps: 'Discontinuation approved → technical and accounts clearance in parallel → final closure once both are cleared or excepted.', asUser: 'Technical Supervisor and Accounts Officer', path: '/service-changes' },
{ title: 'Support ticket', steps: 'Simulate an incoming call → assign by zone and skill → resolve with work and materials → record customer confirmation → close (Account Manager notified).', asUser: 'Support Staff, Technical Supervisor', path: '/support-tickets' }];


export const demoRules: string[] = [
'Conflicting sales ownership, duplicate serials, negative stock and duplicate recurring invoices are blocked.',
'Nobody can approve their own request. Agent commission terms are decided only by the Business Head.',
'Technical roles never see customer financial figures; Accounts cannot edit technical configuration.',
'Unverified payments do not change balances. Security deposits are kept separate from advances.',
'An expected resumption date never reactivates a service by itself.'];


export const simulatedIntegrations: string[] = [
'Incoming calls and emails for tickets (“Simulate” buttons — no telephony or mailbox).',
'Auto recharge and network restriction for Associates — recorded only, no network change.',
'Notifications are in-app only. No SMS or email is sent.',
'Barcode/QR scanning and the Associate self-service portal are future extensions.',
'Role switching, data and activity history live in this browser. It is not a security control or a production audit log.'];