import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Search,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Clock,
  CheckCheck,
  Menu,
  ExternalLink
} from 'lucide-react';
import { GlobalSearchModal } from './GlobalSearchModal';
import { ThemeSwitcher } from './ThemeSwitcher';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadNotificationsCount, handleMarkAllNotificationsRead, employees } = useData();
  const { canManageSettings } = usePermissions();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute Breadcrumbs title
  const getPageMeta = () => {
    const p = location.pathname;
    if (p === '/dashboard') return { title: 'لوحة التحكم والمتابعة', subtitle: 'نظرة عامة على سير المعاملات ومؤشرات الأداء' };
    if (p === '/requests') return { title: 'الطلبات والمعاملات', subtitle: 'إدارة وتتبع كافة المعاملات الصادرة والواردة' };
    if (p === '/requests/new') return { title: 'إضافة معاملة جديدة', subtitle: 'تسجيل معاملة جديدة وتعيين جهة المتابعة' };
    if (p.startsWith('/requests/') && p.endsWith('/edit')) return { title: 'تعديل المعاملة', subtitle: 'تحديث بيانات وملحقات الطلب' };
    if (p.startsWith('/requests/')) return { title: 'تفاصيل المعاملة', subtitle: 'متابعة سجل الإجراءات والتحديثات الزمنية' };
    if (p === '/customers') return { title: 'سجل المراجعين', subtitle: 'قاعدة بيانات المراجعين وسجل معاملاتهم' };
    if (p === '/customers/new') return { title: 'إضافة مراجع جديد', subtitle: 'تسجيل مراجع في قاعدة البيانات' };
    if (p.startsWith('/customers/')) return { title: 'الملف الشخصي للمراجع', subtitle: 'بيانات المراجع وجميع طلباته المرتبطة' };
    if (p === '/ministries') return { title: 'الوزارات والجهات الحكومية', subtitle: 'إدارة الجهات الشريكة ومحددات SLA' };
    if (p === '/ministries/new') return { title: 'إضافة جهة حكومية', subtitle: 'تعريف وزارة أو جهة مع مدة الإنجاز المحددة' };
    if (p.startsWith('/ministries/')) return { title: 'بيانات الجهة الحكومية', subtitle: 'متابعة المعاملات ومؤشرات إنجاز الجهة' };
    if (p === '/employees') return { title: 'الموظفون والمستخدمون', subtitle: 'إدارة فريق العمل وتوزيع المهام' };
    if (p === '/employees/new') return { title: 'إضافة موظف جديد', subtitle: 'إنشاء حساب موظف وتحديد دوره الإداري' };
    if (p.startsWith('/employees/')) return { title: 'ملف الموظف', subtitle: 'بيانات الموظف والمعاملات المسندة إليه' };
    if (p === '/roles' || p.startsWith('/roles/')) return { title: 'الأدوار والصلاحيات', subtitle: 'مصفوفة الصلاحيات والتحكم بالأمان' };
    if (p === '/reports' || p.startsWith('/reports/')) return { title: 'التقارير والإحصائيات', subtitle: 'تحليلات تفصيلية وتصدير البيانات' };
    if (p === '/notifications' || p.startsWith('/notifications/')) return { title: 'مركز الإشعارات', subtitle: 'تنبيهات النظام ومستجدات المعاملات' };
    if (p === '/audit-logs') return { title: 'سجل العمليات والرقابة', subtitle: 'تتبع كافة التعديلات والأنشطة الإدارية' };
    if (p.startsWith('/settings')) return { title: 'إعدادات النظام', subtitle: 'تهيئة الحالات، محددات SLA، وقوالب WhatsApp' };
    if (p === '/profile') return { title: 'الملف الشخصي', subtitle: 'بيانات الحساب وتغيير كلمة المرور' };
    return { title: 'نظام إدارة المعاملات', subtitle: 'CivicFlow' };
  };

  const pageMeta = getPageMeta();

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs select-none">
        {/* Mobile menu trigger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-tight">
              {pageMeta.title}
            </h2>
            <p className="hidden md:block text-xs text-slate-400 font-medium">{pageMeta.subtitle}</p>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-medium transition cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">بحث سريع...</span>
            <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded shadow-xs">
              Ctrl+K
            </kbd>
          </button>

          <ThemeSwitcher />

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition"
              title="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute left-0 sm:right-auto mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-right animate-in fade-in duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-800">الإشعارات</h4>
                    {unreadNotificationsCount > 0 && (
                      <span className="text-[11px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                        {unreadNotificationsCount} جديد
                      </span>
                    )}
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      قراءة الكل
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setIsNotifOpen(false);
                        if (notif.link) navigate(notif.link);
                        else navigate('/notifications');
                      }}
                      className={`p-3.5 hover:bg-slate-50 transition cursor-pointer ${
                        !notif.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {notif.timeAgo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-2 border-t border-slate-100 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-bold text-blue-600 hover:underline inline-block py-1"
                  >
                    عرض كل الإشعارات
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'أحمد علي'}</p>
                <p className="text-[10px] text-slate-500">{user?.role || 'مدير النظام'}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-right animate-in fade-in duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="font-bold text-sm text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {user?.role}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    الملف الشخصي
                  </Link>
                  {canManageSettings && (
                    <Link
                      to="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Shield className="w-4 h-4 text-slate-400" />
                      إعدادات المنظومة
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
