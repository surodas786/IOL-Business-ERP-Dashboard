export type ServiceChangeViewId = 'overview' | 'requests' | 'stops' | 'clearances';

export const serviceChangeViews: {id: ServiceChangeViewId;label: string;}[] = [
{ id: 'overview', label: 'Dashboard' },
{ id: 'requests', label: 'All requests' },
{ id: 'stops', label: 'Temporary stops' },
{ id: 'clearances', label: 'Discontinuation clearances' }];