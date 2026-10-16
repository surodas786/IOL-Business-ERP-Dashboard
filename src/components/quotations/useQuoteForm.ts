import { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { demoNow } from '../../utils/format';
import { computeRoutes, defaultCommission, rateCardMrc, validateTerms } from '../../utils/quoteRules';
import type { EquipmentTerm, QuotationTerms } from '../../types/quotation';

/** Form state for a quotation version. Rate-card prices follow service and bandwidth; they are never typed in. */
export function useQuoteForm(initial: QuotationTerms) {
  const { db } = useData();
  const [t, setT] = useState<QuotationTerms>(initial);
  const [touchedCommission, setTouchedCommission] = useState(false);
  const agent = t.agentId ? db.salesAgents.find((a) => a.id === t.agentId) : undefined;

  const set = <K extends keyof QuotationTerms,>(k: K, v: QuotationTerms[K]) =>
  setT((p) => {
    const next = { ...p, [k]: v };
    if (k === 'serviceType' || k === 'bandwidthMbps') next.listMrc = rateCardMrc(next.serviceType, next.bandwidthMbps);
    if (k === 'billingTerm') next.creditDays = v === 'Postpaid' ? Math.max(next.creditDays, db.quotePolicy.standardCreditDays) : 0;
    if (k === 'mrc' && agent && !touchedCommission) next.agentCommission = defaultCommission(agent.commissionRule, next.mrc);
    return next;
  });

  const setCommission = (v: number) => {
    setTouchedCommission(true);
    setT((p) => ({ ...p, agentCommission: v }));
  };

  const updateEquipment = (id: string, patch: Partial<EquipmentTerm>) => setT((p) => ({ ...p, equipment: p.equipment.map((e) => e.id === id ? { ...e, ...patch } : e) }));
  const addEquipment = () =>
  setT((p) => ({ ...p, equipment: [...p.equipment, { id: `EQ-${Date.now().toString(36)}`, item: '', ownership: 'IOL-owned · returnable', returnCondition: 'Return on disconnection in working order.' }] }));
  const removeEquipment = (id: string) => setT((p) => ({ ...p, equipment: p.equipment.filter((e) => e.id !== id) }));

  const errors = useMemo(() => validateTerms(t, demoNow()), [t]);
  const routes = useMemo(() => computeRoutes(db, t), [db, t]);

  return { t, set, setCommission, updateEquipment, addEquipment, removeEquipment, errors, routes, agent };
}