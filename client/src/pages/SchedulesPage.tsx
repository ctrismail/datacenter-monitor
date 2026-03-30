import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSchedulesApi, createScheduleApi, updateScheduleApi, deleteScheduleApi, listCheckTypesApi } from '../api/checks';
import { listEquipmentApi } from '../api/equipment';
import toast from 'react-hot-toast';
import { Plus, Trash2, Clock, Pencil, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const intervalOptions = [
  { value: 8, label: '8 saat' },
  { value: 12, label: '12 saat' },
  { value: 24, label: '1 gün' },
  { value: 48, label: '2 gün' },
  { value: 168, label: '1 hafta' },
  { value: 336, label: '2 hafta' },
  { value: 720, label: '1 ay' },
];

const formatInterval = (hours: number) => {
  const opt = intervalOptions.find(o => o.value === hours);
  if (opt) return opt.label;
  if (hours < 24) return `${hours} saat`;
  return `${Math.round(hours / 24)} gün`;
};

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ equipmentId: '', checkTypeId: '', intervalHours: '24' });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => listSchedulesApi().then(r => r.data),
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => listEquipmentApi().then(r => r.data),
  });

  const { data: checkTypes = [] } = useQuery({
    queryKey: ['checkTypes'],
    queryFn: () => listCheckTypesApi().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: createScheduleApi,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); toast.success('Takvim oluşturuldu'); closeModal(); },
    onError: () => toast.error('Bu kombinasyon zaten mevcut'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateScheduleApi(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); toast.success('Takvim güncellendi'); closeModal(); },
    onError: () => toast.error('Hata oluştu'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteScheduleApi,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); toast.success('Takvim silindi'); },
  });

  const openCreate = () => { setEditingId(null); setForm({ equipmentId: '', checkTypeId: '', intervalHours: '24' }); setShowModal(true); };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ equipmentId: String(s.equipment_id), checkTypeId: String(s.check_type_id), intervalHours: String(s.interval_hours) });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMut.mutate({ id: editingId, data: { intervalHours: parseInt(form.intervalHours) } });
    } else {
      createMut.mutate({ equipmentId: parseInt(form.equipmentId), checkTypeId: parseInt(form.checkTypeId), intervalHours: parseInt(form.intervalHours) });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontrol Takvimi</h1>
          <p className="text-sm text-gray-500 mt-1">{schedules.length} aktif takvim</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Yeni Takvim
        </button>
      </div>

      <div className="space-y-3">
        {schedules.map((s: any, i: number) => (
          <motion.div key={s.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="card-modern p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{s.equipment_name}</p>
                <p className="text-sm text-gray-500">
                  {s.check_type_name}
                  <span className="mx-2 text-gray-300">|</span>
                  Her <span className="font-medium text-blue-600">{formatInterval(s.interval_hours)}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(s)}
                className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                <Pencil size={14} />
              </button>
              <button onClick={() => { if (confirm('Bu takvimi silmek istiyor musunuz?')) deleteMut.mutate(s.id); }}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
        {schedules.length === 0 && (
          <div className="text-center py-16">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Henüz takvim oluşturulmamış</p>
            <button onClick={openCreate} className="btn-primary mt-4">İlk Takvimi Oluştur</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Takvimi Düzenle' : 'Yeni Takvim'}</h2>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ekipman *</label>
                  <select value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}
                    className="input-modern" required disabled={!!editingId}>
                    <option value="">Ekipman seçin</option>
                    {equipment.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kontrol Tipi *</label>
                  <select value={form.checkTypeId} onChange={e => setForm({ ...form, checkTypeId: e.target.value })}
                    className="input-modern" required disabled={!!editingId}>
                    <option value="">Kontrol tipi seçin</option>
                    {checkTypes.map((ct: any) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kontrol Aralığı *</label>
                  <select value={form.intervalHours} onChange={e => setForm({ ...form, intervalHours: e.target.value })} className="input-modern">
                    {intervalOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">{editingId ? 'Güncelle' : 'Oluştur'}</button>
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
