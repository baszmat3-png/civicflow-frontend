import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  FileText,
  Upload,
  Building2,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Tag
} from 'lucide-react';
import { registryService, RegistryEntityItem } from '../../services/registryService';
import { publicService } from '../../services/publicService';

interface CreateLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'OUTGOING' | 'INCOMING';
  onSuccess: () => void;
}

export const CreateLetterModal: React.FC<CreateLetterModalProps> = ({
  isOpen,
  onClose,
  type,
  onSuccess
}) => {
  const isOutgoing = type === 'OUTGOING';

  const [entities, setEntities] = useState<RegistryEntityItem[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields
  const [letterNumber, setLetterNumber] = useState('');
  const [externalNumber, setExternalNumber] = useState('');
  const [departmentNumber, setDepartmentNumber] = useState('');
  const [archiveFileNumber, setArchiveFileNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [entityId, setEntityId] = useState('');
  const [customEntityName, setCustomEntityName] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [actionRequired, setActionRequired] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [file, setFile] = useState<File | null>(null);

  const handleClearFields = () => {
    setLetterNumber('');
    setExternalNumber('');
    setDepartmentNumber('');
    setArchiveFileNumber('');
    setDate(new Date().toISOString().split('T')[0]);
    setSubject('');
    setEntityId('');
    setCustomEntityName('');
    setMinistryId('');
    setCitizenName('');
    setCitizenPhone('');
    setSummary('');
    setNotes('');
    setActionRequired('');
    setPriority('NORMAL');
    setFile(null);
    setErrorMsg('');
  };

  useEffect(() => {
    if (!isOpen) return;
    const loadMetadata = async () => {
      try {
        const [entList, meta] = await Promise.all([
          registryService.getEntities(),
          publicService.getFormData()
        ]);
        setEntities(entList);
        setMinistries(meta.ministries || []);
      } catch (err) {
        console.error('Failed to load registry entities:', err);
      }
    };
    loadMetadata();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterNumber.trim() || !subject.trim()) {
      setErrorMsg('يرجى ملء رقم الكتاب وعنوان الموضوع');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const formData = new FormData();
      formData.append('subject', subject.trim());
      if (date) formData.append(isOutgoing ? 'issueDate' : 'receiveDate', date);
      if (departmentNumber) formData.append('departmentNumber', departmentNumber.trim());
      if (archiveFileNumber) formData.append('archiveFileNumber', archiveFileNumber.trim());
      if (entityId) formData.append(isOutgoing ? 'recipientEntityId' : 'senderEntityId', entityId);
      if (customEntityName) formData.append(isOutgoing ? 'recipientName' : 'senderName', customEntityName.trim());
      if (ministryId) formData.append('ministryId', ministryId);
      if (citizenName) formData.append('citizenName', citizenName.trim());
      if (citizenPhone) formData.append('citizenPhone', citizenPhone.trim());
      if (summary) formData.append('summary', summary.trim());
      if (notes) formData.append('notes', notes.trim());
      if (file) formData.append('attachment', file);

      if (isOutgoing) {
        formData.append('letterNumber', letterNumber.trim());
        await registryService.createOutgoingLetter(formData);
      } else {
        formData.append('incomingNumber', letterNumber.trim());
        if (externalNumber) formData.append('externalLetterNumber', externalNumber.trim());
        if (actionRequired) formData.append('actionRequired', actionRequired.trim());
        formData.append('priority', priority);
        await registryService.createIncomingLetter(formData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ قيد الكتاب في السجل');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 relative border border-slate-100 dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isOutgoing ? 'تسجيل كتاب صادر جديد' : 'تسجيل كتاب وارد جديد'}
            </h2>
            <p className="text-xs text-slate-500">
              {isOutgoing ? 'توثيق وأرشفة الكتب الرسمية الصادرة من المكتب' : 'توثيق وأرشفة الكتب والمخاطبات الواردة إلى المكتب'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                {isOutgoing ? 'رقم الكتاب الصادر (العدد)' : 'رقم القيد الوارد الداخلي'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder={isOutgoing ? 'مثال: ص/2026/142' : 'مثال: و/2026/089'}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {!isOutgoing ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  رقم كتاب الجهة الوارد الأصلي
                </label>
                <input
                  type="text"
                  value={externalNumber}
                  onChange={(e) => setExternalNumber(e.target.value)}
                  placeholder="الرقم المسجل على الكتاب الورقي"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  تاريخ صدور الكتاب <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none font-mono"
                />
              </div>
            )}
          </div>

          {!isOutgoing && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                تاريخ الورود <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none font-mono"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                {isOutgoing ? 'رقم صادر القسم' : 'رقم وارد القسم'} (اختياري)
              </label>
              <input
                type="text"
                value={departmentNumber}
                onChange={(e) => setDepartmentNumber(e.target.value)}
                placeholder="رقم القيد لدى القسم المختص"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                رقم ملف الحفظ (الأرشيف)
              </label>
              <input
                type="text"
                value={archiveFileNumber}
                onChange={(e) => setArchiveFileNumber(e.target.value)}
                placeholder="مثال: ملف رقم 12 / رف 4"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              عنوان وموضوع الكتاب <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثال: طلب تخصيص مالي لعلاج مريض / تأييد سكن..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                {isOutgoing ? 'الجهة الصادر إليها' : 'الجهة الوارد منها'}
              </label>
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
              >
                <option value="">اختر من قائمة الجهات المسجلة</option>
                {entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                الوزارة ذات العلاقة (اختياري)
              </label>
              <select
                value={ministryId}
                onChange={(e) => setMinistryId(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
              >
                <option value="">اختر الوزارة</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                صاحب الشأن / المواطن المعني
              </label>
              <input
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="اسم المواطن صاحب المعاملة"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                رقم هاتف صاحب الشأن
              </label>
              <input
                type="tel"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                placeholder="077XXXXXXXX"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none font-mono"
              />
            </div>
          </div>

          {!isOutgoing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  درجة الأولوية
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
                >
                  <option value="NORMAL">عادي</option>
                  <option value="IMPORTANT">مهم</option>
                  <option value="URGENT">عاجل وفوري</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  الإجراء المطلوب
                </label>
                <input
                  type="text"
                  value={actionRequired}
                  onChange={(e) => setActionRequired(e.target.value)}
                  placeholder="مثال: إحالة للمتابعة القانونية..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                ملخص محتوى الكتاب
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="نص مختصر يلخص مضمون الكتاب..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                ملاحظات
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية أو تنبيهات..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              إضافة / عرض مرفقات الكتاب (PDF / صور)
            </label>
            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-2xl text-center bg-slate-50/50 dark:bg-gray-850 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="file"
                id="letter-attachment-input"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="letter-attachment-input" className="cursor-pointer block space-y-1.5">
                <Upload className="w-6 h-6 text-blue-600 mx-auto" />
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  {file ? file.name : 'اضغط لاختيار أو سحب ملف الكتاب الممسوح ضوئياً'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB (اضغط لتغيير الملف)` : 'PDF أو صور حتى 25 ميجابايت'}
                </div>
              </label>
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-2 text-rose-600 hover:text-rose-700 text-xs font-bold underline"
                >
                  إزالة الملف
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100 dark:border-gray-700">
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-bold"
              isLoading={submitting}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              حفظ القيد
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFields}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              تفريغ الحقول
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
