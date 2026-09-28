import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building2,
  CalendarDays
} from 'lucide-react';
import { publicService, AppointmentSlotItem } from '../../services/publicService';

export const PublicAppointmentPage: React.FC = () => {
  const navigate = useNavigate();

  const [targetPerson, setTargetPerson] = useState<'DEPUTY' | 'OFFICE_DIRECTOR'>('DEPUTY');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableDates, setAvailableDates] = useState<AppointmentSlotItem[]>([]);
  const [personTitle, setPersonTitle] = useState('سعادة النائب');

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNationalId, setCustomerNationalId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setErrorMsg('');
        const res = await publicService.getAppointmentSlots(targetPerson);
        setAvailableDates(res.availableDates || []);
        setPersonTitle(res.targetPersonTitle || (targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب'));
        if (res.availableDates && res.availableDates.length > 0) {
          setSelectedDate(res.availableDates[0].date);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'تعذر تحميل المواعيد المتاحة');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [targetPerson]);

  const activeDateSlots = availableDates.find((d) => d.date === selectedDate)?.slots || [];

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !selectedDate || !selectedSlot || !purpose) {
      setErrorMsg('يرجى ملء كافة الحقول الإلزامية واختيار الموعد');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await publicService.bookAppointment({
        customerName,
        customerPhone,
        customerNationalId: customerNationalId || undefined,
        targetPerson,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        purpose,
        notes: notes || undefined
      });
      setBookingResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرسال طلب الموعد');
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingResult) {
    return (
      <div className="py-12 max-w-lg mx-auto" dir="rtl">
        <Card className="border-emerald-200 dark:border-emerald-900 shadow-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
              #{bookingResult.appointmentNumber}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">تم استلام طلب الموعد بنجاح</h2>
            <p className="text-xs text-slate-500">
              سيقوم فريق السكرتارية بمراجعة طلبك وإرسال رسالة تأكيد رسمية إلى هاتفك عبر واتساب.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 text-xs space-y-2.5 text-right">
            <div className="flex justify-between">
              <span className="text-slate-500">صاحب الموعد:</span>
              <span className="font-bold text-slate-800 dark:text-white">{bookingResult.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الجهة المطلوب مقابلتها:</span>
              <span className="font-bold text-blue-600">{personTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">التاريخ المحدد:</span>
              <span className="font-bold text-slate-800 dark:text-white font-mono">{selectedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الوقت:</span>
              <span className="font-bold text-slate-800 dark:text-white font-mono">{bookingResult.timeSlot}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setBookingResult(null);
                setCustomerName('');
                setCustomerPhone('');
                setPurpose('');
                setSelectedSlot('');
              }}
            >
              حجز موعد آخر
            </Button>
            <Button variant="outline" onClick={() => navigate('/track')}>
              العودة لبوابة المراجعين
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-3xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
          <CalendarDays className="w-4 h-4" />
          بوابة الحجز الإلكتروني للمقابلات
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          حجز موعد لمقابلة النائب أو مدير المكتب
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 max-w-xl mx-auto">
          اختر الشخصية المطلوب مقابلتها والموعد المناسب لجدولة حضوركم في مقر المكتب دون انتظار عشوائي.
        </p>
      </div>

      {/* Target Person Toggle */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            setTargetPerson('DEPUTY');
            setSelectedSlot('');
          }}
          className={`p-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2.5 transition ${
            targetPerson === 'DEPUTY'
              ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shadow-md'
              : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 hover:border-slate-300'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          مقابلة النائب
        </button>

        <button
          type="button"
          onClick={() => {
            setTargetPerson('OFFICE_DIRECTOR');
            setSelectedSlot('');
          }}
          className={`p-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2.5 transition ${
            targetPerson === 'OFFICE_DIRECTOR'
              ? 'border-purple-600 bg-purple-50/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 shadow-md'
              : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-5 h-5" />
          مقابلة مدير المكتب
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Booking Form */}
      <form onSubmit={handleBook} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-xl space-y-6">
        {/* Date Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 mb-2.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            1. اختر تاريخ اليوم المتاح للمقابلة:
          </label>

          {loadingSlots ? (
            <div className="py-6 text-center text-xs text-slate-400">جاري تحميل الأيام المتاحة...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {availableDates.map((item) => {
                const isSelected = selectedDate === item.date;
                return (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.date);
                      setSelectedSlot('');
                    }}
                    className={`p-3 rounded-2xl border text-center transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-slate-700 dark:text-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.dayName}</div>
                    <div className="text-[11px] font-mono opacity-90 mt-0.5">{item.date}</div>
                    <div className="text-[10px] mt-1 opacity-75">{item.slots.length} أوقات</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Slot Selector */}
        {selectedDate && (
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 mb-2.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              2. اختر توقيت الموعد:
            </label>

            {activeDateSlots.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد أوقات متوفرة في هذا اليوم.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {activeDateSlots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl border text-xs font-mono font-bold transition ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                          : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Citizen Info */}
        <div className="pt-4 border-t border-slate-100 dark:border-gray-700 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-600" />
            3. بيانات المراجع وموضوع المقابلة:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                اسم المراجع الثلاثي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="الاسم الكامل كما في الهوية"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                رقم الهاتف (واتساب) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="077XXXXXXXX"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              موضوع وغرض المقابلة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="مثال: طلب متابعة كتاب صادر لدى وزارة الصحة بخصوص..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              ملاحظات أو تفاصيل إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل أخرى تود توضيحها مسبقاً..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-3.5 text-sm font-bold shadow-lg shadow-blue-500/20"
          isLoading={submitting}
          disabled={!selectedSlot || !customerName || !customerPhone || !purpose}
          icon={<CheckCircle2 className="w-4 h-4" />}
        >
          تأكيد وإرسال طلب حجز الموعد
        </Button>
      </form>
    </div>
  );
};
