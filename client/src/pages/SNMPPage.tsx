import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSnmpDevicesApi, createSnmpDeviceApi, deleteSnmpDeviceApi, getSnmpLiveApi, getSnmpAlarmsApi, acknowledgeAlarmApi, startPollingApi } from '../api/snmp';
import { listEquipmentApi } from '../api/equipment';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Wifi, WifiOff, Radio, Bell, CheckCircle, AlertTriangle, AlertOctagon, Activity, Server, Zap, Thermometer, Battery, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const iconMap: Record<string, any> = { zap: Zap, thermometer: Thermometer, battery: Battery, flame: Flame };

// Canlı veri kartı - gauge ile
function LiveDeviceCard({ device }: { device: any }) {
  const CatIcon = iconMap[device.category_icon || ''] || Server;
  const readings = device.readings || [];

  // Ana metrik (ilk 4 reading) gauge olarak göster
  const gaugeReadings = readings.slice(0, 4);
  const otherReadings = readings.slice(4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            device.last_status === 'online' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
          )}>
            <CatIcon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{device.equipment_name}</h3>
            <p className="text-xs text-gray-400">{device.category_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {device.last_status === 'online' ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <Wifi size={12} /> Çevrimiçi
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
              <WifiOff size={12} /> Çevrimdışı
            </span>
          )}
        </div>
      </div>

      {/* Gauge'ler - SVG */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {gaugeReadings.map((r: any, i: number) => {
          const max = getMaxForUnit(r.unit, r.label);
          const val = Number(r.numeric_value) || 0;
          const pct = Math.min(100, Math.max(0, (val / max) * 100));
          const angle = (pct / 100) * 180;
          const color = r.status === 'critical' ? '#ef4444' : r.status === 'warning' ? '#eab308' : '#22c55e';
          return (
            <div key={i} className="text-center">
              <svg viewBox="0 0 120 70" className="w-full max-w-[140px] mx-auto">
                {/* Background arc */}
                <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
                {/* Value arc */}
                <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(angle / 180) * 157} 157`}
                  className="transition-all duration-1000 ease-out" />
                {/* Needle */}
                <line x1="60" y1="65" x2={60 + 40 * Math.cos(Math.PI - (angle * Math.PI / 180))} y2={65 - 40 * Math.sin(Math.PI - (angle * Math.PI / 180))}
                  stroke="#475569" strokeWidth="2" strokeLinecap="round"
                  className="transition-all duration-1000 ease-out" />
                <circle cx="60" cy="65" r="4" fill="#475569" />
                {/* Value text */}
                <text x="60" y="55" textAnchor="middle" className="text-sm font-bold" fill="#1e293b" fontSize="14">
                  {val}{r.unit || ''}
                </text>
              </svg>
              <p className="text-xs font-medium text-gray-500 -mt-1">{r.label}</p>
            </div>
          );
        })}
      </div>

      {/* Diğer okumalar - kompakt liste */}
      {otherReadings.length > 0 && (
        <div className="px-5 pb-4 space-y-1.5">
          {otherReadings.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
              <span className="text-xs text-gray-500">{r.label}</span>
              <div className="flex items-center gap-2">
                <span className={clsx('text-sm font-semibold', getStatusColor(r.status))}>
                  {Number(r.numeric_value)?.toFixed(1) || '0'}
                  {r.unit && <span className="text-xs font-normal text-gray-400 ml-0.5">{r.unit}</span>}
                </span>
                <div className={clsx('w-2 h-2 rounded-full', getStatusDot(r.status))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function getMaxForUnit(unit: string, label: string): number {
  if (unit === '%') return 100;
  if (unit === 'V' && label.includes('Akü')) return 30;
  if (unit === 'V') return 260;
  if (unit === '°C') return 60;
  if (unit === 'A') return 100;
  if (unit === 'Hz') return 55;
  if (unit === 'bar') return 8;
  if (unit === 'kW') return 20;
  if (unit === 'dk') return 200;
  if (unit === 'rpm') return 2000;
  return 100;
}

function getStatusColor(status: string) {
  if (status === 'critical') return 'text-red-600';
  if (status === 'warning') return 'text-yellow-600';
  return 'text-gray-800';
}

function getStatusDot(status: string) {
  if (status === 'critical') return 'bg-red-500 animate-pulse';
  if (status === 'warning') return 'bg-yellow-500 animate-pulse';
  return 'bg-green-500';
}

export default function SNMPPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [tab, setTab] = useState<'live' | 'devices' | 'alarms'>('live');
  const queryClient = useQueryClient();

  // Canlı veri (5 saniyede bir yenile)
  const { data: liveData = [] } = useQuery({
    queryKey: ['snmp', 'live'],
    queryFn: () => getSnmpLiveApi().then(r => r.data),
    refetchInterval: 5000,
  });

  // Cihaz listesi
  const { data: devices = [] } = useQuery({
    queryKey: ['snmp', 'devices'],
    queryFn: () => listSnmpDevicesApi().then(r => r.data),
  });

  // Alarmlar
  const { data: alarms = [] } = useQuery({
    queryKey: ['snmp', 'alarms'],
    queryFn: () => getSnmpAlarmsApi().then(r => r.data),
    refetchInterval: 10000,
  });

  // Ekipman listesi (modal için)
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => listEquipmentApi().then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSnmpDeviceApi(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['snmp'] }); toast.success('Cihaz silindi'); },
  });

  const ackMut = useMutation({
    mutationFn: (id: number) => acknowledgeAlarmApi(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['snmp', 'alarms'] }); toast.success('Alarm onaylandı'); },
  });

  const activeAlarmCount = alarms.length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Radio className="text-blue-500" size={24} />
            SNMP Monitör
          </h1>
          <p className="text-sm text-gray-500 mt-1">Canlı cihaz izleme ve alarm yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => startPollingApi().then(() => toast.success('Polling başlatıldı'))}
            className="btn-success text-sm flex items-center gap-1.5 px-3 py-2 rounded-xl">
            <Activity size={16} /> Polling Başlat
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5 px-3 py-2 rounded-xl">
            <Plus size={16} /> Cihaz Ekle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { key: 'live', label: 'Canlı Veri', icon: Activity },
          { key: 'devices', label: 'Cihazlar', icon: Server },
          { key: 'alarms', label: `Alarmlar${activeAlarmCount > 0 ? ` (${activeAlarmCount})` : ''}`, icon: Bell },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Canlı Veri */}
      {tab === 'live' && (
        <div>
          {liveData.length === 0 ? (
            <div className="text-center py-16">
              <Radio size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">Henüz SNMP cihazı eklenmedi</h3>
              <p className="text-sm text-gray-400 mt-1">"Cihaz Ekle" butonuyla ekipmanlarınıza SNMP bağlantısı kurun</p>
              <button onClick={() => setShowAddModal(true)}
                className="btn-primary mt-4 text-sm flex items-center gap-1.5 px-4 py-2 rounded-xl mx-auto">
                <Plus size={16} /> İlk Cihazı Ekle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence>
                {liveData.map((device: any) => (
                  <LiveDeviceCard key={device.device_id} device={device} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Tab: Cihazlar */}
      {tab === 'devices' && (
        <div className="space-y-3">
          {devices.map((d: any) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={clsx('w-3 h-3 rounded-full',
                  d.last_status === 'online' ? 'bg-green-500 animate-pulse' : d.last_status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                )} />
                <div>
                  <p className="font-medium text-gray-800">{d.equipment_name}</p>
                  <p className="text-xs text-gray-400">{d.ip_address}:{d.port} · SNMP v{d.snmp_version} · {d.poll_interval}s · {d.oid_count} OID</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx('text-xs px-2 py-1 rounded-full font-medium',
                  d.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                )}>
                  {d.is_active ? 'Aktif' : 'Pasif'}
                </span>
                <button onClick={() => deleteMut.mutate(d.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {devices.length === 0 && (
            <p className="text-center text-gray-400 py-8">Henüz SNMP cihazı eklenmedi</p>
          )}
        </div>
      )}

      {/* Tab: Alarmlar */}
      {tab === 'alarms' && (
        <div className="space-y-3">
          {alarms.map((a: any) => (
            <div key={a.id} className={clsx('rounded-xl border p-4 flex items-center justify-between',
              a.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
            )}>
              <div className="flex items-center gap-3">
                {a.severity === 'critical' ? <AlertOctagon size={20} className="text-red-500" /> : <AlertTriangle size={20} className="text-yellow-500" />}
                <div>
                  <p className="font-medium text-gray-800">{a.equipment_name} - {a.oid_label}</p>
                  <p className="text-sm text-gray-500">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleString('tr-TR')}</p>
                </div>
              </div>
              <button onClick={() => ackMut.mutate(a.id)}
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-green-50 hover:border-green-300 text-gray-600 hover:text-green-600 transition-colors">
                <CheckCircle size={14} /> Onayla
              </button>
            </div>
          ))}
          {alarms.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle size={48} className="mx-auto text-green-300 mb-3" />
              <p className="text-gray-400">Aktif alarm yok</p>
            </div>
          )}
        </div>
      )}

      {/* Cihaz Ekle Modal */}
      <AddDeviceModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        equipment={equipment}
        existingDeviceEquipmentIds={devices.map((d: any) => d.equipment_id)}
      />
    </div>
  );
}

function AddDeviceModal({ show, onClose, equipment, existingDeviceEquipmentIds }: {
  show: boolean; onClose: () => void; equipment: any[]; existingDeviceEquipmentIds: number[];
}) {
  const [form, setForm] = useState({ equipmentId: '', ipAddress: '192.168.1.', port: '161', community: 'public', pollInterval: '30' });
  const queryClient = useQueryClient();

  const createMut = useMutation({
    mutationFn: (data: any) => createSnmpDeviceApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snmp'] });
      toast.success('SNMP cihazı eklendi ve polling başladı');
      onClose();
      setForm({ equipmentId: '', ipAddress: '192.168.1.', port: '161', community: 'public', pollInterval: '30' });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Hata oluştu'),
  });

  if (!show) return null;

  const availableEquipment = equipment.filter((e: any) => !existingDeviceEquipmentIds.includes(e.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">SNMP Cihaz Ekle</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); createMut.mutate({ equipmentId: parseInt(form.equipmentId), ipAddress: form.ipAddress, port: parseInt(form.port), community: form.community, pollInterval: parseInt(form.pollInterval) }); }}
          className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Ekipman</label>
            <select value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })}
              className="input-modern" required>
              <option value="">Seçin...</option>
              {availableEquipment.map((eq: any) => (
                <option key={eq.id} value={eq.id}>{eq.name} ({eq.category_name})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">IP Adresi</label>
              <input className="input-modern" value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })}
                placeholder="192.168.1.100" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Port</label>
              <input className="input-modern" type="number" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Community</label>
              <input className="input-modern" value={form.community} onChange={e => setForm({ ...form, community: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Poll Aralığı (sn)</label>
              <select className="input-modern" value={form.pollInterval} onChange={e => setForm({ ...form, pollInterval: e.target.value })}>
                <option value="10">10 saniye</option>
                <option value="30">30 saniye</option>
                <option value="60">1 dakika</option>
                <option value="300">5 dakika</option>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <strong>Simülasyon Modu:</strong> Gerçek cihaz olmadan test verisi üretilir. OID'ler ekipman kategorisine göre otomatik oluşturulur.
          </div>
          <button type="submit" disabled={createMut.isPending}
            className="btn-primary w-full py-2.5 rounded-xl text-sm font-medium">
            {createMut.isPending ? 'Ekleniyor...' : 'Cihazı Ekle ve Polling Başlat'}
          </button>
        </form>
      </div>
    </div>
  );
}
