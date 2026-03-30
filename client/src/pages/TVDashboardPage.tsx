import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummaryApi, getEquipmentStatusesApi, getDashboardAlertsApi, getRecentChecksApi } from '../api/dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, CheckCircle, AlertTriangle, AlertOctagon, Zap, Thermometer, Activity, Battery, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
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

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="text-3xl font-mono font-bold text-white/90">
      {time.toLocaleTimeString('tr-TR')}
    </div>
  );
}

function TVStatusCard({ eq }: { eq: EquipmentStatus }) {
  const status = getOverallStatus(eq);
  const CatIcon = iconMap[eq.category_icon || ''] || Server;
  const bg = { ok: 'from-green-900/40 to-green-800/20 border-green-500/30', warning: 'from-yellow-900/40 to-yellow-800/20 border-yellow-500/30', overdue: 'from-red-900/40 to-red-800/20 border-red-500/30', unknown: 'from-gray-800/40 to-gray-700/20 border-gray-500/30' };
  const dotClass = { ok: 'bg-green-500 animate-pulse-green', warning: 'bg-yellow-500 animate-pulse-yellow', overdue: 'bg-red-500 animate-pulse-red', unknown: 'bg-gray-500' };
  const statusText = { ok: 'NORMAL', warning: 'UYARI', overdue: 'GECİKMİŞ', unknown: 'BİLİNMİYOR' };

  return (
    <div className={clsx('bg-gradient-to-br rounded-2xl p-5 border', bg[status])}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <CatIcon size={20} className="text-white/60" />
          <span className="text-sm text-white/60">{eq.category_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx('w-3.5 h-3.5 rounded-full', dotClass[status])} />
          <span className={clsx('text-xs font-bold', status === 'ok' ? 'text-green-400' : status === 'warning' ? 'text-yellow-400' : status === 'overdue' ? 'text-red-400' : 'text-gray-400')}>
            {statusText[status]}
          </span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-white">{eq.name}</h3>
      {eq.location && <p className="text-sm text-white/50 mt-1">{eq.location}</p>}
      <div className="mt-3 space-y-1">
        {eq.schedules?.filter(s => s.schedule_id !== null).map(s => (
          <div key={s.schedule_id} className="text-sm text-white/70">
            {s.check_type_name}: {s.last_checked
              ? formatDistanceToNow(new Date(s.last_checked), { addSuffix: true, locale: tr })
              : 'Kontrol edilmedi'}
            {s.last_user && <span className="text-white/40"> - {s.last_user}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TVDashboardPage() {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_DURATION = 15000;

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

  const { data: recentChecks = [] } = useQuery<any[]>({
    queryKey: ['dashboard', 'recent'],
    queryFn: () => getRecentChecksApi(15).then(r => r.data),
    refetchInterval: 30000,
  });

  const equipmentPages: EquipmentStatus[][] = [];
  for (let i = 0; i < statuses.length; i += 6) {
    equipmentPages.push(statuses.slice(i, i + 6));
  }

  const totalPages = 1 + equipmentPages.length + (alerts.length > 0 ? 1 : 0);

  // Reset auto-rotation timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDirection(1);
      setCurrentPage(p => (p + 1) % totalPages);
    }, currentPage === totalPages - 1 && alerts.length > 0 ? 30000 : PAGE_DURATION);
  }, [totalPages, currentPage, alerts.length]);

  useEffect(() => {
    if (totalPages <= 1) return;
    resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [resetTimer, totalPages]);

  // Jump to alert page when new alert
  useEffect(() => {
    if (alerts.length > 0 && totalPages > 0) {
      setDirection(1);
      setCurrentPage(totalPages - 1);
    }
  }, [alerts.length]);

  const goToPage = (idx: number) => {
    setDirection(idx > currentPage ? 1 : -1);
    setCurrentPage(idx);
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrentPage(p => (p - 1 + totalPages) % totalPages);
  };

  const goNext = () => {
    setDirection(1);
    setCurrentPage(p => (p + 1) % totalPages);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const summaryCards = [
    { label: 'Toplam Ekipman', value: summary?.total_equipment || '0', color: 'from-blue-600 to-blue-700', icon: Server },
    { label: 'Normal', value: summary?.ok_count || '0', color: 'from-green-600 to-green-700', icon: CheckCircle },
    { label: 'Uyarı', value: summary?.warning_count || '0', color: 'from-yellow-600 to-yellow-700', icon: AlertTriangle },
    { label: 'Gecikmiş', value: summary?.overdue_count || '0', color: 'from-red-600 to-red-700', icon: AlertOctagon },
  ];

  const pageNames = ['Genel Bakış', ...equipmentPages.map((_, i) => `Ekipmanlar ${i + 1}`), ...(alerts.length > 0 ? ['Alarmlar'] : [])];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-400" size={28} />
          <h1 className="text-2xl font-bold">DC Monitor</h1>
          <span className="text-sm text-white/40 ml-2">Veri Merkezi Kontrol Sistemi</span>
        </div>
        <Clock />
      </div>

      {/* Page content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Left/Right navigation arrows */}
        {totalPages > 1 && (
          <>
            <button onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/40 hover:text-white transition-all">
              <ChevronLeft size={28} />
            </button>
            <button onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/40 hover:text-white transition-all">
              <ChevronRight size={28} />
            </button>
          </>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          {/* Page 0: Overview */}
          {currentPage === 0 && (
            <motion.div key="overview" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0 p-8">
              <div className="grid grid-cols-4 gap-6 mb-8">
                {summaryCards.map(card => (
                  <div key={card.label} className={clsx('bg-gradient-to-br rounded-2xl p-6', card.color)}>
                    <card.icon size={32} className="text-white/80 mb-3" />
                    <p className="text-5xl font-bold">{card.value}</p>
                    <p className="text-lg text-white/70 mt-1">{card.label}</p>
                  </div>
                ))}
              </div>
              <h2 className="text-xl font-semibold text-white/80 mb-4">Tüm Ekipmanlar</h2>
              <div className="grid grid-cols-3 gap-4">
                {statuses.slice(0, 6).map(eq => <TVStatusCard key={eq.id} eq={eq} />)}
              </div>
            </motion.div>
          )}

          {/* Equipment pages */}
          {equipmentPages.map((page, idx) => (
            currentPage === idx + 1 && (
              <motion.div key={`equip-${idx}`} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="absolute inset-0 p-8">
                <h2 className="text-xl font-semibold text-white/80 mb-6">
                  Ekipmanlar ({idx * 6 + 1}-{Math.min((idx + 1) * 6, statuses.length)} / {statuses.length})
                </h2>
                <div className="grid grid-cols-3 gap-5">
                  {page.map(eq => <TVStatusCard key={eq.id} eq={eq} />)}
                </div>
              </motion.div>
            )
          ))}

          {/* Alert page */}
          {alerts.length > 0 && currentPage === totalPages - 1 && (
            <motion.div key="alerts" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0 p-8">
              <div className="bg-red-900/30 border-2 border-red-500/50 rounded-2xl p-8 animate-pulse-red">
                <div className="flex items-center gap-3 mb-6">
                  <AlertOctagon size={36} className="text-red-400" />
                  <h2 className="text-3xl font-bold text-red-400">GECİKMİŞ KONTROLLER</h2>
                </div>
                <div className="space-y-4">
                  {alerts.map(a => (
                    <div key={`${a.equipment_id}-${a.check_type_name}`}
                      className="bg-red-950/50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xl font-semibold text-white">{a.equipment_name}</p>
                        <p className="text-red-300">{a.check_type_name} - {a.category_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-400">
                          {a.hours_overdue ? `${Math.round(a.hours_overdue)} saat` : 'Hiç yapılmadı'}
                        </p>
                        <p className="text-sm text-red-300/70">gecikme</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom bar: ticker + navigation */}
      <div className="border-t border-white/10 bg-slate-950/80">
        {/* Ticker */}
        <div className="px-4 py-2 overflow-hidden border-b border-white/5">
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/40 shrink-0">Son Kontroller</span>
            <div className="overflow-hidden flex-1">
              <div className="animate-marquee whitespace-nowrap">
                {recentChecks.map((c: any, i: number) => (
                  <span key={i} className="inline-block mx-6 text-sm text-white/60">
                    {new Date(c.checked_at).toLocaleTimeString('tr-TR')} - {c.user_name} - {c.equipment_name} - {c.check_type_name} -
                    <span className={clsx('ml-1 font-medium', c.status === 'ok' ? 'text-green-400' : c.status === 'warning' ? 'text-yellow-400' : 'text-red-400')}>
                      {c.status === 'ok' ? 'Normal' : c.status === 'warning' ? 'Uyarı' : 'Kritik'}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Page navigation */}
        <div className="flex items-center justify-center gap-3 py-2.5 px-4">
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => goToPage(i)}
                className={clsx(
                  'rounded-full transition-all duration-300 cursor-pointer',
                  i === currentPage
                    ? 'bg-blue-500 h-3 w-10'
                    : 'bg-white/20 hover:bg-white/40 h-3 w-3'
                )}
                title={pageNames[i]}
              />
            ))}
          </div>
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <ChevronRight size={18} />
          </button>
          <span className="text-xs text-white/30 ml-2">{currentPage + 1} / {totalPages}</span>
        </div>
      </div>
    </div>
  );
}
