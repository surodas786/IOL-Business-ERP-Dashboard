import { useSession } from '../contexts/SessionContext';
import { WAREHOUSES, warehouseInFilter } from '../utils/inventoryRules';

/** Warehouses matching the top-bar branch filter. */
export function useWarehouseScope() {
  const { branchFilter } = useSession();
  const warehouses = WAREHOUSES.filter((w) => warehouseInFilter(w, branchFilter));
  return { warehouses, inScope: (w: string) => warehouses.includes(w) };
}