import { hasPermission } from '../utils/access';
import type { Role } from '../types/erp';

export type InstallationViewId = 'list' | 'board' | 'schedule' | 'my-jobs';

export const installationViews: {id: InstallationViewId;label: string;visible: (r: Role) => boolean;}[] = [
{ id: 'my-jobs', label: 'My jobs', visible: (r) => r.id === 'fieldTechnician' },
{ id: 'list', label: 'List', visible: () => true },
{ id: 'board', label: 'Board', visible: () => true },
{ id: 'schedule', label: 'Schedule', visible: (r) => hasPermission(r, 'technicalConfig') || r.modules.includes('installations') }];