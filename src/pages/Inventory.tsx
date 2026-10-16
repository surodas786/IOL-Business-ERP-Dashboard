import React from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { canAccessModule } from '../utils/access';
import { inventoryViews } from '../data/inventoryViews';
import { AccessDenied } from '../components/shell/AccessDenied';
import { StockView } from '../components/inventory/StockView';
import { ItemMasterView } from '../components/inventory/ItemMasterView';
import { ReceiptsView } from '../components/inventory/ReceiptsView';
import { ReservationsView } from '../components/inventory/ReservationsView';
import { IssuesView } from '../components/inventory/IssuesView';
import { TransfersView } from '../components/inventory/TransfersView';
import { ReturnsView } from '../components/inventory/ReturnsView';
import { AdjustmentsView } from '../components/inventory/AdjustmentsView';
import { CustomerEquipmentView } from '../components/inventory/CustomerEquipmentView';
import { VendorPricesView } from '../components/inventory/VendorPricesView';

export function Inventory() {
  const { view } = useParams();
  const { role } = useSession();
  if (!canAccessModule(role, 'inventory')) return <AccessDenied title="Inventory and Equipment" module="inventory" />;
  const views = inventoryViews.filter((v) => v.visible(role));
  const current = view ? views.find((v) => v.id === view) : views[0];
  if (!current) return <Navigate to="/inventory" replace />;

  return (
    <div className="px-4 pb-8 pt-4 lg:px-5">
      <div className="mb-3">
        <h1 className="text-[19px] font-bold text-slate-900">Inventory and Equipment</h1>
        <p className="mt-0.5 text-[12px] text-slate-500">Serial-tracked equipment and quantity-based consumables across warehouses · procurement is outside the demo · fictional demo data</p>
      </div>
      <nav aria-label="Inventory views" className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200">
        {views.map((v) =>
        <NavLink
          key={v.id}
          to={v.id === 'stock' ? '/inventory' : `/inventory/${v.id}`}
          end
          className={({ isActive }) =>
          `-mb-px whitespace-nowrap border-b-2 px-2.5 pb-2 pt-1 text-[12px] font-semibold transition-colors duration-150 ${isActive || v.id === current.id && !view ? 'border-primary text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`
          }>
          
            {v.label}
          </NavLink>
        )}
      </nav>
      {current.id === 'stock' && <StockView />}
      {current.id === 'items' && <ItemMasterView />}
      {current.id === 'receipts' && <ReceiptsView />}
      {current.id === 'reservations' && <ReservationsView />}
      {current.id === 'issues' && <IssuesView />}
      {current.id === 'transfers' && <TransfersView />}
      {current.id === 'returns' && <ReturnsView />}
      {current.id === 'adjustments' && <AdjustmentsView />}
      {current.id === 'equipment' && <CustomerEquipmentView />}
      {current.id === 'prices' && <VendorPricesView />}
    </div>);

}