import React from 'react';
import { Outlet, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles } from 'lucide-react';
import { ThemeSwitcher } from '../components/common/ThemeSwitcher';

export const AuthLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" dir="rtl">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-xl shadow-blue-600/30 mb-4">
          CF
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">CivicFlow</h1>
        <p className="mt-1 text-sm text-slate-400 font-medium">نظام إدارة الصادر والوارد والمعاملات الإدارية</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          <Outlet />
        </div>

        {/* Public portal quick button */}
        <div className="mt-6 text-center">
          <Link
            to="/track"
            className="text-xs text-slate-400 hover:text-blue-400 transition inline-flex items-center gap-1.5"
          >
            <span>هل أنت مراجع وتريد متابعة طلبك؟</span>
            <span className="font-bold underline text-blue-400">بوابة الاستعلام العام</span>
          </Link>
        </div>
      </div>
      <ThemeSwitcher variant="floating" />
    </div>
  );
};
