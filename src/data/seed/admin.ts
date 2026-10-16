import type { AdminArea, ApprovalRule, MasterDataItem, OperationalZone, OrgNode, PolicySetting } from '../../types/admin';

// FICTIONAL DEMO CONFIGURATION — geography names are real places; all organisation data is invented.

export const orgLevels: string[] = ['Company', 'Division', 'Department', 'Team'];

export const orgNodes: OrgNode[] = [
{ id: 'ON-01', name: 'Innovative Online Limited', nameBn: 'ইনোভেটিভ অনলাইন লিমিটেড', level: 0, parentId: null },
{ id: 'ON-10', name: 'Commercial', nameBn: 'বাণিজ্যিক', level: 1, parentId: 'ON-01' },
{ id: 'ON-20', name: 'Operations', nameBn: 'অপারেশনস', level: 1, parentId: 'ON-01' },
{ id: 'ON-30', name: 'Finance', nameBn: 'অর্থ', level: 1, parentId: 'ON-01' },
{ id: 'ON-40', name: 'Corporate Services', nameBn: 'কর্পোরেট সার্ভিসেস', level: 1, parentId: 'ON-01' },
{ id: 'ON-11', name: 'Sales', nameBn: 'বিক্রয়', level: 2, parentId: 'ON-10' },
{ id: 'ON-12', name: 'Account Management', nameBn: 'অ্যাকাউন্ট ম্যানেজমেন্ট', level: 2, parentId: 'ON-10' },
{ id: 'ON-13', name: 'Sales Operations (Back Office)', nameBn: 'সেলস অপারেশনস', level: 2, parentId: 'ON-10' },
{ id: 'ON-21', name: 'Network Operations', nameBn: 'নেটওয়ার্ক অপারেশনস', level: 2, parentId: 'ON-20' },
{ id: 'ON-22', name: 'Field Services', nameBn: 'ফিল্ড সার্ভিসেস', level: 2, parentId: 'ON-20' },
{ id: 'ON-23', name: 'Customer Support', nameBn: 'গ্রাহক সহায়তা', level: 2, parentId: 'ON-20' },
{ id: 'ON-24', name: 'Supply Chain', nameBn: 'সাপ্লাই চেইন', level: 2, parentId: 'ON-20' },
{ id: 'ON-31', name: 'Accounts', nameBn: 'হিসাব', level: 2, parentId: 'ON-30' },
{ id: 'ON-32', name: 'Finance Control', nameBn: 'ফাইন্যান্স কন্ট্রোল', level: 2, parentId: 'ON-30' },
{ id: 'ON-41', name: 'Executive Office', nameBn: 'নির্বাহী কার্যালয়', level: 2, parentId: 'ON-40' },
{ id: 'ON-42', name: 'IT & Systems', nameBn: 'আইটি ও সিস্টেমস', level: 2, parentId: 'ON-40' },
{ id: 'ON-221', name: 'Dhaka Field Team', nameBn: 'ঢাকা ফিল্ড টিম', level: 3, parentId: 'ON-22' },
{ id: 'ON-222', name: 'Chattogram Field Team', nameBn: 'চট্টগ্রাম ফিল্ড টিম', level: 3, parentId: 'ON-22' },
{ id: 'ON-223', name: 'Sylhet Field Team', nameBn: 'সিলেট ফিল্ড টিম', level: 3, parentId: 'ON-22' }];


export const adminAreas: AdminArea[] = [
{ id: 'DV-DHK', code: '30', name: 'Dhaka Division', nameBn: 'ঢাকা বিভাগ', level: 'Division', parentId: null },
{ id: 'DV-CTG', code: '20', name: 'Chattogram Division', nameBn: 'চট্টগ্রাম বিভাগ', level: 'Division', parentId: null },
{ id: 'DV-SYL', code: '60', name: 'Sylhet Division', nameBn: 'সিলেট বিভাগ', level: 'Division', parentId: null },
{ id: 'DS-DHK', code: '3026', name: 'Dhaka District', nameBn: 'ঢাকা জেলা', level: 'District', parentId: 'DV-DHK' },
{ id: 'DS-GAZ', code: '3033', name: 'Gazipur District', nameBn: 'গাজীপুর জেলা', level: 'District', parentId: 'DV-DHK' },
{ id: 'DS-NGJ', code: '3067', name: 'Narayanganj District', nameBn: 'নারায়ণগঞ্জ জেলা', level: 'District', parentId: 'DV-DHK' },
{ id: 'DS-CTG', code: '2015', name: 'Chattogram District', nameBn: 'চট্টগ্রাম জেলা', level: 'District', parentId: 'DV-CTG' },
{ id: 'DS-SYL', code: '6091', name: 'Sylhet District', nameBn: 'সিলেট জেলা', level: 'District', parentId: 'DV-SYL' },
{ id: 'TH-UTW', code: '302695', name: 'Uttara West', nameBn: 'উত্তরা পশ্চিম', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-UTE', code: '302696', name: 'Uttara East', nameBn: 'উত্তরা পূর্ব', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-MRP', code: '302648', name: 'Mirpur Model', nameBn: 'মিরপুর মডেল', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-PLB', code: '302664', name: 'Pallabi', nameBn: 'পল্লবী', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-GUL', code: '302630', name: 'Gulshan', nameBn: 'গুলশান', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-BAN', code: '302604', name: 'Banani', nameBn: 'বনানী', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-DHN', code: '302616', name: 'Dhanmondi', nameBn: 'ধানমন্ডি', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-MTJ', code: '302654', name: 'Motijheel', nameBn: 'মতিঝিল', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-JTB', code: '302637', name: 'Jatrabari', nameBn: 'যাত্রাবাড়ী', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-SPR', code: '302680', name: 'Shyampur', nameBn: 'শ্যামপুর', level: 'Upazila / Thana', parentId: 'DS-DHK' },
{ id: 'TH-GZS', code: '303330', name: 'Gazipur Sadar', nameBn: 'গাজীপুর সদর', level: 'Upazila / Thana', parentId: 'DS-GAZ' },
{ id: 'TH-TNG', code: '303336', name: 'Tongi', nameBn: 'টঙ্গী', level: 'Upazila / Thana', parentId: 'DS-GAZ' },
{ id: 'TH-NGS', code: '306758', name: 'Narayanganj Sadar', nameBn: 'নারায়ণগঞ্জ সদর', level: 'Upazila / Thana', parentId: 'DS-NGJ' },
{ id: 'TH-DBM', code: '201528', name: 'Double Mooring', nameBn: 'ডবলমুরিং', level: 'Upazila / Thana', parentId: 'DS-CTG' },
{ id: 'TH-KTC', code: '201541', name: 'Kotwali (Chattogram)', nameBn: 'কোতোয়ালী (চট্টগ্রাম)', level: 'Upazila / Thana', parentId: 'DS-CTG' },
{ id: 'TH-PHT', code: '201565', name: 'Pahartali', nameBn: 'পাহাড়তলী', level: 'Upazila / Thana', parentId: 'DS-CTG' },
{ id: 'TH-HLS', code: '201535', name: 'Halishahar', nameBn: 'হালিশহর', level: 'Upazila / Thana', parentId: 'DS-CTG' },
{ id: 'TH-KTS', code: '609141', name: 'Kotwali (Sylhet)', nameBn: 'কোতোয়ালী (সিলেট)', level: 'Upazila / Thana', parentId: 'DS-SYL' },
{ id: 'TH-APS', code: '609108', name: 'Airport (Sylhet)', nameBn: 'বিমানবন্দর (সিলেট)', level: 'Upazila / Thana', parentId: 'DS-SYL' },
{ id: 'TH-JLB', code: '609125', name: 'Jalalabad', nameBn: 'জালালাবাদ', level: 'Upazila / Thana', parentId: 'DS-SYL' }];


export const operationalZones: OperationalZone[] = [
{ id: 'uttara', name: 'Uttara', branchId: 'dhaka-north', adminAreaIds: ['TH-UTW', 'TH-UTE', 'TH-TNG', 'TH-GZS'], status: 'Active' },
{ id: 'mirpur', name: 'Mirpur', branchId: 'dhaka-north', adminAreaIds: ['TH-MRP', 'TH-PLB'], status: 'Active' },
{ id: 'gulshan', name: 'Gulshan', branchId: 'dhaka-north', adminAreaIds: ['TH-GUL', 'TH-BAN'], status: 'Active' },
{ id: 'dhanmondi', name: 'Dhanmondi', branchId: 'dhaka-south', adminAreaIds: ['TH-DHN'], status: 'Active' },
{ id: 'motijheel', name: 'Motijheel', branchId: 'dhaka-south', adminAreaIds: ['TH-MTJ'], status: 'Active' },
{ id: 'jatrabari', name: 'Jatrabari', branchId: 'dhaka-south', adminAreaIds: ['TH-JTB', 'TH-SPR', 'TH-NGS'], status: 'Active' },
{ id: 'agrabad', name: 'Agrabad', branchId: 'chattogram', adminAreaIds: ['TH-DBM', 'TH-KTC'], status: 'Active' },
{ id: 'pahartali', name: 'Pahartali', branchId: 'chattogram', adminAreaIds: ['TH-PHT', 'TH-HLS'], status: 'Active' },
{ id: 'zindabazar', name: 'Zindabazar', branchId: 'sylhet', adminAreaIds: ['TH-KTS'], status: 'Active' },
{ id: 'ambarkhana', name: 'Ambarkhana', branchId: 'sylhet', adminAreaIds: ['TH-APS'], status: 'Active' }];


export const approvalRules: ApprovalRule[] = [
{ id: 'AR-01', name: 'Quotation — standard', approvalType: 'Quotation', comparator: 'upTo', thresholdBdt: 50000, requiredPermission: 'approveQuotation', approverRoles: ['businessHead', 'management'], slaHours: 24, enforcedInDemo: true },
{ id: 'AR-02', name: 'Quotation — high value', approvalType: 'Quotation', comparator: 'above', thresholdBdt: 50000, requiredPermission: 'approveQuotation', approverRoles: ['management'], slaHours: 24, enforcedInDemo: true },
{ id: 'AR-03', name: 'Credit note', approvalType: 'Credit Note', comparator: 'any', requiredPermission: 'approveFinancial', approverRoles: ['financeApprover'], slaHours: 48, enforcedInDemo: true },
{ id: 'AR-04', name: 'Sales agent commission', approvalType: 'Commission', comparator: 'any', requiredPermission: 'approveCommission', approverRoles: ['financeApprover'], slaHours: 72, enforcedInDemo: true, note: 'Management holds no commission authority unless explicitly granted.' },
{ id: 'AR-05', name: 'Associate revenue-share payout', approvalType: 'Associate Payout', comparator: 'any', requiredPermission: 'approveFinancial', approverRoles: ['financeApprover'], slaHours: 48, enforcedInDemo: true },
{ id: 'AR-06', name: 'Disconnection — technical clearance', approvalType: 'Disconnection clearance', comparator: 'any', requiredPermission: 'technicalConfig', approverRoles: ['technicalSupervisor', 'fieldTechnician'], slaHours: 72, enforcedInDemo: true },
{ id: 'AR-07', name: 'Disconnection — accounts clearance', approvalType: 'Disconnection clearance', comparator: 'any', requiredPermission: 'recordCollection', approverRoles: ['accountsOfficer'], slaHours: 72, enforcedInDemo: true, note: 'Blocked while dues are outstanding.' },
{ id: 'AR-08', name: 'Role change granting financial approval', approvalType: 'Role change', comparator: 'any', requiredPermission: 'manageUsers', approverRoles: ['systemAdmin'], slaHours: 24, enforcedInDemo: true, note: 'An administrator can never grant financial approval to their own account.' }];


export const masterData: MasterDataItem[] = [
{ id: 'MD-001', category: 'Service type', code: 'DIA', label: 'Dedicated Internet', labelBn: 'ডেডিকেটেড ইন্টারনেট', active: true },
{ id: 'MD-002', category: 'Service type', code: 'BBD', label: 'Broadband', labelBn: 'ব্রডব্যান্ড', active: true },
{ id: 'MD-003', category: 'Service type', code: 'IPT', label: 'IP Transit', labelBn: 'আইপি ট্রানজিট', active: true },
{ id: 'MD-004', category: 'Service type', code: 'DCN', label: 'Data Connectivity', labelBn: 'ডেটা কানেক্টিভিটি', active: true },
{ id: 'MD-011', category: 'Payment method', code: 'BTR', label: 'Bank Transfer', labelBn: 'ব্যাংক ট্রান্সফার', active: true },
{ id: 'MD-012', category: 'Payment method', code: 'BDP', label: 'Bank Deposit', labelBn: 'ব্যাংক জমা', active: true },
{ id: 'MD-013', category: 'Payment method', code: 'BKS', label: 'bKash', labelBn: 'বিকাশ', active: true },
{ id: 'MD-014', category: 'Payment method', code: 'CHQ', label: 'Cheque', labelBn: 'চেক', active: true },
{ id: 'MD-015', category: 'Payment method', code: 'NGD', label: 'Nagad', labelBn: 'নগদ', active: false },
{ id: 'MD-021', category: 'Equipment', code: 'ONT-EG8145V5', label: 'Huawei EG8145V5 ONT', labelBn: 'হুয়াওয়ে ওএনটি', active: true },
{ id: 'MD-022', category: 'Equipment', code: 'FBR-DROP-2C', label: 'Drop fibre, 2-core', labelBn: 'ড্রপ ফাইবার, ২-কোর', active: true },
{ id: 'MD-031', category: 'Ticket category', code: 'LNK', label: 'Link down', labelBn: 'লিংক বিচ্ছিন্ন', active: true },
{ id: 'MD-032', category: 'Ticket category', code: 'PKT', label: 'Packet loss / latency', labelBn: 'প্যাকেট লস / ল্যাটেন্সি', active: true },
{ id: 'MD-033', category: 'Ticket category', code: 'CFG', label: 'Configuration request', labelBn: 'কনফিগারেশন অনুরোধ', active: true },
{ id: 'MD-041', category: 'Disconnection reason', code: 'REL', label: 'Relocating outside coverage', labelBn: 'কভারেজের বাইরে স্থানান্তর', active: true },
{ id: 'MD-042', category: 'Disconnection reason', code: 'NPY', label: 'Non-payment', labelBn: 'অপরিশোধিত বিল', active: true },
{ id: 'MD-043', category: 'Disconnection reason', code: 'CMP', label: 'Moved to competitor', labelBn: 'অন্য প্রতিষ্ঠানে স্থানান্তর', active: true },
{ id: 'MD-051', category: 'Lead source', code: 'DIR', label: 'Direct', labelBn: 'সরাসরি', active: true },
{ id: 'MD-052', category: 'Lead source', code: 'AGT', label: 'Sales Agent', labelBn: 'সেলস এজেন্ট', active: true },
{ id: 'MD-053', category: 'Lead source', code: 'WEB', label: 'Web', labelBn: 'ওয়েব', active: true },
{ id: 'MD-054', category: 'Lead source', code: 'REF', label: 'Referral', labelBn: 'রেফারেল', active: true }];


export const policies: PolicySetting[] = [
{ id: 'POL-SUPERVISOR', name: 'Supervisor visibility', value: 'direct', status: 'Awaiting IOL confirmation' },
{ id: 'LBL-GGC', name: 'Survey component label — GGC', value: 'GGC (Google Global Cache)', status: 'Awaiting IOL confirmation' },
{ id: 'LBL-FNN', name: 'Survey component label — FNN', value: 'FNN (private network segment)', status: 'Awaiting IOL confirmation' },
{ id: 'POL-PAYBACK', name: 'Survey payback formula', value: 'Proposed demo formula', status: 'Awaiting IOL confirmation' },
{ id: 'SCOPE-management', name: 'Record scope — Management', value: 'company', status: 'Confirmed' },
{ id: 'SCOPE-businessHead', name: 'Record scope — Business Head', value: 'company', status: 'Confirmed' },
{ id: 'SCOPE-salesExecutive', name: 'Record scope — Sales Executive', value: 'own', status: 'Confirmed' },
{ id: 'SCOPE-accountManager', name: 'Record scope — Account Manager', value: 'own', status: 'Confirmed' },
{ id: 'SCOPE-backOffice', name: 'Record scope — Back Office', value: 'company', status: 'Confirmed' },
{ id: 'SCOPE-technicalSupervisor', name: 'Record scope — Technical Supervisor', value: 'team', status: 'Confirmed' },
{ id: 'SCOPE-fieldTechnician', name: 'Record scope — Field Technician', value: 'own', status: 'Confirmed' },
{ id: 'SCOPE-inventoryOfficer', name: 'Record scope — Inventory Officer', value: 'company', status: 'Confirmed' },
{ id: 'SCOPE-accountsOfficer', name: 'Record scope — Accounts Officer', value: 'company', status: 'Confirmed' },
{ id: 'SCOPE-financeApprover', name: 'Record scope — Finance Approver', value: 'company', status: 'Confirmed' },
{ id: 'SCOPE-systemAdmin', name: 'Record scope — System Administrator', value: 'company', status: 'Confirmed' },
{ id: 'SCOPE-supportStaff', name: 'Record scope — Support Staff', value: 'branch', status: 'Confirmed' }];