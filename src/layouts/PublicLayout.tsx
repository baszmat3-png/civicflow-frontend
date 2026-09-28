import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, LogIn, Search, PhoneCall } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Public Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/track" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              CF
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">بوابة استعلام المعاملات</h1>
              <p className="text-[11px] text-slate-500">نظام المتابعة الإدارية الموحد CivicFlow</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/track"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>استعلام</span>
            </Link>

            <Link
              to="/appointments/book"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition"
            >
              <span>حجز موعد</span>
            </Link>

            <Link
              to="/transparency"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition"
            >
              <span>لوحة الشفافية</span>
            </Link>

            <Link
              to="/submit-request"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
            >
              <span>تقديم طلب جديد</span>
            </Link>

            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">دخول الموظفين</span>
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
            <span>بوابة رسمية آمنة للاستعلام ومتابعة المعاملات الحكومية والإدارية</span>
          </div>
          <div>
            <span>جميع الحقوق محفوظة &copy; 2026 CivicFlow Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
