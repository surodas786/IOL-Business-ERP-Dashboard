import type { Lead, Opportunity } from '../../types/records';
import type { CrmConflict, CrmStage, Tender } from '../../types/crm';

// FICTIONAL DEMO DATA — all organisations, people, tenders, IDs and amounts are invented.

export const crmStages: CrmStage[] = [
{ id: 'suspect', label: 'Suspect', role: 'entry' },
{ id: 'prospect', label: 'Prospect', role: 'prospect' },
{ id: 'negotiation', label: 'Negotiation' },
{ id: 'workOrder', label: 'Work Order', role: 'workOrder' },
{ id: 'closedWon', label: 'Closed Won', role: 'won' }];


export const leads: Lead[] = [
{ id: 'LD-2026-0228', company: 'Sylhet Hill Agricultural Institute', companyBn: 'সিলেট হিল কৃষি ইনস্টিটিউট', category: 'Education', contactName: 'Dr. Mahmuda Khanam', contactDesignation: 'Registrar', contactPhone: '+880 1711-582034', contactEmail: 'registrar@shai.demo', address: 'Tilagarh, Sylhet 3100', source: 'Tender', ownerId: 'u-02', status: 'Lost', createdAt: '2026-08-20T10:00:00+06:00', branchId: 'sylhet', zoneId: 'ambarkhana' },
{ id: 'LD-2026-0236', company: 'Gulshan Lakeview Restaurants', companyBn: 'গুলশান লেকভিউ রেস্টুরেন্টস', category: 'SME', contactName: 'Nadia Chowdhury', contactDesignation: 'Operations Director', contactPhone: '+880 1711-448209', contactEmail: 'nadia@lakeview.demo', address: 'Road 104, Gulshan 2, Dhaka 1212', source: 'Direct', ownerId: 'u-03', status: 'Lost', createdAt: '2026-08-26T12:00:00+06:00', branchId: 'dhaka-north', zoneId: 'gulshan' },
{ id: 'LD-2026-0249', company: 'Karnaphuli Freight Terminal Ltd', companyBn: 'কর্ণফুলী ফ্রেইট টার্মিনাল লিমিটেড', category: 'Corporate', contactName: 'Rezaul Karim', contactDesignation: 'IT Manager', contactPhone: '+880 1819-336512', contactEmail: 'rezaul.karim@kft.demo', address: 'Bandar Road, Agrabad, Chattogram 4100', source: 'Direct', ownerId: 'u-15', status: 'Qualified', createdAt: '2026-09-10T11:30:00+06:00', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'LD-2026-0262', company: 'Dhanmondi Scholars School', companyBn: 'ধানমন্ডি স্কলার্স স্কুল', category: 'Education', contactName: 'Farzana Haque', contactDesignation: 'Principal', contactPhone: '+880 1712-905431', contactEmail: 'principal@dss.demo', address: 'House 27, Road 9/A, Dhanmondi, Dhaka 1209', source: 'Web', ownerId: 'u-04', status: 'Qualified', createdAt: '2026-09-04T09:40:00+06:00', branchId: 'dhaka-south', zoneId: 'dhanmondi' },
{ id: 'LD-2026-0270', company: 'Uttara Civic Services Board', companyBn: 'উত্তরা সিভিক সার্ভিসেস বোর্ড', category: 'Government', contactName: 'Md. Harun-or-Rashid', contactDesignation: 'Executive Engineer (ICT)', contactPhone: '+880 1715-662093', contactEmail: 'ee.ict@ucsb.demo', address: 'Civic Bhaban, Sector 6, Uttara, Dhaka 1230', source: 'Tender', ownerId: 'u-02', status: 'Qualified', createdAt: '2026-09-18T10:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'LD-2026-0288', company: 'Mirpur Diagnostic Centre', companyBn: 'মিরপুর ডায়াগনস্টিক সেন্টার', category: 'Healthcare', contactName: 'Dr. Nazmul Haque', contactDesignation: 'Managing Director', contactPhone: '+880 1712-640318', contactEmail: 'nazmul.haque@mirpurdiag.demo', address: 'Plot 7, Section 10, Mirpur, Dhaka 1216', source: 'Sales Agent', agentId: 'SA-301', ownerId: 'u-03', status: 'Converted', createdAt: '2026-09-02T11:20:00+06:00', branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'LD-2026-0294', company: 'Port View Logistics', companyBn: 'পোর্ট ভিউ লজিস্টিকস', category: 'Corporate', contactName: 'Faisal Chowdhury', contactDesignation: 'Head of IT', contactPhone: '+880 1819-271604', contactEmail: 'faisal@portview.demo', address: '5th Floor, 104 Agrabad C/A, Chattogram 4100', source: 'Referral', referral: 'Anwar Hossain, Karnaphuli Shipping Agency', ownerId: 'u-02', status: 'Converted', createdAt: '2026-09-05T15:40:00+06:00', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'LD-2026-0301', company: 'Karnaphuli Shipping Agency', companyBn: 'কর্ণফুলী শিপিং এজেন্সি', category: 'SME', contactName: 'Anwar Hossain', contactDesignation: 'Operations Manager', contactPhone: '+880 1711-908273', contactEmail: 'anwar@ksa.demo', address: '31 Sheikh Mujib Road, Agrabad, Chattogram 4100', source: 'Direct', ownerId: 'u-02', status: 'Converted', createdAt: '2026-09-14T10:10:00+06:00', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'LD-2026-0305', company: 'Surma Valley Medical College', companyBn: 'সুরমা ভ্যালি মেডিকেল কলেজ', category: 'Education', contactName: 'Prof. Aminul Islam', contactDesignation: 'Director (Administration)', contactPhone: '+880 1711-320457', contactEmail: 'director.admin@svmc.demo', address: 'Airport Road, Ambarkhana, Sylhet 3100', source: 'Tender', ownerId: 'u-02', status: 'Qualified', createdAt: '2026-10-03T10:00:00+06:00', branchId: 'sylhet', zoneId: 'ambarkhana' },
{ id: 'LD-2026-0311', company: 'Meghna Textiles Ltd', companyBn: 'মেঘনা টেক্সটাইল লিমিটেড', category: 'Corporate', contactName: 'Shahidul Karim', contactDesignation: 'GM — Administration', contactPhone: '+880 1730-118842', contactEmail: 'shahidul.karim@meghnatex.demo', address: 'Kashimpur Road, Konabari, Gazipur 1751', source: 'Direct', ownerId: 'u-03', status: 'Qualified', createdAt: '2026-09-22T10:05:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'LD-2026-0320', company: "Banani Heights Owners' Association", companyBn: 'বনানী হাইটস ওনার্স অ্যাসোসিয়েশন', category: 'Residential Bulk', contactName: 'Shirin Sultana', contactDesignation: 'Secretary', contactPhone: '+880 1713-447120', contactEmail: 'secretary@bananiheights.demo', address: 'House 18, Road 11, Banani, Dhaka 1213', source: 'Web', ownerId: 'u-03', status: 'New', createdAt: '2026-10-11T09:30:00+06:00', branchId: 'dhaka-north', zoneId: 'gulshan' },
{ id: 'LD-2026-0322', company: 'Halishahar Garments Ltd', companyBn: 'হালিশহর গার্মেন্টস লিমিটেড', category: 'Corporate', contactName: 'Mostafa Kamal', contactDesignation: 'Admin Manager', contactPhone: '+880 1817-552961', contactEmail: 'mostafa.kamal@hgl.demo', address: 'Plot 9, Block K, Halishahar, Chattogram 4216', source: 'Sales Agent', agentId: 'SA-302', ownerId: 'u-02', status: 'Qualified', createdAt: '2026-10-06T12:15:00+06:00', branchId: 'chattogram', zoneId: 'pahartali' },
{ id: 'LD-2026-0325', company: 'Rahman Steel Works', companyBn: 'রহমান স্টিল ওয়ার্কস', category: 'Corporate', contactName: 'Abdur Rahman', contactDesignation: 'Director', contactPhone: '+880 1711-330245', contactEmail: 'abdur.rahman@rahmansteel.demo', address: '88 Motijheel C/A, Dhaka 1000', source: 'Direct', ownerId: 'u-04', status: 'Qualified', createdAt: '2026-10-08T15:00:00+06:00', branchId: 'dhaka-south', zoneId: 'jatrabari' },
{ id: 'LD-2026-0327', company: 'Meghna Textile Mills', companyBn: 'মেঘনা টেক্সটাইল মিলস', category: 'Corporate', contactName: 'Shahidul Karim', contactDesignation: 'Administration', contactPhone: '+880 1730-118842', contactEmail: '', address: 'Konabari, Gazipur', source: 'Web', ownerId: 'u-14', status: 'New', createdAt: '2026-10-14T16:20:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara' }];


const base = { communications: [], attachments: [], history: [], decisionDateHistory: [] };

export const opportunities: Opportunity[] = [
{
  ...base,
  id: 'OP-2026-0149', leadId: 'LD-2026-0228', expansion: 'New customer', title: 'Sylhet Hill Agricultural Institute — 200 Mbps campus internet',
  siteName: 'Main campus', siteAddress: 'Tilagarh, Sylhet 3100', serviceType: 'Dedicated Internet', bandwidthMbps: 200, expectedMrc: 110000, otc: 90000, marginPct: 27,
  stage: 'negotiation', status: 'Lost', ownerId: 'u-02', createdAt: '2026-08-21T10:00:00+06:00', expectedDecisionDate: '2026-09-30T17:00:00+06:00',
  nextAction: '', nextActionDue: '', lossReason: 'Chose competitor — tender awarded to the lowest bidder at ৳ 1,02,000/month.', branchId: 'sylhet', zoneId: 'ambarkhana',
  communications: [{ id: 'CM-01', at: '2026-08-28T11:00:00+06:00', channel: 'Meeting', summary: 'Pre-bid meeting attended at the registrar’s office.', byId: 'u-02', interest: true }],
  history: [{ at: '2026-10-01T15:00:00+06:00', byId: 'u-02', kind: 'Lost', detail: 'Marked lost after tender result', reason: 'Chose competitor — tender awarded to the lowest bidder at ৳ 1,02,000/month.' }]
},
{
  ...base,
  id: 'OP-2026-0158', leadId: 'LD-2026-0236', expansion: 'New customer', title: 'Gulshan Lakeview Restaurants — 30 Mbps for 3 outlets',
  siteName: 'Gulshan 2 flagship', siteAddress: 'Road 104, Gulshan 2, Dhaka 1212', serviceType: 'Dedicated Internet', bandwidthMbps: 30, expectedMrc: 21000, otc: 12000, marginPct: 30,
  stage: 'negotiation', status: 'Lost', ownerId: 'u-03', createdAt: '2026-08-27T10:00:00+06:00', expectedDecisionDate: '2026-09-25T17:00:00+06:00',
  nextAction: '', nextActionDue: '', lossReason: 'Chose competitor — competitor matched at ৳ 18,000 with a free router.', branchId: 'dhaka-north', zoneId: 'gulshan',
  communications: [
  { id: 'CM-02', at: '2026-08-27T12:00:00+06:00', channel: 'Visit', summary: 'Walked the three outlets with Nadia; POS needs a stable uplink.', byId: 'u-03', interest: true },
  { id: 'CM-03', at: '2026-09-22T16:00:00+06:00', channel: 'Call', summary: 'Nadia confirmed they signed with another provider.', byId: 'u-03', interest: false }],

  history: [{ at: '2026-09-22T16:30:00+06:00', byId: 'u-03', kind: 'Lost', detail: 'Marked lost', reason: 'Chose competitor — competitor matched at ৳ 18,000 with a free router.' }]
},
{
  ...base,
  id: 'OP-2026-0162', leadId: 'LD-2026-0249', expansion: 'New customer', title: 'Karnaphuli Freight Terminal — 100 Mbps dedicated + backup',
  siteName: 'Terminal office', siteAddress: 'Bandar Road, Agrabad, Chattogram 4100', serviceType: 'Dedicated Internet', bandwidthMbps: 100, expectedMrc: 68000, otc: 40000, marginPct: 35,
  stage: 'prospect', status: 'Open', ownerId: 'u-15', createdAt: '2026-09-10T12:00:00+06:00', expectedDecisionDate: '2026-11-20T17:00:00+06:00',
  nextAction: 'Send revised proposal with backup link pricing', nextActionDue: '2026-09-25T17:00:00+06:00', branchId: 'chattogram', zoneId: 'agrabad',
  communications: [
  { id: 'CM-04', at: '2026-09-11T11:00:00+06:00', channel: 'Visit', summary: 'Met Rezaul Karim; current provider has frequent outages during monsoon.', byId: 'u-15', interest: true },
  { id: 'CM-05', at: '2026-09-18T15:30:00+06:00', channel: 'Email', summary: 'Rezaul asked for a backup-link option before taking it to the board.', byId: 'u-15', interest: true }],

  history: [{ at: '2026-09-11T11:30:00+06:00', byId: 'u-15', kind: 'Stage', detail: 'Suspect → Prospect' }],
  decisionDateHistory: [
  { at: '2026-09-28T10:00:00+06:00', byId: 'u-15', from: '2026-09-30T17:00:00+06:00', to: '2026-10-15T17:00:00+06:00', reason: 'Board meeting postponed.' },
  { at: '2026-10-09T10:00:00+06:00', byId: 'u-15', from: '2026-10-15T17:00:00+06:00', to: '2026-10-31T17:00:00+06:00', reason: 'Waiting for budget sign-off.' },
  { at: '2026-10-13T12:00:00+06:00', byId: 'u-15', from: '2026-10-31T17:00:00+06:00', to: '2026-11-20T17:00:00+06:00', reason: 'Customer asked for more time.' }]

},
{
  ...base,
  id: 'OP-2026-0171', leadId: 'LD-2026-0262', expansion: 'New customer', title: 'Dhanmondi Scholars School — 60 Mbps campus internet',
  siteName: 'Main building', siteAddress: 'House 27, Road 9/A, Dhanmondi, Dhaka 1209', serviceType: 'Dedicated Internet', bandwidthMbps: 60, expectedMrc: 36000, otc: 25000, marginPct: 32,
  stage: 'prospect', status: 'Stalled', ownerId: 'u-04', createdAt: '2026-09-05T10:00:00+06:00', expectedDecisionDate: '2027-01-15T17:00:00+06:00',
  nextAction: 'Re-engage after the January budget approval', nextActionDue: '2027-01-05T11:00:00+06:00', stalledReason: 'School budget frozen until the January term; principal asked us to return after 5 Jan.', branchId: 'dhaka-south', zoneId: 'dhanmondi',
  communications: [
  { id: 'CM-06', at: '2026-09-06T11:00:00+06:00', channel: 'Meeting', summary: 'Principal wants smart-classroom connectivity for 24 rooms.', byId: 'u-04', interest: true },
  { id: 'CM-07', at: '2026-10-02T12:30:00+06:00', channel: 'Call', summary: 'Budget committee froze capital spending until January.', byId: 'u-04', interest: true }],

  history: [
  { at: '2026-09-06T11:30:00+06:00', byId: 'u-04', kind: 'Stage', detail: 'Suspect → Prospect' },
  { at: '2026-10-02T13:00:00+06:00', byId: 'u-04', kind: 'Stalled', detail: 'Marked stalled', reason: 'School budget frozen until the January term; principal asked us to return after 5 Jan.' }]

},
{
  ...base,
  id: 'OP-2026-0178', leadId: 'LD-2026-0294', customerId: 'CU-1004', expansion: 'New customer', title: 'Port View Logistics — 20 Mbps dedicated',
  siteName: 'Agrabad Office', siteAddress: '5th Floor, 104 Agrabad C/A, Chattogram 4100', serviceType: 'Dedicated Internet', bandwidthMbps: 20, expectedMrc: 14000, otc: 8000, marginPct: 33,
  stage: 'workOrder', status: 'Open', ownerId: 'u-02', createdAt: '2026-09-06T11:00:00+06:00', expectedDecisionDate: '2026-09-19T17:00:00+06:00',
  nextAction: 'Confirm billing activation with Accounts', nextActionDue: '2026-10-17T12:00:00+06:00', contractedAt: '2026-09-20T11:00:00+06:00', branchId: 'chattogram', zoneId: 'agrabad',
  communications: [{ id: 'CM-08', at: '2026-09-06T12:00:00+06:00', channel: 'Call', summary: 'Referred by Anwar Hossain; needs a link before their ERP go-live.', byId: 'u-02', interest: true }],
  history: [{ at: '2026-09-20T11:00:00+06:00', byId: 'u-05', kind: 'Stage', detail: 'Negotiation → Work Order (WO-2026-0144)' }]
},
{
  ...base,
  id: 'OP-2026-0183', leadId: 'LD-2026-0301', customerId: 'CU-1005', expansion: 'New customer', title: 'Karnaphuli Shipping — 10 Mbps dedicated',
  siteName: 'Head Office', siteAddress: '31 Sheikh Mujib Road, Agrabad, Chattogram 4100', serviceType: 'Dedicated Internet', bandwidthMbps: 10, expectedMrc: 9000, otc: 8000, marginPct: 31,
  stage: 'workOrder', status: 'Open', ownerId: 'u-02', createdAt: '2026-09-15T10:00:00+06:00', expectedDecisionDate: '2026-10-02T17:00:00+06:00',
  nextAction: 'Confirm installation date with Anwar Hossain', nextActionDue: '2026-10-18T11:00:00+06:00', contractedAt: '2026-10-03T10:30:00+06:00', branchId: 'chattogram', zoneId: 'agrabad',
  communications: [{ id: 'CM-09', at: '2026-09-15T11:00:00+06:00', channel: 'Visit', summary: 'Office move complete; ready for a fibre link.', byId: 'u-02', interest: true }],
  history: [{ at: '2026-10-03T10:30:00+06:00', byId: 'u-05', kind: 'Stage', detail: 'Negotiation → Work Order (WO-2026-0149)' }]
},
{
  ...base,
  id: 'OP-2026-0189', leadId: 'LD-2026-0288', customerId: 'CU-1006', expansion: 'New customer', title: 'Mirpur Diagnostic Centre — 40 Mbps dedicated',
  siteName: 'Diagnostic Centre', siteAddress: 'Plot 7, Section 10, Mirpur, Dhaka 1216', serviceType: 'Dedicated Internet', bandwidthMbps: 40, expectedMrc: 22500, otc: 15000, marginPct: 34,
  stage: 'closedWon', status: 'Won', ownerId: 'u-03', agentId: 'SA-301', createdAt: '2026-09-03T12:00:00+06:00', expectedDecisionDate: '2026-09-25T17:00:00+06:00',
  nextAction: '', nextActionDue: '', wonAt: '2026-10-02T10:00:00+06:00', contractedAt: '2026-09-25T12:00:00+06:00', branchId: 'dhaka-north', zoneId: 'mirpur',
  communications: [{ id: 'CM-10', at: '2026-09-03T12:30:00+06:00', channel: 'Visit', summary: 'Introduced by agent Karim Molla; PACS system needs a symmetric link.', byId: 'u-03', interest: true }],
  history: [{ at: '2026-10-02T10:00:00+06:00', byId: 'u-09', kind: 'Stage', detail: 'Work Order → Closed Won (billing activated)' }]
},
{
  ...base,
  id: 'OP-2026-0201', leadId: 'LD-2026-0270', expansion: 'New customer', title: 'Uttara Civic Services Board — 14 ward offices',
  siteName: 'Civic Bhaban + 13 ward offices', siteAddress: 'Civic Bhaban, Sector 6, Uttara, Dhaka 1230', serviceType: 'Data Connectivity', bandwidthMbps: 20, expectedMrc: 196000, otc: 140000, marginPct: 29,
  stage: 'negotiation', status: 'Open', ownerId: 'u-02', createdAt: '2026-09-18T10:30:00+06:00', expectedDecisionDate: '2026-11-05T17:00:00+06:00',
  nextAction: 'Attend technical evaluation presentation', nextActionDue: '2026-10-21T10:30:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  communications: [
  { id: 'CM-11', at: '2026-09-24T11:00:00+06:00', channel: 'Meeting', summary: 'Pre-bid meeting; 14 sites, SLA 99.5%, penalty clause on downtime.', byId: 'u-02', interest: true },
  { id: 'CM-12', at: '2026-10-08T12:30:00+06:00', channel: 'Visit', summary: 'Bid submitted by hand at the procurement cell.', byId: 'u-02', interest: true }],

  history: [
  { at: '2026-09-24T12:00:00+06:00', byId: 'u-02', kind: 'Stage', detail: 'Suspect → Prospect' },
  { at: '2026-10-08T13:00:00+06:00', byId: 'u-02', kind: 'Stage', detail: 'Prospect → Negotiation' }]

},
{
  ...base,
  id: 'OP-2026-0207', leadId: 'LD-2026-0311', expansion: 'New customer', title: 'Meghna Textiles — 100 Mbps dedicated fibre',
  siteName: 'Konabari factory', siteAddress: 'Kashimpur Road, Konabari, Gazipur 1751', serviceType: 'Dedicated Internet', bandwidthMbps: 100, expectedMrc: 85000, otc: 45000, marginPct: 38,
  stage: 'negotiation', status: 'Open', ownerId: 'u-03', createdAt: '2026-09-24T14:20:00+06:00', expectedDecisionDate: '2026-10-31T17:00:00+06:00',
  nextAction: 'Send approved quotation to Shahidul Karim', nextActionDue: '2026-10-16T12:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  communications: [
  { id: 'CM-13', at: '2026-09-22T10:30:00+06:00', channel: 'Call', summary: 'Shahidul Karim enquired about a dedicated link for the new knitting unit.', byId: 'u-03', interest: true },
  { id: 'CM-14', at: '2026-09-25T15:00:00+06:00', channel: 'Visit', summary: 'Site walk with factory admin; rooftop access confirmed.', byId: 'u-03', interest: true },
  { id: 'CM-15', at: '2026-10-13T15:30:00+06:00', channel: 'Meeting', summary: 'Presented 100 Mbps proposal; customer wants /29 IPv4 block included.', byId: 'u-03', interest: true }],

  attachments: [{ id: 'AT-01', name: 'Meghna_site_photos.zip', sizeKb: 8420, uploadedAt: '2026-09-25T18:00:00+06:00', byId: 'u-03' }],
  history: [
  { at: '2026-09-24T14:20:00+06:00', byId: 'u-03', kind: 'Stage', detail: 'Suspect → Prospect' },
  { at: '2026-10-13T16:10:00+06:00', byId: 'u-03', kind: 'Stage', detail: 'Prospect → Negotiation' }],

  decisionDateHistory: [{ at: '2026-10-13T16:20:00+06:00', byId: 'u-03', from: '2026-10-20T17:00:00+06:00', to: '2026-10-31T17:00:00+06:00', reason: 'Factory board meeting moved to end of month.' }]
},
{
  ...base,
  id: 'OP-2026-0212', leadId: 'LD-2026-0305', expansion: 'New customer', title: 'Surma Valley Medical College — campus backbone + 300 Mbps',
  siteName: 'Main campus', siteAddress: 'Airport Road, Ambarkhana, Sylhet 3100', serviceType: 'Dedicated Internet', bandwidthMbps: 300, expectedMrc: 145000, otc: 220000, marginPct: 31,
  stage: 'prospect', status: 'Open', ownerId: 'u-02', createdAt: '2026-10-03T10:30:00+06:00', expectedDecisionDate: '2026-11-30T17:00:00+06:00',
  nextAction: 'Submit clarification questions on fibre ring scope', nextActionDue: '2026-10-16T15:00:00+06:00', branchId: 'sylhet', zoneId: 'ambarkhana',
  communications: [{ id: 'CM-16', at: '2026-10-07T11:00:00+06:00', channel: 'Meeting', summary: 'Pre-bid meeting; 6 buildings, hospital wing needs redundancy.', byId: 'u-02', interest: true }],
  history: [{ at: '2026-10-07T12:00:00+06:00', byId: 'u-02', kind: 'Stage', detail: 'Suspect → Prospect' }]
},
{
  ...base,
  id: 'OP-2026-0215', leadId: 'LD-2026-0322', expansion: 'New customer', title: 'Halishahar Garments — 50 Mbps dedicated',
  siteName: 'Factory', siteAddress: 'Plot 9, Block K, Halishahar, Chattogram 4216', serviceType: 'Dedicated Internet', bandwidthMbps: 50, expectedMrc: 30000, otc: 20000, marginPct: 36,
  stage: 'prospect', status: 'Open', ownerId: 'u-02', agentId: 'SA-302', createdAt: '2026-10-07T11:00:00+06:00', expectedDecisionDate: '2026-11-10T17:00:00+06:00',
  nextAction: 'Confirm survey access with Mostafa Kamal', nextActionDue: '2026-10-14T17:00:00+06:00', branchId: 'chattogram', zoneId: 'pahartali',
  communications: [
  { id: 'CM-17', at: '2026-10-06T12:30:00+06:00', channel: 'Call', summary: 'Introduced by agent; buyer audit requires a reliable link.', byId: 'u-02', interest: true },
  { id: 'CM-18', at: '2026-10-09T11:00:00+06:00', channel: 'Visit', summary: 'Met Mostafa Kamal; survey requested for the factory roof.', byId: 'u-02', interest: true }],

  history: [{ at: '2026-10-07T11:00:00+06:00', byId: 'u-02', kind: 'Stage', detail: 'Suspect → Prospect' }]
},
{
  ...base,
  id: 'OP-2026-0219', leadId: 'LD-2026-0320', expansion: 'New customer', title: 'Banani Heights — 300 Mbps bulk broadband',
  siteName: 'Banani Heights', siteAddress: 'House 18, Road 11, Banani, Dhaka 1213', serviceType: 'Broadband', bandwidthMbps: 300, expectedMrc: 55000, otc: 60000, marginPct: 29,
  stage: 'suspect', status: 'Open', ownerId: 'u-03', createdAt: '2026-10-12T10:00:00+06:00', expectedDecisionDate: '2026-11-30T17:00:00+06:00',
  nextAction: 'First call to Shirin Sultana', nextActionDue: '2026-10-15T16:00:00+06:00', branchId: 'dhaka-north', zoneId: 'gulshan'
},
{
  ...base,
  id: 'OP-2026-0221', leadId: 'LD-2026-0325', customerId: 'CU-1002', expansion: 'Additional site', title: 'Rahman Steel Works — Narayanganj warehouse 30 Mbps',
  siteName: 'Narayanganj Warehouse', siteAddress: 'Plot 31, BSCIC Industrial Estate, Narayanganj 1400', serviceType: 'Dedicated Internet', bandwidthMbps: 30, expectedMrc: 18000, otc: 15000, marginPct: 34,
  stage: 'prospect', status: 'Open', ownerId: 'u-04', createdAt: '2026-10-08T15:30:00+06:00', expectedDecisionDate: '2026-11-15T17:00:00+06:00',
  nextAction: 'Send BSCIC access letter to the survey team', nextActionDue: '2026-10-17T12:00:00+06:00', branchId: 'dhaka-south', zoneId: 'jatrabari',
  communications: [{ id: 'CM-19', at: '2026-10-08T15:00:00+06:00', channel: 'Meeting', summary: 'Abdur Rahman wants the new warehouse on the same corporate account.', byId: 'u-04', interest: true }],
  history: [{ at: '2026-10-08T15:30:00+06:00', byId: 'u-04', kind: 'Created', detail: 'Additional site under existing customer CU-1002' }]
},
{
  ...base,
  id: 'OP-2026-0224', leadId: 'LD-2026-0327', expansion: 'New customer', title: 'Meghna Textile Mills — dedicated internet enquiry',
  siteName: 'Factory', siteAddress: 'Konabari, Gazipur', serviceType: 'Dedicated Internet', bandwidthMbps: 50, expectedMrc: 40000, otc: 20000, marginPct: 35,
  stage: 'suspect', status: 'Open', ownerId: 'u-14', createdAt: '2026-10-14T16:20:00+06:00', expectedDecisionDate: '2026-11-30T17:00:00+06:00',
  nextAction: 'Verify the organisation before calling', nextActionDue: '2026-10-16T11:00:00+06:00', branchId: 'dhaka-north', zoneId: 'uttara',
  history: [{ at: '2026-10-14T16:20:00+06:00', byId: 'u-14', kind: 'Created', detail: 'Web enquiry registered; flagged for duplicate review' }]
}];


export const tenders: Tender[] = [
{
  id: 'TD-2026-007', reference: 'SHAI/ICT/2026/07', title: 'Campus internet, 200 Mbps', issuingOrganisation: 'Sylhet Hill Agricultural Institute', issuingOrganisationBn: 'সিলেট হিল কৃষি ইনস্টিটিউট',
  opportunityId: 'OP-2026-0149', ownerId: 'u-02', branchId: 'sylhet', zoneId: 'ambarkhana', publishedAt: '2026-08-18T10:00:00+06:00',
  clarificationDeadline: '2026-09-02T17:00:00+06:00', submissionDeadline: '2026-09-15T12:00:00+06:00', winProbability: 0, estimatedValue: 110000,
  competitors: [{ name: 'Competitor A (national ISP)', note: 'Won at ৳ 1,02,000/month' }],
  documents: [
  { id: 'D1', name: 'Trade licence', required: true, done: true },
  { id: 'D2', name: 'BTRC ISP licence', required: true, done: true },
  { id: 'D3', name: 'Price schedule', required: true, done: true }],

  submissionStatus: 'Submitted', submittedAt: '2026-09-15T10:30:00+06:00', outcome: 'Lost', outcomeNote: 'Awarded to the lowest bidder at ৳ 1,02,000/month.'
},
{
  id: 'TD-2026-011', reference: 'UCSB/PROC/ICT-11/2026', title: 'Ward office connectivity — 14 sites at 20 Mbps', issuingOrganisation: 'Uttara Civic Services Board', issuingOrganisationBn: 'উত্তরা সিভিক সার্ভিসেস বোর্ড',
  opportunityId: 'OP-2026-0201', ownerId: 'u-02', branchId: 'dhaka-north', zoneId: 'uttara', publishedAt: '2026-09-16T10:00:00+06:00',
  clarificationDeadline: '2026-10-01T17:00:00+06:00', submissionDeadline: '2026-10-08T12:00:00+06:00', winProbability: 55, estimatedValue: 196000,
  competitors: [
  { name: 'Competitor A (national ISP)', note: 'Incumbent at 6 of the 14 sites' },
  { name: 'Competitor B (metro fibre)', note: 'Aggressive on price; weaker SLA history' }],

  documents: [
  { id: 'D1', name: 'Trade licence', required: true, done: true },
  { id: 'D2', name: 'TIN and VAT (BIN) certificates', required: true, done: true },
  { id: 'D3', name: 'BTRC ISP licence', required: true, done: true },
  { id: 'D4', name: 'Tender security (pay order)', required: true, done: true },
  { id: 'D5', name: 'Technical compliance sheet', required: true, done: true },
  { id: 'D6', name: 'Price schedule', required: true, done: true }],

  submissionStatus: 'Submitted', submittedAt: '2026-10-08T11:40:00+06:00', outcome: 'Pending'
},
{
  id: 'TD-2026-014', reference: 'SVMC/TENDER/2026/14', title: 'Campus backbone and 300 Mbps dedicated internet', issuingOrganisation: 'Surma Valley Medical College', issuingOrganisationBn: 'সুরমা ভ্যালি মেডিকেল কলেজ',
  opportunityId: 'OP-2026-0212', ownerId: 'u-02', branchId: 'sylhet', zoneId: 'ambarkhana', publishedAt: '2026-10-02T10:00:00+06:00',
  clarificationDeadline: '2026-10-17T15:00:00+06:00', submissionDeadline: '2026-10-22T12:00:00+06:00', winProbability: 40, estimatedValue: 145000,
  competitors: [{ name: 'Competitor C (regional ISP)', note: 'Current provider; complaints about outages in the hospital wing' }],
  documents: [
  { id: 'D1', name: 'Trade licence', required: true, done: true },
  { id: 'D2', name: 'TIN and VAT (BIN) certificates', required: true, done: true },
  { id: 'D3', name: 'BTRC ISP licence', required: true, done: true },
  { id: 'D4', name: 'Bank solvency certificate', required: true, done: false },
  { id: 'D5', name: 'Tender security ৳ 50,000 (pay order)', required: true, done: false },
  { id: 'D6', name: 'Technical compliance sheet', required: true, done: false },
  { id: 'D7', name: 'Experience certificates (3 similar works)', required: true, done: true },
  { id: 'D8', name: 'Price schedule', required: true, done: false },
  { id: 'D9', name: 'Company brochure', required: false, done: false }],

  submissionStatus: 'Preparing', outcome: 'Pending'
}];


export const crmConflicts: CrmConflict[] = [
{
  id: 'CF-0001', kind: 'Possible duplicate', opportunityId: 'OP-2026-0224',
  matches: [{ type: 'lead', id: 'LD-2026-0311' }, { type: 'opportunity', id: 'OP-2026-0207' }],
  reasons: ['Similar name to Meghna Textiles Ltd', 'Same phone as Meghna Textiles Ltd (+880 1730-118842)', 'Similar address to Meghna Textiles Ltd'],
  requestedById: 'u-14', raisedAt: '2026-10-14T16:20:00+06:00', status: 'Open'
},
{
  id: 'CF-0002', kind: 'Assignment conflict', opportunityId: 'OP-2026-0219', matches: [{ type: 'opportunity', id: 'OP-2026-0219' }],
  reasons: ['Sadia Islam asked to work this opportunity, which Tanvir Hasan already owns'],
  note: 'Shirin Sultana contacted me directly through a residents’ committee member and wants me as the point of contact.',
  requestedById: 'u-14', raisedAt: '2026-10-15T09:10:00+06:00', status: 'Open'
}];