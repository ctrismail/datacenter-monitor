import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEquipmentApi, createEquipmentApi, updateEquipmentApi, deleteEquipmentApi, listCategoriesApi } from '../api/equipment';
import toast from 'react-hot-toast';
import { Plus, Trash2, MapPin, Pencil, X, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import type { Equipment, Category } from '../types';

interface EquipmentForm {
  name: string;
  categoryId: string;
  location: string;
  description: string;
}

const emptyForm: EquipmentForm = { name: '', categoryId: '', location: '', description: '' };

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);
  const [filterCategory, setFilterCategory] = useState('');

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: () => listEquipmentApi().then(r => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => listCategoriesApi().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: createEquipmentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Ekipman eklendi');
      closeModal();
    },
    onError: () => toast.error('Hata oluştu'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateEquipmentApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Ekipman güncellendi');
      closeModal();
    },
    onError: () => toast.error('Hata oluştu'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEquipmentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Ekipman silindi');
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditingId(eq.id);
    setForm({
      name: eq.name,
      categoryId: String(eq.category_id),
      location: eq.location || '',
      description: eq.description || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { categoryId: parseInt(form.categoryId), name: form.name, location: form.location, description: form.description };
    if (editingId) {
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate(data);
    }
  };

  const filtered = filterCategory
    ? equipment.filter(e => e.category_id === parseInt(filterCategory))
    : equipment;

  const grouped = categories
    .map(cat => ({ ...cat, items: filtered.filter(e => e.category_id === cat.id) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ekipmanlar</h1>
          <p className="text-sm text-gray-500 mt-1">{equipment.length} ekipman kayıtlı</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="input-modern !w-auto text-sm">
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Yeni Ekipman
          </button>
        </div>
      </div>

      {grouped.map(group => (
        <div key={group.id} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server size={14} />
            {group.name} ({group.items.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((eq, i) => (
              <motion.div key={eq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-modern p-4 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="badge badge-blue">{eq.category_name}</span>
                    <h3 className="font-semibold text-gray-900 mt-2 truncate">{eq.name}</h3>
                    {eq.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{eq.location}</span>
                      </p>
                    )}
                    {eq.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{eq.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button onClick={() => openEdit(eq)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { if (confirm('Bu ekipmanı silmek istediğinize emin misiniz?')) deleteMut.mutate(eq.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Server size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Henüz ekipman eklenmemiş</p>
          <button onClick={openCreate} className="btn-primary mt-4">İlk Ekipmanı Ekle</button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? 'Ekipmanı Düzenle' : 'Yeni Ekipman'}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ekipman Adı *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input-modern" placeholder="Örn: Jeneratör 1 - Ana" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori *</label>
                  <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                    className="input-modern" required>
                    <option value="">Kategori seçin</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Konum</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    className="input-modern" placeholder="Örn: B Blok Bodrum Kat" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Açıklama</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="input-modern resize-none" rows={2} placeholder="Marka, model, kapasite..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editingId ? 'Güncelle' : 'Ekle'}
                  </button>
                  <button type="button" onClick={closeModal} className="btn-secondary">İptal</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
