import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, ClipboardCheck, History, Calendar, Users, X, Tv, Activity } from 'lucide-react';
import clsx from 'clsx';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/equipment', icon: Server, label: 'Ekipmanlar' },
  { to: '/check-entry', icon: ClipboardCheck, label: 'Kontrol Girişi' },
  { to: '/check-logs', icon: History, label: 'Kontrol Geçmişi' },
  { to: '/schedules', icon: Calendar, label: 'Takvim' },
  { to: '/users', icon: Users, label: 'Kullanıcılar' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />}
      <aside className={clsx(
        'fixed md:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transform transition-transform duration-300 md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <Activity size={16} />
            </div>
            <div>
              <h1 className="text-base font-bold">DC Monitor</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">ICS Data Center</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
        </div>

        <nav className="p-3 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <a href="/tv" target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Tv size={18} />
            TV Modu
          </a>
        </div>
      </aside>
    </>
  );
}
