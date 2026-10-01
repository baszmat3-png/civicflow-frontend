import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn, Search, Calendar, PlusCircle, BarChart3 } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const location = useLocation();

  const isTrackActive = location.pathname.startsWith('/track');
  const isBookActive = location.pathname.startsWith('/appointments/book');
  const isSubmitActive = location.pathname.startsWith('/submit-request') || location.pathname.startsWith('/public/submit-request');
  const isTransparencyActive = location.pathname.startsWith('/transparency');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Public Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-20 flex items-center justify-between gap-2">
          {/* Logo & Platform Name */}
          <Link to="/track" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              CF
            </div>
            <div className="hidden xs:block">
              <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">بوابة استعلام المعاملات</h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500">نظام المتابعة الإدارية الموحد CivicFlow</p>
            </div>
          </Link>

          {/* Navigation Action Badges / Buttons (Red for Search, Green for Booking, Blue for New Request) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto custom-scrollbar-x py-1">
            {/* 1. المربع الأحمر: الاستعلام والبحث */}
            <Link
              to="/track"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition shadow-sm shrink-0 ${
                isTrackActive
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-300'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>استعلام</span>
            </Link>

            {/* 2. المربع الأخضر: حجز موعد */}
            <Link
              to="/appointments/book"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition shadow-sm shrink-0 ${
                isBookActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>حجز موعد</span>
            </Link>

            {/* 3. المربع الأزرق: تقديم طلب جديد */}
            <Link
              to="/submit-request"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition shadow-sm shrink-0 ${
                isSubmitActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>تقديم طلب جديد</span>
            </Link>

            {/* 4. لوحة الشفافية (مجهولة الهوية) */}
            <Link
              to="/transparency"
              className={`hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition shrink-0 ${
                isTransparencyActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>لوحة الشفافية</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Public Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>بوابة رسمية آمنة للاستعلام ومتابعة المعاملات وحجز المواعيد</span>
          </div>
          <div className="flex items-center gap-4">
            <span>جميع الحقوق محفوظة &copy; 2026 CivicFlow Platform</span>
            <Link
              to="/login"
              className="text-slate-400 hover:text-blue-600 flex items-center gap-1 transition"
            >
              <LogIn className="w-3 h-3" />
              <span>دخول الموظفين</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
