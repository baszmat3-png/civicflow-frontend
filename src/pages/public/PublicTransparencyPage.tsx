import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Building2,
  Star,
  Users,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  PieChart,
  Sparkles
} from 'lucide-react';
import { publicService, TransparencyStats } from '../../services/publicService';

export const PublicTransparencyPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransparencyStats | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await publicService.getTransparencyStats();
        setStats(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'تعذر تحميل بيانات الشفافية العامة');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-gray-500 font-semibold">جاري استخراج مؤشرات الأداء والشفافية العامة...</p>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          بوابة الشفافية والأداء البرلماني المفتوح
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          لوحة الشفافية ومؤشرات إنجاز معاملات المواطنين
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 max-w-2xl mx-auto">
          إحصائيات إجمالية محدثة مباشرة تعكس جهود خدمة المراجعين ونسب المتابعة والإنجاز مع كافة الوزارات والمؤسسات الرسمية بكل شفافية.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Requests */}
        <div className="p-4 rounded-3xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-sm text-center space-y-1.5">
          <div className="w-9 h-9 bg-blue-50 text-blue-600 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
            {stats?.totalRequests || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-500">إجمالي المعاملات</div>
        </div>

        {/* Completed This Month */}
        <div className="p-4 rounded-3xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-sm text-center space-y-1.5">
          <div className="w-9 h-9 bg-teal-50 text-teal-600 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-teal-600">
            {stats?.completedThisMonth || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-500">مُنجز هذا الشهر</div>
        </div>

        {/* Completed Total */}
        <div className="p-4 rounded-3xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-sm text-center space-y-1.5">
          <div className="w-9 h-9 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
            {stats?.completedTotal || 0}
          </div>
          <div className="text-[11px] font-bold text-slate-500">إجمالي المنجز</div>
        </div>

        {/* Completion Rate */}
        <div className="p-4 rounded-3xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-sm text-center space-y-1.5">
          <div className="w-9 h-9 bg-purple-50 text-purple-600 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-purple-600">
            %{stats?.completionRate || 100}
          </div>
          <div className="text-[11px] font-bold text-slate-500">نسبة الإنجاز</div>
        </div>

        {/* Citizen Satisfaction */}
        <div className="p-4 rounded-3xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-sm text-center space-y-1.5 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 bg-amber-50 text-amber-500 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <Star className="w-4 h-4 fill-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-500 flex items-center justify-center gap-1">
            <span>{stats?.citizenSatisfactionScore || 5.0}</span>
            <span className="text-xs text-slate-400 font-normal">/ 5</span>
          </div>
          <div className="text-[11px] font-bold text-slate-500">رضا المراجعين</div>
        </div>
      </div>

      {/* Ministry Breakdown Table */}
      <Card className="rounded-3xl border-slate-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="p-6 bg-slate-50 dark:bg-gray-750 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              مؤشرات المتابعة والإنجاز حسب الوزارة والجهة الحكومية
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">محدث تلقائياً</span>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/60 dark:bg-gray-800 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700">
                <tr>
                  <th className="p-4">الجهة الحكومية / الوزارة</th>
                  <th className="p-4 text-center">إجمالي المعاملات</th>
                  <th className="p-4 text-center">المعاملات المنجزة</th>
                  <th className="p-4 text-center">نسبة الإنجاز</th>
                  <th className="p-4 text-center">متوسط مدة المعالجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {(stats?.ministryStats || []).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-gray-750/50 transition">
                    <td className="p-4 font-bold text-slate-800 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {m.name}
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-slate-700 dark:text-gray-300">
                      {m.totalRequests}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-600">
                      {m.completedRequests}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, m.completionRate)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-gray-300">
                          %{m.completionRate}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-500">
                      {m.slaDays} أيام عمل
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Return to portal */}
      <div className="text-center pt-4">
        <Button variant="outline" onClick={() => navigate('/track')} icon={<ArrowRight className="w-4 h-4" />}>
          العودة إلى بوابة الاستعلام عن المعاملات
        </Button>
      </div>
    </div>
  );
};
