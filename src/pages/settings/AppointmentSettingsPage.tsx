import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Calendar,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck,
  Settings,
  Plus,
  ArrowRight
} from 'lucide-react';
import { appointmentService, AppointmentScheduleItem } from '../../services/appointmentService';

const DAYS = [
  { dayOfWeek: 0, dayName: 'الأحد' },
  { dayOfWeek: 1, dayName: 'الإثنين' },
  { dayOfWeek: 2, dayName: 'الثلاثاء' },
  { dayOfWeek: 3, dayName: 'الأربعاء' },
  { dayOfWeek: 4, dayName: 'الخميس' },
  { dayOfWeek: 5, dayName: 'الجمعة' },
  { dayOfWeek: 6, dayName: 'السبت' }
];

export const AppointmentSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [targetPerson, setTargetPerson] = useState<'DEPUTY' | 'OFFICE_DIRECTOR'>('DEPUTY');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [schedules, setSchedules] = useState<AppointmentScheduleItem[]>([]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await appointmentService.getSchedules(targetPerson);

      // Ensure all 7 days exist
      const fullWeek = DAYS.map((d) => {
        const found = data.find((item) => item.dayOfWeek === d.dayOfWeek);
        if (found) return found;
        return {
          id: `temp-${d.dayOfWeek}`,
          targetPerson,
          dayOfWeek: d.dayOfWeek,
          dayName: d.dayName,
          isWorkingDay: d.dayOfWeek < 5, // Sun-Thu working by default
          startTime: '09:00',
          endTime: '14:00',
          slotDurationMinutes: 30,
          maxPerSlot: 1
        };
      });

      setSchedules(fullWeek);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحميل إعدادات المواعيد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [targetPerson]);

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, isWorkingDay: !s.isWorkingDay } : s))
    );
  };

  const handleFieldChange = (dayOfWeek: number, field: keyof AppointmentScheduleItem, value: any) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg('');
      setSavedSuccess(false);
      await appointmentService.saveSchedules(targetPerson, schedules);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            إعدادات أوقات وجدول المقابلات
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تحديد الأيام وساعات التواجد ومدة كل مقابلة لتنظيم تقويم الحجوزات الإلكترونية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة للإعدادات
          </Button>

          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={saving}
            icon={<Save className="w-4 h-4" />}
          >
            حفظ التعديلات
          </Button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>تم حفظ وتحديث جدول أوقات المقابلات بنجاح.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Target Person Selector */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <button
          type="button"
          onClick={() => setTargetPerson('DEPUTY')}
          className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
            targetPerson === 'DEPUTY'
              ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          جدول مواعيد سعادة النائب
        </button>

        <button
          type="button"
          onClick={() => setTargetPerson('OFFICE_DIRECTOR')}
          className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition ${
            targetPerson === 'OFFICE_DIRECTOR'
              ? 'border-purple-600 bg-purple-50/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
              : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600'
          }`}
        >
          <Building2 className="w-4 h-4" />
          جدول مواعيد مدير المكتب
        </button>
      </div>

      {/* Days Settings Card */}
      <Card className="rounded-3xl border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-gray-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            أيام وساعات العمل المتاحة للحجز:
          </h3>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">جاري تحميل الجدول...</div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div
                  key={s.dayOfWeek}
                  className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    s.isWorkingDay
                      ? 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700'
                      : 'bg-slate-50 dark:bg-gray-850 border-slate-100 dark:border-gray-800 opacity-60'
                  }`}
                >
                  {/* Day Toggle */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <input
                      type="checkbox"
                      id={`day-${s.dayOfWeek}`}
                      checked={s.isWorkingDay}
                      onChange={() => handleToggleDay(s.dayOfWeek)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label
                      htmlFor={`day-${s.dayOfWeek}`}
                      className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer select-none"
                    >
                      {s.dayName}
                    </label>
                  </div>

                  {/* Time Config (if working) */}
                  {s.isWorkingDay ? (
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">من الساعة:</span>
                        <input
                          type="time"
                          value={s.startTime}
                          onChange={(e) => handleFieldChange(s.dayOfWeek, 'startTime', e.target.value)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono text-xs focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">إلى الساعة:</span>
                        <input
                          type="time"
                          value={s.endTime}
                          onChange={(e) => handleFieldChange(s.dayOfWeek, 'endTime', e.target.value)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono text-xs focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">مدة الموعد:</span>
                        <select
                          value={s.slotDurationMinutes}
                          onChange={(e) =>
                            handleFieldChange(s.dayOfWeek, 'slotDurationMinutes', Number(e.target.value))
                          }
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-xs focus:outline-none"
                        >
                          <option value={15}>15 دقيقة</option>
                          <option value={20}>20 دقيقة</option>
                          <option value={30}>30 دقيقة</option>
                          <option value={45}>45 دقيقة</option>
                          <option value={60}>60 دقيقة</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">الحد الأقصى/موعد:</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={s.maxPerSlot}
                          onChange={(e) =>
                            handleFieldChange(s.dayOfWeek, 'maxPerSlot', Number(e.target.value))
                          }
                          className="w-14 p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono text-xs text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">يوم عطلة / لا تتوفر مواعيد</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
