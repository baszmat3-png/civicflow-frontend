import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { WhatsAppSettings } from '../../types';
import { whatsappService, WhatsAppGatewayView } from '../../services/whatsappService';
import { Input } from '../../components/ui/Input';
import {
  MessageSquare,
  CheckCircle2,
  Save,
  ArrowRight,
  FileCode2,
  Eye,
  EyeOff,
  Send,
  KeyRound
} from 'lucide-react';

export const WhatsAppSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, handleUpdateSettings } = useData();
  const { success, error } = useToast();

  const [whatsapp, setWhatsapp] = useState<WhatsAppSettings>({
    isConnected: false,
    phoneNumber: '',
    instanceName: '',
    lastSync: '',
    triggers: []
  });
  const [isLoading, setIsLoading] = useState(false);

  // --- Real gateway connection (credentials are stored server-side; secrets are never sent back in full) ---
  const [gw, setGw] = useState<WhatsAppGatewayView | null>(null);
  const [form, setForm] = useState({
    enabled: true,
    provider: 'wpsender' as 'wpsender' | 'ultramsg',
    apiUrl: '',
    apiKey: '',
    senderPhone: '',
    ultraInstanceId: '',
    ultraToken: ''
  });
  const [showKey, setShowKey] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [isSavingGw, setIsSavingGw] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const applyGateway = (g: WhatsAppGatewayView) => {
    setGw(g);
    setForm({
      enabled: g.enabled,
      provider: g.provider,
      apiUrl: g.apiUrl,
      apiKey: '',
      senderPhone: g.senderPhone,
      ultraInstanceId: g.ultraInstanceId,
      ultraToken: ''
    });
  };

  useEffect(() => {
    whatsappService.getGateway().then(applyGateway).catch(() => {});
  }, []);

  useEffect(() => {
    if (settings?.whatsapp) {
      setWhatsapp(settings.whatsapp);
    }
  }, [settings]);

  const toggleTrigger = (id: string) => {
    setWhatsapp((prev) => ({
      ...prev,
      triggers: prev.triggers.map((trg) =>
        trg.id === id ? { ...trg, enabled: !trg.enabled } : trg
      )
    }));
  };

  const handleSaveGateway = async () => {
    setIsSavingGw(true);
    try {
      const updated = await whatsappService.updateGateway(form);
      applyGateway(updated);
      success('تم حفظ إعدادات ربط واتساب');
    } catch (err: any) {
      error(err?.message || 'تعذر حفظ إعدادات الربط');
    } finally {
      setIsSavingGw(false);
    }
  };

  const handleTestGateway = async () => {
    if (!testPhone.trim()) {
      error('أدخل رقم هاتف لإرسال رسالة الاختبار إليه');
      return;
    }
    setIsTesting(true);
    try {
      // Save first so the test always uses what is on screen
      await whatsappService.updateGateway(form);
      const r = await whatsappService.testGateway(testPhone.trim());
      applyGateway(r);
      if (r.success) success(r.message);
      else error(r.message);
    } catch (err: any) {
      error(err?.message || 'فشل اختبار الاتصال');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsLoading(true);
    try {
      await handleUpdateSettings({ whatsapp });
      success('تم حفظ إعدادات وأحداث WhatsApp بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات بوابة WhatsApp</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة الاتصال ببوابة المراسلة الفورية وضبط أحداث الإرسال التلقائي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/settings/whatsapp/templates')}
            icon={<FileCode2 className="w-4 h-4" />}
          >
            قوالب الرسائل
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isLoading}
            icon={<Save className="w-4 h-4" />}
          >
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      {/* Gateway connection (real) */}
      <Card>
        <CardHeader className="bg-slate-50/70">
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-600" />
              <CardTitle className="text-base">ربط بوابة واتساب (API)</CardTitle>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                gw?.configured && form.enabled
                  ? gw.lastTestOk === false
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  gw?.configured && form.enabled
                    ? gw.lastTestOk === false
                      ? 'bg-amber-500'
                      : 'bg-emerald-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              {!gw?.configured ? 'غير مهيأ' : !form.enabled ? 'معطّل' : gw.lastTestOk === false ? 'آخر اختبار فشل' : 'مفعّل'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <p className="font-bold text-sm text-slate-900">تفعيل إرسال رسائل واتساب</p>
              <p className="text-[11px] text-slate-500">عند الإيقاف لا تُرسل أي رسالة (الحجز، التذكير، الحالة، OTP)</p>
            </div>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="w-5 h-5 accent-teal-600"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1.5">مزوّد الخدمة</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'wpsender', label: 'WPSender' },
                { id: 'ultramsg', label: 'UltraMsg' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, provider: p.id as 'wpsender' | 'ultramsg' }))}
                  className={`py-2 rounded-lg border text-sm font-bold transition ${
                    form.provider === p.id
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {form.provider === 'wpsender' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="رابط الـ API"
                  dir="ltr"
                  value={form.apiUrl}
                  onChange={(e) => setForm((f) => ({ ...f, apiUrl: e.target.value }))}
                  placeholder="https://backendapi.wpsenderx.com/api/messages/send"
                />
              </div>
              <div>
                <div className="relative">
                  <Input
                    label="مفتاح API (API Key)"
                    dir="ltr"
                    type={showKey ? 'text' : 'password'}
                    value={form.apiKey}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder={gw?.hasApiKey ? gw.apiKeyMasked : 'wps_...'}
                    helperText={gw?.hasApiKey ? 'المفتاح محفوظ. اتركه فارغاً للإبقاء عليه أو أدخل مفتاحاً جديداً لاستبداله.' : 'الصق المفتاح من لوحة المزوّد'}
                    icon={<KeyRound className="w-4 h-4" />}
                    autoComplete="off"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute left-3 top-[2.6rem] text-slate-400 hover:text-slate-700"
                    aria-label="إظهار/إخفاء المفتاح"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Input
                label="رقم الإرسال الرسمي (Sender)"
                dir="ltr"
                value={form.senderPhone}
                onChange={(e) => setForm((f) => ({ ...f, senderPhone: e.target.value }))}
                placeholder="+9647XXXXXXXXX"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Instance ID"
                dir="ltr"
                value={form.ultraInstanceId}
                onChange={(e) => setForm((f) => ({ ...f, ultraInstanceId: e.target.value }))}
                placeholder="instance12345"
              />
              <Input
                label="Token"
                dir="ltr"
                type={showKey ? 'text' : 'password'}
                value={form.ultraToken}
                onChange={(e) => setForm((f) => ({ ...f, ultraToken: e.target.value }))}
                placeholder={gw?.hasUltraToken ? gw.ultraTokenMasked : 'token'}
                helperText={gw?.hasUltraToken ? 'التوكن محفوظ. اتركه فارغاً للإبقاء عليه.' : undefined}
                autoComplete="off"
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleSaveGateway} isLoading={isSavingGw} icon={<Save className="w-4 h-4" />}>
              حفظ إعدادات الربط
            </Button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <p className="font-bold text-sm text-slate-900">اختبار الاتصال</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input dir="ltr" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="رقم لاستلام رسالة الاختبار 07XXXXXXXXX" />
              </div>
              <Button variant="secondary" onClick={handleTestGateway} isLoading={isTesting} icon={<Send className="w-4 h-4" />}>
                حفظ وإرسال رسالة اختبار
              </Button>
            </div>
            {gw?.lastTestAt && (
              <p className={`text-xs font-semibold ${gw.lastTestOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                آخر اختبار: {new Date(gw.lastTestAt).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })} — {gw.lastTestMessage}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Triggers (8 triggers from prompt) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-base">أحداث الإرسال التلقائي (Notification Triggers)</CardTitle>
            <CardDescription>
              حدد الحالات والمناسبات التي يتم فيها إرسال رسالة WhatsApp فورية للمراجع
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {whatsapp.triggers.map((trg) => (
            <div
              key={trg.id}
              onClick={() => toggleTrigger(trg.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                trg.enabled
                  ? 'bg-teal-50/40 border-teal-300 text-teal-950'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2
                  className={`w-4 h-4 ${trg.enabled ? 'text-teal-600' : 'text-slate-300'}`}
                />
                <div>
                  <p className="font-bold text-xs">{trg.title}</p>
                  <p className="text-[11px] opacity-70">الحدث البرمجي: {trg.event}</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={trg.enabled}
                onChange={() => {}}
                className="w-4 h-4 text-teal-600 rounded"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
