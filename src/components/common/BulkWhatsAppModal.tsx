import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { whatsappService } from '../../services/whatsappService';
import { WhatsAppTemplate } from '../../types';
import {
  MessageSquare,
  Send,
  Users,
  Sparkles,
  Clock,
  Eye,
  Phone,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Timer,
  Upload,
  FileText,
  Trash2,
  Paperclip
} from 'lucide-react';

export interface BulkRecipientItem {
  id?: string;
  requestId?: string;
  phoneNumber: string;
  customerName?: string;
  requestNumber?: string;
  ministry?: string;
  ministryName?: string;
  title?: string;
  trackingLink?: string;
}

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: BulkRecipientItem[];
  onSuccess?: () => void;
}

type RecipientStatus = 'idle' | 'sending' | 'sent' | 'failed';

interface RecipientStateItem extends BulkRecipientItem {
  status: RecipientStatus;
  errorMessage?: string;
}

export const formatWhatsAppPhone = (rawPhone: string): string => {
  if (!rawPhone) return '';
  // Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard Latin digits (0-9)
  let cleaned = rawPhone
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString())
    .replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Iraq formats: 07xxxxxxxxx -> 9647xxxxxxxxx
  if (cleaned.startsWith('96407')) {
    cleaned = '964' + cleaned.substring(4);
  } else if (cleaned.startsWith('07') && cleaned.length === 11) {
    cleaned = '964' + cleaned.substring(1);
  } else if (/^7[3-9]\d{8}$/.test(cleaned)) {
    cleaned = '964' + cleaned;
  }
  // Saudi Arabia: 05xxxxxxxx -> 9665xxxxxxxx
  else if (cleaned.startsWith('96605') && cleaned.length === 13) {
    cleaned = '966' + cleaned.substring(4);
  } else if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '966' + cleaned.substring(1);
  } else if (/^5\d{8}$/.test(cleaned)) {
    cleaned = '966' + cleaned;
  }
  // Egypt: 01xxxxxxxxx -> 201xxxxxxxxx
  else if (cleaned.startsWith('2001') && cleaned.length === 13) {
    cleaned = '20' + cleaned.substring(3);
  } else if (/^01[0125]\d{8}$/.test(cleaned)) {
    cleaned = '2' + cleaned;
  }

  return cleaned;
};

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onSuccess
}) => {
  const { success, error: toastError, warning } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('bulk_custom_message');
  const [messageText, setMessageText] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Document Attachment
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Staggered Delay config (Anti-ban protection)
  const [delayValue, setDelayValue] = useState<number>(5);
  const [delayUnit, setDelayUnit] = useState<'seconds' | 'minutes'>('seconds');

  // Execution Engine states
  const [recipientList, setRecipientList] = useState<RecipientStateItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [completedSummary, setCompletedSummary] = useState<{ success: number; failed: number } | null>(null);

  const isPausedRef = useRef(isPaused);
  const isCancelledRef = useRef(false);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Initialize ONCE when modal is opened
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Just opened
      setRecipientList(
        recipients.map((r) => ({
          ...r,
          status: 'idle'
        }))
      );
      setIsSending(false);
      setIsPaused(false);
      setCurrentIndex(0);
      setCountdown(0);
      setCompletedSummary(null);
      isCancelledRef.current = false;

      const fetchTemplates = async () => {
        try {
          setLoadingTemplates(true);
          const list = await whatsappService.getTemplates();
          setTemplates(list);

          const defaultTpl =
            list.find((t) => t.key === 'bulk_custom_message') ||
            list.find((t) => t.key === 'status_updated') ||
            list[0];

          if (defaultTpl) {
            setSelectedTemplateKey(defaultTpl.key);
            setMessageText(defaultTpl.content);
          } else {
            setMessageText(
              'السلام عليكم الأخ/الأخت {{customer_name}} المحترم،\nنود إعلامكم بخصوص معاملتكم ({{request_number}}) لدى ({{ministry}}):\nيرجى العلم بأنه تم تحديث الإجراءات بنجاح.\n\nلمتابعة التفاصيل: {{tracking_link}}\nمع تحيات مكتب المتابعة.'
            );
          }
        } catch (err) {
          console.error('Failed to load whatsapp templates', err);
        } finally {
          setLoadingTemplates(false);
        }
      };

      fetchTemplates();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    if (key === 'custom') {
      setMessageText('');
      return;
    }
    const found = templates.find((t) => t.key === key);
    if (found) {
      setMessageText(found.content);
    }
  };

  const handleInsertVariable = (varName: string) => {
    setMessageText((prev) => `${prev} {{${varName}}}`);
  };

  const formatMessageForRecipient = (item: BulkRecipientItem, rawTemplate: string): string => {
    if (!rawTemplate) return '';
    return rawTemplate
      .replace(/{{customer_name}}/g, item.customerName || 'المراجع')
      .replace(/{{request_number}}/g, item.requestNumber || 'REQ-1001')
      .replace(/{{ministry}}/g, item.ministry || item.ministryName || 'الجهة الحكومية')
      .replace(/{{title}}/g, item.title || 'معاملة رسمية')
      .replace(/{{phone}}/g, item.phoneNumber || '')
      .replace(/{{custom_message}}\n?/g, '')
      .replace(
        /{{tracking_link}}/g,
        item.trackingLink ||
          `${window.location.origin}/track/${item.requestNumber || 'REQ-1001'}`
      );
  };

  const openWhatsAppDirect = (item: BulkRecipientItem) => {
    const phone = formatWhatsAppPhone(item.phoneNumber);
    const msg = formatMessageForRecipient(item, messageText);
    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Preview sample
  const sampleRecipient = recipientList[0] || recipients[0] || {
    customerName: 'محمد أحمد',
    requestNumber: 'REQ-2026-0001',
    ministry: 'وزارة الإسكان',
    phoneNumber: '07701234567',
    title: 'طلب تخصيص أرض سكنية'
  };
  const formattedPreview = formatMessageForRecipient(sampleRecipient, messageText);

  // Sequential Staggered Sender Loop with Live Countdown & Anti-ban Delay
  const handleStartSequentialSend = async () => {
    if (!messageText.trim()) {
      toastError('يرجى كتابة نص الرسالة قبل الإرسال');
      return;
    }

    if (recipientList.length === 0) {
      toastError('لا يوجد مستلمون محددون');
      return;
    }

    const calculatedDelaySec = delayUnit === 'minutes' ? Math.max(1, delayValue) * 60 : Math.max(1, delayValue);

    setIsSending(true);
    setIsPaused(false);
    isCancelledRef.current = false;
    setCompletedSummary(null);

    let successCount = 0;
    let failCount = 0;
    const currentMsgSnapshot = messageText;

    for (let i = 0; i < recipientList.length; i++) {
      if (isCancelledRef.current) break;

      // Handle pause loop
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }
      if (isCancelledRef.current) break;

      setCurrentIndex(i);
      const currentItem = recipientList[i];

      // Update status to 'sending'
      setRecipientList((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'sending' } : r))
      );

      const targetPhone = formatWhatsAppPhone(currentItem.phoneNumber);
      const itemMsg = formatMessageForRecipient(currentItem, currentMsgSnapshot);

      try {
        await whatsappService.sendWhatsApp(
          targetPhone,
          itemMsg,
          selectedTemplateKey !== 'custom' ? selectedTemplateKey : undefined,
          currentItem.requestId || currentItem.id,
          attachedFile
        );

        successCount++;
        setRecipientList((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'sent' } : r))
        );
      } catch (err: any) {
        console.warn(`Failed to send to ${targetPhone}`, err);
        failCount++;
        setRecipientList((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'failed',
                  errorMessage: err?.response?.data?.message || err?.message || 'تعذر الإرسال عبر البوابة'
                }
              : r
          )
        );
      }

      // If not the last item, apply anti-ban countdown delay
      if (i < recipientList.length - 1 && !isCancelledRef.current) {
        for (let s = calculatedDelaySec; s > 0; s--) {
          if (isCancelledRef.current) break;
          while (isPausedRef.current && !isCancelledRef.current) {
            await new Promise((r) => setTimeout(r, 500));
          }
          setCountdown(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCountdown(0);
      }
    }

    setIsSending(false);
    setCompletedSummary({ success: successCount, failed: failCount });

    if (!isCancelledRef.current) {
      if (failCount === 0) {
        success('تم الإرسال بنجاح', `تم إرسال ${successCount} رسالة واتساب لجميع المستلمين المحددين.`);
        if (onSuccess) onSuccess();
      } else {
        warning(
          'اكتملت عملية الإرسال مع تنبيهات',
          `تم بنجاح: ${successCount} | فشل: ${failCount} (يمكنك فتح المحادثات الفاشلة عبر زر واتساب ويب)`
        );
      }
    }
  };

  const handleStop = () => {
    isCancelledRef.current = true;
    setIsSending(false);
    setIsPaused(false);
    setCountdown(0);
  };

  const availableVariables = [
    { key: 'customer_name', label: 'اسم المراجع' },
    { key: 'request_number', label: 'رقم المعاملة' },
    { key: 'ministry', label: 'الوزارة / الجهة' },
    { key: 'title', label: 'عنوان المعاملة' },
    { key: 'phone', label: 'رقم الهاتف' },
    { key: 'tracking_link', label: 'رابط التتبع' }
  ];

  const sentCount = recipientList.filter((r) => r.status === 'sent').length;
  const failedCount = recipientList.filter((r) => r.status === 'failed').length;
  const progressPercent = recipientList.length > 0 ? Math.round(((sentCount + failedCount) / recipientList.length) * 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={isSending ? () => {} : onClose} maxWidth="2xl" title="إرسال رسائل WhatsApp مخصصة للمحددين">
      <div className="space-y-5 text-right" dir="rtl">
        {/* Recipients Counter Card */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                المستلمون المختارون: ({recipientList.length || recipients.length}) مراجع / معاملة
              </h4>
              <p className="text-xs text-emerald-700">
                سيتم توليد رسالة واتساب مخصصة لكل مستلم باسمه ومعلومات معاملته تلقائياً
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-emerald-200/80 text-emerald-900 rounded-full text-xs font-black self-start sm:self-center shadow-xs">
            {recipientList.length || recipients.length} مستلم
          </span>
        </div>

        {/* Delay / Anti-Ban Configuration Box */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-amber-600" />
              <span>الفارق الزمني بين كل رسالة وأخرى (تجنب الحظر من واتساب):</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="300"
                value={delayValue}
                onChange={(e) => setDelayValue(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isSending}
                className="w-20 px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-center font-bold font-mono text-sm text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
              />
              <select
                value={delayUnit}
                onChange={(e) => setDelayUnit(e.target.value as any)}
                disabled={isSending}
                className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
              >
                <option value="seconds">ثانية (Seconds)</option>
                <option value="minutes">دقيقة (Minutes)</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              نظام الحماية من الحظر: يقوم النظام بانتظار الفارق الزمني المحدد بين كل رسالة والأخرى لمحاكاة الإرسال البشري الطبيعي وحماية رقمك من قيود واتساب.
            </span>
          </p>
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            اختيار قالب الرسالة:
          </label>
          <select
            value={selectedTemplateKey}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            disabled={loadingTemplates || isSending}
            className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          >
            <option value="bulk_custom_message">قالب الرسائل الجماعية المخصصة للمراجعين (افتراضي)</option>
            {templates
              .filter((t) => t.key !== 'bulk_custom_message')
              .map((t) => (
                <option key={t.key} value={t.key}>
                  {t.title}
                </option>
              ))}
            <option value="custom">✍️ كتابة نص مخصص جديد من الصفر...</option>
          </select>
        </div>

        {/* Dynamic Placeholders Toolbar */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-600">
            إدراج متغير ديناميكي (اضغط للإضافة في النص):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableVariables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => handleInsertVariable(v.key)}
                disabled={isSending}
                className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-700 font-medium transition"
              >
                + {v.label} <span className="text-slate-400 font-mono">({`{{${v.key}}}`})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Editor Textarea */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            نص الرسالة (يمكنك تعديله قبل الإرسال):
          </label>
          <textarea
            rows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending}
            placeholder="اكتب نص الرسالة هنا مع المتغيرات مثل {{customer_name}}..."
            className="w-full text-xs p-3.5 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
          />
        </div>

        {/* Document Attachment Section (Optional) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            إرفاق مستند (اختياري)
          </label>

          {!attachedFile ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/40 rounded-2xl p-5 text-center cursor-pointer transition group shadow-2xs">
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 mb-2 transition shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                اضغط لاختيار ملف
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                PDF / صورة / Word، حتى 25 ميغابايت
              </span>
              <input
                type="file"
                hidden
                disabled={isSending}
                accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (f.size > 25 * 1024 * 1024) {
                      toastError('حجم الملف يتجاوز الحد المسموح به (25 ميغابايت)');
                      return;
                    }
                    setAttachedFile(f);
                  }
                }}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3.5 bg-emerald-950/5 border border-emerald-500/30 rounded-2xl transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-950 truncate max-w-[220px] sm:max-w-md">
                    {attachedFile.name}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    {attachedFile.size >= 1024 * 1024
                      ? `${(attachedFile.size / (1024 * 1024)).toFixed(1)} ميغابايت`
                      : `${Math.round(attachedFile.size / 1024)} كيلوبايت`}
                    ، جاهز للإرسال
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                disabled={isSending}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                title="إزالة الملف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Live Preview Bubble */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              معاينة حية للرسالة (للمستلم: {sampleRecipient.customerName || 'المراجع'}):
            </span>
            <button
              type="button"
              onClick={() => openWhatsAppDirect(sampleRecipient)}
              className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 hover:underline"
              title="تجربة الفتح في واتساب ويب مباشرة"
            >
              <ExternalLink className="w-3 h-3" />
              <span>فتح تجريبي في WhatsApp Web</span>
            </button>
          </div>
          <div className="bg-[#e5ddd5] p-3.5 rounded-2xl border border-slate-300/80 shadow-inner">
            <div className="bg-white rounded-xl p-3 max-w-md ml-auto rounded-tr-none shadow-sm space-y-2 text-right border border-emerald-100">
              {attachedFile && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{attachedFile.name}</span>
                </div>
              )}
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {formattedPreview || 'نص الرسالة فارغ...'}
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-mono pt-1">
                <span>{new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-emerald-500 font-bold">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sending Progress Dashboard */}
        {isSending && (
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-xl border border-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>
                  جارٍ الإرسال: {sentCount + failedCount + 1} من {recipientList.length}
                </span>
              </span>
              <span className="font-mono text-emerald-400">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Live Status & Countdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400">✓ تم بنجاح: {sentCount}</span>
                {failedCount > 0 && <span className="text-rose-400">✗ فشل: {failedCount}</span>}
              </div>

              {countdown > 0 && (
                <div className="flex items-center gap-1.5 text-amber-300 font-bold font-mono animate-pulse">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>الرسالة التالية خلال {countdown} ثانية...</span>
                </div>
              )}
            </div>

            {/* Execution Controls */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isPaused ? 'استئناف الإرسال' : 'إيقاف مؤقت'}</span>
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition border border-rose-500/40"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>إلغاء العملية</span>
              </button>
            </div>
          </div>
        )}

        {/* Completed Summary / Failed items fallback */}
        {completedSummary && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-800">تقرير نتيجة الإرسال الجماعي:</h5>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
                  نجاح: {completedSummary.success}
                </span>
                {completedSummary.failed > 0 && (
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg">
                    تعذر: {completedSummary.failed}
                  </span>
                )}
              </div>
            </div>

            {completedSummary.failed > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                <p className="text-[11px] text-slate-500 font-medium">
                  المستلمون الذين تعذر إرسال الرسالة لهم عبر الخادم (يمكنك فتح المحادثة مباشرة):
                </p>
                {recipientList
                  .filter((r) => r.status === 'failed')
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-white rounded-xl border border-rose-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{item.customerName || 'المراجع'}</span>
                        <span className="font-mono text-slate-500 text-[11px] mr-2">({item.phoneNumber})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openWhatsAppDirect(item)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>إرسال عبر WhatsApp Web</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            {isSending ? 'جارٍ المعالجة مع الحفاظ على الفاصل الزمني...' : 'جاهز للإرسال'}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              {completedSummary ? 'إغلاق' : 'إلغاء'}
            </Button>

            {!completedSummary ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleStartSequentialSend}
                disabled={isSending || recipientList.length === 0 || !messageText.trim()}
                isLoading={isSending}
                icon={<Send className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/20"
              >
                {isSending ? 'جارٍ الإرسال...' : `إرسال WhatsApp لـ (${recipientList.length}) مراجع`}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (onSuccess) onSuccess();
                  onClose();
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6"
              >
                تم والعودة
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
export default BulkWhatsAppModal;
