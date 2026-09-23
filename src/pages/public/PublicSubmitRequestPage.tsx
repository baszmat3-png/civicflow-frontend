import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  User,
  Building2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Lock,
  ArrowRight,
  File as FileIcon,
  X,
  Plus,
  ShieldCheck,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { publicService, PublicSubmissionResult } from '../../services/publicService';
import { authService } from '../../services/authService';
import { City, Ministry, RequestTypeEntity } from '../../types';
import { IRAQI_GOVERNORATES } from '../../constants/iraqGovernorates';
import { calculateFileSha256, validateFileBeforeUpload } from '../../utils/fileChecksum';

interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: string;
  documentType: 'IDENTITY' | 'REQUEST_DOCUMENT';
}

export const PublicSubmitRequestPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [occupation, setOccupation] = useState<'موظف حكومي' | 'كاسب' | 'طالب' | 'عاطل عن العمل' | 'قطاع خاص' | 'أخرى' | string>('كاسب');
  const [birthYear, setBirthYear] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>(IRAQI_GOVERNORATES[8]); // Default to بغداد
  const [address, setAddress] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [requestTypeId, setRequestTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  // Uploaded Files State (Matching Image 5 layout)
  const [uploadFiles, setUploadFiles] = useState<UploadItem[]>([]);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const requestInputRef = useRef<HTMLInputElement>(null);
  const genericInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Dynamic Options
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestTypeEntity[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<PublicSubmissionResult | null>(null);
  const [copied, setCopied] = useState(false);

  // WhatsApp OTP Verification
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [showPhoneOtpModal, setShowPhoneOtpModal] = useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldownSeconds > 0) {
      timer = setTimeout(() => setCooldownSeconds((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleSendPhoneOtp = async () => {
    if (!phone || phone.trim().length < 8) {
      setPhoneOtpError('يرجى إدخال رقم هاتف واتساب صحيح أولاً');
      return;
    }
    setIsSendingPhoneOtp(true);
    setPhoneOtpError('');
    try {
      await authService.sendPhoneVerificationOTP(phone.trim());
      setShowPhoneOtpModal(true);
      setCooldownSeconds(60);
    } catch (err: any) {
      setPhoneOtpError(err.message || 'تعذر إرسال رمز التحقق عبر الواتساب');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpInput || phoneOtpInput.trim().length !== 6) {
      setPhoneOtpError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }
    setIsVerifyingPhoneOtp(true);
    setPhoneOtpError('');
    try {
      await authService.verifyPhoneOTP(phone.trim(), phoneOtpInput.trim());
      setIsPhoneVerified(true);
      setShowPhoneOtpModal(false);
    } catch (err: any) {
      setPhoneOtpError(err.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoadingData(true);
        const data = await publicService.getFormData();
        const mins = data.ministries || [];
        const cts = data.cities || [];
        const rTypes = data.requestTypes || [];
        setMinistries(mins);
        setCities(cts);
        setRequestTypes(rTypes);
        if (mins.length > 0) setMinistryId(mins[0].id);
        if (rTypes.length > 0) setRequestTypeId(rTypes[0].id);
      } catch (err: any) {
        console.error('Error loading public form data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadFormData();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `MB ${(bytes / (1024 * 1024)).toFixed(1)}`;
    return `KB ${Math.max(1, Math.round(bytes / 1024))}`;
  };

  const addFiles = (files: FileList | null, defaultType: 'IDENTITY' | 'REQUEST_DOCUMENT') => {
    if (!files || files.length === 0) return;
    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file: f,
      name: f.name,
      size: formatFileSize(f.size),
      documentType: defaultType
    }));
    setUploadFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleDocType = (id: string, newType: 'IDENTITY' | 'REQUEST_DOCUMENT') => {
    setUploadFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, documentType: newType } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !phone.trim()) {
      setErrorMessage('يرجى إدخال الاسم ورقم الهاتف للتواصل واستلام الإشعار');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSubmitting(true);

      // Validate all files and compute SHA-256 checksums
      const checksumsMap: Record<string, string> = {};
      for (const item of uploadFiles) {
        const check = validateFileBeforeUpload(item.file, 50);
        if (!check.valid) {
          setErrorMessage(check.error || 'أحد الملفات المرفقة غير صالح');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsSubmitting(false);
          return;
        }
        const hash = await calculateFileSha256(item.file);
        if (hash) {
          checksumsMap[item.file.name] = hash;
        }
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      if (altPhone.trim()) formData.append('altPhone', altPhone.trim());
      if (nationalId.trim()) formData.append('nationalId', nationalId.trim());
      formData.append('occupation', occupation || 'كاسب');
      formData.append('birthYear', birthYear.trim() || '2000');
      formData.append('address', address.trim() || selectedGovernorate || 'بغداد');

      // Match city by selected governorate name or ID
      const matchedCity = cities.find(
        (c) => c.name === selectedGovernorate || c.id === selectedGovernorate
      );
      if (matchedCity) {
        formData.append('cityId', matchedCity.id);
      } else if (selectedGovernorate) {
        formData.append('cityId', selectedGovernorate);
      }

      if (ministryId) formData.append('ministryId', ministryId);
      if (requestTypeId) formData.append('requestTypeId', requestTypeId);
      formData.append('title', title.trim() || 'طلب مراجع عبر البوابة الإلكترونية');
      if (details.trim()) formData.append('details', details.trim());

      // Send checksums map for backend verification
      if (Object.keys(checksumsMap).length > 0) {
        formData.append('fileChecksums', JSON.stringify(checksumsMap));
      }

      // Append classified files (deduplicating by file object)
      const appendedFiles = new Set<string>();
      uploadFiles.forEach((item) => {
        const fileKey = `${item.file.name}_${item.file.size}_${item.documentType}`;
        if (appendedFiles.has(fileKey)) return;
        appendedFiles.add(fileKey);

        if (item.documentType === 'IDENTITY') {
          formData.append('identityFiles', item.file);
        } else {
          formData.append('requestFiles', item.file);
        }
      });

      const res = await publicService.submitRequest(formData);
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message || 'تعذر تقديم الطلب، يرجى مراجعة البيانات والمحاولة مجدداً';
      if (msg === 'Invalid input' || msg.includes('Invalid input') || msg.includes('VALIDATION_ERROR')) {
        msg = 'يرجى التأكد من إدخال الاسم ورقم الهاتف بشكل صحيح';
      }
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyTracking = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.requestNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 flex items-center justify-center" dir="rtl">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-slate-100 dark:border-gray-700 p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">تم تقديم طلبك بنجاح!</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            تم استلام طلبك وقيده في المنظومة، يمكنك متابعة حالة الطلب في أي وقت باستخدام رقم المعاملة أدناه
          </p>

          {/* Request Card */}
          <div className="bg-slate-50 dark:bg-gray-750 p-5 rounded-2xl border border-slate-200 dark:border-gray-700 mb-6 text-right space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">رقم المعاملة:</span>
              <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">{result.requestNumber}</span>
            </div>
            {result.customerNumber && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">رقم المراجع:</span>
                <span className="text-xs font-bold font-mono text-gray-700 dark:text-gray-300">{result.customerNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">الحالة الحالية:</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {result.status || 'استلام الطلب'}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCopyTracking}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'تم نسخ الرقم!' : 'نسخ رقم المعاملة'}
            </button>

            <Link
              to={`/track/${result.requestNumber}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              متابعة حالة الطلب الآن
            </Link>

            <button
              onClick={() => {
                setResult(null);
                setTitle('');
                setDetails('');
                setUploadFiles([]);
              }}
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition mt-2 block mx-auto cursor-pointer"
            >
              تقديم طلب آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">CivicFlow</h2>
              <p className="text-[11px] text-slate-500 dark:text-gray-400">بوابة تقديم ومتابعة المعاملات الحكومية</p>
            </div>
          </div>
          <Link
            to="/track"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            متابعة معاملة سابقة <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        {/* Hero Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-gray-700 shadow-sm">
          <div className="border-b border-slate-100 dark:border-gray-700 pb-5 mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">بوابة تقديم المعاملات والطلبات</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1.5 leading-relaxed">
              يرجى إدخال بياناتك بدقة وإرفاق المستندات المطلوبة لتسهيل معالجة طلبك لدى الجهات المختصة
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Citizen Information */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                بيانات مقدم الطلب (المراجع)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    الاسم الكامل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: عباس محمد"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                      رقم هاتف واتساب <span className="text-rose-500">*</span>
                    </label>
                    {isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        موثق عبر واتساب ✓
                      </span>
                    ) : phone.trim().length >= 8 ? (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={isSendingPhoneOtp || cooldownSeconds > 0}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {isSendingPhoneOtp ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>جاري الإرسال...</span>
                          </>
                        ) : cooldownSeconds > 0 ? (
                          <span>إعادة الإرسال بعد ({cooldownSeconds}ث)</span>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تأكيد بـ رمز OTP</span>
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (isPhoneVerified) setIsPhoneVerified(false);
                    }}
                    placeholder="077********"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border ${
                      isPhoneVerified
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700'
                    } text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-right`}
                  />

                  {/* Inline OTP Verification Box */}
                  {showPhoneOtpModal && !isPhoneVerified && (
                    <div className="mt-2 p-3 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-right animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          أدخل رمز التحقق (OTP) المرسل لواتساب
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPhoneOtpModal(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {phoneOtpError && (
                        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          {phoneOtpError}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          maxLength={6}
                          value={phoneOtpInput}
                          onChange={(e) => setPhoneOtpInput(e.target.value)}
                          placeholder="123456"
                          className="w-28 px-3 py-1.5 text-center text-sm font-bold font-mono tracking-widest rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPhoneOtp}
                          disabled={isVerifyingPhoneOtp || phoneOtpInput.length < 6}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 cursor-pointer"
                        >
                          {isVerifyingPhoneOtp ? 'جاري التحقق...' : 'تأكيد الرمز'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={isSendingPhoneOtp || cooldownSeconds > 0}
                          className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {cooldownSeconds > 0 ? `(${cooldownSeconds}ث)` : 'إعادة إرسال'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    رقم الهاتف اتصال (اختياري)
                  </label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="078********"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    رقم الهوية الوطنية / البطاقة الموحدة
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="19xxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    العمل / المهنة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">اختر المهنة...</option>
                    <option value="موظف حكومي">موظف حكومي</option>
                    <option value="كاسب">كاسب</option>
                    <option value="طالب">طالب</option>
                    <option value="عاطل عن العمل">عاطل عن العمل</option>
                    <option value="قطاع خاص">قطاع خاص</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    المواليد (سنة الميلاد) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="مثال: 1995"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    المحافظة <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(قائمة محافظات العراق الـ 19)</span>
                  </label>
                  <select
                    required
                    value={selectedGovernorate}
                    onChange={(e) => setSelectedGovernorate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    {IRAQI_GOVERNORATES.map((gov, idx) => (
                      <option key={gov} value={gov}>
                        {idx + 1}. {gov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    عنوان السكن / أقرب نقطة دالة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="المحافظة، الحي، أقرب نقطة دالة..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="pt-4 border-t border-slate-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                تفاصيل المعاملة والجهة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    الجهة الحكومية / الوزارة المعنية <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={ministryId}
                    onChange={(e) => setMinistryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">اختر الجهة...</option>
                    {ministries.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    نوع الطلب / المعاملة
                  </label>
                  <select
                    value={requestTypeId}
                    onChange={(e) => setRequestTypeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">اختر نوع الطلب...</option>
                    {requestTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    عنوان / الطلب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: طلب نقل، تظلم، استثناء..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    شرح وتفاصيل الطلب
                  </label>
                  <textarea
                    rows={4}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="تفاصيل المعاملة، التوضيحات، وأي أرقام سابقة..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-900 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Attachments Section - Matching Image 5 Exact Design */}
            <div className="pt-4 border-t border-slate-100 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  المرفقات والمستندات (إمكانية رفع أكثر من مستند)
                </h3>
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                  {uploadFiles.length > 0 ? `(${uploadFiles.length} مستندات محددة)` : 'اختياري'}
                </span>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>حماية الخصوصية: وثائق الهوية مشفرة ومحمية ولا تظهر في صفحة التتبع العامة للمراجعين</span>
              </div>

              {/* Hidden Inputs */}
              <input
                type="file"
                ref={identityInputRef}
                multiple
                accept=".pdf,image/*"
                onChange={(e) => {
                  addFiles(e.target.files, 'IDENTITY');
                  if (identityInputRef.current) identityInputRef.current.value = '';
                }}
                className="hidden"
              />

              <input
                type="file"
                ref={requestInputRef}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={(e) => {
                  addFiles(e.target.files, 'REQUEST_DOCUMENT');
                  if (requestInputRef.current) requestInputRef.current.value = '';
                }}
                className="hidden"
              />

              <input
                type="file"
                ref={genericInputRef}
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => {
                  addFiles(e.target.files, 'REQUEST_DOCUMENT');
                  if (genericInputRef.current) genericInputRef.current.value = '';
                }}
                className="hidden"
              />

              {/* Quick Action Upload Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => identityInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-900/10 text-xs font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-50 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  + إضافة صور / ملفات الهوية (سري ومحمي)
                </button>

                <button
                  type="button"
                  onClick={() => requestInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 text-xs font-bold text-blue-900 dark:text-blue-300 hover:bg-blue-50 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  + إضافة مستندات وخطاب المعاملة
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addFiles(e.dataTransfer.files, 'REQUEST_DOCUMENT');
                }}
                onClick={() => genericInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20'
                    : 'border-slate-300 dark:border-gray-600 hover:border-blue-500 bg-slate-50/50 dark:bg-gray-750'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200 mb-1">
                  اسحب وأفلت الملفات هنا، أو <span className="text-blue-600 dark:text-blue-400 hover:underline">اضغط لاختيار الملفات من جهازك</span>
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-gray-400">
                  يدعم صور الهويات (JPG, PNG)، ومستندات PDF، Word، Excel حتى 10MB لكل ملف
                </p>
              </div>

              {/* Uploaded Files List (Matching Image 5) */}
              {uploadFiles.length > 0 && (
                <div className="space-y-2.5 pt-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-gray-200">
                      الملفات المرفقة الجاهزة للرفع ({uploadFiles.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadFiles([])}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      حذف الكل
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {uploadFiles.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs flex flex-col gap-2 transition hover:border-blue-300"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <FileIcon className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-bold text-xs text-slate-800 dark:text-gray-200 truncate" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">
                              ({item.size})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                            title="حذف المرفق"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* File Classification Selector */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-gray-700 text-[11px]">
                          <select
                            value={item.documentType}
                            onChange={(e) => handleToggleDocType(item.id, e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 rounded-lg py-1 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="IDENTITY">صورة هوية / بطاقة موحدة (سري ومحمي)</option>
                            <option value="REQUEST_DOCUMENT">مستند معاملة / خطاب ثبوتي</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button & Confirmation Bar */}
            <div className="pt-6 border-t border-slate-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-gray-400">
                {uploadFiles.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> سيتم إرفاق {uploadFiles.length} مستندات مع الطلب
                  </span>
                ) : (
                  <span>لم يتم إرفاق ملفات (اختياري)</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-9 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري تسجيل الطلب ورفع المستندات...</span>
                  </>
                ) : (
                  'إرسال الطلب واعتماد المعاملة'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

