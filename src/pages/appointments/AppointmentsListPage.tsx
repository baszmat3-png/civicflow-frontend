import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  User,
  Phone,
  Building2,
  UserCheck,
  Filter,
  Check,
  X,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { appointmentService, AppointmentItem } from '../../services/appointmentService';

export const AppointmentsListPage: React.FC = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [targetPersonFilter, setTargetPersonFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Status Action Modal State
  const [activeAppointment, setActiveAppointment] = useState<AppointmentItem | null>(null);
  const [actionType, setActionType] = useState<'CONFIRMED' | 'REJECTED' | 'COMPLETED' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await appointmentService.getAppointments({
        status: statusFilter,
        targetPerson: targetPersonFilter,
        search,
        date: dateFilter
      });
      setAppointments(data);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, targetPersonFilter, dateFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments();
  };

  const handleUpdateStatus = async () => {
    if (!activeAppointment || !actionType) return;
    try {
      setUpdating(true);
      await appointmentService.updateStatus(activeAppointment.id, {
        status: actionType,
        adminNotes: adminNotes.trim() || undefined
      });
      setActiveAppointment(null);
      setActionType(null);
      setAdminNotes('');
      fetchAppointments();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة الموعد');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> مؤكد ومقبول
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            <XCircle className="w-3.5 h-3.5" /> معتذر عنه
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
            <Check className="w-3.5 h-3.5" /> تمت المقابلة
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <Clock3 className="w-3.5 h-3.5" /> بانتظار المراجعة
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            جدول حجوزات ومواعيد المراجعين
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة طلبات المواعيد لمقابلة النائب أو مدير المكتب، مع إرسال إشعارات واتساب تلقائية للمراجعين.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-2xl border-slate-200 dark:border-gray-700 shadow-xs">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الموعد أو اسم المراجع أو الهاتف..."
                className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Target Person */}
            <select
              value={targetPersonFilter}
              onChange={(e) => setTargetPersonFilter(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
            >
              <option value="ALL">كل الشخصيات (النائب ومدير المكتب)</option>
              <option value="DEPUTY">سعادة النائب</option>
              <option value="OFFICE_DIRECTOR">مدير المكتب</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="PENDING">بانتظار المراجعة</option>
              <option value="CONFIRMED">مؤكد ومقبول</option>
              <option value="REJECTED">معتذر عنه</option>
              <option value="COMPLETED">تمت المقابلة</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
            />
          </form>
        </CardContent>
      </Card>

      {/* Appointments List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">جاري تحميل قائمة المواعيد...</div>
      ) : appointments.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700">
          لا توجد مواعيد مسجلة تطابق خيارات البحث الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt) => {
            const dateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
            const isDeputy = apt.targetPerson === 'DEPUTY';

            return (
              <Card
                key={apt.id}
                className="rounded-3xl border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                          #{apt.appointmentNumber}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isDeputy
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          }`}
                        >
                          {isDeputy ? 'مقابلة النائب' : 'مدير المكتب'}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        {apt.customerName}
                      </h3>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>

                  {/* Date & Time Slot */}
                  <div className="p-3 bg-slate-50 dark:bg-gray-750 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 font-mono font-bold">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {dateStr}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 font-mono font-bold">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      {apt.timeSlot}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {apt.customerPhone}
                    </span>
                  </div>

                  {/* Purpose */}
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-500">موضوع المقابلة:</span>
                    <p className="text-slate-800 dark:text-gray-200 leading-relaxed font-medium bg-slate-50/50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-gray-800">
                      {apt.purpose}
                    </p>
                  </div>

                  {/* Admin Notes if any */}
                  {apt.adminNotes && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                      <strong>ملاحظة الإدارة:</strong> {apt.adminNotes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-gray-750">
                    {apt.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setActiveAppointment(apt);
                            setActionType('CONFIRMED');
                          }}
                          icon={<Check className="w-3.5 h-3.5" />}
                        >
                          موافقة وتأكيد
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => {
                            setActiveAppointment(apt);
                            setActionType('REJECTED');
                          }}
                          icon={<X className="w-3.5 h-3.5" />}
                        >
                          اعتذار
                        </Button>
                      </>
                    )}

                    {apt.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs text-blue-700 bg-blue-50 hover:bg-blue-100"
                        onClick={() => {
                          setActiveAppointment(apt);
                          setActionType('COMPLETED');
                        }}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        تسجيل إتمام المقابلة
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Modal */}
      {activeAppointment && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              {actionType === 'CONFIRMED' && 'تأكيد واعتماد الموعد'}
              {actionType === 'REJECTED' && 'الاعتذار عن الموعد'}
              {actionType === 'COMPLETED' && 'تسجيل إتمام المقابلة'}
            </h3>

            <p className="text-xs text-slate-500">
              موعد المراجع: <strong>{activeAppointment.customerName}</strong> ({activeAppointment.appointmentNumber})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                ملاحظات أو توجيهات (تُرسل للمراجع عبر واتساب):
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  actionType === 'CONFIRMED'
                    ? 'مثال: يرجى إحضار المستمسكات الأصلية للحالة...'
                    : 'مثال: نعتذر لعدم تواجد النائب في هذا التاريخ...'
                }
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className={`w-full ${actionType === 'REJECTED' ? 'bg-rose-600 hover:bg-rose-700' : ''}`}
                onClick={handleUpdateStatus}
                isLoading={updating}
              >
                تأكيد العملية
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveAppointment(null);
                  setActionType(null);
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
