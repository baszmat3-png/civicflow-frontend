import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  Bell,
  Menu,
  Building2,
  UserCheck,
  BarChart3,
  History,
  Settings,
  Search,
  X,
  ExternalLink,
  Flame,
  User,
  Calendar,
  Send,
  Inbox
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { unreadNotificationsCount, overdueRequestsCount } = useData();
  const { canAccessModule } = usePermissions();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const allMainTabs = [
    { name: 'الرئيسية', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, module: 'الرئيسية' },
    {
      name: 'الطلبات',
      path: '/requests',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      module: 'الطلبات',
      badge: overdueRequestsCount > 0 ? overdueRequestsCount : undefined
    },
    { name: 'المراجعون', path: '/customers', icon: <Users className="w-5 h-5" />, module: 'المراجعون' },
    {
      name: 'الإشعارات',
      path: '/notifications',
      icon: <Bell className="w-5 h-5" />,
      module: 'الإشعارات',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    }
  ];

  const mainTabs = allMainTabs.filter((tab) => canAccessModule(tab.module));

  const allMoreLinks = [
    { name: 'المواعيد والمقابلات', path: '/appointments', icon: <Calendar className="w-5 h-5" />, module: 'إدارة المواعيد' },
    { name: 'سجل الصادر', path: '/registry/outgoing', icon: <Send className="w-5 h-5" />, module: 'الصادر والوارد' },
    { name: 'سجل الوارد', path: '/registry/incoming', icon: <Inbox className="w-5 h-5" />, module: 'الصادر والوارد' },
    { name: 'الوزارات والجهات', path: '/ministries', icon: <Building2 className="w-5 h-5" />, module: 'الوزارات' },
    { name: 'الموظفون', path: '/employees', icon: <UserCheck className="w-5 h-5" />, module: 'الموظفون' },
    { name: 'التقارير والإحصائيات', path: '/reports', icon: <BarChart3 className="w-5 h-5" />, module: 'التقارير' },
    { name: 'سجل العمليات والرقابة', path: '/audit-logs', icon: <History className="w-5 h-5" />, module: 'سجل العمليات' },
    { name: 'إعدادات المنظومة', path: '/settings', icon: <Settings className="w-5 h-5" />, module: 'الإعدادات' },
    { name: 'الملف الشخصي', path: '/profile', icon: <User className="w-5 h-5" />, module: 'dashboard' },
    { name: 'بوابة الاستعلام العام للمراجعين', path: '/track', icon: <Search className="w-5 h-5" />, external: true, module: 'dashboard' }
  ];

  const moreLinks = allMoreLinks.filter((link) => canAccessModule(link.module));

  return (
    <>
      {/* Bottom Sticky Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 shadow-lg select-none">
        <div className="flex items-center justify-around">
          {mainTabs.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              (tab.path !== '/dashboard' && location.pathname.startsWith(tab.path));

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition relative ${
                  isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {tab.badge && (
                    <span className="absolute -top-1.5 -left-2 bg-rose-500 text-white text-[10px] font-bold px-1 rounded-full min-w-4 text-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1">{tab.name}</span>
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-slate-500 hover:text-slate-800 transition ${
              isDrawerOpen ? 'text-blue-600 font-bold' : ''
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] mt-1">المزيد</span>
          </button>
        </div>
      </nav>

      {/* Drawer Dialog for "المزيد" */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-10 max-h-[80vh] overflow-y-auto border-t border-slate-200 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  CF
                </div>
                <h3 className="font-bold text-base text-slate-900">جميع الوحدات الإدارية</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {moreLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  target={item.external ? '_blank' : undefined}
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition font-medium text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.external && <ExternalLink className="w-4 h-4 text-slate-400" />}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
