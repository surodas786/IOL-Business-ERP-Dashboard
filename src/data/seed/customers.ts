import type { BillingAccount, Customer, ServiceConnection, Site } from '../../types/records';
import type { ProfileCorrection } from '../../types/customer';

// FICTIONAL DEMO DATA — all companies, people, IDs, licence numbers and accounts are invented.
// Leads and opportunities live in ./sales.ts.

export const customers: Customer[] = [
{
  id: 'CU-1002', name: 'Rahman Steel Works', nameBn: 'রহমান স্টিল ওয়ার্কস', segment: 'Corporate', category: 'Corporate', accountManagerId: 'u-04', status: 'Active', since: '2021-03-14T10:00:00+06:00',
  profileStage: 'Negotiation', submittedAt: '2021-02-20T10:00:00+06:00', registeredAddress: '88 Motijheel C/A, Dhaka 1000', tradeLicenceNo: 'DSCC-TRAD-0912374', tin: '312-845-6620',
  contacts: [
  { id: 'CC-0101', role: 'Primary', name: 'Abdur Rahman', nameBn: 'আব্দুর রহমান', designation: 'Director', phone: '+880 1711-330245', email: 'arahman@rahmansteel.com.bd' },
  { id: 'CC-0102', role: 'Technical', name: 'Mahfuz Alam', designation: 'IT Manager', phone: '+880 1819-552710', email: 'it@rahmansteel.com.bd' },
  { id: 'CC-0103', role: 'Billing', name: 'Shahana Parvin', nameBn: 'শাহানা পারভীন', designation: 'Accounts Executive', phone: '+880 1712-904118', email: 'accounts@rahmansteel.com.bd' },
  { id: 'CC-0104', role: 'Authorised', name: 'Abdur Rahman', designation: 'Director (signatory)', phone: '+880 1711-330245', email: 'arahman@rahmansteel.com.bd' }],

  documents: [
  { id: 'CD-0101', type: 'Trade licence', fileName: 'RSW_trade_licence_2026.pdf', reference: 'DSCC-TRAD-0912374', sensitivity: 'identity', uploadedAt: '2026-01-12T11:00:00+06:00', byId: 'u-05' },
  { id: 'CD-0102', type: 'TIN certificate', fileName: 'RSW_TIN.pdf', reference: '312-845-6620', sensitivity: 'identity', uploadedAt: '2021-02-21T12:00:00+06:00', byId: 'u-05' },
  { id: 'CD-0103', type: 'NID — authorised signatory', fileName: 'A_Rahman_NID.jpg', reference: '1987 2614 0035', sensitivity: 'identity', uploadedAt: '2021-02-21T12:00:00+06:00', byId: 'u-05' },
  { id: 'CD-0104', type: 'Bank payment instruction', fileName: 'RSW_EFT_mandate.pdf', reference: 'Dutch-Bangla Bank, Motijheel · A/C 1021-1100-48213', sensitivity: 'payment', uploadedAt: '2024-03-02T10:00:00+06:00', byId: 'u-09' },
  { id: 'CD-0105', type: 'Service agreement', fileName: 'RSW_MSA_2024.pdf', reference: 'MSA-2024-0219', sensitivity: 'general', uploadedAt: '2024-01-15T10:00:00+06:00', byId: 'u-05' }],

  branchId: 'dhaka-south', zoneId: 'motijheel'
},
{
  id: 'CU-1003', name: 'Green Valley Apartments', nameBn: 'গ্রিন ভ্যালি অ্যাপার্টমেন্টস', segment: 'Corporate', category: 'Corporate', accountManagerId: 'u-02', status: 'Active', since: '2023-07-01T10:00:00+06:00',
  profileStage: 'Negotiation', submittedAt: '2023-06-10T10:00:00+06:00', registeredAddress: 'Road 12, Sector 7, Uttara, Dhaka 1230', tradeLicenceNo: 'DNCC-SOC-2023-0451', tin: '418-220-7731',
  contacts: [
  { id: 'CC-0111', role: 'Primary', name: 'Kamal Uddin', nameBn: 'কামাল উদ্দিন', designation: 'Society Manager', phone: '+880 1712-774310', email: 'manager@greenvalley.org.bd' },
  { id: 'CC-0112', role: 'Billing', name: 'Kamal Uddin', designation: 'Society Manager', phone: '+880 1712-774310', email: 'manager@greenvalley.org.bd' },
  { id: 'CC-0113', role: 'Authorised', name: 'Selina Haque', designation: 'Committee Secretary', phone: '+880 1715-660218', email: 'secretary@greenvalley.org.bd' }],

  documents: [
  { id: 'CD-0111', type: 'Society registration', fileName: 'GVA_registration.pdf', reference: 'DNCC-SOC-2023-0451', sensitivity: 'identity', uploadedAt: '2023-06-11T10:00:00+06:00', byId: 'u-05' }],

  branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'CU-1004', name: 'Port View Logistics', nameBn: 'পোর্ট ভিউ লজিস্টিকস', segment: 'Corporate', category: 'Corporate', accountManagerId: 'u-02', leadId: 'LD-2026-0294', status: 'Onboarding', since: '2026-09-19T16:30:00+06:00',
  profileStage: 'Negotiation', submittedAt: '2026-09-08T11:00:00+06:00', registeredAddress: '5th Floor, 104 Agrabad C/A, Chattogram 4100', tradeLicenceNo: 'CCC-TL-2019-77812', tin: '529-114-0386',
  contacts: [
  { id: 'CC-0121', role: 'Primary', name: 'Faisal Chowdhury', nameBn: 'ফয়সাল চৌধুরী', designation: 'Head of IT', phone: '+880 1819-271604', email: 'faisal@portviewbd.com' },
  { id: 'CC-0122', role: 'Technical', name: 'Faisal Chowdhury', designation: 'Head of IT', phone: '+880 1819-271604', email: 'faisal@portviewbd.com' },
  { id: 'CC-0123', role: 'Billing', name: 'Rupa Barua', designation: 'Finance Officer', phone: '+880 1818-330917', email: 'finance@portviewbd.com' }],

  documents: [
  { id: 'CD-0121', type: 'Trade licence', fileName: 'PortView_TL.pdf', reference: 'CCC-TL-2019-77812', sensitivity: 'identity', uploadedAt: '2026-09-15T12:00:00+06:00', byId: 'u-05' },
  { id: 'CD-0122', type: 'Signed work order', fileName: 'WO-2026-0144_signed.pdf', reference: 'WO-2026-0144', sensitivity: 'general', uploadedAt: '2026-09-20T11:30:00+06:00', byId: 'u-05' }],

  branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'CU-1005', name: 'Karnaphuli Shipping Agency', nameBn: 'কর্ণফুলী শিপিং এজেন্সি', segment: 'SME', category: 'SOHO', accountManagerId: 'u-02', leadId: 'LD-2026-0301', status: 'Onboarding', since: '2026-10-02T12:00:00+06:00',
  profileStage: 'Negotiation', submittedAt: '2026-09-17T10:00:00+06:00', registeredAddress: '31 Sheikh Mujib Road, Agrabad, Chattogram 4100',
  branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'CU-1006', name: 'Mirpur Diagnostic Centre', nameBn: 'মিরপুর ডায়াগনস্টিক সেন্টার', segment: 'SME', category: 'Corporate', accountManagerId: 'u-02', leadId: 'LD-2026-0288', status: 'Active', since: '2026-09-25T12:00:00+06:00',
  profileStage: 'Survey', submittedAt: '2026-09-10T10:00:00+06:00', registeredAddress: 'Plot 7, Section 10, Mirpur, Dhaka 1216', tradeLicenceNo: 'DNCC-TL-2018-33091', tin: '207-338-9104',
  contacts: [
  { id: 'CC-0131', role: 'Primary', name: 'Dr. Nazmul Haque', nameBn: 'ডা. নাজমুল হক', designation: 'Managing Director', phone: '+880 1712-640318', email: 'md@mirpurdiagnostic.com' },
  { id: 'CC-0132', role: 'Technical', name: 'Arman Hossain', designation: 'PACS Administrator', phone: '+880 1913-207714', email: 'pacs@mirpurdiagnostic.com' },
  { id: 'CC-0133', role: 'Billing', name: 'Lipi Akter', designation: 'Accounts', phone: '+880 1716-882041', email: 'accounts@mirpurdiagnostic.com' },
  { id: 'CC-0134', role: 'Authorised', name: 'Dr. Nazmul Haque', designation: 'Managing Director (signatory)', phone: '+880 1712-640318', email: 'md@mirpurdiagnostic.com' }],

  documents: [
  { id: 'CD-0131', type: 'Trade licence', fileName: 'MDC_trade_licence.pdf', reference: 'DNCC-TL-2018-33091', sensitivity: 'identity', uploadedAt: '2026-09-11T10:00:00+06:00', byId: 'u-05' },
  { id: 'CD-0132', type: 'bKash merchant payment', fileName: 'MDC_bKash_mandate.pdf', reference: 'bKash merchant 01712-640318', sensitivity: 'payment', uploadedAt: '2026-10-02T10:30:00+06:00', byId: 'u-09' }],

  branchId: 'dhaka-north', zoneId: 'mirpur'
},
{
  id: 'CU-1007', name: 'Surma Tea Traders', nameBn: 'সুরমা টি ট্রেডার্স', segment: 'SME', category: 'SOHO', accountManagerId: 'u-02', status: 'Active', since: '2022-05-10T10:00:00+06:00',
  profileStage: 'Negotiation', submittedAt: '2022-04-28T10:00:00+06:00', registeredAddress: '12 Zindabazar Main Road, Sylhet 3100', tradeLicenceNo: 'SCC-TL-2015-10442',
  branchId: 'sylhet', zoneId: 'zindabazar'
},
{
  id: 'CU-1008', name: 'Pahartali Cable & Net', nameBn: 'পাহাড়তলী ক্যাবল অ্যান্ড নেট', segment: 'Associate', category: 'Associate/MAC', accountManagerId: 'u-02', associateId: 'AS-202', status: 'Active', since: '2023-11-01T10:00:00+06:00',
  profileStage: 'Negotiation', submittedAt: '2023-10-12T10:00:00+06:00', registeredAddress: '45 DT Road, Pahartali, Chattogram 4202', tradeLicenceNo: 'CCC-TL-2020-55120',
  branchId: 'chattogram', zoneId: 'pahartali'
},
{
  id: 'CU-1009', name: 'Zindabazar Link Solutions', nameBn: 'জিন্দাবাজার লিংক সলিউশনস', segment: 'Associate', category: 'Bandwidth', accountManagerId: 'u-02', associateId: 'AS-203', status: 'Active', since: '2024-06-01T10:00:00+06:00',
  profileStage: 'Negotiation', submittedAt: '2024-05-14T10:00:00+06:00', registeredAddress: 'Lamabazar, Sylhet 3100', tradeLicenceNo: 'SCC-TL-2021-20871',
  branchId: 'sylhet', zoneId: 'zindabazar'
},
{
  id: 'CU-1010', name: 'Dhanmondi Dental Care', nameBn: 'ধানমন্ডি ডেন্টাল কেয়ার', segment: 'SME', category: 'SOHO', accountManagerId: 'u-04', status: 'Prospect', since: '2026-10-14T15:00:00+06:00',
  profileStage: 'Draft', registeredAddress: 'House 27, Road 8, Dhanmondi, Dhaka 1205',
  contacts: [{ id: 'CC-0141', role: 'Primary', name: 'Dr. Farzana Yasmin', nameBn: 'ডা. ফারজানা ইয়াসমিন', designation: 'Proprietor', phone: '+880 1715-438290', email: 'farzana@dhanmondidental.com' }],
  branchId: 'dhaka-south', zoneId: 'dhanmondi'
},
{
  id: 'CU-1011', name: 'Meridian Bank PLC — Agrabad Branch', nameBn: 'মেরিডিয়ান ব্যাংক পিএলসি — আগ্রাবাদ শাখা', segment: 'Corporate', category: 'Bank', accountManagerId: 'u-15', status: 'Prospect', since: '2026-10-06T11:00:00+06:00',
  profileStage: 'Survey', submittedAt: '2026-10-09T12:00:00+06:00', registeredAddress: '2nd Floor, 71 Agrabad C/A, Chattogram 4100', tradeLicenceNo: 'CCC-TL-2009-01193', tin: '100-472-3358',
  contacts: [
  { id: 'CC-0151', role: 'Primary', name: 'Mostafizur Rahman', designation: 'Branch Manager', phone: '+880 1711-773012', email: 'agrabad.bm@meridianbank.com.bd' },
  { id: 'CC-0152', role: 'Technical', name: 'Tahmid Islam', designation: 'Regional IT Officer', phone: '+880 1819-640522', email: 'it.ctg@meridianbank.com.bd' },
  { id: 'CC-0153', role: 'Authorised', name: 'Nasreen Sultana', nameBn: 'নাসরিন সুলতানা', designation: 'Head of Procurement (signatory)', phone: '+880 1713-208446', email: 'procurement@meridianbank.com.bd' }],

  documents: [{ id: 'CD-0151', type: 'Trade licence', fileName: 'Meridian_TL.pdf', reference: 'CCC-TL-2009-01193', sensitivity: 'identity', uploadedAt: '2026-10-09T11:30:00+06:00', byId: 'u-15' }],
  branchId: 'chattogram', zoneId: 'agrabad'
}];


export const sites: Site[] = [
{ id: 'ST-2001', customerId: 'CU-1002', name: 'Head Office', address: '88 Motijheel C/A, Dhaka 1000', contactName: 'Abdur Rahman', contactPhone: '+880 1711-330245', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'ST-2002', customerId: 'CU-1002', name: 'Rolling Mill', address: 'Plot 14, Postogola Industrial Area, Dhaka 1204', contactName: 'Mahfuz Alam', contactPhone: '+880 1819-552710', branchId: 'dhaka-south', zoneId: 'jatrabari' },
{ id: 'ST-2003', customerId: 'CU-1002', name: 'Chattogram Depot', address: '22 Strand Road, Sadarghat, Chattogram 4000', contactName: 'Jasim Uddin', contactPhone: '+880 1715-208943', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'ST-2004', customerId: 'CU-1003', name: 'Green Valley Complex', address: 'Road 12, Sector 7, Uttara, Dhaka 1230', contactName: 'Kamal Uddin (Manager)', contactPhone: '+880 1712-774310', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'ST-2005', customerId: 'CU-1004', name: 'Agrabad Office', address: '5th Floor, 104 Agrabad C/A, Chattogram 4100', contactName: 'Faisal Chowdhury', contactPhone: '+880 1819-271604', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'ST-2006', customerId: 'CU-1005', name: 'Head Office', address: '31 Sheikh Mujib Road, Agrabad, Chattogram 4100', contactName: 'Anwar Hossain', contactPhone: '+880 1711-908273', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'ST-2007', customerId: 'CU-1006', name: 'Diagnostic Centre', address: 'Plot 7, Section 10, Mirpur, Dhaka 1216', contactName: 'Dr. Nazmul Haque', contactPhone: '+880 1712-640318', branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'ST-2008', customerId: 'CU-1007', name: 'Showroom & Office', address: '12 Zindabazar Main Road, Sylhet 3100', contactName: 'Abul Kalam', contactPhone: '+880 1716-402288', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'ST-2009', customerId: 'CU-1008', name: 'Pahartali POP', address: '45 DT Road, Pahartali, Chattogram 4202', contactName: 'Nurul Absar', contactPhone: '+880 1818-660172', branchId: 'chattogram', zoneId: 'pahartali' },
{ id: 'ST-2010', customerId: 'CU-1009', name: 'Lamabazar POP', address: 'Lamabazar, Sylhet 3100', contactName: 'Delwar Hossain', contactPhone: '+880 1711-509634', branchId: 'sylhet', zoneId: 'zindabazar' }];


export const connections: ServiceConnection[] = [
{ id: 'CN-50121', customerId: 'CU-1002', siteId: 'ST-2001', billingAccountId: 'BA-3002', serviceType: 'Dedicated Internet', product: 'Internet', medium: 'Fibre', bandwidthMbps: 50, mrc: 32000, status: 'Active', activatedAt: '2021-03-20T12:00:00+06:00', onuSerial: 'HWTC-7A21C4E9', vlan: 1121, cpe: 'Huawei EG8145V5 ONT', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'CN-50122', customerId: 'CU-1002', siteId: 'ST-2002', billingAccountId: 'BA-3002', serviceType: 'Dedicated Internet', product: 'Internet', medium: 'Fibre', bandwidthMbps: 30, mrc: 18000, status: 'Active', activatedAt: '2022-08-11T12:00:00+06:00', onuSerial: 'HWTC-7A21D0B3', vlan: 1122, cpe: 'Huawei EG8145V5 ONT', branchId: 'dhaka-south', zoneId: 'jatrabari' },
{ id: 'CN-50123', customerId: 'CU-1002', siteId: 'ST-2003', billingAccountId: 'BA-3002', serviceType: 'Data Connectivity', product: 'Data Connectivity', medium: 'Fibre', bandwidthMbps: 20, mrc: 12500, status: 'Active', activatedAt: '2024-01-15T12:00:00+06:00', onuSerial: 'HWTC-80F3A112', vlan: 2123, cpe: 'Huawei EG8145V5 ONT', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'CN-50124', customerId: 'CU-1002', siteId: 'ST-2001', billingAccountId: 'BA-3011', serviceType: 'Data Connectivity', product: 'CCTV', medium: 'Cat6', bandwidthMbps: 0, mrc: 6500, status: 'Active', activatedAt: '2025-02-01T12:00:00+06:00', cpe: '8 × Hikvision IP camera, 1 × 16-ch NVR', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'CN-50125', customerId: 'CU-1002', siteId: 'ST-2002', billingAccountId: 'BA-3011', serviceType: 'Data Connectivity', product: 'LAN', medium: 'Cat6', bandwidthMbps: 0, mrc: 4000, status: 'Active', activatedAt: '2025-02-01T12:00:00+06:00', cpe: '2 × 24-port managed switch, 46 Cat6 points', branchId: 'dhaka-south', zoneId: 'jatrabari' },
{ id: 'CN-50126', customerId: 'CU-1002', siteId: 'ST-2001', billingAccountId: 'BA-3011', serviceType: 'Data Connectivity', product: 'Access Control', medium: 'Cat6', bandwidthMbps: 0, mrc: 3000, status: 'Active', activatedAt: '2025-06-10T12:00:00+06:00', cpe: '3 × ZKTeco card reader, 1 × controller', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'CN-50130', customerId: 'CU-1003', siteId: 'ST-2004', billingAccountId: 'BA-3003', serviceType: 'Broadband', product: 'Internet', medium: 'Fibre', bandwidthMbps: 200, mrc: 42000, status: 'Active', activatedAt: '2023-07-05T12:00:00+06:00', onuSerial: 'HWTC-5C9E2214', vlan: 1310, cpe: 'Huawei MA5671 ONT + building OLT feed', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'CN-50140', customerId: 'CU-1007', siteId: 'ST-2008', billingAccountId: 'BA-3007', serviceType: 'Dedicated Internet', product: 'Internet', medium: 'Radio', bandwidthMbps: 10, mrc: 8500, status: 'Disconnection Pending', activatedAt: '2022-05-15T12:00:00+06:00', onuSerial: 'HWTC-3D8C5512', vlan: 4140, cpe: 'Ubiquiti LiteBeam 5AC + PoE, Huawei ONT at POP', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'CN-50150', customerId: 'CU-1008', siteId: 'ST-2009', billingAccountId: 'BA-3008', serviceType: 'IP Transit', product: 'IP Transit', medium: 'Fibre', bandwidthMbps: 1000, mrc: 96000, status: 'Active', activatedAt: '2023-11-05T12:00:00+06:00', vlan: 2150, cpe: 'Customer-owned router (BGP)', branchId: 'chattogram', zoneId: 'pahartali' },
{ id: 'CN-50160', customerId: 'CU-1009', siteId: 'ST-2010', billingAccountId: 'BA-3009', serviceType: 'IP Transit', product: 'IP Transit', medium: 'Fibre', bandwidthMbps: 500, mrc: 150000, status: 'Active', activatedAt: '2024-06-05T12:00:00+06:00', vlan: 4160, cpe: 'Customer-owned router (BGP)', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'CN-50176', customerId: 'CU-1006', siteId: 'ST-2007', billingAccountId: 'BA-3006', serviceType: 'Dedicated Internet', product: 'Internet', medium: 'Fibre', bandwidthMbps: 40, mrc: 22500, status: 'Active', activatedAt: '2026-10-02T10:00:00+06:00', onuSerial: 'HWTC-6C11A902', vlan: 1176, cpe: 'Huawei EG8145V5 ONT', branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'CN-50188', customerId: 'CU-1004', siteId: 'ST-2005', billingAccountId: 'BA-3004', serviceType: 'Dedicated Internet', product: 'Internet', medium: 'Fibre', bandwidthMbps: 20, mrc: 14000, status: 'Active', activatedAt: '2026-10-12T18:10:00+06:00', onuSerial: 'HWTC-91B2D07F', vlan: 2188, cpe: 'Huawei EG8145V5 ONT', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'CN-50190', customerId: 'CU-1005', siteId: 'ST-2006', billingAccountId: 'BA-3005', serviceType: 'Dedicated Internet', product: 'Internet', medium: 'Fibre', bandwidthMbps: 10, mrc: 9000, status: 'Pending Activation', vlan: 2190, cpe: 'Huawei EG8145V5 ONT (issued)', branchId: 'chattogram', zoneId: 'agrabad' }];


export const billingAccounts: BillingAccount[] = [
{ id: 'BA-3002', name: 'Rahman Steel Works — Corporate', customerId: 'CU-1002', collectionMode: 'Direct', billingContact: 'Shahana Parvin', billingAddress: '88 Motijheel C/A, Dhaka 1000', branchId: 'dhaka-south', zoneId: 'motijheel' },
{ id: 'BA-3003', name: 'Green Valley Apartments', customerId: 'CU-1003', collectionMode: 'Direct', billingContact: 'Kamal Uddin', billingAddress: 'Road 12, Sector 7, Uttara, Dhaka 1230', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'BA-3004', name: 'Port View Logistics', customerId: 'CU-1004', collectionMode: 'Direct', billingContact: 'Rupa Barua', billingAddress: '5th Floor, 104 Agrabad C/A, Chattogram 4100', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'BA-3005', name: 'Karnaphuli Shipping Agency', customerId: 'CU-1005', collectionMode: 'Direct', billingContact: 'Anwar Hossain', billingAddress: '31 Sheikh Mujib Road, Agrabad, Chattogram 4100', branchId: 'chattogram', zoneId: 'agrabad' },
{ id: 'BA-3006', name: 'Mirpur Diagnostic Centre', customerId: 'CU-1006', collectionMode: 'Direct', billingContact: 'Lipi Akter', billingAddress: 'Plot 7, Section 10, Mirpur, Dhaka 1216', branchId: 'dhaka-north', zoneId: 'mirpur' },
{ id: 'BA-3007', name: 'Surma Tea Traders', customerId: 'CU-1007', collectionMode: 'Direct', billingContact: 'Abul Kalam', billingAddress: '12 Zindabazar Main Road, Sylhet 3100', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'BA-3008', name: 'Pahartali Cable & Net — Remittance', customerId: 'CU-1008', associateId: 'AS-202', collectionMode: 'Associate — Decentralised', billingContact: 'Nurul Absar', billingAddress: '45 DT Road, Pahartali, Chattogram 4202', branchId: 'chattogram', zoneId: 'pahartali' },
{ id: 'BA-3009', name: 'Zindabazar Link Solutions — Fixed fee', customerId: 'CU-1009', associateId: 'AS-203', collectionMode: 'Associate — Fixed Monthly', billingContact: 'Delwar Hossain', billingAddress: 'Lamabazar, Sylhet 3100', branchId: 'sylhet', zoneId: 'zindabazar' },
{ id: 'BA-3010', name: 'Uttara Net Point — Subscriber pool', associateId: 'AS-201', collectionMode: 'Associate — Centralised', billingContact: 'IOL Collections Desk', billingAddress: 'House 42, Road 11, Sector 4, Uttara, Dhaka 1230', branchId: 'dhaka-north', zoneId: 'uttara' },
{ id: 'BA-3011', name: 'Rahman Steel Works — Security & LAN', customerId: 'CU-1002', collectionMode: 'Direct', billingContact: 'Mahfuz Alam', billingAddress: 'Plot 14, Postogola Industrial Area, Dhaka 1204', branchId: 'dhaka-south', zoneId: 'motijheel' }];


export const profileCorrections: ProfileCorrection[] = [
{
  id: 'PC-0007', customerId: 'CU-1006', field: 'registeredAddress', oldValue: 'Plot 7, Section 11, Mirpur, Dhaka 1216', proposedValue: 'Plot 7, Section 10, Mirpur, Dhaka 1216',
  reason: 'Trade licence and survey SV-2026-0905 show Section 10; Section 11 was a typing error at lead entry.', requestedById: 'u-05', requestedAt: '2026-10-06T11:20:00+06:00',
  status: 'Approved', decidedById: 'u-02', decidedAt: '2026-10-06T15:45:00+06:00', decisionNote: 'Verified against trade licence.', frozenDocs: ['QT-2026-0371', 'WO-2026-0131', 'INV-33405'],
  branchId: 'dhaka-north', zoneId: 'mirpur'
},
{
  id: 'PC-0009', customerId: 'CU-1004', field: 'name', oldValue: 'Port View Logistics', proposedValue: 'Port View Logistics Ltd.',
  reason: 'Registered as a private limited company — trade licence CCC-TL-2019-77812 shows “Port View Logistics Ltd.”. Needed for VAT invoices.', requestedById: 'u-05', requestedAt: '2026-10-14T12:10:00+06:00',
  status: 'Pending', branchId: 'chattogram', zoneId: 'agrabad'
}];


/** Values as they stood before an approved correction, for seeded document snapshots. */
export const preCorrectionSnapshot: Record<string, Partial<Record<'registeredAddress' | 'name', string>>> = {
  'CU-1006': { registeredAddress: 'Plot 7, Section 11, Mirpur, Dhaka 1216' }
};