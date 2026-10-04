import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge, DeadlineBadge } from '../../components/common/PriorityBadge';
import { RequestTimeline } from '../../components/request/RequestTimeline';
import { ChangeStatusModal } from '../../components/request/ChangeStatusModal';
import { AddAttachmentModal } from '../../components/request/AddAttachmentModal';
import { AddFinalResponseModal } from '../../components/request/AddFinalResponseModal';
import { SendNotificationModal } from '../../components/request/SendNotificationModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { addRequestAttachment, addFinalResponse } from '../../services/api';
import { requestService } from '../../services/requestService';
import { exportRequestItemToWord } from '../../services/wordExportService';
import { usePermissions } from '../../hooks/usePermissions';
import {
  User,
  Phone,
  Building2,
  Calendar,
  Clock,
  Printer,
  Edit,
  RefreshCw,
  Paperclip,
  Award,
  Send,
  Trash2,
  FileCheck2,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Download,
  FileDown
} from 'lucide-react';

export const RequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, refreshData, handleDeleteRequest, handleChangeStatus, auditLogs } = useData();
  const { success, error: toastError } = useToast();
  const {
    canUpdateRequest,
    canDeleteRequest,
    canChangeStatus,
    canUploadAttachments,
    canFinalResponse,
    canSendWhatsApp
  } = usePermissions();

  const request = requests.find((r) => r.id === id || r.requestNumber === id);

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isFinalResponseModalOpen, setIsFinalResponseModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4 text-base">المعاملة غير موجودة في النظام أو تم حذفها.</p>
        <Button variant="primary" onClick={() => navigate('/requests')}>
          العودة لقائمة الطلبات
        </Button>
      </div>
    );
  }

  // Related audit logs
  const relatedLogs = auditLogs.filter(
    (l) => l.requestNumber === request.requestNumber || l.details.includes(request.requestNumber)
  );

  const handlePrint = () => {
    window.print();
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await handleDeleteRequest(request.id);
      success('تم حذف المعاملة', `تم حذف الطلب ${request.requestNumber} بنجاح`);
      navigate('/requests');
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Breadcrumb & Print-hidden bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/requests" className="hover:text-blue-600">
            الطلبات والمعاملات
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-800">{request.requestNumber}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/requests')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة للقائمة
          </Button>
          <Link
            to={`/track/${request.requestNumber}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
          >
            <span>عرض في بوابة المراجع</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Request Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl sm:text-2xl font-black font-mono text-blue-600">
              #{request.requestNumber}
            </span>
            <StatusBadge status={request.status} size="lg" />
            <PriorityBadge priority={request.priority} />
            <DeadlineBadge
              status={request.deadlineStatus}
              daysRemainingOrOverdue={request.daysRemainingOrOverdue}
            />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">{request.title}</h1>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
            <span>
              الجهة: <strong className="text-slate-700">{request.ministryName}</strong>
            </span>
            <span>•</span>
            <span>
              الموظف المسؤول:{' '}
              <strong className="text-slate-700">{request.assignedEmployeeName}</strong>
            </span>
            <span>•</span>
            <span>
              تاريخ التقديم: <strong className="text-slate-700 font-mono">{request.receiveDate}</strong>
            </span>
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto print:hidden">
          {canChangeStatus && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              تغيير الحالة
            </Button>
          )}

          {canUploadAttachments && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAttachmentModalOpen(true)}
              icon={<Paperclip className="w-4 h-4" />}
            >
              إضافة مرفق
            </Button>
          )}

          {canFinalResponse && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFinalResponseModalOpen(true)}
              icon={<Award className="w-4 h-4 text-emerald-600" />}
            >
              إضافة إجابة نهائية
            </Button>
          )}

          {canSendWhatsApp && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNotificationModalOpen(true)}
              icon={<Send className="w-4 h-4 text-blue-600" />}
            >
              إرسال إشعار
            </Button>
          )}

          {canUpdateRequest && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/requests/${request.id}/edit`)}
              icon={<Edit className="w-4 h-4" />}
            >
              تعديل
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                setIsExportingWord(true);
                await exportRequestItemToWord(request);
                success('تم تجهيز ملف Word', 'تم تصدير وتحميل مستند المعاملة بصيغة Word (.docx) بنجاح.');
              } catch (err: any) {
                toastError('فشل التصدير', err?.message || 'حدث خطأ أثناء تصدير ملف Word');
              } finally {
                setIsExportingWord(false);
              }
            }}
            isLoading={isExportingWord}
            icon={<FileText className="w-4 h-4 text-blue-600" />}
            className="border-blue-200 text-blue-800 hover:bg-blue-50 font-bold"
            title="تصدير وطباعة تفاصيل المعاملة إلى ملف Word (.docx)"
          >
            طباعة Word
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
            طباعة
          </Button>

          {canDeleteRequest && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200"
              title="حذف المعاملة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right 2 Columns: Details, Timeline, Final Response */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Final Response Decision (if present) */}
          {request.finalResponse && (
            <Card className="border-emerald-200 bg-emerald-50/20">
              <CardHeader className="bg-emerald-50/70 border-emerald-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <CardTitle className="text-emerald-950">الإجابة الرسمية والقرار النهائي المعتمد</CardTitle>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {request.finalResponse.decision}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  {request.finalResponse.summary}
                </p>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t border-emerald-100 text-emerald-900">
                  <div>
                    <span className="text-emerald-700">رقم الصادر / الوثيقة:</span>
                    <p className="font-bold font-mono mt-0.5">{request.finalResponse.documentNumber || 'بدون رقم'}</p>
                  </div>
                  <div>
                    <span className="text-emerald-700">تاريخ الاعتماد:</span>
                    <p className="font-bold font-mono mt-0.5">{request.finalResponse.issuedAt}</p>
                  </div>
                  <div>
                    <span className="text-emerald-700">الموظف المعتمد:</span>
                    <p className="font-bold mt-0.5">{request.finalResponse.issuedBy}</p>
                  </div>
                </div>

                {request.finalResponse.attachmentName && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800">{request.finalResponse.attachmentName}</span>
                    </div>
                    <span className="text-emerald-600 font-bold">وثيقة جاهزة للتحميل</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section 2: Request Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle>تفاصيل المعاملة والوصف</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-normal">
                {request.details || 'لا يوجد وصف تفصيلي إضافي للمعاملة.'}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-1">نوع الطلب</span>
                  <p className="font-bold text-slate-800">{request.requestType}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-1">الجهة المعنية</span>
                  <p className="font-bold text-slate-800">{request.ministryName}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-1">تاريخ الاستلام</span>
                  <p className="font-bold text-slate-800 font-mono">{request.receiveDate}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-1">الموعد المتوقع (SLA)</span>
                  <p className="font-bold text-slate-800 font-mono">{request.expectedCompletionDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Timeline of Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <CardTitle>المسار الزمني وتاريخ الإجراءات (Timeline)</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="print:hidden"
                >
                  + تحديث الحالة
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RequestTimeline currentStatus={request.status} events={request.timeline} />
            </CardContent>
          </Card>

          {/* Section 5: Attachments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-blue-600" />
                  <CardTitle>المرفقات والوثائق ({request.attachments.length})</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAttachmentModalOpen(true)}
                  className="print:hidden"
                >
                  + إضافة مرفق
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {request.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {request.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {att.type}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 truncate">{att.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {att.size} • بواسطة {att.uploadedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              await requestService.downloadAttachment(att.id, att.name);
                              success('تم التحميل', `تم تحميل الملف: ${att.name}`);
                            } catch {
                              // Handled via toast or API
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-bold text-[11px]"
                          title="عرض وتحميل المرفق"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  لا توجد مرفقات مرتبطة بهذه المعاملة حتى الآن.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Left 1 Column: Customer Details, SLA Status, Internal Notes, Audit Log */}
        <div className="space-y-6">
          {/* Section 1: Customer Info Card */}
          <Card>
            <CardHeader className="bg-slate-50/70">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm">بيانات المراجع</CardTitle>
                </div>
                <Link
                  to={`/customers/${request.customerId}`}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  عرض ملفه
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">الاسم الكامل:</span>
                <p className="font-bold text-sm text-slate-900 mt-0.5">{request.customerName}</p>
              </div>

              <div>
                <span className="text-slate-400">رقم هاتف واتساب:</span>
                <p className="font-bold text-slate-800 font-mono mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  {request.customerPhone}
                </p>
              </div>

              {request.customerAddress && (
                <div>
                  <span className="text-slate-400">عنوان السكن / أقرب نقطة دالة:</span>
                  <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {request.customerAddress}
                  </p>
                </div>
              )}

              {request.customerOccupation && (
                <div>
                  <span className="text-slate-400">المهنة / العمل:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{request.customerOccupation}</p>
                </div>
              )}

              {request.customerBirthYear && (
                <div>
                  <span className="text-slate-400">سنة الميلاد:</span>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">{request.customerBirthYear}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-blue-700"
                  onClick={() => setIsNotificationModalOpen(true)}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  إرسال رسالة للمراجع
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: SLA Deadline Card */}
          <Card>
            <CardHeader className="bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm">محددات المدة الزمنية (SLA)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500">الحالة الزمنية:</span>
                <DeadlineBadge
                  status={request.deadlineStatus}
                  daysRemainingOrOverdue={request.daysRemainingOrOverdue}
                />
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>تاريخ الاستلام:</span>
                  <span className="font-bold font-mono text-slate-900">{request.receiveDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>الموعد المتوقع:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {request.expectedCompletionDate}
                  </span>
                </div>
                {request.completedDate && (
                  <div className="flex items-center justify-between text-emerald-700 font-bold">
                    <span>تاريخ الإنجاز الفعلي:</span>
                    <span className="font-mono">{request.completedDate}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Internal Notes */}
          <Card>
            <CardHeader className="bg-slate-50/70">
              <CardTitle className="text-sm">الملاحظات الداخلية (خاصة)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
                {request.internalNotes || 'لا توجد ملاحظات داخلية مسجلة.'}
              </p>
            </CardContent>
          </Card>

          {/* Section 8: Activity Log on this Request */}
          <Card>
            <CardHeader className="bg-slate-50/70">
              <CardTitle className="text-sm">سجل العمليات على الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedLogs.length > 0 ? (
                relatedLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="text-xs pb-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                      <span>{log.userName}</span>
                      <span>{log.date} {log.time}</span>
                    </div>
                    <p className="font-semibold text-slate-700 mt-0.5">{log.action}</p>
                    <p className="text-slate-500 mt-0.5">{log.details}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">لا توجد عمليات مسجلة حديثاً</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODALS */}
      {isStatusModalOpen && (
        <ChangeStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          request={request}
          onSubmit={async (newStatus, note, file, rejectionReason) => {
            await handleChangeStatus(request.id, newStatus, note, file, rejectionReason);
            success('تم تحديث الحالة', `أصبحت حالة الطلب الآن (${newStatus})`);
          }}
        />
      )}

      {isAttachmentModalOpen && (
        <AddAttachmentModal
          isOpen={isAttachmentModalOpen}
          onClose={() => setIsAttachmentModalOpen(false)}
          onSubmit={async (attachments) => {
            await Promise.all(
              attachments.map((att) => addRequestAttachment(request.id, att))
            );
            await refreshData();
            success(
              'تم رفع المستندات',
              attachments.length > 1
                ? `تمت إضافة (${attachments.length}) مستندات بنجاح`
                : `تمت إضافة المستند بنجاح`
            );
          }}
        />
      )}

      {isFinalResponseModalOpen && (
        <AddFinalResponseModal
          isOpen={isFinalResponseModalOpen}
          onClose={() => setIsFinalResponseModalOpen(false)}
          request={request}
          onSubmit={async (resp) => {
            await addFinalResponse(request.id, resp);
            await refreshData();
            success('تم اعتماد الإجابة النهائية', 'تم تسجيل القرار ونقل المعاملة إلى حالة الإجابة جاهزة');
          }}
        />
      )}

      {isNotificationModalOpen && (
        <SendNotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          request={request}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف المعاملة نهائياً"
        message={`هل أنت متأكد من حذف المعاملة #${request.requestNumber}؟ سيتم حذف جميع المرفقات والمسار الزمني المرتبط.`}
        confirmText="حذف المعاملة"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
