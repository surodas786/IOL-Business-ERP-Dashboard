import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { inUserScope } from '../utils/access';

/** Agents and their commission records inside the user's scope and the top-bar branch filter. */
export function useScopedAgents() {
  const { db } = useData();
  const { user, branchFilter } = useSession();
  const inScope = (branchId: Parameters<typeof inUserScope>[1]) => inUserScope(user, branchId) && (branchFilter === 'all' || branchId === branchFilter);
  const agents = db.salesAgents.filter((a) => inScope(a.branchId));
  const customerOk = (id: string) => {
    const c = db.customers.find((x) => x.id === id);
    return !!c && inScope(c.branchId);
  };
  const ids = new Set(agents.map((a) => a.id));
  const agentOk = (id?: string) => !!id && ids.has(id);
  const attributions = db.agentAttributions.filter((a) => agentOk(a.agentId) || customerOk(a.customerId));
  const proposals = db.commissionProposals.filter((p) => agentOk(p.agentId) || customerOk(p.customerId));
  const accruals = db.commissionAccruals.filter((a) => agentOk(a.agentId));
  const settlements = db.agentSettlements.filter((s) => agentOk(s.agentId));
  const reassignments = db.attributionReassignments.filter((r) => agentOk(r.fromAgentId) || agentOk(r.toAgentId) || customerOk(r.customerId));
  return { agents, attributions, proposals, accruals, settlements, reassignments };
}