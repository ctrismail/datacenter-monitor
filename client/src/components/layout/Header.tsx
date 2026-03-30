import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Bell, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardAlertsApi } from '../../api/dashboard';
import type { Alert } from '../../types';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAlerts, setShowAlerts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => getDashboardAlertsApi().then(r => r.data),
    refetchInterval: 30000,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    }
    if (showAlerts) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAlerts]);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200">
          <Menu size={22} />
        </button>
        <h2 className="text-sm font-medium text-gray-500 hidden md:block">Veri Merkezi Kontrol Paneli</h2>
      </div>
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`relative p-2.5 rounded-lg transition-colors ${alerts.length > 0 ? 'text-red-500 hover:bg-red-50 active:bg-red-100' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <Bell size={20} />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Alert dropdown */}
          {showAlerts && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">
                  Bildirimler {alerts.length > 0 && `(${alerts.length})`}
                </span>
                <button onClick={() => setShowAlerts(false)} className="p-1 rounded hover:bg-gray-200">
                  <X size={14} />
                </button>
              </div>
              <div className="overflow-y-auto max-h-72">
                {alerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    Gecikmiş kontrol yok
                  </div>
                ) : (
                  alerts.map((a, i) => (
                    <div key={`${a.equipment_id}-${a.check_type_name}`}
                      onClick={() => { setShowAlerts(false); navigate('/check-entry'); }}
                      className={`px-4 py-3 cursor-pointer hover:bg-red-50 transition-colors ${i < alerts.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{a.equipment_name}</p>
                          <p className="text-xs text-gray-500">{a.check_type_name}</p>
                        </div>
                        <span className="text-xs font-bold text-red-500 whitespace-nowrap">
                          {a.hours_overdue ? `${Math.round(a.hours_overdue)}s gecikme` : 'Yapılmadı'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {alerts.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <button onClick={() => { setShowAlerts(false); navigate('/check-entry'); }}
                    className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-800">
                    Kontrol Girişi Yap
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.display_name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.display_name || user?.username}</span>
        </div>
        <button onClick={logout}
          className="p-2.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 active:bg-red-100 transition-colors" title="Cikis Yap">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
