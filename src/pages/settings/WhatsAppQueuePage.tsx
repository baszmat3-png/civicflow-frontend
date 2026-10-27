import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, RotateCcw, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { whatsappService } from '../../services/whatsappService';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'بالانتظار', cls: 'bg-amber-100 text-amber-800' },
  PROCESSING: { label: 'قيد الإرسال', cls: 'bg-blue-100 text-blue-800' },
  SENT: { label: 'أُرسلت', cls: 'bg-emerald-100 text-emerald-800' },
  FAILED: { label: 'فشلت', cls: 'bg-rose-100 text-rose-800' }
};

export const WhatsAppQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await whatsappService.getQueue());
    } catch (e: any) {
      error(e?.message || 'تعذر جلب حالة الطابور');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live view
    return () => clearInterval(t);
  }, [load]);

  const retry = async () => {
    setRetrying(true);
    try {
      const r = await whatsappService.retryQueue();
      success(`أُعيدت جدولة ${r.count} رسالة`);
      load();
    } catch (e: any) {
      error(e?.message || 'تعذرت إعادة المحاولة');
    } finally {
      setRetrying(false);
    }
  };

  const counts = data?.counts || { PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 };
  const fmt = (d?: string) => (d ? new Date(d).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' }) : '—');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/settings/whatsapp')} icon={<ArrowRight className="w-4 h-4" />}>
            رجوع
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">مراقبة رسائل واتساب</h1>
            <p className="text-xs text-slate-500">حالة الطابور مباشرة، تتحدث كل 5 ثوانٍ</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>تحديث</Button>
          <Button variant="primary" size="sm" onClick={retry} isLoading={retrying} disabled={!counts.FAILED} icon={<RotateCcw className="w-4 h-4" />}>
            إعادة محاولة الفاشلة ({counts.FAILED})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { k: 'PENDING', icon: <Clock className="w-5 h-5" /> },
          { k: 'PROCESSING', icon: <Loader2 className="w-5 h-5" /> },
          { k: 'SENT', icon: <CheckCircle2 className="w-5 h-5" /> },
          { k: 'FAILED', icon: <XCircle className="w-5 h-5" /> }
        ].map(({ k, icon }) => (
          <div key={k} className={`rounded-xl p-4 flex items-center justify-between ${STATUS_META[k].cls}`}>
            <div>
              <p className="text-xs font-bold">{STATUS_META[k].label}</p>
              <p className="text-2xl font-black">{counts[k] ?? 0}</p>
            </div>
            {icon}
          </div>
        ))}
      </div>

      {data?.oldestPendingAgeSeconds > 120 && (
        <div className="p-3 rounded-xl bg-amber-100 text-amber-900 text-sm font-semibold border border-amber-300">
          أقدم رسالة منتظرة منذ {Math.round(data.oldestPendingAgeSeconds / 60)} دقيقة — تحقق من إعدادات ربط واتساب أو أن البوابة تعمل.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">آخر الرسائل</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-slate-500">جاري التحميل...</p>}
          {!loading && (data?.recent || []).length === 0 && <p className="text-sm text-slate-500">لا توجد رسائل بعد.</p>}
          {(data?.recent || []).map((m: any) => (
            <div key={m.id} className="p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-slate-800" dir="ltr">{m.phoneNumber}</span>
                <span className={`px-2.5 py-1 rounded-full font-bold ${STATUS_META[m.status]?.cls || ''}`}>{STATUS_META[m.status]?.label || m.status}</span>
              </div>
              <div className="text-slate-500 flex flex-wrap gap-x-4 gap-y-0.5">
                <span>القالب: {m.templateKey || 'نص مخصص'}</span>
                <span>المحاولات: {m.attempts}</span>
                <span>{m.status === 'SENT' ? `أُرسلت: ${fmt(m.sentAt)}` : `أُنشئت: ${fmt(m.createdAt)}`}</span>
                {m.status === 'PENDING' && <span>المحاولة التالية: {fmt(m.nextAttemptAt)}</span>}
              </div>
              {m.lastError && <p className="text-rose-600 font-semibold break-words">{m.lastError}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
