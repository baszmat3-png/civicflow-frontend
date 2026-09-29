import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  Building2,
  UserCheck,
  BarChart3,
  Bell,
  History,
  Settings,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Flame,
  Plus,
  Calendar,
  Send,
  Inbox
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { unreadNotificationsCount, overdueRequestsCount } = useData();
  const { canAccessModule } = usePermissions();

  const allNavItems = [
    { name: 'الرئيسية', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, module: 'الرئيسية' },
    {
      name: 'الطلبات والمعاملات',
      path: '/requests',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      module: 'الطلبات',
      badge: overdueRequestsCount > 0 ? (
        <span className="bg-rose-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
          <Flame className="w-2.5 h-2.5" />
          {overdueRequestsCount}
        </span>
      ) : undefined
    },
    { name: 'المواعيد والمقابلات', path: '/appointments', icon: <Calendar className="w-5 h-5" />, module: 'إدارة المواعيد' },
    { name: 'سجل الصادر', path: '/registry/outgoing', icon: <Send className="w-5 h-5" />, module: 'الصادر والوارد' },
    { name: 'سجل الوارد', path: '/registry/incoming', icon: <Inbox className="w-5 h-5" />, module: 'الصادر والوارد' },
    { name: 'المراجعون', path: '/customers', icon: <Users className="w-5 h-5" />, module: 'المراجعون' },
    { name: 'الوزارات والجهات', path: '/ministries', icon: <Building2 className="w-5 h-5" />, module: 'الوزارات' },
    { name: 'الموظفون', path: '/employees', icon: <UserCheck className="w-5 h-5" />, module: 'الموظفون' },
    { name: 'التقارير', path: '/reports', icon: <BarChart3 className="w-5 h-5" />, module: 'التقارير' },
    {
      name: 'الإشعارات',
      path: '/notifications',
      icon: <Bell className="w-5 h-5" />,
      module: 'الإشعارات',
      badge: unreadNotificationsCount > 0 ? (
        <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
          {unreadNotificationsCount}
        </span>
      ) : undefined
    },
    { name: 'سجل العمليات', path: '/audit-logs', icon: <History className="w-5 h-5" />, module: 'سجل العمليات' },
    { name: 'الإعدادات', path: '/settings', icon: <Settings className="w-5 h-5" />, module: 'الإعدادات' }
  ];

  const navItems = allNavItems.filter((item) => canAccessModule(item.module));

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-900 text-white border-l border-slate-800 transition-all duration-300 select-none z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md shrink-0">
              CF
            </div>
            <div className="text-right overflow-hidden">
              <h1 className="font-bold text-sm tracking-wide text-white truncate">CivicFlow</h1>
              <p className="text-[10px] text-slate-400 truncate">إدارة الصادر والوارد والمعاملات</p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md mx-auto">
            CF
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden xl:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={isCollapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
        >
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <div className="shrink-0 group-hover:scale-105 transition-transform">{item.icon}</div>
              {!isCollapsed && (
                <span className="flex-1 text-right truncate">{item.name}</span>
              )}
              {!isCollapsed && item.badge}
              {isCollapsed && item.badge && (
                <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-slate-900" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Public Tracking & Submission Quick Links */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <NavLink
          to="/submit-request"
          target="_blank"
          className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 hover:text-emerald-300 transition border border-emerald-800/40 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title="بوابة تقديم طلبات المراجعين (رابط عام للجمهور)"
        >
          <div className="flex items-center gap-2 truncate">
            <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && <span>بوابة تقديم طلب جديد</span>}
          </div>
          {!isCollapsed && <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />}
        </NavLink>

        <NavLink
          to="/track"
          target="_blank"
          className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-800 hover:text-blue-400 transition border border-slate-700/50 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title="بوابة استعلام المراجعين العامة (بدون تسجيل دخول)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-blue-400 shrink-0" />
            {!isCollapsed && <span>بوابة الاستعلام العام</span>}
          </div>
          {!isCollapsed && <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />}
        </NavLink>
      </div>
    </aside>
  );
};
