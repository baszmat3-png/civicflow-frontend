import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { employeeService } from '../../services/employeeService';
import { ministryService } from '../../services/ministryService';
import { Employee, Ministry } from '../../types';
import {
  Users,
  Building2,
  Save,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  ShieldAlert,
  Sliders,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';

export const DistributionSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE_ONLY' | 'AUTO_ASSIGN_ONLY'>('ALL');

  // Local state for distribution configuration per employee
  // Map employeeId -> { assignedMinistries: string[], isAutoAssignEnabled: boolean }
  const [distributionMap, setDistributionMap] = useState<
    Record<string, { assignedMinistries: string[]; isAutoAssignEnabled: boolean }>
  >({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, minList] = await Promise.all([
        employeeService.getEmployees(),
        ministryService.getMinistries()
      ]);

      setEmployees(empList);
      setMinistries(minList);

      const initialMap: Record<string, { assignedMinistries: string[]; isAutoAssignEnabled: boolean }> = {};
      empList.forEach((emp) => {
        initialMap[emp.id] = {
          assignedMinistries: Array.isArray(emp.assignedMinistries) ? emp.assignedMinistries : [],
          isAutoAssignEnabled: typeof emp.isAutoAssignEnabled === 'boolean' ? emp.isAutoAssignEnabled : true
        };
      });
      setDistributionMap(initialMap);
    } catch (err: any) {
      console.error('Failed to load distribution data', err);
      toastError('تعذر جلب البيانات', 'حدث خطأ أثناء تحميل بيانات الموظفين والوزارات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAutoAssign = (empId: string) => {
    setDistributionMap((prev) => {
      const current = prev[empId] || { assignedMinistries: [], isAutoAssignEnabled: true };
      return {
        ...prev,
        [empId]: {
          ...current,
          isAutoAssignEnabled: !current.isAutoAssignEnabled
        }
      };
    });
  };

  const handleToggleMinistry = (empId: string, ministryName: string) => {
    setDistributionMap((prev) => {
      const current = prev[empId] || { assignedMinistries: [], isAutoAssignEnabled: true };
      const currentMins = current.assignedMinistries || [];
      const exists = currentMins.includes(ministryName);
      const updatedMins = exists
        ? currentMins.filter((m) => m !== ministryName)
        : [...currentMins, ministryName];

      return {
        ...prev,
        [empId]: {
          ...current,
          assignedMinistries: updatedMins
        }
      };
    });
  };

  const handleSelectAllMinistries = (empId: string) => {
    setDistributionMap((prev) => {
      const current = prev[empId] || { assignedMinistries: [], isAutoAssignEnabled: true };
      return {
        ...prev,
        [empId]: {
          ...current,
          assignedMinistries: ministries.map((m) => m.name)
        }
      };
    });
  };

  const handleClearAllMinistries = (empId: string) => {
    setDistributionMap((prev) => {
      const current = prev[empId] || { assignedMinistries: [], isAutoAssignEnabled: true };
      return {
        ...prev,
        [empId]: {
          ...current,
          assignedMinistries: []
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = Object.entries(distributionMap).map(([id, config]) => ({
        id,
        assignedMinistries: config.assignedMinistries,
        isAutoAssignEnabled: config.isAutoAssignEnabled
      }));

      await employeeService.saveDistributionSettings(payload);
      success('تم الحفظ بنجاح', 'تم تحديث قواعد توزيع المعاملات وتخصيص الوزارات للموظفين');
      loadData();
    } catch (err: any) {
      console.error('Failed to save distribution settings', err);
      toastError('فشل الحفظ', 'حدث خطأ أثناء حفظ إعدادات التوزيع');
    } finally {
      setSaving(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const currentConfig = distributionMap[emp.id] || {
      assignedMinistries: [],
      isAutoAssignEnabled: true
    };

    if (filterStatus === 'ACTIVE_ONLY') {
      return matchesSearch && emp.status === 'نشط';
    }
    if (filterStatus === 'AUTO_ASSIGN_ONLY') {
      return matchesSearch && currentConfig.isAutoAssignEnabled;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/settings')}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="العودة للإعدادات"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-6 h-6 text-brand-600" />
              إدارة التوزيع والإسناد التلقائي
            </h1>
          </div>
          <p className="text-xs text-slate-500 mr-7">
            تحديد الوزارات والجهات المخصصة لكل موظف والتحكم في استقبال المعاملات الجديدة وتوزيع أعباء العمل
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            تحديث
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            icon={<Save className="w-4 h-4" />}
            className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm font-bold"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ قواعد التوزيع'}
          </Button>
        </div>
      </div>

      {/* Info Card explaining logic */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4.5 text-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-blue-950">آلية الإسناد والتوزيع الذكي للمعاملات</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              عند إضافة معاملة جديدة (عبر النظام أو البوابة العامة)، يبحث النظام تلقائياً عن الموظفين المفعل لديهم <span className="font-semibold text-blue-800">الإسناد التلقائي</span> والمحدد لهم وزارة المعاملة. وفي حال تطابق أكثر من موظف، تُسند المعاملة للموظف صاحب <span className="font-semibold text-blue-800">العدد الأقل من المعاملات الجارية</span> لتحقيق التوازن العادل.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث باسم الموظف أو البريد أو القسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 font-medium"
          >
            <option value="ALL">جميع الموظفين ({employees.length})</option>
            <option value="ACTIVE_ONLY">الموظفون النشطون فقط</option>
            <option value="AUTO_ASSIGN_ONLY">المفعل لديهم الإسناد فقط</option>
          </select>
        </div>
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mb-3" />
          <p className="text-xs font-medium text-slate-500">جارٍ تحميل بيانات التوزيع والموظفين...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">لا يوجد موظفون مطابقون لبحثك</p>
          <p className="text-xs text-slate-400 mt-1">جرّب تغيير عبارة البحث أو الفلتر أعلاه</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEmployees.map((emp) => {
            const config = distributionMap[emp.id] || {
              assignedMinistries: [],
              isAutoAssignEnabled: true
            };
            const assignedCount = config.assignedMinistries.length;
            const isAllMinistries = assignedCount === 0 || assignedCount === ministries.length;

            return (
              <Card
                key={emp.id}
                className={`transition-all duration-200 ${
                  !config.isAutoAssignEnabled
                    ? 'border-slate-200 bg-slate-50/50 opacity-90'
                    : 'border-slate-200/90 hover:border-brand-300 shadow-sm'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Employee Identity */}
                    <div className="flex items-start gap-3.5 min-w-[280px]">
                      <div className="w-11 h-11 rounded-full bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-black text-sm shrink-0 shadow-inner">
                        {emp.avatarUrl ? (
                          <img
                            src={emp.avatarUrl}
                            alt={emp.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          emp.name.charAt(0)
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{emp.name}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              emp.status === 'نشط'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{emp.email}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1">
                          <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {emp.role || emp.department || 'موظف'}
                          </span>
                          <span className="text-slate-500">
                            المعاملات الجارية:{' '}
                            <strong className="text-slate-800 font-black">
                              {emp.assignedRequestsCount || 0}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Assign Switch & Ministry Config */}
                    <div className="flex-1 space-y-3.5 border-t lg:border-t-0 lg:border-r border-slate-200 lg:pr-5 pt-4 lg:pt-0">
                      {/* Auto-Assign toggle */}
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <div className="flex items-center gap-2">
                          {config.isAutoAssignEnabled ? (
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <UserX className="w-4 h-4 text-slate-400" />
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-800">
                              تضمين في الإسناد التلقائي
                            </span>
                            <p className="text-[10px] text-slate-500">
                              {config.isAutoAssignEnabled
                                ? 'يستقبل المعاملات الجديدة المسندة تلقائياً'
                                : 'معطل مؤقتاً (لن تصله معاملات تلقائية جديدة)'}
                            </p>
                          </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.isAutoAssignEnabled}
                            onChange={() => handleToggleAutoAssign(emp.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {/* Ministry chips */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            الوزارات والجهات الموكلة (
                            {assignedCount === 0 ? 'الكل - بدون تقييد' : `${assignedCount} محددة`}
                            ):
                          </label>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectAllMinistries(emp.id)}
                              className="text-[11px] text-brand-600 hover:text-brand-800 font-medium hover:underline"
                            >
                              تحديد الكل
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleClearAllMinistries(emp.id)}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-medium hover:underline"
                            >
                              مسح التحديد (عام)
                            </button>
                          </div>
                        </div>

                        {/* Chips container */}
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50/50 rounded-lg border border-slate-200/60">
                          {ministries.map((min) => {
                            const isSelected = config.assignedMinistries.includes(min.name);
                            return (
                              <button
                                key={min.id}
                                type="button"
                                onClick={() => handleToggleMinistry(emp.id, min.name)}
                                className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-brand-600 text-white shadow-xs font-bold'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50'
                                }`}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-3 h-3 text-white shrink-0" />
                                ) : (
                                  <Square className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                                <span>{min.name}</span>
                              </button>
                            );
                          })}
                        </div>
                        {assignedCount === 0 && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200/80">
                            * لم يتم حصر وزارات معينة، مما يعني أن الموظف يمكن أن تسند له معاملات من <strong>أي وزارة</strong>.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Save Button Bar on Bottom */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur border border-slate-200 p-4 rounded-xl shadow-lg flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تأكد من الضغط على زر الحفظ لتطبيق التغييرات على محرك الإسناد الفوري</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || loading}
          icon={<Save className="w-4 h-4" />}
          className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm font-bold px-6"
        >
          {saving ? 'جارٍ الحفظ...' : 'حفظ قواعد التوزيع'}
        </Button>
      </div>
    </div>
  );
};
export default DistributionSettingsPage;
