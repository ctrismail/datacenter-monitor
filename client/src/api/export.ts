import api from './axios';

export const exportChecksApi = (params: any) =>
  api.get('/export/checks', { params, responseType: 'blob' });

export const exportReportApi = (year: number, month: number) =>
  api.get('/export/report', { params: { year, month }, responseType: 'blob' });
