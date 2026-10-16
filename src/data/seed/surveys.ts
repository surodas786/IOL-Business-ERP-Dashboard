import type { Survey } from '../../types/records';
import type { BomLine, StockItem, SurveyBypass, SurveyCommercial, SurveyTechnical } from '../../types/survey';

// FICTIONAL DEMO DATA — sites, PoPs, routes, prices and people are invented.

const priced = '2026-10-10T10:00:00+06:00';

/** BOM line helper. reservedQty defaults to 0 (estimate only). */
function line(id: string, item: string, quantity: number, unit: string, unitCost: number, supply: BomLine['supply'], ownership: BomLine['ownership'], sku?: string, reservedQty = 0, pricedAt = priced): BomLine {
  return { id, sku, item, quantity, unit, unitCost, pricedAt, supply, ownership, reservedQty };
}

const noCommercial: SurveyCommercial = {
  mrc: 0, mrcDiscount: 0, otc: 0, otcWaiver: 0, refundableDeposit: 0, advanceReceived: 0,
  labour: 0, permits: 0, nttnOtc: 0, otherOneTime: 0, nttnMonthly: 0, upstreamMonthly: 0, otherRecurring: 0, agentRecurringPct: 0
};

const baseTech: Partial<SurveyTechnical> = { ggcRequired: false, ggcNotes: '', fnnRequired: false, fnnNotes: '', nttnNotes: '', capacityNotes: '' };

export const surveys: Survey[] = [
{
  id: 'SV-2026-0905', opportunityId: 'OP-2026-0189', customerId: 'CU-1006', siteId: 'ST-2007', siteLabel: 'Diagnostic Centre', address: 'Plot 7, Section 10, Mirpur, Dhaka 1216',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 40, siteContactName: 'Arman Hossain (PACS Administrator)', siteContactPhone: '+880 1913-207714', accessInstructions: 'Server room on 3rd floor; key with reception. Visits 9 AM–5 PM.',
  requestedById: 'u-03', technicianName: 'Jahid Hasan', status: 'Approved', result: 'Feasible', fibreDistanceM: 450,
  requestedAt: '2026-09-10T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-09-10T12:00:00+06:00', assignedAt: '2026-09-10T15:00:00+06:00', scheduledAt: '2026-09-12T11:00:00+06:00', startedAt: '2026-09-12T11:10:00+06:00',
  completedAt: '2026-09-12T15:00:00+06:00', reviewedById: 'u-06', reviewedAt: '2026-09-12T17:30:00+06:00', reviewNote: 'Approved. Use the existing duct.',
  notes: 'Underground duct available from Mirpur 10 POP.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Mirpur 10 PoP', popDistanceM: '450', route: 'Underground duct along Begum Rokeya Sarani, riser to 3rd floor', lastMile: 'IOL', nttn: 'None — IOL own fibre', capacity: 'Available',
    latencyMs: '5', mtu: '1500', redundancy: 'None', ipRequirement: '1 × static IPv4', power: 'Customer UPS available', grounding: 'Building earth bar in server room', rack: 'Customer 12U rack, 2U free',
    constraints: 'None', deliveryDays: '10', outcome: 'Feasible', outcomeNotes: 'Standard install.'
  },
  bom: [
  line('BL-0101', 'Huawei EG8145V5 ONT', 1, 'pc', 4800, 'IOL stock', 'IOL-owned · returnable', 'ONT-EG8145V5', 0, '2026-09-12T10:00:00+06:00'),
  line('BL-0102', 'Drop fibre, 2-core', 450, 'm', 18, 'IOL stock', 'IOL-owned · consumed', 'FBR-DROP-2C', 0, '2026-09-12T10:00:00+06:00')],

  commercial: { ...noCommercial, mrc: 22500, otc: 15000, labour: 4000, upstreamMonthly: 5200, otherRecurring: 1200, updatedById: 'u-03', updatedAt: '2026-09-13T10:00:00+06:00' },
  attachments: [{ id: 'SA-0101', name: 'MDC_server_room.jpg', kind: 'Photo', at: '2026-09-12T14:20:00+06:00', byId: 'u-06' }],
  branchId: 'dhaka-north', zoneId: 'mirpur'
},
{
  id: 'SV-2026-0918', opportunityId: 'OP-2026-0178', customerId: 'CU-1004', siteId: 'ST-2005', siteLabel: 'Agrabad Office', address: '5th Floor, 104 Agrabad C/A, Chattogram 4100',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 20, siteContactName: 'Faisal Chowdhury', siteContactPhone: '+880 1819-271604', accessInstructions: 'Riser access via building management office, ground floor.',
  requestedById: 'u-02', technicianName: 'Rakib Uddin', technicianUserId: 'u-07', status: 'Approved', result: 'Feasible', fibreDistanceM: 350,
  requestedAt: '2026-09-08T11:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-09-08T12:10:00+06:00', assignedAt: '2026-09-08T13:00:00+06:00', scheduledAt: '2026-09-09T10:00:00+06:00', startedAt: '2026-09-09T10:05:00+06:00',
  completedAt: '2026-09-09T12:30:00+06:00', reviewedById: 'u-06', reviewedAt: '2026-09-09T16:00:00+06:00', reviewNote: 'Approved.',
  notes: 'Riser access approved by building management.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Agrabad PoP', popDistanceM: '350', route: 'Aerial along Agrabad Access Road, building riser', lastMile: 'IOL', nttn: 'None — IOL own fibre', capacity: 'Available',
    latencyMs: '6', mtu: '1500', redundancy: 'None', ipRequirement: '1 × static IPv4', power: 'Office UPS', grounding: 'Riser earth point', rack: 'Wall-mount shelf', constraints: 'None', deliveryDays: '7', outcome: 'Feasible', outcomeNotes: ''
  },
  bom: [
  line('BL-0201', 'Huawei EG8145V5 ONT', 1, 'pc', 4800, 'IOL stock', 'IOL-owned · returnable', 'ONT-EG8145V5', 0, '2026-09-09T10:00:00+06:00'),
  line('BL-0202', 'Drop fibre, 2-core', 350, 'm', 18, 'IOL stock', 'IOL-owned · consumed', 'FBR-DROP-2C', 0, '2026-09-09T10:00:00+06:00')],

  commercial: { ...noCommercial, mrc: 14000, otc: 8000, labour: 3500, upstreamMonthly: 2600, otherRecurring: 900 },
  branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'SV-2026-0924', opportunityId: 'OP-2026-0183', customerId: 'CU-1005', siteId: 'ST-2006', siteLabel: 'Head Office', address: '31 Sheikh Mujib Road, Agrabad, Chattogram 4100',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 10, siteContactName: 'Anwar Hossain', siteContactPhone: '+880 1711-908273', accessInstructions: 'Roof access needs the landlord present (call a day ahead).',
  requestedById: 'u-02', technicianName: 'Rakib Uddin', technicianUserId: 'u-07', status: 'Approved', result: 'Feasible', fibreDistanceM: 280,
  requestedAt: '2026-09-17T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-09-17T11:30:00+06:00', assignedAt: '2026-09-17T12:00:00+06:00', scheduledAt: '2026-09-18T14:00:00+06:00', startedAt: '2026-09-18T14:10:00+06:00',
  completedAt: '2026-09-18T16:10:00+06:00', reviewedById: 'u-06', reviewedAt: '2026-09-19T10:00:00+06:00', reviewNote: 'Approved with roof mount.',
  notes: 'Aerial drop from Agrabad POP; roof mount needed.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Agrabad PoP', popDistanceM: '280', route: 'Aerial drop from Agrabad PoP pole line to roof', lastMile: 'IOL', nttn: 'None — IOL own fibre', capacity: 'Available',
    latencyMs: '6', mtu: '1500', redundancy: 'None', ipRequirement: 'Dynamic, NAT', power: 'Customer to provide socket near rack', grounding: 'New earth rod needed', rack: 'Wall-mount shelf',
    constraints: 'Roof mount; landlord present', deliveryDays: '12', outcome: 'Feasible with conditions', outcomeNotes: 'Earth rod to be installed by IOL.'
  },
  bom: [
  line('BL-0301', 'Huawei EG8145V5 ONT', 1, 'pc', 4800, 'IOL stock', 'IOL-owned · returnable', 'ONT-EG8145V5', 0, '2026-09-18T10:00:00+06:00'),
  line('BL-0302', 'Drop fibre, 2-core', 280, 'm', 18, 'IOL stock', 'IOL-owned · consumed', 'FBR-DROP-2C', 280, '2026-09-18T10:00:00+06:00'),
  line('BL-0303', 'Pole clamp set', 6, 'set', 350, 'IOL stock', 'IOL-owned · consumed', 'HW-POLE-CLAMP', 6, '2026-09-18T10:00:00+06:00')],

  commercial: { ...noCommercial, mrc: 9000, otc: 8000, labour: 3000, permits: 1500, upstreamMonthly: 1300, otherRecurring: 700 },
  branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'SV-2026-0928', opportunityId: 'OP-2026-0149', siteLabel: 'Main campus', address: 'Tilagarh, Sylhet 3100',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 200, siteContactName: 'Dr. Mahmuda Khanam (Registrar)', siteContactPhone: '+880 1711-582034', accessInstructions: 'Report to the registrar’s office; campus security escorts.',
  requestedById: 'u-02', technicianName: 'Tareq Aziz', technicianUserId: 'u-13', status: 'Not Feasible', result: 'Not Feasible',
  requestedAt: '2026-08-24T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-08-24T12:00:00+06:00', assignedAt: '2026-08-24T15:00:00+06:00', scheduledAt: '2026-08-27T10:00:00+06:00', startedAt: '2026-08-27T10:20:00+06:00',
  completedAt: '2026-08-27T16:00:00+06:00', reviewedById: 'u-06', reviewedAt: '2026-08-28T11:00:00+06:00',
  reviewNote: 'Not feasible on IOL fibre within the tender timeline: Surma river crossing needs an NTTN backhaul that cannot be delivered before 30 Sep.',
  notes: 'Own-fibre route blocked by river crossing; NTTN backhaul only.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Zindabazar PoP', popDistanceM: '6800', route: 'Would cross the Surma at Keane Bridge — no IOL duct', lastMile: 'NTTN partner', nttn: 'NTTN partner backhaul',
    nttnNotes: 'Partner quoted 45 working days for backhaul.', capacity: 'Available after upgrade', capacityNotes: 'Zindabazar uplink needs +200 Mbps.', latencyMs: '10', mtu: '1500', redundancy: 'None',
    ipRequirement: '/28 IPv4', power: 'Campus generator', grounding: 'Unknown', rack: 'Campus data centre', constraints: 'River crossing; tender deadline 30 Sep', deliveryDays: '60', outcome: 'Not feasible',
    outcomeNotes: 'Cannot meet the tender delivery date.'
  },
  bom: [],
  branchId: 'sylhet', zoneId: 'ambarkhana'
},
{
  id: 'SV-2026-0932', opportunityId: 'OP-2026-0207', siteLabel: 'Konabari factory', address: 'Kashimpur Road, Konabari, Gazipur 1751',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 100, siteContactName: 'Shahidul Karim (Admin Manager)', siteContactPhone: '+880 1711-445210', accessInstructions: 'Main gate 2; security needs the technician’s NID. Rooftop via staircase B.',
  requestedById: 'u-03', technicianName: 'Jahid Hasan', status: 'Approved', result: 'Feasible', fibreDistanceM: 1200,
  requestedAt: '2026-09-26T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-09-26T13:00:00+06:00', assignedAt: '2026-09-27T10:00:00+06:00', scheduledAt: '2026-10-01T10:00:00+06:00', startedAt: '2026-10-01T10:15:00+06:00',
  completedAt: '2026-10-01T15:20:00+06:00', reviewedById: 'u-06', reviewedAt: '2026-10-02T11:00:00+06:00', reviewNote: 'Approved with conditions: two pole permissions from the Konabari pourashava before work starts.',
  notes: 'Aerial fibre from Uttara Sector 11 POP via Konabari; two pole permissions needed.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Uttara Sector 11 PoP (via Konabari splice point)', popDistanceM: '1200', route: 'Aerial ADSS on 14 poles along Kashimpur Road, entry via rooftop', lastMile: 'IOL',
    nttn: 'None — IOL own fibre', capacity: 'Available', capacityNotes: 'Uttara uplink at 61% peak.', ggcRequired: true, ggcNotes: 'Cache benefit for factory streaming training videos.', fnnRequired: false,
    latencyMs: '8', mtu: '1500', redundancy: 'None', ipRequirement: '/29 IPv4 block, /64 IPv6', power: 'Factory UPS, 30 min backup', grounding: 'Factory earth pit 15 m from rack',
    rack: 'IOL to supply 9U wall rack', constraints: 'Two pole permissions; no work during shift change 2–3 PM', deliveryDays: '14', outcome: 'Feasible with conditions', outcomeNotes: 'Pole permissions first.'
  },
  bom: [
  line('BL-0501', 'ADSS aerial fibre, 12-core', 1200, 'm', 62, 'IOL stock', 'IOL-owned · consumed', 'FBR-ADSS-12C'),
  line('BL-0502', 'Splice closure, 24F', 2, 'pc', 2600, 'IOL stock', 'IOL-owned · consumed', 'SPL-CLOSURE-24'),
  line('BL-0503', 'Pole clamp set', 14, 'set', 350, 'IOL stock', 'IOL-owned · consumed', 'HW-POLE-CLAMP'),
  line('BL-0504', 'Huawei EG8145V5 ONT', 1, 'pc', 4800, 'IOL stock', 'IOL-owned · returnable', 'ONT-EG8145V5'),
  line('BL-0505', 'MikroTik RB4011 router', 1, 'pc', 21500, 'IOL purchase', 'IOL-owned · returnable', 'RTR-MT-RB4011'),
  line('BL-0506', '1G SFP LX module', 2, 'pc', 1900, 'IOL stock', 'IOL-owned · returnable', 'SFP-1G-LX'),
  line('BL-0507', '9U wall rack', 1, 'pc', 7500, 'IOL stock', 'IOL-owned · returnable', 'RACK-9U'),
  line('BL-0508', 'Customer firewall (Fortigate 60F)', 1, 'pc', 0, 'Customer', 'Customer-owned')],

  commercial: { ...noCommercial, mrc: 85000, otc: 45000, refundableDeposit: 20000, labour: 12000, permits: 6000, upstreamMonthly: 21000, otherRecurring: 3500, updatedById: 'u-03', updatedAt: '2026-10-13T15:50:00+06:00' },
  attachments: [
  { id: 'SA-0501', name: 'Konabari_pole_route.kml', kind: 'Document', at: '2026-10-01T15:00:00+06:00', byId: 'u-06' },
  { id: 'SA-0502', name: 'Meghna_rooftop.jpg', kind: 'Photo', at: '2026-10-01T13:40:00+06:00', byId: 'u-06' }],

  branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'SV-2026-0941', opportunityId: 'OP-2026-0215', siteLabel: 'Factory roof', address: 'Plot 9, Block K, Halishahar, Chattogram 4216',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 50, siteContactName: 'Mostafa Kamal (Factory Manager)', siteContactPhone: '+880 1819-552390', accessInstructions: 'Customer requests the visit before noon. Safety shoes required on the production floor.',
  requestedById: 'u-02', technicianName: 'Rakib Uddin', technicianUserId: 'u-07', status: 'Scheduled',
  requestedAt: '2026-10-09T12:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-10-10T10:00:00+06:00', assignedAt: '2026-10-11T11:00:00+06:00', scheduledAt: '2026-10-16T11:00:00+06:00',
  notes: 'Customer requests the visit before noon.',
  branchId: 'chattogram', zoneId: 'pahartali'
},
{
  id: 'SV-2026-0943', opportunityId: 'OP-2026-0201', siteLabel: 'Civic Bhaban HQ', address: 'Civic Bhaban, Sector 6, Uttara, Dhaka 1230',
  requestedService: 'Data Connectivity', requestedBandwidthMbps: 20, siteContactName: 'Engr. Habibur Rahman (ICT Cell)', siteContactPhone: '+880 1712-338104', accessInstructions: 'Government building: visitor pass from the ICT cell, 4th floor.',
  requestedById: 'u-02', technicianName: 'Jahid Hasan', status: 'Returned', fibreDistanceM: 300,
  requestedAt: '2026-10-05T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-10-05T14:00:00+06:00', assignedAt: '2026-10-06T10:00:00+06:00', scheduledAt: '2026-10-09T10:30:00+06:00', startedAt: '2026-10-09T10:40:00+06:00',
  completedAt: '2026-10-09T16:00:00+06:00', reviewedById: 'u-06', reviewedAt: '2026-10-10T12:00:00+06:00',
  reviewNote: 'Returned: rack space and power details missing, and redundancy must reflect the 99.5% SLA in the tender.',
  notes: 'Hub site for the 14 ward offices.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Uttara Sector 11 PoP', popDistanceM: '300', route: 'Underground duct to the basement, riser to 4th floor', lastMile: 'IOL', nttn: 'None — IOL own fibre', capacity: 'Available',
    fnnRequired: true, fnnNotes: 'Ward offices need a private network to the HQ.', latencyMs: '5', mtu: '1500', redundancy: 'None', ipRequirement: '/29 IPv4; private VLAN per ward', power: '', grounding: '', rack: '',
    constraints: 'Work permitted only Sunday–Thursday', deliveryDays: '21', outcome: 'Feasible', outcomeNotes: ''
  },
  bom: [
  line('BL-0701', 'Huawei EG8145V5 ONT', 1, 'pc', 4800, 'IOL stock', 'IOL-owned · returnable', 'ONT-EG8145V5'),
  line('BL-0702', 'Drop fibre, 2-core', 300, 'm', 18, 'IOL stock', 'IOL-owned · consumed', 'FBR-DROP-2C'),
  line('BL-0703', 'MikroTik RB4011 router', 1, 'pc', 21500, 'IOL stock', 'IOL-owned · returnable', 'RTR-MT-RB4011')],

  history: [{ at: '2026-10-10T12:00:00+06:00', byId: 'u-06', action: 'Returned', note: 'Rack space and power details missing, and redundancy must reflect the 99.5% SLA in the tender.' }],
  branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'SV-2026-0944', opportunityId: 'OP-2026-0212', siteLabel: 'Hospital wing and campus', address: 'Airport Road, Ambarkhana, Sylhet 3100',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 300, siteContactName: 'Md. Azizur Rahman (IT Officer)', siteContactPhone: '+880 1716-553027', accessInstructions: 'Hospital wing: wear the visitor tag; no drilling near ICU on level 2.',
  requestedById: 'u-02', technicianName: 'Tareq Aziz', technicianUserId: 'u-13', status: 'In Progress',
  requestedAt: '2026-10-08T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-10-08T15:00:00+06:00', assignedAt: '2026-10-09T10:00:00+06:00', scheduledAt: '2026-10-15T09:30:00+06:00', startedAt: '2026-10-15T09:45:00+06:00',
  notes: '6 buildings; hospital wing needs redundancy.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Ambarkhana PoP', popDistanceM: '900', route: 'Aerial along Airport Road; campus ring through existing conduits', lastMile: 'IOL', nttn: 'None — IOL own fibre',
    capacity: 'Available after upgrade', capacityNotes: 'Ambarkhana uplink needs +300 Mbps.', redundancy: 'Dual PoP', ipRequirement: '/28 IPv4'
  },
  bom: [line('BL-0801', 'ADSS aerial fibre, 12-core', 900, 'm', 62, 'IOL stock', 'IOL-owned · consumed', 'FBR-ADSS-12C')],
  attachments: [{ id: 'SA-0801', name: 'SVMC_hospital_wing.jpg', kind: 'Photo', at: '2026-10-15T10:20:00+06:00', byId: 'u-13' }],
  branchId: 'sylhet', zoneId: 'ambarkhana'
},
{
  id: 'SV-2026-0947', opportunityId: 'OP-2026-0162', siteLabel: 'Terminal office', address: 'Bandar Road, Agrabad, Chattogram 4100',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 100, siteContactName: 'Rezaul Karim (IT Head)', siteContactPhone: '+880 1819-702261', accessInstructions: 'Port security zone — gate pass from the terminal office 24 h in advance.',
  requestedById: 'u-15', technicianName: 'Rakib Uddin', technicianUserId: 'u-07', status: 'Submitted for Technical Review', fibreDistanceM: 650,
  requestedAt: '2026-10-06T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-10-06T14:00:00+06:00', assignedAt: '2026-10-07T10:00:00+06:00', scheduledAt: '2026-10-13T10:00:00+06:00', startedAt: '2026-10-13T10:30:00+06:00',
  completedAt: '2026-10-14T17:20:00+06:00',
  notes: 'Primary on IOL fibre, backup through NTTN partner.',
  tech: {
    ...baseTech, medium: 'Fibre', nearbyPop: 'Agrabad PoP', popDistanceM: '650', route: 'Aerial along Bandar Road; backup via partner fibre from Pahartali', lastMile: 'Shared', nttn: 'NTTN partner last mile',
    nttnNotes: 'Backup path leased from NTTN partner, ৳ 12,000/month, 10 working days.', capacity: 'Available', capacityNotes: 'Agrabad uplink at 54% peak.', ggcRequired: false, fnnRequired: false,
    latencyMs: '6', mtu: '1500', redundancy: 'Dual PoP', ipRequirement: '/29 IPv4, BGP not needed', power: 'Terminal UPS + generator', grounding: 'Server room earth bar', rack: 'Customer 42U rack, 4U free',
    constraints: 'Port security escort; salt-air corrosion — use sealed closures', deliveryDays: '18', outcome: 'Feasible', outcomeNotes: 'Backup path depends on NTTN delivery.'
  },
  bom: [
  line('BL-0901', 'ADSS aerial fibre, 12-core', 650, 'm', 62, 'IOL stock', 'IOL-owned · consumed', 'FBR-ADSS-12C'),
  line('BL-0902', 'Splice closure, 24F', 1, 'pc', 2600, 'IOL stock', 'IOL-owned · consumed', 'SPL-CLOSURE-24'),
  line('BL-0903', 'Huawei EG8145V5 ONT', 2, 'pc', 4800, 'IOL stock', 'IOL-owned · returnable', 'ONT-EG8145V5'),
  line('BL-0904', 'MikroTik RB4011 router', 1, 'pc', 21500, 'IOL purchase', 'IOL-owned · returnable', 'RTR-MT-RB4011'),
  line('BL-0905', 'Partner backup last mile (handover)', 1, 'link', 0, 'NTTN partner', 'Partner-owned')],

  commercial: { ...noCommercial, mrc: 68000, otc: 40000, labour: 9000, nttnOtc: 8000, nttnMonthly: 12000, upstreamMonthly: 15000, otherRecurring: 2500, updatedById: 'u-15', updatedAt: '2026-10-15T09:00:00+06:00' },
  attachments: [
  { id: 'SA-0901', name: 'KFT_server_room.jpg', kind: 'Photo', at: '2026-10-13T12:10:00+06:00', byId: 'u-07' },
  { id: 'SA-0902', name: 'KFT_route_sketch.pdf', kind: 'Document', at: '2026-10-14T17:00:00+06:00', byId: 'u-07' }],

  branchId: 'chattogram', zoneId: 'agrabad'
},
{
  id: 'SV-2026-0949', opportunityId: 'OP-2026-0201', siteLabel: 'Ward offices 1–7', address: 'Wards 1–7, Sectors 1–7, Uttara, Dhaka 1230',
  requestedService: 'Data Connectivity', requestedBandwidthMbps: 20, siteContactName: 'Engr. Habibur Rahman (ICT Cell)', siteContactPhone: '+880 1712-338104', accessInstructions: 'Each ward office opens 9 AM–4 PM; ICT cell will phone ahead.',
  requestedById: 'u-02', technicianName: 'Jahid Hasan', status: 'Assigned',
  requestedAt: '2026-10-12T10:00:00+06:00', boReviewerId: 'u-05', boClearedAt: '2026-10-13T11:00:00+06:00', assignedAt: '2026-10-14T10:30:00+06:00',
  notes: 'Seven sites — one visit day planned.',
  branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'SV-2026-0951', opportunityId: 'OP-2026-0201', siteLabel: 'Ward offices 8–14', address: 'Wards 8–14, Sectors 8–14, Uttara, Dhaka 1230',
  requestedService: 'Data Connectivity', requestedBandwidthMbps: 20, siteContactName: 'Engr. Habibur Rahman (ICT Cell)', siteContactPhone: '+880 1712-338104', accessInstructions: 'Ward 12 address to be confirmed by the ICT cell.',
  requestedById: 'u-02', technicianName: '', status: 'Back Office Review', boReviewerId: 'u-05',
  requestedAt: '2026-10-14T11:00:00+06:00',
  notes: 'Back Office checking the ward address list against the tender schedule.',
  branchId: 'dhaka-north', zoneId: 'uttara'
},
{
  id: 'SV-2026-0952', opportunityId: 'OP-2026-0221', customerId: 'CU-1002', siteLabel: 'Narayanganj Warehouse', address: 'Plot 31, BSCIC Industrial Estate, Narayanganj 1400',
  requestedService: 'Dedicated Internet', requestedBandwidthMbps: 30, siteContactName: 'Mahfuz Alam (IT Manager)', siteContactPhone: '+880 1819-552710', accessInstructions: 'BSCIC gate needs an access letter from Rahman Steel.',
  requestedById: 'u-04', technicianName: '', status: 'Submitted',
  requestedAt: '2026-10-15T09:40:00+06:00',
  notes: 'Additional site under CU-1002 — same corporate billing account.',
  branchId: 'dhaka-south', zoneId: 'jatrabari'
}];


export const surveyBypasses: SurveyBypass[] = [
{
  id: 'SB-2026-003', opportunityId: 'OP-2026-0219', reason: 'Building already lit by IOL',
  justification: 'Banani Heights shares the riser with House 16 (IOL bulk customer since 2025). Survey SV-2026-0712 covered the same riser and the 8-port splitter has 5 free ports.',
  documentRef: 'SV-2026-0712 report; building management letter BH/2026/41', requestedById: 'u-03', requestedAt: '2026-10-14T12:30:00+06:00', status: 'Pending',
  branchId: 'dhaka-north', zoneId: 'gulshan'
}];


export const stockItems: StockItem[] = [
...(['Dhaka Central Warehouse', 'Chattogram Warehouse', 'Sylhet Warehouse'] as const).flatMap((w, i) => {
  const on = (dhaka: number, ctg: number, syl: number) => [dhaka, ctg, syl][i];
  const k = ['DHK', 'CTG', 'SYL'][i];
  return [
  { id: `STK-${k}-ONT`, sku: 'ONT-EG8145V5', name: 'Huawei EG8145V5 ONT', unit: 'pc', warehouse: w, onHand: on(58, 6, 20), reserved: on(0, 0, 0), unitCost: 4800, pricedAt: priced },
  { id: `STK-${k}-DROP`, sku: 'FBR-DROP-2C', name: 'Drop fibre, 2-core', unit: 'm', warehouse: w, onHand: on(6200, 1800, 2500), reserved: on(0, 280, 0), unitCost: 18, pricedAt: priced },
  { id: `STK-${k}-ADSS`, sku: 'FBR-ADSS-12C', name: 'ADSS aerial fibre, 12-core', unit: 'm', warehouse: w, onHand: on(3500, 900, 4000), reserved: 0, unitCost: 62, pricedAt: priced },
  { id: `STK-${k}-SPL`, sku: 'SPL-CLOSURE-24', name: 'Splice closure, 24F', unit: 'pc', warehouse: w, onHand: on(14, 3, 6), reserved: 0, unitCost: 2600, pricedAt: priced },
  { id: `STK-${k}-CLAMP`, sku: 'HW-POLE-CLAMP', name: 'Pole clamp set', unit: 'set', warehouse: w, onHand: on(120, 40, 25), reserved: on(0, 6, 0), unitCost: 350, pricedAt: priced },
  { id: `STK-${k}-SFP`, sku: 'SFP-1G-LX', name: '1G SFP LX module', unit: 'pc', warehouse: w, onHand: on(22, 4, 2), reserved: 0, unitCost: 1900, pricedAt: priced },
  { id: `STK-${k}-RTR`, sku: 'RTR-MT-RB4011', name: 'MikroTik RB4011 router', unit: 'pc', warehouse: w, onHand: on(0, 1, 0), reserved: 0, unitCost: 21500, pricedAt: priced },
  { id: `STK-${k}-RACK`, sku: 'RACK-9U', name: '9U wall rack', unit: 'pc', warehouse: w, onHand: on(4, 0, 1), reserved: 0, unitCost: 7500, pricedAt: priced }];

})];