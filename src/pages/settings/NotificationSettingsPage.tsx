import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Bell, Save, ArrowRight, ShieldCheck, Flame, MessageSquare } from 'lucide-react';

export const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, handleUpdateSettings } = useData();
  const { success, error } = useToast();

  const [prefs, setPrefs] = useState({
    enableInApp: true,
    enableOverdueAlerts: true,
    enableStatusAlerts: true,
    enableWhatsApp: true,
    autoNotifyCustomerOnStatusChange: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings?.notificationPreferences) {
      setPrefs(settings.notificationPreferences);
    }
  }, [settings]);

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsLoading(true);
    try {
      await handleUpdateSettings({ notificationPreferences: prefs });
      success('تم حفظ تفضيلات الإشعارات');
    } catch (err) {
      error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة للإعدادات
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات الإشعارات والتنبيهات</h1>
            <p className="text-xs text-slate-500 mt-0.5">التحكم في قنوات الإشعار وأوقات التنبيه التلقائي</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          isLoading={isLoading}
          icon={<Save className="w-4 h-4" />}
        >
          حفظ التفضيلات
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">تفضيلات الإرسال والتنبيهات الحية</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onClick={() => togglePref('enableInApp')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-sm text-slate-900">إشعارات النظام الداخلية (In-App)</p>
              <p className="text-xs text-slate-500 mt-0.5">إظهار الإشعارات الحية في جرس التنبيهات بالمنظومة</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.enableInApp}
              onChange={() => {}}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>

          <div
            onClick={() => togglePref('enableOverdueAlerts')}
            className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 hover:border-rose-300 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 mt-0.5">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm text-rose-950">تنبيهات تجاوز مدد الإنجاز (Overdue SLA)</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  إرسال إشعار فوري وتصعيد المعاملة عند تجاوز المدة الزمنية المحددة للوزارة
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.enableOverdueAlerts}
              onChange={() => {}}
              className="w-5 h-5 text-rose-600 rounded"
            />
          </div>

          <div
            onClick={() => togglePref('enableStatusAlerts')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-sm text-slate-900">تنبيهات تغيير حالة المعاملات</p>
              <p className="text-xs text-slate-500 mt-0.5">إشعار الموظفين المعنيين عند تحديث مراحل المعاملة</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.enableStatusAlerts}
              onChange={() => {}}
              className="w-5 h-5 text-blue-600 rounded"
            />
          </div>

          <div
            onClick={() => togglePref('enableWhatsApp')}
            className="p-4 rounded-xl border border-teal-200 bg-teal-50/20 hover:border-teal-300 transition cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-700 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm text-teal-950">تفعيل إشعارات WhatsApp التلقائية</p>
                <p className="text-xs text-teal-700 mt-0.5">إرسال رسائل التحديثات المباشرة إلى هواتف المراجعين عند التقديم وتغيير الحالة والقرار النهائي</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.enableWhatsApp}
              onChange={() => {}}
              className="w-5 h-5 text-teal-600 rounded"
            />
          </div>

          {/* Deputy Office Overdue WhatsApp Escalation Section */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/40 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 mt-0.5">
                  <Flame className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    تحويل المعاملات المتأخرة إلى واتساب مكتب النائب تلقائياً (إشعار الطوارئ)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    إرسال إشعار فوري عبر WhatsApp إلى هاتف مكتب النائب أو المتابعة الخاصة بمجرد تأخر أي معاملة عن مدة الإنجاز المحددة.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={(prefs as any).enableOverdueWhatsAppToDeputy !== false}
                onChange={() => setPrefs((prev: any) => ({ ...prev, enableOverdueWhatsAppToDeputy: !(prev.enableOverdueWhatsAppToDeputy !== false) }))}
                className="w-5 h-5 text-amber-600 rounded mt-1 cursor-pointer"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-amber-200/60">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رقم هاتف مكتب النائب / هاتف المتابعة الخاصة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  value={(prefs as any).deputyOfficePhone || ''}
                  onChange={(e) => setPrefs((prev: any) => ({ ...prev, deputyOfficePhone: e.target.value }))}
                  placeholder="مثال: 07700000001 أو +9647700000001"
                  className="w-full text-xs p-3 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  الرقم الذي ستصل إليه رسائل التنبيه والإنذار بالمعاملات المتأخرة فوراً.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    قالب رسالة التنبيه بالمعاملة المتأخرة (WhatsApp Template)
                  </label>
                  <div className="text-[10px] text-slate-500 font-mono">
                    متغيرات: {'{{request_number}}'}, {'{{customer_name}}'}, {'{{ministry}}'}, {'{{overdue_days}}'}
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={
                    (prefs as any).overdueAlertTemplate ||
                    `⚠️ *تنبيه عاجل لمكتب النائب - معاملة متأخرة*\n\n📋 رقم المعاملة: {{request_number}}\n👤 صاحب المعاملة: {{customer_name}} ({{customer_phone}})\n🏛️ الجهة/الوزارة: {{ministry}}\n⏳ مدة التأخير: {{overdue_days}} يوم\n📝 موضوع المعاملة: {{title}}\n👨‍💼 الموظف المسؤول: {{employee_name}}\n\nيرجى التوجيه والمتابعة مع الجهة المعنية.`
                  }
                  onChange={(e) => setPrefs((prev: any) => ({ ...prev, overdueAlertTemplate: e.target.value }))}
                  className="w-full text-xs p-3 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const phone = (prefs as any).deputyOfficePhone?.trim();
                    if (!phone) {
                      error('يرجى كتابة رقم هاتف مكتب النائب أولاً');
                      return;
                    }
                    try {
                      const { whatsappService } = await import('../../services/whatsappService');
                      await whatsappService.sendWhatsApp(
                        phone,
                        `🔔 تجربة تنبيه مكتب النائب:\nهذا اختبار لقناة إرسال تنبيهات المعاملات المتأخرة عبر واتساب من منظومة CivicFlow بنجاح.`
                      );
                      success('تم إرسال رسالة التنبيه التجريبية لهاتف مكتب النائب بنجاح');
                    } catch (err: any) {
                      error(err.message || 'تعذر إرسال التنبيه التجريبي');
                    }
                  }}
                  className="text-amber-900 border-amber-400 bg-white hover:bg-amber-100 text-xs font-bold"
                  icon={<MessageSquare className="w-3.5 h-3.5 text-amber-700" />}
                >
                  تجربة إرسال تنبيه لهاتف مكتب النائب
                </Button>
              </div>
            </div>
          </div>

          {/* Test WhatsApp Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800">اختبار اتصال وإرسال رسالة واتساب عامة</h4>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="أدخل أي رقم هاتف للتجربة (مثال: 07821189947)"
                id="test-phone-input"
                className="w-full sm:flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <button
                type="button"
                onClick={async () => {
                  const input = document.getElementById('test-phone-input') as HTMLInputElement;
                  const phoneVal = input?.value?.trim();
                  if (!phoneVal) {
                    error('يرجى إدخال رقم هاتف صالح للاختبار');
                    return;
                  }
                  try {
                    const { whatsappService } = await import('../../services/whatsappService');
                    await whatsappService.sendWhatsApp(
                      phoneVal,
                      `🔔 رسالة اختبار تجريبية من منظومة CivicFlow للخدمات والمعاملات الحكومية. تم ربط خدمة الواتساب بنجاح!`
                    );
                    success('تم إرسال رسالة الاختبار بنجاح عبر WhatsApp');
                  } catch (err: any) {
                    error(err.message || 'تعذر إرسال رسالة الاختبار');
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                إرسال رسالة تجريبية
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
