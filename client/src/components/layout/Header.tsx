import { useAuth } from '../../context/AuthContext';
import { Menu, LogOut, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardAlertsApi } from '../../api/dashboard';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { data: alerts = [] } = useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => getDashboardAlertsApi().then(r => r.data),
    refetchInterval: 30000,
  });

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100">
          <Menu size={20} />
        </button>
        <h2 className="text-sm font-medium text-gray-500 hidden md:block">Veri Merkezi Kontrol Paneli</h2>
      </div>
      <div className="flex items-center gap-2">
        {alerts.length > 0 && (
          <div className="relative p-2 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer" title={`${alerts.length} gecikmiş kontrol`}>
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {alerts.length}
            </span>
          </div>
        )}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.display_name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.display_name || user?.username}</span>
        </div>
        <button onClick={logout}
          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Çıkış Yap">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
