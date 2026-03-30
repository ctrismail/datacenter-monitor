import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEquipmentApi, listCategoriesApi, getFieldDefsApi } from '../api/equipment';
import { listCheckTypesApi, createCheckLogApi } from '../api/checks';
import toast from 'react-hot-toast';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Equipment, Category, CheckType, FieldDefinition } from '../types';

export default function CheckEntryPage() {
  const queryClient = useQueryClient();
  const [selectedEquipment, setSelectedEquipment] = useState<number | ''>('');
  const [selectedCheckType, setSelectedCheckType] = useState<number | ''>('');
  const [status, setStatus] = useState<'ok' | 'warning' | 'critical'>('ok');
  const [notes, setNotes] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>([]);

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: () => listEquipmentApi().then(r => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => listCategoriesApi().then(r => r.data),
  });

  const { data: checkTypes = [] } = useQuery<CheckType[]>({
    queryKey: ['checkTypes'],
    queryFn: () => listCheckTypesApi().then(r => r.data),
  });

  const selectedEq = equipment.find(e => e.id === selectedEquipment);

  useEffect(() => {
    if (selectedEq) {
      getFieldDefsApi(selectedEq.category_id).then(r => {
        setFieldDefs(r.data);
        setFieldValues({});
      });
    } else {
      setFieldDefs([]);
      setFieldValues({});
    }
  }, [selectedEquipment]);

  const mutation = useMutation({
    mutationFn: createCheckLogApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['checkLogs'] });
      toast.success('Kontrol kaydedildi!');
      setSelectedEquipment('');
      setSelectedCheckType('');
      setStatus('ok');
      setNotes('');
      setFieldValues({});
      setFieldDefs([]);
    },
    onError: () => toast.error('Hata oluştu'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment || !selectedCheckType) return;
    mutation.mutate({
      equipmentId: selectedEquipment,
      checkTypeId: selectedCheckType,
      status,
      notes: notes || undefined,
      fieldValues: Object.entries(fieldValues)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => ({ fieldDefId: parseInt(k), value: v })),
    });
  };

  const statusOptions = [
    { value: 'ok' as const, label: 'Normal', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
    { value: 'warning' as const, label: 'Uyarı', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { value: 'critical' as const, label: 'Kritik', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
  ];

  const grouped = categories.map(cat => ({
    ...cat,
    items: equipment.filter(e => e.category_id === cat.id)
  })).filter(g => g.items.length > 0);

  const selectFieldOptions: Record<string, string[]> = {
    engine_status: ['Çalışıyor', 'Durdu', 'Arızalı', 'Bakımda'],
    physical_condition: ['İyi', 'Orta', 'Kötü'],
    filter_status: ['Temiz', 'Kirli', 'Değişmeli'],
    compressor_status: ['Çalışıyor', 'Durdu', 'Arızalı'],
    airflow: ['Normal', 'Zayıf', 'Yok'],
    noise_level: ['Normal', 'Yüksek', 'Çok Yüksek'],
    ups_mode: ['Online', 'Batarya', 'Bypass', 'Eco', 'Arızalı'],
    panel_status: ['Normal', 'Alarm', 'Arızalı', 'Bakımda'],
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Kontrol Girişi</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-4 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ekipman Seçin</label>
          <select value={selectedEquipment} onChange={e => setSelectedEquipment(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none" required>
            <option value="">Ekipman seçiniz...</option>
            {grouped.map(g => (
              <optgroup key={g.id} label={g.name}>
                {g.items.map(eq => <option key={eq.id} value={eq.id}>{eq.name} {eq.location ? `(${eq.location})` : ''}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kontrol Tipi</label>
          <select value={selectedCheckType} onChange={e => setSelectedCheckType(e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none" required>
            <option value="">Kontrol tipi seçiniz...</option>
            {checkTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
          <div className="grid grid-cols-3 gap-2">
            {statusOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                className={clsx('flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                  status === opt.value ? opt.color + ' border-current' : 'border-gray-200 text-gray-400')}>
                <opt.icon size={24} />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {fieldDefs.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Ölçüm Değerleri</h3>
            <div className="space-y-3">
              {fieldDefs.map(fd => (
                <div key={fd.id}>
                  <label className="block text-sm text-gray-600 mb-1">
                    {fd.field_label} {fd.unit ? `(${fd.unit})` : ''} {fd.is_required && <span className="text-red-500">*</span>}
                  </label>
                  {fd.field_type === 'number' && (
                    <input type="number" step="any"
                      value={fieldValues[fd.id] || ''} onChange={e => setFieldValues({ ...fieldValues, [fd.id]: e.target.value })}
                      className="w-full px-3 py-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                      required={fd.is_required} placeholder={fd.field_label} />
                  )}
                  {fd.field_type === 'text' && (
                    <input type="text"
                      value={fieldValues[fd.id] || ''} onChange={e => setFieldValues({ ...fieldValues, [fd.id]: e.target.value })}
                      className="w-full px-3 py-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                      required={fd.is_required} />
                  )}
                  {fd.field_type === 'select' && (
                    <select value={fieldValues[fd.id] || ''} onChange={e => setFieldValues({ ...fieldValues, [fd.id]: e.target.value })}
                      className="w-full px-3 py-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                      required={fd.is_required}>
                      <option value="">Seçiniz...</option>
                      {(selectFieldOptions[fd.field_name] || ['İyi', 'Orta', 'Kötü']).map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  )}
                  {fd.field_type === 'boolean' && (
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setFieldValues({ ...fieldValues, [fd.id]: 'true' })}
                        className={clsx('flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all',
                          fieldValues[fd.id] === 'true' ? 'bg-green-50 border-green-400 text-green-700' : 'border-gray-200 text-gray-400')}>
                        Evet / Normal
                      </button>
                      <button type="button" onClick={() => setFieldValues({ ...fieldValues, [fd.id]: 'false' })}
                        className={clsx('flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all',
                          fieldValues[fd.id] === 'false' ? 'bg-red-50 border-red-400 text-red-700' : 'border-gray-200 text-gray-400')}>
                        Hayır / Sorunlu
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full px-3 py-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Ek notlar (isteğe bağlı)..." />
        </div>

        <button type="submit" disabled={mutation.isPending}
          className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-medium text-base hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Kaydediliyor...' : 'Kontrolü Kaydet'}
        </button>
      </form>
    </div>
  );
}
