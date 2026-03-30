import api from './axios';

export const loginApi = (username: string, password: string) =>
  api.post('/auth/login', { username, password });

export const getMeApi = () => api.get('/auth/me');

export const generateTVTokenApi = () => api.post('/auth/tv-token');
