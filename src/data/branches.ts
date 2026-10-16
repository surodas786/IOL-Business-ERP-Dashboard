import type { BaselineZoneMetrics, Branch } from '../types/erp';

/** Fictional branches. */
export const branches: Branch[] = [
{
  id: 'dhaka-north',
  name: 'Dhaka North',
  nameBn: 'ঢাকা উত্তর',
  color: '#0d9488',
  address: 'House 42, Road 11, Sector 4, Uttara, Dhaka 1230',
  warehouse: 'Dhaka Central Warehouse',
  fieldTeamLead: 'Jahid Hasan',
  zones: [
  { id: 'uttara', name: 'Uttara' },
  { id: 'mirpur', name: 'Mirpur' },
  { id: 'gulshan', name: 'Gulshan' }]

},
{
  id: 'dhaka-south',
  name: 'Dhaka South',
  nameBn: 'ঢাকা দক্ষিণ',
  color: '#4338ca',
  address: 'Level 6, 88 Motijheel C/A, Dhaka 1000',
  warehouse: 'Dhaka Central Warehouse',
  fieldTeamLead: 'Sohel Rana',
  zones: [
  { id: 'dhanmondi', name: 'Dhanmondi' },
  { id: 'motijheel', name: 'Motijheel' },
  { id: 'jatrabari', name: 'Jatrabari' }]

},
{
  id: 'chattogram',
  name: 'Chattogram',
  nameBn: 'চট্টগ্রাম',
  color: '#c2410c',
  address: '1st Floor, 104 Agrabad C/A, Chattogram 4100',
  warehouse: 'Chattogram Warehouse',
  fieldTeamLead: 'Rakib Uddin',
  fieldTeamUserId: 'u-07',
  zones: [
  { id: 'agrabad', name: 'Agrabad' },
  { id: 'pahartali', name: 'Pahartali' }]

},
{
  id: 'sylhet',
  name: 'Sylhet',
  nameBn: 'সিলেট',
  color: '#b45309',
  address: 'Blue Water Shopping City, Zindabazar, Sylhet 3100',
  warehouse: 'Sylhet Warehouse',
  fieldTeamLead: 'Tareq Aziz',
  fieldTeamUserId: 'u-13',
  zones: [
  { id: 'zindabazar', name: 'Zindabazar' },
  { id: 'ambarkhana', name: 'Ambarkhana' }]

}];


/**
 * Portfolio baselines for accounts not modelled as individual demo records.
 * Live dashboard figures add the shared demo records on top of these.
 */
export const zoneBaselines: BaselineZoneMetrics[] = [
{ zoneId: 'uttara', branchId: 'dhaka-north', mrc: 7072000, billed: 6812000, collected: 5859000, pipeline: 1800000, activeLinks: 1838, installsOpen: 8, ticketsOpen: 13 },
{ zoneId: 'mirpur', branchId: 'dhaka-north', mrc: 4837500, billed: 4653226, collected: 3920000, pipeline: 1870000, activeLinks: 2209, installsOpen: 6, ticketsOpen: 18 },
{ zoneId: 'gulshan', branchId: 'dhaka-north', mrc: 6440000, billed: 6150000, collected: 5300000, pipeline: 2140000, activeLinks: 410, installsOpen: 4, ticketsOpen: 7 },
{ zoneId: 'dhanmondi', branchId: 'dhaka-south', mrc: 5820000, billed: 5540000, collected: 4910000, pipeline: 2600000, activeLinks: 1620, installsOpen: 7, ticketsOpen: 16 },
{ zoneId: 'motijheel', branchId: 'dhaka-south', mrc: 5198000, billed: 4947500, collected: 4480000, pipeline: 2250000, activeLinks: 689, installsOpen: 5, ticketsOpen: 10 },
{ zoneId: 'jatrabari', branchId: 'dhaka-south', mrc: 3142000, billed: 3010000, collected: 2550000, pipeline: 1300000, activeLinks: 1979, installsOpen: 3, ticketsOpen: 21 },
{ zoneId: 'agrabad', branchId: 'chattogram', mrc: 6112500, billed: 5730000, collected: 4902300, pipeline: 3040000, activeLinks: 979, installsOpen: 9, ticketsOpen: 19 },
{ zoneId: 'pahartali', branchId: 'chattogram', mrc: 3644000, billed: 3404000, collected: 2950000, pipeline: 1490000, activeLinks: 1429, installsOpen: 8, ticketsOpen: 12 },
{ zoneId: 'zindabazar', branchId: 'sylhet', mrc: 3221500, billed: 3152000, collected: 2790000, pipeline: 1520000, activeLinks: 868, installsOpen: 3, ticketsOpen: 7 },
{ zoneId: 'ambarkhana', branchId: 'sylhet', mrc: 2240000, billed: 2190000, collected: 1910000, pipeline: 1080000, activeLinks: 760, installsOpen: 2, ticketsOpen: 6 }];