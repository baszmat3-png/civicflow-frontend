import React, { useState, useEffect } from 'react';
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
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Phone
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

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  recipients,
  onSuccess
}) => {
  const { success, error: toastError } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('bulk_custom_message');
  const [messageText, setMessageText] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const list = await whatsappService.getTemplates();
        setTemplates(list);

        // Find bulk_custom_message or use first available
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

  // Preview formatting for the first recipient
  const sampleRecipient = recipients[0] || {
    customerName: 'محمد أحمد',
    requestNumber: 'REQ-2026-0001',
    ministry: 'وزارة الإسكان',
    phoneNumber: '07701234567',
    title: 'طلب تخصيص أرض سكنية'
  };

  const formattedPreview = messageText
    ? messageText
        .replace(/{{customer_name}}/g, sampleRecipient.customerName || 'المراجع')
        .replace(/{{request_number}}/g, sampleRecipient.requestNumber || 'REQ-1001')
        .replace(/{{ministry}}/g, sampleRecipient.ministry || sampleRecipient.ministryName || 'الجهة الحكومية')
        .replace(/{{title}}/g, sampleRecipient.title || 'معاملة رسمية')
        .replace(/{{phone}}/g, sampleRecipient.phoneNumber || '')
        .replace(
          /{{tracking_link}}/g,
          sampleRecipient.trackingLink ||
            `${window.location.origin}/track/${sampleRecipient.requestNumber || 'REQ-1001'}`
        )
    : '';

  const handleSendBulk = async () => {
    if (!messageText.trim()) {
      toastError('يرجى كتابة نص الرسالة قبل الإرسال');
      return;
    }

    if (recipients.length === 0) {
      toastError('لا يوجد مستلمون محددون');
      return;
    }

    try {
      setIsSending(true);
      setProgress({ current: 0, total: recipients.length });

      const res = await whatsappService.sendBulkWhatsApp(
        recipients,
        messageText,
        selectedTemplateKey !== 'custom' ? selectedTemplateKey : undefined
      );

      success(
        'تم إرسال الرسائل الجماعية',
        `تم إرسال ${res.successCount} رسالة واتساب بنجاح${
          res.failCount > 0 ? ` (فشل ${res.failCount})` : ''
        }`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to send bulk whatsapp', err);
      toastError('فشل الإرسال الجماعي', err.message || 'حدث خطأ أثناء إرسال الرسائل');
    } finally {
      setIsSending(false);
      setProgress(null);
    }
  };

  const availableVariables = [
    { key: 'customer_name', label: 'اسم المراجع' },
    { key: 'request_number', label: 'رقم المعاملة' },
    { key: 'ministry', label: 'الوزارة / الجهة' },
    { key: 'title', label: 'عنوان المعاملة' },
    { key: 'phone', label: 'رقم الهاتف' },
    { key: 'tracking_link', label: 'رابط التتبع' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl" title="إرسال رسائل WhatsApp مخصصة للمحددين">
      <div className="space-y-5 text-right" dir="rtl">
        {/* Recipients Counter Card */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                المستلمون المختارون: ({recipients.length}) مراجع / معاملة
              </h4>
              <p className="text-xs text-emerald-700">
                سيتم إرسال رسالة واتساب مخصصة لكل مستلم باسمه ومعلومات معاملته تلقائياً
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-200/80 text-emerald-900 rounded-full text-xs font-black">
            {recipients.length} مستلم
          </span>
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
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending}
            placeholder="اكتب نص الرسالة هنا مع المتغيرات مثل {{customer_name}}..."
            className="w-full text-xs p-3.5 border border-slate-300 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
          />
        </div>

        {/* Live Preview Bubble */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              معاينة حية لشكل الرسالة (للمستلم الأول: {sampleRecipient.customerName || 'المراجع'}):
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {sampleRecipient.phoneNumber || ''}
            </span>
          </div>
          <div className="bg-[#e5ddd5] p-3.5 rounded-2xl border border-slate-300/80 shadow-inner">
            <div className="bg-white rounded-xl p-3 max-w-md ml-auto rounded-tr-none shadow-sm space-y-1.5 text-right border border-emerald-100">
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

        {/* Sending Progress */}
        {isSending && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                جارٍ إرسال رسائل WhatsApp للمراجعين...
              </span>
              <span>{recipients.length} رسالة</span>
            </div>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 animate-pulse w-full"></div>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            إلغاء
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSendBulk}
            disabled={isSending || recipients.length === 0 || !messageText.trim()}
            isLoading={isSending}
            icon={<Send className="w-4 h-4" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/20"
          >
            {isSending ? 'جارٍ الإرسال...' : `إرسال WhatsApp لـ (${recipients.length}) مراجع`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
export default BulkWhatsAppModal;
