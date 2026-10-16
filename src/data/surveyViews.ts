import type { Role } from '../types/erp';
import { canSuperviseSurveys, canViewCostAnalysis } from '../utils/surveyRules';

export type SurveyViewId = 'queue' | 'bypass' | 'cost' | 'settings';

export interface SurveyView {
  id: SurveyViewId;
  label: string;
  visible: (role: Role) => boolean;
}

export const surveyViews: SurveyView[] = [
{ id: 'queue', label: 'Survey queue', visible: () => true },
{ id: 'bypass', label: 'Bypass requests', visible: (r) => canSuperviseSurveys(r) || r.permissions.includes('viewPipeline') },
{ id: 'cost', label: 'Cost analysis', visible: canViewCostAnalysis },
{ id: 'settings', label: 'Labels and formula', visible: (r) => canSuperviseSurveys(r) || canViewCostAnalysis(r) }];


export type SurveyTabId = 'request' | 'technical' | 'bom' | 'attachments' | 'cost' | 'history';

export const surveyTabs: {id: SurveyTabId;label: string;visible: (r: Role) => boolean;}[] = [
{ id: 'request', label: 'Request', visible: () => true },
{ id: 'technical', label: 'Technical survey', visible: () => true },
{ id: 'bom', label: 'Bill of materials', visible: () => true },
{ id: 'attachments', label: 'Photos and documents', visible: () => true },
{ id: 'cost', label: 'Cost analysis', visible: canViewCostAnalysis },
{ id: 'history', label: 'History', visible: () => true }];