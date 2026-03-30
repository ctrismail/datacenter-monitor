import api from './axios';

export const getDashboardSummaryApi = () => api.get('/dashboard/summary');
export const getEquipmentStatusesApi = () => api.get('/dashboard/statuses');
export const getDashboardAlertsApi = () => api.get('/dashboard/alerts');
export const getChartDataApi = (equipmentId: number, days?: number) =>
  api.get(`/dashboard/chart-data/${equipmentId}`, { params: { days } });
export const getRecentChecksApi = (limit?: number) =>
  api.get('/dashboard/recent', { params: { limit } });
