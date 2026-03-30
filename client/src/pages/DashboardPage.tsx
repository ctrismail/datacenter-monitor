import { useQuery } from '@tanstack/react-query';
import { getDashboardSummaryApi, getEquipmentStatusesApi, getDashboardAlertsApi } from '../api/dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, CheckCircle, AlertTriangle, AlertOctagon, Zap, Thermometer, Battery, Flame } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { DashboardSummary, EquipmentStatus, Alert } from '../types';

function getOverallStatus(eq: EquipmentStatus): 'ok' | 'warning' | 'overdue' | 'unknown' {
  if (!eq.schedules || eq.schedules.length === 0 || eq.schedules[0].schedule_id === null) return 'unknown';
  let worst: 'ok' | 'warning' | 'overdue' = 'ok';
  for (const s of eq.schedules) {
    if (!s.last_checked || s.hours_since_check === null) return 'overdue';
    if (s.hours_since_check > s.interval_hours) return 'overdue';
    if (s.hours_since_check > s.interval_hours * 0.8) worst = 'warning';
  }
  return worst;
}

const iconMap: Record<string, any> = { zap: Zap, thermometer: Thermometer, battery: Battery, flame: Flame };

export default function DashboardPage() {
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => getDashboardSummaryApi().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: statuses = [] } = useQuery<EquipmentStatus[]>({
    queryKey: ['dashboard', 'statuses'],
    queryFn: () => getEquipmentStatusesApi().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => getDashboardAlertsApi().then(r => r.data),
    refetchInterval: 30000,
  });

  const summaryCards = [
    { label: 'Toplam Ekipman', value: summary?.total_equipment || '0', color: 'bg-blue-500', icon: Server },
    { label: 'Normal', value: summary?.ok_count || '0', color: 'bg-green-500', icon: CheckCircle },
    { label: 'Uyarı', value: summary?.warning_count || '0', color: 'bg-yellow-500', icon: AlertTriangle },
    { label: 'Gecikmiş', value: summary?.overdue_count || '0', color: 'bg-red-500', icon: AlertOctagon },
  ];

  return (
    <div>
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 animate-pulse-red">
            <p className="text-red-700 font-medium text-sm">
              {alerts.length} gecikmiş kontrol: {alerts.slice(0, 3).map(a => a.equipment_name).join(', ')}
              {alerts.length > 3 && ` ve ${alerts.length - 3} daha...`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {summaryCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl shadow-sm p-4 border">
            <div className="flex items-center gap-3">
              <div className={clsx('p-2 rounded-lg text-white', card.color)}>
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Ekipman Durumları</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statuses.map((eq, i) => {
          const status = getOverallStatus(eq);
          const CatIcon = iconMap[eq.category_icon || ''] || Server;
          const statusColors = {
            ok: 'border-green-200',
            warning: 'border-yellow-300',
            overdue: 'border-red-300',
            unknown: 'border-gray-200',
          };
          const dotClass = {
            ok: 'bg-green-500 animate-pulse-green',
            warning: 'bg-yellow-500 animate-pulse-yellow',
            overdue: 'bg-red-500 animate-pulse-red',
            unknown: 'bg-gray-400',
          };

          return (
            <motion.div key={eq.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
              className={clsx('bg-white rounded-xl shadow-sm p-4 border-2 transition-colors cursor-default', statusColors[status])}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CatIcon size={16} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{eq.category_name}</span>
                </div>
                <div className={clsx('w-3 h-3 rounded-full', dotClass[status])} />
              </div>
              <h3 className="font-semibold text-gray-800">{eq.name}</h3>
              {eq.location && <p className="text-xs text-gray-500 mt-0.5">{eq.location}</p>}
              <div className="mt-3 space-y-1">
                {eq.schedules?.filter(s => s.schedule_id !== null).map(s => (
                  <div key={s.schedule_id} className="text-xs text-gray-500">
                    <span className="font-medium">{s.check_type_name}:</span>{' '}
                    {s.last_checked
                      ? formatDistanceToNow(new Date(s.last_checked), { addSuffix: true, locale: tr })
                      : 'Hiç kontrol edilmedi'}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
