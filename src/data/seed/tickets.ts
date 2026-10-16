import type { Ticket } from '../../types/records';
import type { IssueCategory, RosterEntry, Shift, TicketPriority } from '../../types/ticket';
import { technicianProfiles } from '../supportConfig';

/** FICTIONAL DEMO support tickets. Demo "now" is 15 Oct 2026, 10:42 AM Dhaka. */
export const tickets: Ticket[] = [
{
  id: 'TK-58812', customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50121', subject: 'Link down — Head Office, Motijheel', priority: 'Urgent', status: 'Open',
  source: 'Phone call', category: 'Link down', description: 'Customer IT (Mr. Habib) reports total loss of internet at Head Office since 09:00. ONT LOS light red. Power confirmed at rack.',
  callerName: 'Habibur Rahman', callerContact: '+880 1711-450921', createdByName: 'Rumana Begum',
  openedAt: '2026-10-15T09:10:00+06:00', responseDueAt: '2026-10-15T09:25:00+06:00', slaDueAt: '2026-10-15T13:10:00+06:00',
  firstResponseAt: '2026-10-15T09:18:00+06:00', firstResponseByName: 'Rumana Begum', firstResponseNote: 'Called back, checked OLT port — LOS on PON 0/3/7. Field visit needed.',
  branchId: 'dhaka-south', zoneId: 'motijheel', attachments: [],
  events: [
  { at: '2026-10-15T09:10:00+06:00', byName: 'Rumana Begum', kind: 'Created', detail: 'Phone call · Link down · Urgent' },
  { at: '2026-10-15T09:18:00+06:00', byName: 'Rumana Begum', kind: 'Response', detail: 'Called back, checked OLT port — LOS on PON 0/3/7. Field visit needed.' }]

},
{
  id: 'TK-58820', customerId: 'CU-1003', siteId: 'ST-2004', connectionId: 'CN-50130', subject: 'Fibre cut on Sector 7 feeder — Green Valley', priority: 'Urgent', status: 'On Hold',
  source: 'Field team', category: 'Fibre cut', description: 'Road-widening contractor cut the 12-core feeder near Sector 7 roundabout. Tower A and B offline.', createdByName: 'Arif Chowdhury',
  team: 'Field Team', assigneeName: 'Jahid Hasan',
  openedAt: '2026-10-15T06:30:00+06:00', responseDueAt: '2026-10-15T06:45:00+06:00', slaDueAt: '2026-10-15T10:30:00+06:00',
  firstResponseAt: '2026-10-15T06:41:00+06:00', firstResponseByName: 'Arif Chowdhury', firstResponseNote: 'Jahid dispatched with splice kit.', startedAt: '2026-10-15T07:20:00+06:00',
  holds: [{ from: '2026-10-15T08:05:00+06:00', reason: 'Awaiting third-party / upstream', note: 'City Corporation crew still excavating; site closed until they finish.', pausesSla: false, byName: 'Jahid Hasan', resumeTo: 'In Progress' }],
  escalations: [{ at: '2026-10-15T09:00:00+06:00', level: 2, to: 'Business Head — Mahbubul Alam', reason: 'Excavation delay — need City Corporation contact to get site access.', byName: 'Arif Chowdhury' }],
  branchId: 'dhaka-north', zoneId: 'uttara', attachments: [{ name: 'cut-location.jpg', sizeKb: 812, at: '2026-10-15T07:40:00+06:00', byName: 'Jahid Hasan' }],
  events: [
  { at: '2026-10-15T06:30:00+06:00', byName: 'Arif Chowdhury', kind: 'Created', detail: 'Field team · Fibre cut · Urgent' },
  { at: '2026-10-15T06:35:00+06:00', byName: 'Arif Chowdhury', kind: 'Assigned', detail: 'Field Team · Jahid Hasan' },
  { at: '2026-10-15T06:41:00+06:00', byName: 'Arif Chowdhury', kind: 'Response', detail: 'Jahid dispatched with splice kit.' },
  { at: '2026-10-15T07:20:00+06:00', byName: 'Jahid Hasan', kind: 'Status', detail: 'Work started' },
  { at: '2026-10-15T07:40:00+06:00', byName: 'Jahid Hasan', kind: 'Attachment', detail: 'cut-location.jpg' },
  { at: '2026-10-15T08:05:00+06:00', byName: 'Jahid Hasan', kind: 'Hold', detail: 'Awaiting third-party / upstream — City Corporation crew still excavating. SLA keeps running (Urgent tickets never pause).' },
  { at: '2026-10-15T09:00:00+06:00', byName: 'Arif Chowdhury', kind: 'Escalation', detail: 'Level 2 → Business Head — Mahbubul Alam' }]

},
{
  id: 'TK-58790', customerId: 'CU-1003', siteId: 'ST-2004', connectionId: 'CN-50130', subject: 'Intermittent packet loss in Tower B', priority: 'High', status: 'In Progress',
  source: 'Email', category: 'Packet loss / latency', description: 'Residents association reports 5–10% packet loss in the evenings. Ping logs attached.', callerName: 'Green Valley Facilities', callerContact: 'facilities@greenvalley.demo',
  createdByName: 'Rumana Begum', team: 'Field Team', assigneeName: 'Jahid Hasan',
  openedAt: '2026-10-14T16:20:00+06:00', responseDueAt: '2026-10-14T16:50:00+06:00', slaDueAt: '2026-10-15T16:20:00+06:00',
  firstResponseAt: '2026-10-14T17:05:00+06:00', firstResponseByName: 'Rumana Begum', firstResponseNote: 'Acknowledged by email; requested MTR from two flats.', startedAt: '2026-10-15T09:30:00+06:00',
  branchId: 'dhaka-north', zoneId: 'uttara', attachments: [{ name: 'ping-log-tower-b.txt', sizeKb: 14, at: '2026-10-14T16:20:00+06:00', byName: 'Rumana Begum' }],
  events: [
  { at: '2026-10-14T16:20:00+06:00', byName: 'Rumana Begum', kind: 'Created', detail: 'Email · Packet loss / latency · High' },
  { at: '2026-10-14T16:40:00+06:00', byName: 'Rumana Begum', kind: 'Assigned', detail: 'Field Team · Jahid Hasan' },
  { at: '2026-10-14T17:05:00+06:00', byName: 'Rumana Begum', kind: 'Response', detail: 'Acknowledged by email; requested MTR from two flats. (15 min after the response target)' },
  { at: '2026-10-15T09:30:00+06:00', byName: 'Jahid Hasan', kind: 'Status', detail: 'Work started' }]

},
{
  id: 'TK-58815', customerId: 'CU-1006', siteId: 'ST-2007', connectionId: 'CN-50176', subject: 'ONT rebooting every few hours — Mirpur Diagnostic', priority: 'High', status: 'On Hold',
  source: 'Phone call', category: 'Equipment fault', description: 'Lab reception reports internet drops 3–4 times a day; ONT power cycles on its own.', callerName: 'Shafiqul Islam', callerContact: '+880 1819-552013',
  createdByName: 'Rumana Begum', team: 'CPE Support', assigneeName: 'Faruk Hossain',
  openedAt: '2026-10-15T08:00:00+06:00', responseDueAt: '2026-10-15T08:30:00+06:00', slaDueAt: '2026-10-16T08:00:00+06:00',
  firstResponseAt: '2026-10-15T08:12:00+06:00', firstResponseByName: 'Rumana Begum', firstResponseNote: 'Remote check shows 6 reboots in 24 h. Replacement ONT likely.',
  holds: [{ from: '2026-10-15T09:40:00+06:00', reason: 'Awaiting customer access', note: 'Server room key is with the lab manager, back at 12:00.', pausesSla: true, byName: 'Faruk Hossain', resumeTo: 'Assigned' }],
  branchId: 'dhaka-north', zoneId: 'mirpur', attachments: [],
  events: [
  { at: '2026-10-15T08:00:00+06:00', byName: 'Rumana Begum', kind: 'Created', detail: 'Phone call · Equipment fault · High' },
  { at: '2026-10-15T08:12:00+06:00', byName: 'Rumana Begum', kind: 'Response', detail: 'Remote check shows 6 reboots in 24 h. Replacement ONT likely.' },
  { at: '2026-10-15T08:20:00+06:00', byName: 'Rumana Begum', kind: 'Assigned', detail: 'CPE Support · Faruk Hossain' },
  { at: '2026-10-15T09:40:00+06:00', byName: 'Faruk Hossain', kind: 'Hold', detail: 'Awaiting customer access — server room key with lab manager until 12:00. SLA paused (allowed for High).' }]

},
{
  id: 'TK-58818', customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50121', subject: 'Damaged patch cord in 3rd-floor rack', priority: 'Normal', status: 'Resolved',
  source: 'Account Manager', category: 'Equipment fault', description: 'AM Nusrat noticed a crushed patch cord during a site visit; link flapping on the backup port.', createdByName: 'Nusrat Jahan',
  team: 'Field Team', assigneeName: 'Sohel Rana',
  openedAt: '2026-10-14T11:00:00+06:00', responseDueAt: '2026-10-14T13:00:00+06:00', slaDueAt: '2026-10-15T11:00:00+06:00',
  firstResponseAt: '2026-10-14T11:35:00+06:00', firstResponseByName: 'Rumana Begum', firstResponseNote: 'Scheduled Sohel for this afternoon.', startedAt: '2026-10-14T15:10:00+06:00',
  resolvedAt: '2026-10-14T15:55:00+06:00',
  resolution: {
    description: 'Backup uplink patch cord crushed by rack door; caused flapping on port 2.',
    workPerformed: 'Replaced SC/APC patch cord, re-dressed cables, added velcro ties. Verified light level −18.2 dBm and stable link for 20 min.',
    materials: [{ sku: 'PC-SCAPC-3M', itemName: 'Fibre patch cord SC/APC 3 m', quantity: 1, unit: 'pc', serials: [], source: 'Technician stock', warehouse: 'Dhaka Central Warehouse', movementIds: [] }],
    resolvedAt: '2026-10-14T15:55:00+06:00', confirmation: 'Confirmation pending', byName: 'Sohel Rana', recordedAt: '2026-10-14T16:05:00+06:00'
  },
  branchId: 'dhaka-south', zoneId: 'motijheel', attachments: [{ name: 'rack-after.jpg', sizeKb: 640, at: '2026-10-14T15:58:00+06:00', byName: 'Sohel Rana' }],
  events: [
  { at: '2026-10-14T11:00:00+06:00', byName: 'Nusrat Jahan', kind: 'Created', detail: 'Account Manager · Equipment fault · Normal' },
  { at: '2026-10-14T11:35:00+06:00', byName: 'Rumana Begum', kind: 'Response', detail: 'Scheduled Sohel for this afternoon.' },
  { at: '2026-10-14T11:36:00+06:00', byName: 'Rumana Begum', kind: 'Assigned', detail: 'Field Team · Sohel Rana' },
  { at: '2026-10-14T15:10:00+06:00', byName: 'Sohel Rana', kind: 'Status', detail: 'Work started' },
  { at: '2026-10-14T16:05:00+06:00', byName: 'Sohel Rana', kind: 'Resolution', detail: 'Resolved 14 Oct, 03:55 PM · confirmation pending' }]

},
{
  id: 'TK-58801', customerId: 'CU-1006', siteId: 'ST-2007', connectionId: 'CN-50176', subject: 'Static IP re-assignment request', priority: 'Normal', status: 'Closed',
  source: 'Email', category: 'Configuration request', description: 'Customer needs the /29 moved to the new firewall WAN port.', createdByName: 'Rumana Begum', team: 'NOC Desk', assigneeName: 'Jahid Hasan',
  openedAt: '2026-10-13T10:00:00+06:00', responseDueAt: '2026-10-13T12:00:00+06:00', slaDueAt: '2026-10-14T10:00:00+06:00',
  firstResponseAt: '2026-10-13T10:20:00+06:00', firstResponseByName: 'Rumana Begum', firstResponseNote: 'Confirmed change window 3 PM.', startedAt: '2026-10-13T15:00:00+06:00',
  resolvedAt: '2026-10-13T15:30:00+06:00', closedAt: '2026-10-13T17:00:00+06:00', closedByName: 'Rumana Begum',
  resolution: {
    description: 'Static /29 re-pointed to new firewall WAN MAC.', workPerformed: 'Cleared ARP on BRAS, updated MAC binding, tested inbound 443 from NOC.', materials: [],
    resolvedAt: '2026-10-13T15:30:00+06:00', confirmation: 'Confirmed by customer', confirmedBy: 'Shafiqul Islam (IT)', byName: 'Jahid Hasan', recordedAt: '2026-10-13T15:40:00+06:00'
  },
  branchId: 'dhaka-north', zoneId: 'mirpur', attachments: [],
  events: [
  { at: '2026-10-13T10:00:00+06:00', byName: 'Rumana Begum', kind: 'Created', detail: 'Email · Configuration request · Normal' },
  { at: '2026-10-13T10:20:00+06:00', byName: 'Rumana Begum', kind: 'Response', detail: 'Confirmed change window 3 PM.' },
  { at: '2026-10-13T10:21:00+06:00', byName: 'Rumana Begum', kind: 'Assigned', detail: 'NOC Desk · Jahid Hasan' },
  { at: '2026-10-13T15:40:00+06:00', byName: 'Jahid Hasan', kind: 'Resolution', detail: 'Resolved · confirmed by Shafiqul Islam (IT)' },
  { at: '2026-10-13T17:00:00+06:00', byName: 'Rumana Begum', kind: 'Closed', detail: 'Closed · Account Manager notified' }]

},
{
  id: 'TK-58816', customerId: 'CU-1004', siteId: 'ST-2005', connectionId: 'CN-50188', subject: 'Speed below 20 Mbps after 6 PM', priority: 'Normal', status: 'Assigned',
  source: 'Phone call', category: 'Slow speed', description: 'Port View operations say downloads drop to ~8 Mbps in the evening. New connection (activated 12 Oct).', callerName: 'Faisal Chowdhury', callerContact: '+880 1819-271604',
  createdByName: 'Rumana Begum', team: 'Field Team', assigneeName: 'Rakib Uddin',
  openedAt: '2026-10-15T09:50:00+06:00', responseDueAt: '2026-10-15T11:50:00+06:00', slaDueAt: '2026-10-16T09:50:00+06:00',
  branchId: 'chattogram', zoneId: 'agrabad', attachments: [],
  events: [
  { at: '2026-10-15T09:50:00+06:00', byName: 'Rumana Begum', kind: 'Created', detail: 'Phone call · Slow speed · Normal' },
  { at: '2026-10-15T10:05:00+06:00', byName: 'Rumana Begum', kind: 'Assigned', detail: 'Field Team · Rakib Uddin' }]

},
{
  id: 'TK-58805', customerId: 'CU-1007', siteId: 'ST-2008', connectionId: 'CN-50140', subject: 'Schedule ONT pickup after disconnection', priority: 'Low', status: 'Open',
  source: 'Account Manager', category: 'Equipment pickup / relocation', description: 'Discontinuation approved; IOL ONT is receivable. Customer prefers pickup on a weekday morning.', createdByName: 'Nusrat Jahan',
  openedAt: '2026-10-14T11:40:00+06:00', responseDueAt: '2026-10-14T19:40:00+06:00', slaDueAt: '2026-10-17T11:40:00+06:00',
  branchId: 'sylhet', zoneId: 'zindabazar', attachments: [],
  events: [{ at: '2026-10-14T11:40:00+06:00', byName: 'Nusrat Jahan', kind: 'Created', detail: 'Account Manager · Equipment pickup / relocation · Low' }]
}];


/** Sample scenarios used by "Simulate incoming call / email". No external system is contacted. */
export interface SimulationScenario {
  channel: 'Call' | 'Email';
  customerId: string;
  siteId: string;
  connectionId: string;
  subject: string;
  category: IssueCategory;
  priority: TicketPriority;
  description: string;
  callerName: string;
  callerContact: string;
  attachment?: {name: string;sizeKb: number;};
}

export const simulationScenarios: SimulationScenario[] = [
{ channel: 'Call', customerId: 'CU-1004', siteId: 'ST-2005', connectionId: 'CN-50188', subject: 'No internet at Agrabad office', category: 'Link down', priority: 'Urgent', description: 'Caller says all PCs show "No internet" since 10 minutes ago. ONT lights not checked yet.', callerName: 'Faisal Chowdhury', callerContact: '+880 1819-271604' },
{ channel: 'Call', customerId: 'CU-1006', siteId: 'ST-2007', connectionId: 'CN-50176', subject: 'Video calls freezing — Mirpur Diagnostic', category: 'Packet loss / latency', priority: 'High', description: 'Doctors report telemedicine calls freezing every few minutes since morning.', callerName: 'Shafiqul Islam', callerContact: '+880 1819-552013' },
{ channel: 'Call', customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50121', subject: 'Request to open port 8443 for ERP vendor', category: 'Configuration request', priority: 'Low', description: 'IT asks to allow inbound 8443 to 103.x.x.10 for their ERP vendor until month end.', callerName: 'Habibur Rahman', callerContact: '+880 1711-450921' },
{ channel: 'Email', customerId: 'CU-1003', siteId: 'ST-2004', connectionId: 'CN-50130', subject: 'Slow Wi-Fi in Tower A common area', category: 'Slow speed', priority: 'Normal', description: 'Email from facilities: speed test in the lobby shows 4 Mbps on a 50 Mbps plan. Screenshot attached.', callerName: 'Green Valley Facilities', callerContact: 'facilities@greenvalley.demo', attachment: { name: 'speedtest-lobby.png', sizeKb: 220 } },
{ channel: 'Email', customerId: 'CU-1002', siteId: 'ST-2001', connectionId: 'CN-50121', subject: 'Packet loss to Singapore servers', category: 'Packet loss / latency', priority: 'High', description: 'Email from IT with MTR showing 12% loss at hop 6 towards their Singapore data centre.', callerName: 'Habibur Rahman', callerContact: 'it@rahmansteel.demo', attachment: { name: 'mtr-singapore.txt', sizeKb: 6 } },
{ channel: 'Email', customerId: 'CU-1006', siteId: 'ST-2007', connectionId: 'CN-50176', subject: 'CCTV remote view not loading', category: 'CCTV fault', priority: 'Normal', description: 'Email: NVR remote view times out from the owner’s phone since yesterday.', callerName: 'Mirpur Diagnostic Admin', callerContact: 'admin@mirpurdiag.demo', attachment: { name: 'app-error.jpg', sizeKb: 145 } }];


/** Week of 12–18 Oct 2026. A simple rotation, with a few manual exceptions. */
const DAYS = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
const ROTATION: Shift[][] = [
['Day', 'Day', 'Day', 'Day', 'Off', 'On call', 'Day'],
['Evening', 'Evening', 'Day', 'Day', 'Day', 'Off', 'Off'],
['Day', 'Day', 'Day', 'Day', 'Off', 'Off', 'On call'],
['Day', 'Day', 'Day', 'Day', 'Day', 'Off', 'Off'],
['Night', 'Night', 'Off', 'Leave', 'Leave', 'Day', 'Day'],
['Day', 'Day', 'On call', 'Day', 'Day', 'Off', 'Off']];


export const dutyRoster: RosterEntry[] = technicianProfiles.flatMap((t, ti) =>
DAYS.map((date, di) => ({
  id: `DR-${ti + 1}${di + 1}`,
  technicianName: t.name,
  date,
  shift: ROTATION[ti % ROTATION.length][di],
  note: t.name === 'Mizanur Rahman' && ROTATION[ti][di] === 'Leave' ? 'Family leave' : undefined
}))
);