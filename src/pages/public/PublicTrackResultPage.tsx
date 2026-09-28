import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Clock,
  Building2,
  Calendar,
  Download,
  Printer,
  FileCheck2,
  AlertTriangle,
  FileText,
  Lock,
  Layers,
  KeyRound,
  RotateCw,
  Star,
  CheckCircle
} from 'lucide-react';
import { publicService, OtpRequestResult } from '../../services/publicService';
import { PublicRatingModal } from '../../components/public/PublicRatingModal';

const PUBLIC_STEPS = [
  'استلام الطلب',
  'قيد المراجعة',
  'تم إرسال الطلب للجهة',
  'قيد المعالجة',
  'موافقة',
  'الإجابة جاهزة',
  'تم التسليم'
];

export const PublicTrackResultPage: React.FC = () => {
  const { requestNumber } = useParams<{ requestNumber: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryNumber = requestNumber || searchParams.get('q') || '';
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // OTP Verification State
  const [targetReqForOtp, setTargetReqForOtp] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<OtpRequestResult | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedData, setVerifiedData] = useState<any | null>(null);

  // Rating Modal State
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  useEffect(() => {
    if (!queryNumber) {
      setLoading(false);
      return;
    }

    const fetchTrack = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const data = await publicService.trackRequest(queryNumber);
        setRequest(data);

        // If direct single request match, set it up for OTP verification
        if (!data.isMultiple && data.requestNumber) {
          setTargetReqForOtp(data.requestNumber);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'لم يتم العثور على المعاملة');
        setRequest(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
  }, [queryNumber]);

  // Request OTP dispatch
  const handleRequestOtp = async (reqNum: string) => {
    try {
      setOtpLoading(true);
      setOtpError('');
      setTargetReqForOtp(reqNum);
      const res = await publicService.requestTrackingOtp(reqNum);
      setOtpInfo(res);
    } catch (err: any) {
      setOtpError(err.message || 'فشل إرسال رمز التحقق، يرجى المحاولة لاحقاً');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReqForOtp || !otpCode.trim()) {
      setOtpError('يرجى إدخال رمز التحقق OTP');
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');
      const data = await publicService.verifyTrackingOtp(targetReqForOtp, otpCode.trim());
      setVerifiedData(data);
      setIsVerified(true);
    } catch (err: any) {
      setOtpError(err.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setOtpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-gray-500 font-semibold">جاري الاستعلام عن بيانات المعاملة من المنظومة...</p>
      </div>
    );
  }

  if (!request || errorMsg) {
    return (
      <div className="text-center py-16 space-y-6 max-w-md mx-auto" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">لم يتم العثور على المعاملة</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            لا توجد معاملة مسجلة ببيانات البحث <span className="font-mono font-bold text-slate-800 dark:text-gray-200">{queryNumber}</span>.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/track')}
          icon={<Search className="w-4 h-4" />}
        >
          البحث برقم آخر
        </Button>
      </div>
    );
  }

  // 1. Multiple Requests Selection View
  if (request.isMultiple && request.requests && !targetReqForOtp) {
    return (
      <div className="space-y-6 py-6 max-w-3xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/track')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            بحث جديد
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm space-y-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              نتائج الاستعلام
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              تم العثور على {request.total} معاملة
              {request.customerName ? ` للمراجع (${request.customerName})` : ''}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              اختر المعاملة التي ترغب في متابعة مسارها الإجرائي والاطلاع على مستنداتها:
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {request.requests.map((r: any) => (
              <div
                key={r.requestNumber}
                onClick={() => handleRequestOtp(r.requestNumber)}
                className="p-4 rounded-2xl border border-slate-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                      #{r.requestNumber}
                    </span>
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-gray-100">{r.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{r.ministryName}</span>
                    <span>•</span>
                    <span>تاريخ التقديم: {r.receiveDate}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestOtp(r.requestNumber);
                  }}
                  className="shrink-0 text-xs"
                  icon={<Lock className="w-3.5 h-3.5" />}
                >
                  تتبع المعاملة (رمز التحقق)
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. OTP Verification Lock Screen (If not verified yet)
  if (!isVerified) {
    const activeReqNum = targetReqForOtp || request.requestNumber;
    return (
      <div className="space-y-6 py-10 max-w-md mx-auto" dir="rtl">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (request.isMultiple) {
                setTargetReqForOtp(null);
                setOtpInfo(null);
              } else {
                navigate('/track');
              }
            }}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {request.isMultiple ? 'العودة لنتائج البحث' : 'بحث جديد'}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 text-xs font-bold font-mono">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              المعاملة #{activeReqNum}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              التحقق من هوية صاحب المعاملة
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
              لحماية سرية بيانات ومستندات المراجع، يلزم إدخال رمز التحقق (OTP) الذي يُرسل لرقم الهاتف المسجل في المعاملة.
            </p>
          </div>

          {otpError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 text-right">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          {!otpInfo ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-gray-750 rounded-2xl border border-slate-100 dark:border-gray-700 text-xs text-slate-600 dark:text-gray-300">
                📱 اضغط على الزر أدناه لتلقي رمز التحقق السري فوراً عبر واتساب على رقمك المسجل.
              </div>
              <Button
                variant="primary"
                className="w-full py-3 text-sm font-bold shadow-md shadow-blue-500/20"
                onClick={() => handleRequestOtp(activeReqNum)}
                isLoading={otpLoading}
                icon={<KeyRound className="w-4 h-4" />}
              >
                إرسال رمز التحقق (OTP) عبر واتساب
              </Button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5 pt-2">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                تم إرسال رمز التحقق بنجاح إلى الرقم: <strong className="font-mono text-sm">{otpInfo.maskedPhone}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-2">
                  أدخل رمز التحقق المكون من 6 أرقام:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="------"
                  className="w-full text-center tracking-[0.6em] font-mono font-black text-2xl py-3 rounded-2xl border border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-sm font-bold shadow-md shadow-blue-500/20"
                isLoading={otpLoading}
                disabled={otpCode.length < 4}
              >
                تأكيد والاطلاع على المعاملة
              </Button>

              <button
                type="button"
                onClick={() => handleRequestOtp(activeReqNum)}
                disabled={otpLoading}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-center gap-1.5 mx-auto"
              >
                <RotateCw className={`w-3.5 h-3.5 ${otpLoading ? 'animate-spin' : ''}`} />
                إعادة إرسال رمز التحقق
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 3. Fully Verified Request Details View
  const displayData = verifiedData || request;
  const currentIdx = PUBLIC_STEPS.indexOf(displayData.status);
  const publicDocs = displayData.stageDocuments || displayData.publicDocuments || [];

  return (
    <div className="space-y-6 py-6 max-w-3xl mx-auto" dir="rtl">
      {/* Top action */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (request.isMultiple) {
              setIsVerified(false);
              setTargetReqForOtp(null);
            } else {
              navigate('/track');
            }
          }}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          {request.isMultiple ? 'العودة لنتائج البحث' : 'بحث جديد'}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRatingOpen(true)}
            icon={<Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
          >
            تقييم مستوى الخدمة
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-4 h-4" />}
          >
            طباعة البطاقة
          </Button>
        </div>
      </div>

      {/* Main Status Banner */}
      <Card className="border-blue-200 dark:border-blue-900 overflow-hidden shadow-lg">
        <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-blue-950 p-6 sm:p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="text-xl sm:text-2xl font-black font-mono text-blue-300">
              #{displayData.requestNumber}
            </span>
            <StatusBadge status={displayData.status} size="lg" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{displayData.title}</h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
            {displayData.customerName && (
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                المراجع: <strong className="text-white">{displayData.customerName}</strong>
              </span>
            )}
            {displayData.ministryName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  الجهة: <strong className="text-white">{displayData.ministryName}</strong>
                </span>
              </>
            )}
            {displayData.requestType && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  النوع: <strong className="text-white">{displayData.requestType}</strong>
                </span>
              </>
            )}
            {displayData.receiveDate && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  تاريخ التقديم: <strong className="text-white font-mono">{displayData.receiveDate}</strong>
                </span>
              </>
            )}
            {displayData.expectedCompletionDate && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  الموعد المتوقع: <strong className="text-white font-mono">{displayData.expectedCompletionDate}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Public Timeline & Stage Documents */}
        <CardContent className="p-6 sm:p-8 space-y-6">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            المسار الإجرائي للمعاملة
          </h3>

          <div className="relative border-r-2 border-slate-200 dark:border-gray-700 pr-6 mr-3 space-y-6">
            {PUBLIC_STEPS.map((step, idx) => {
              const isPassed = currentIdx > idx;
              const isCurrent = displayData.status === step;

              let nodeColor = 'bg-slate-100 dark:bg-gray-700 border-slate-300 dark:border-gray-600 text-slate-400';
              if (isPassed) {
                nodeColor = 'bg-emerald-600 border-emerald-600 text-white shadow-xs';
              } else if (isCurrent) {
                nodeColor = 'bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900';
              }

              return (
                <div key={step} className="relative">
                  <div
                    className={`absolute -right-[35px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${nodeColor}`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isCurrent ? (
                      <Circle className="w-2.5 h-2.5 fill-current" />
                    ) : (
                      <Circle className="w-2 h-2" />
                    )}
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : isPassed
                        ? 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'
                        : 'bg-white dark:bg-gray-800/40 border-slate-100 dark:border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800 dark:text-gray-200">{step}</span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                          المرحلة الحالية
                        </span>
                      )}
                      {isPassed && (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">مكتمل ✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rejection notice if rejected */}
          {displayData.status === 'مرفوض' && (
            <div className="mt-6 p-5 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-300 dark:border-rose-800 rounded-2xl space-y-2">
              <h4 className="font-bold text-rose-950 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                تم رفض المعاملة
              </h4>
              <p className="text-xs text-rose-900 dark:text-rose-200 font-medium">
                {displayData.rejectionReason || 'تعذر استكمال المعاملة لعدم استيفاء الشروط والضوابط النظامية المطلوبة.'}
              </p>
            </div>
          )}

          {/* Decision Box (if final response ready) */}
          {displayData.finalResponse && (
            <div className="mt-8 p-5 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200">القرار الرسمي الصادر</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                  {displayData.finalResponse.decision}
                </span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                {displayData.finalResponse.summary}
              </p>
              {displayData.finalResponse.documentNumber && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-mono">
                  رقم الوثيقة الرسمية: <strong>{displayData.finalResponse.documentNumber}</strong>
                </p>
              )}
            </div>
          )}

          {/* Public Stage Documents Available for Download */}
          {publicDocs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                المستندات والقرارات المتاحة للتحميل
              </h4>
              <div className="space-y-2">
                {publicDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-750 border border-slate-200 dark:border-gray-700 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">{doc.type || 'وثيقة رسمية'}</p>
                      </div>
                    </div>

                    <a
                      href={publicService.downloadAttachmentUrl(doc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تنزيل الوثيقة
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating Modal */}
      <PublicRatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        requestNumber={displayData.requestNumber}
        customerName={displayData.customerName}
      />
    </div>
  );
};
