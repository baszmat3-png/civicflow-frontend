import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { RequestPriority, RequestType } from '../../types';
import { ArrowRight, Save, FileText, User } from 'lucide-react';

export const EditRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, ministries, employees, handleUpdateRequest } = useData();
  const { success, error } = useToast();

  const request = requests.find((r) => r.id === id || r.requestNumber === id);

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('إصدار تصريح');
  const [ministryId, setMinistryId] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('عادي');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [receiveDate, setReceiveDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const initializedIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (request && initializedIdRef.current !== request.id) {
      initializedIdRef.current = request.id;
      setTitle(request.title || '');
      setDetails(request.details || '');
      setRequestType(request.requestType || 'إصدار تصريح');
      setMinistryId(request.ministryId || '');
      setPriority(request.priority || 'عادي');
      setAssignedEmployeeId(request.assignedEmployeeId || '');
      setReceiveDate(request.receiveDate || '');
      setExpectedDate(request.expectedCompletionDate || '');
      setInternalNotes(request.internalNotes || '');
    }
  }, [request]);

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">المعاملة غير موجودة أو تم حذفها</p>
        <Button variant="primary" onClick={() => navigate('/requests')}>
          العودة للطلبات
        </Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const assignedEmp = employees.find((e) => e.id === assignedEmployeeId);
      const selectedMin = ministries.find((m) => m.id === ministryId);

      await handleUpdateRequest(request.id, {
        title,
        details,
        requestType,
        ministryId,
        ministryName: selectedMin?.name || request.ministryName,
        priority,
        assignedEmployeeId,
        assignedEmployeeName: assignedEmp?.name || request.assignedEmployeeName,
        receiveDate,
        expectedCompletionDate: expectedDate,
        internalNotes
      });

      success('تم حفظ التعديلات بنجاح', `تم تحديث بيانات المعاملة #${request.requestNumber}`);
      navigate(`/requests/${request.id}`);
    } catch (err) {
      error('حدث خطأ', 'تعذر حفظ التعديلات');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            تعديل المعاملة #{request.requestNumber}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            صاحب المعاملة: <strong className="text-slate-800">{request.customerName}</strong>
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/requests/${request.id}`)}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          إلغاء والعودة للتفاصيل
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>البيانات الأساسية للمعاملة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="عنوان / الطلب"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: طلب نقل، تظلم، استثناء..."
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="نوع الطلب"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as RequestType)}
                required
              >
                <option value="إصدار تصريح">إصدار تصريح</option>
                <option value="تجديد رخصة">تجديد رخصة</option>
                <option value="طلب شهادة رسمية">طلب شهادة رسمية</option>
                <option value="شكوى وتظلم">شكوى وتظلم</option>
                <option value="استعلام إداري">استعلام إداري</option>
                <option value="طلب إعفاء">طلب إعفاء</option>
                <option value="معاملة توثيق">معاملة توثيق</option>
                <option value="أخرى">أخرى</option>
              </Select>

              <Select
                label="الجهة / الوزارة"
                value={ministryId}
                onChange={(e) => setMinistryId(e.target.value)}
                required
              >
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>

              <Select
                label="الأولوية"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                required
              >
                <option value="عادي">عادي</option>
                <option value="مهم">مهم</option>
                <option value="عاجل">عاجل</option>
              </Select>

              <Select
                label="الموظف المسؤول"
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </Select>

              <Input
                label="تاريخ الاستلام"
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                required
              />

              <Input
                label="الموعد المتوقع للإنجاز"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                تفاصيل ووصف المعاملة
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ملاحظات داخلية
              </label>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/requests/${request.id}`)}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            icon={<Save className="w-4 h-4" />}
          >
            حفظ التعديلات
          </Button>
        </div>
      </form>
    </div>
  );
};
