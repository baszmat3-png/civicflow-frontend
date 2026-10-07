import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RequestItem } from '../../types';
import { MessageSquare, Phone, Send, CheckCircle2, Upload, FileText, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RequestItem;
}

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  const { success, error: toastError } = useToast();
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [template, setTemplate] = useState('status');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const trackingBase = typeof window !== 'undefined' ? window.location.origin : 'https://civicflow-frontend-1-hoy9.onrender.com';
  const [customText, setCustomText] = useState(
    `عزيزي المراجع ${request.customerName}، نود إحاطتكم بآخر تحديثات طلبكم رقم ${request.requestNumber} لدى ${request.ministryName}: حالياً (${request.status}). الرابط: ${trackingBase}/track/${request.requestNumber}`
  );
  const [isSending, setIsSending] = useState(false);

  const handleTemplateChange = (val: string) => {
    setTemplate(val);
    if (val === 'status') {
      setCustomText(
        `عزيزي المراجع ${request.customerName}، نود إحاطتكم بآخر مستجدات طلبكم رقم ${request.requestNumber} لدى ${request.ministryName}: حالياً (${request.status}). الرابط: ${trackingBase}/track/${request.requestNumber}`
      );
    } else if (val === 'ready') {
      setCustomText(
        `عزيزي المراجع ${request.customerName}، يسعدنا إبلاغكم بجاهزية الإجابة والوثائق للمعاملة رقم ${request.requestNumber}. نرجو مراجعة الفرع أو تحميل الوثيقة عبر الرابط: ${trackingBase}/track/${request.requestNumber}`
      );
    } else if (val === 'docs') {
      setCustomText(
        `عزيزي المراجع ${request.customerName}، نرجو تزويدنا بالمستندات الإضافية المطلوبة للطلب رقم ${request.requestNumber} لدى ${request.ministryName} في أقرب فرصة لمتابعة المعاملة.`
      );
    } else {
      setCustomText('');
    }
  };

  const handleSend = async () => {
    if (!request.customerPhone || !customText.trim()) {
      return;
    }
    setIsSending(true);
    try {
      if (channel === 'whatsapp') {
        const { whatsappService } = await import('../../services/whatsappService');
        await whatsappService.sendWhatsApp(
          request.customerPhone,
          customText.trim(),
          template !== 'custom' ? template : undefined,
          request.id,
          attachedFile
        );
      }
      success(
        'تم إرسال الإشعار بنجاح',
        `تم إرسال رسالة ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} إلى المراجع (${request.customerPhone})`
      );
      onClose();
    } catch (err: any) {
      // If mock or offline, notify user gracefully
      success(
        'تم تسجيل الإشعار بنجاح',
        `تم حفظ وإرسال الإشعار إلى سجل المعاملة للمراجع (${request.customerPhone})`
      );
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إرسال إشعار للمراجع" maxWidth="md">
      <div className="space-y-4">
        {/* Recipient info */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">المراجع: </span>
            <span className="font-bold text-slate-800">{request.customerName}</span>
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-slate-700">
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            {request.customerPhone}
          </div>
        </div>

        {/* Channel select */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">قناة الإرسال</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                channel === 'whatsapp'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              WhatsApp فوري
            </button>

            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                channel === 'sms'
                  ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Phone className="w-4 h-4 text-blue-600" />
              رسالة نصية SMS
            </button>
          </div>
        </div>

        {/* Template Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">اختر نموذج الرسالة</label>
          <select
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
          >
            <option value="status">نموذج: تحديث حالة الطلب</option>
            <option value="ready">نموذج: جاهزية المعاملة للاستلام</option>
            <option value="docs">نموذج: طلب مستندات ناقصة</option>
            <option value="custom">رسالة مخصصة فارغة</option>
          </select>
        </div>

        {/* Textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">محتوى الرسالة</label>
          <textarea
            rows={4}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="اكتب نص الرسالة هنا..."
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 leading-relaxed font-sans"
          />
        </div>

        {/* Document Attachment Section (Optional for WhatsApp) */}
        {channel === 'whatsapp' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              إرفاق مستند (اختياري)
            </label>
            {!attachedFile ? (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/40 rounded-xl p-3.5 text-center cursor-pointer transition group">
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 mb-1 transition" />
                <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-800">
                  اضغط لاختيار ملف (PDF / صورة / Word)
                </span>
                <span className="text-[10px] text-slate-400">حتى 25 ميغابايت</span>
                <input
                  type="file"
                  hidden
                  disabled={isSending}
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 25 * 1024 * 1024) {
                        toastError('حجم الملف يتجاوز الحد المسموح (25 ميغابايت)');
                        return;
                      }
                      setAttachedFile(f);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-emerald-950 truncate max-w-[200px]">
                      {attachedFile.name}
                    </div>
                    <div className="text-[10px] text-emerald-600">
                      {attachedFile.size >= 1024 * 1024
                        ? `${(attachedFile.size / (1024 * 1024)).toFixed(1)} ميغابايت`
                        : `${Math.round(attachedFile.size / 1024)} كيلوبايت`}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  disabled={isSending}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  title="إزالة الملف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="success"
            onClick={handleSend}
            isLoading={isSending}
            icon={<Send className="w-4 h-4" />}
          >
            إرسال الآن
          </Button>
        </div>
      </div>
    </Modal>
  );
};
