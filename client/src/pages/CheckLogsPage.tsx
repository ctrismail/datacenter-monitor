import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCheckLogsApi } from '../api/checks';
import { listEquipmentApi } from '../api/equipment';
import { exportChecksApi, exportReportApi } from '../api/export';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, History } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import type { Equipment } from '../types';

const statusLabels: Record<string, { label: string; class: string }> = {
  ok: { label: 'Normal', class: 'badge-green' },
  warning: { label: 'Uyarı', class: 'badge-yellow' },
  critical: { label: 'Kritik', class: 'badge-red' },
};

export default function CheckLogsPage() {
  const [page, setPage] = useState(1);
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: () => listEquipmentApi().then(r => r.data),
  });

  const { data: logsData } = useQuery({
    queryKey: ['checkLogs', page, equipmentFilter, startDate, endDate],
    queryFn: () => listCheckLogsApi({
      page, limit: 20,
      equipment_id: equipmentFilter || undefined,
      start: startDate || undefined,
      end: endDate || undefined,
    }).then(r => r.data),
  });

  const logs = logsData?.data || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const downloadBlob = (data: Blob, filename: string) => {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportLogs = async () => {
    const res = await exportChecksApi({ equipment_id: equipmentFilter || undefined, start: startDate || undefined, end: endDate || undefined });
    downloadBlob(new Blob([res.data]), 'kontrol-kayitlari.xlsx');
    setShowExportMenu(false);
  };

  const handleExportMonthly = async () => {
    const now = new Date();
    const res = await exportReportApi(now.getFullYear(), now.getMonth() + 1);
    downloadBlob(new Blob([res.data]), `rapor-${now.getFullYear()}-${now.getMonth() + 1}.xlsx`);
    setShowExportMenu(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontrol Geçmişi</h1>
          <p className="text-sm text-gray-500 mt-1">Toplam {total} kayıt</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowExportMenu(!showExportMenu)}
            className="btn-success flex items-center gap-2">
            <Download size={16} /> Excel İndir
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border p-2 z-50 w-56 animate-scale-in">
                <button onClick={handleExportLogs}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-left">
                  <FileSpreadsheet size={16} className="text-green-600" />
                  <div>
                    <p className="font-medium">Kontrol Kayıtları</p>
                    <p className="text-xs text-gray-400">Filtrelenmiş kayıtlar</p>
                  </div>
                </button>
                <button onClick={handleExportMonthly}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-left">
                  <FileSpreadsheet size={16} className="text-blue-600" />
                  <div>
                    <p className="font-medium">Aylık Rapor</p>
                    <p className="text-xs text-gray-400">Bu ayın özet raporu</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card-modern p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select value={equipmentFilter} onChange={e => { setEquipmentFilter(e.target.value); setPage(1); }} className="input-modern">
          <option value="">Tüm Ekipmanlar</option>
          {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">Başlangıç:</span>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="input-modern" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">Bitiş:</span>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="input-modern" />
        </div>
      </div>

      {/* Table */}
      <div className="card-modern overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Tarih</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Ekipman</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">Kontrol Tipi</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Durum</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">Kontrol Eden</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Notlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <motion.tr key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(log.checked_at).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.equipment_name}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">{log.check_type_name}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('badge', statusLabels[log.status]?.class)}>
                      {statusLabels[log.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">{log.user_name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-400 max-w-[200px] truncate">{log.notes || '-'}</td>
                </motion.tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Kayıt bulunamadı</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
            <span className="text-sm text-gray-400">Sayfa {page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={clsx('w-8 h-8 rounded-lg text-sm font-medium', pageNum === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600')}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
