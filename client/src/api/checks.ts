import api from './axios';

export const listCheckTypesApi = () => api.get('/checks/types');
export const createCheckTypeApi = (data: any) => api.post('/checks/types', data);

export const listSchedulesApi = (equipmentId?: number) =>
  api.get('/checks/schedules', { params: equipmentId ? { equipment_id: equipmentId } : {} });
export const createScheduleApi = (data: any) => api.post('/checks/schedules', data);
export const updateScheduleApi = (id: number, data: any) => api.put(`/checks/schedules/${id}`, data);
export const deleteScheduleApi = (id: number) => api.delete(`/checks/schedules/${id}`);

export const listCheckLogsApi = (params: any) => api.get('/checks', { params });
export const getCheckLogApi = (id: number) => api.get(`/checks/${id}`);
export const createCheckLogApi = (data: any) => api.post('/checks', data);
