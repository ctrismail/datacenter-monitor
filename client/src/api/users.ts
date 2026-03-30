import api from './axios';

export const listUsersApi = () => api.get('/users');
export const createUserApi = (data: any) => api.post('/users', data);
export const updateUserApi = (id: number, data: any) => api.put(`/users/${id}`, data);
export const deleteUserApi = (id: number) => api.delete(`/users/${id}`);
