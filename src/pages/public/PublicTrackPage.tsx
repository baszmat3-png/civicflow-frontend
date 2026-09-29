import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  Search,
  ShieldCheck,
  Clock,
  FileCheck,
  ArrowLeft,
  Sparkles,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Building2,
  Users,
  ChevronLeft
} from 'lucide-react';
import { publicService, TransparencyStats } from '../../services/publicService';

export const PublicTrackPage: React.FC = () => {
  const navigate = useNavigate();
  const [requestNumber, setRequestNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<TransparencyStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const data = await publicService.getTransparencyStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load transparency stats on track page', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestNumber.trim()) return;

    const cleanNum = requestNumber.trim().toUpperCase().replace('#', '');
    navigate(`/track/${cleanNum}`);
  };

  return (
    <div className="space-y-8 py-8" dir="rtl">
      {/* Hero Box */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          البوابة الرسمية للاستعلام ومتابعة المعاملات
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          الاستعلام عن حالة الطلب والمعاملة
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          أدخل رقم المعاملة، أو رقم هاتف واتساب، أو رقم الهوية / البطاقة الموحدة، أو اسم المراجع لمعرفة المرحلة الحالية والاطلاع على القرارات والمستندات الصادرة
        </p>
      </div>

      {/* Main Search Input Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              رقم المعاملة / رقم هاتف واتساب / رقم الهوية / الاسم
            </label>
            <div className="relative">
              <input
                type="text"
                value={requestNumber}
                onChange={(e) => {
                  setRequestNumber(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="أدخل رقم الطلب (REQ-1025) أو رقم الهاتف (077********) أو الهوية أو الاسم..."
                className="w-full text-base sm:text-lg px-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
              />
            </div>
            {errorMsg && <p className="mt-1 text-xs text-rose-600 font-bold">{errorMsg}</p>}
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full py-4 text-base rounded-2xl shadow-lg shadow-blue-600/30">
            <Search className="w-5 h-5 ml-2" />
            استعلام عن المعاملة
          </Button>
        </form>

        {/* Submit Request CTA Banner */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between gap-4">
          <div className="space-y-0.5 text-right">
            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              هل تريد تقديم معاملة جديدة؟
            </h4>
            <p className="text-[11px] text-blue-700/90">
              يمكنك رفع طلبك مباشرة وإرفاق صورة الهوية والمستندات إلكترونياً
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/submit-request')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shrink-0 transition"
          >
            تقديم طلب الآن
          </button>
        </div>
      </div>

      {/* Live Anonymous Transparency Summary Bar (إحصائيات الشفافية العامة مجهولة الهوية) */}
      {stats && (
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  مؤشرات الإنجاز والشفافية العامة
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-semibold border border-emerald-400/30">
                    أرقام مجهولة الهوية
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  إحصائيات إجمالية مباشرة تعكس سرعة الإنجاز بدون الكشف عن أي بيانات شخصية
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/transparency')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition shrink-0"
            >
              <span>تقرير الشفافية الكامل</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-center">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {stats.completedThisMonth}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">مُنجز هذا الشهر</div>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-400">
                {stats.completedTotal}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">إجمالي المعاملات المنجزة</div>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                {stats.averageSlaDays > 0 ? `${stats.averageSlaDays} يوم` : 'أقل من يوم'}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">متوسط زمن الإنجاز</div>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-xl sm:text-2xl font-black font-mono text-teal-300">
                {stats.completionRate}%
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">نسبة الإنجاز الكلية</div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2 text-center">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-slate-800">متابعة فورية على مدار الساعة</h4>
          <p className="text-xs text-slate-500 mt-1">تحديثات مستمرة لحالة طلبك لحظة بلحظة</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <FileCheck className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-slate-800">تحميل الوثائق المعتمدة</h4>
          <p className="text-xs text-slate-500 mt-1">الاطلاع على القرارات الصادرة فور اعتمادها</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <ShieldCheck className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-slate-800">خصوصية وأمان تام</h4>
          <p className="text-xs text-slate-500 mt-1">حماية تامة لبيانات وسجلات المراجعين</p>
        </div>
      </div>

      {/* Bottom CTA Banner (لوحة المراجعين والشفافية العامة) */}
      <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 text-right">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">لوحة الشفافية وإحصائيات الجهات الحكومية</h4>
            <p className="text-xs text-emerald-800/80">
              شاهد تفاصيل إنجاز كل وزارة وجهة، ومتوسط سرعة الإجراءات ومعدلات رضا المواطنين
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/transparency')}
          className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 shrink-0 transition flex items-center gap-1.5"
        >
          <span>عرض لوحة الشفافية</span>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
export default PublicTrackPage;
