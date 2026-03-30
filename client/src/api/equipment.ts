import api from './axios';

export const listEquipmentApi = (categoryId?: number) =>
  api.get('/equipment', { params: categoryId ? { category_id: categoryId } : {} });

export const getEquipmentApi = (id: number) => api.get(`/equipment/${id}`);
export const createEquipmentApi = (data: any) => api.post('/equipment', data);
export const updateEquipmentApi = (id: number, data: any) => api.put(`/equipment/${id}`, data);
export const deleteEquipmentApi = (id: number) => api.delete(`/equipment/${id}`);

export const listCategoriesApi = () => api.get('/equipment/categories');
export const createCategoryApi = (data: any) => api.post('/equipment/categories', data);
export const getFieldDefsApi = (categoryId: number) => api.get(`/equipment/categories/${categoryId}/fields`);
