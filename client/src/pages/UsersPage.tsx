import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsersApi, createUserApi, updateUserApi, deleteUserApi } from '../api/users';
import toast from 'react-hot-toast';
import { Plus, Trash2, UserCircle, Pencil, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserForm {
  username: string;
  displayName: string;
  password: string;
}

const emptyForm: UserForm = { username: '', displayName: '', password: '' };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsersApi().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Kullanıcı oluşturuldu');
      closeModal();
    },
    onError: () => toast.error('Hata oluştu'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateUserApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Kullanıcı güncellendi');
      closeModal();
    },
    onError: () => toast.error('Hata oluştu'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Kullanıcı devre dışı bırakıldı');
    },
  });

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (u: any) => {
    setEditingId(u.id);
    setForm({ username: u.username, displayName: u.display_name, password: '' });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const data: any = { displayName: form.displayName };
      if (form.password) data.password = form.password;
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate(form);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} kullanıcı</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Yeni Kullanıcı
        </button>
      </div>

      <div className="space-y-3">
        {users.map((u: any, i: number) => (
          <motion.div key={u.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-modern p-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {u.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{u.display_name}</p>
                  {u.username === 'admin' && (
                    <span className="badge badge-blue flex items-center gap-1"><Shield size={10} /> Admin</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  @{u.username}
                  {!u.is_active && <span className="badge badge-red ml-2">Devre dışı</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(u)}
                className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                <Pencil size={14} />
              </button>
              {u.username !== 'admin' && u.is_active && (
                <button onClick={() => { if (confirm('Kullanıcıyı devre dışı bırakmak istiyor musunuz?')) deleteMut.mutate(u.id); }}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kullanıcı Adı *</label>
                  <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="input-modern" required disabled={!!editingId} placeholder="kullanici.adi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ad Soyad *</label>
                  <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                    className="input-modern" required placeholder="Ahmet Yılmaz" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Şifre {editingId ? '(boş bırakılırsa değişmez)' : '*'}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="input-modern" required={!editingId} placeholder="••••••••" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editingId ? 'Güncelle' : 'Oluştur'}
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
