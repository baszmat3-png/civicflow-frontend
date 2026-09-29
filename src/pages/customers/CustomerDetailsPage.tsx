import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge, DeadlineBadge } from '../../components/common/PriorityBadge';
import { StatCard } from '../../components/common/StatCard';
import {
  User,
  Phone,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit,
  ArrowRight,
  Flame,
  Mail,
  Shield
} from 'lucide-react';

export const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, requests } = useData();
  const { canUpdateCustomer, canCreateRequest } = usePermissions();

  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 mb-4">المراجع غير موجود أو تم حذفه</p>
        <Button variant="primary" onClick={() => navigate('/customers')}>
          العودة للمراجعين
        </Button>
      </div>
    );
  }

  // Related requests
  const customerRequests = requests.filter(
    (r) => r.customerId === customer.id || r.customerPhone === customer.phone || r.customerName === customer.name
  );

  const completedCount = customerRequests.filter(
    (r) => r.status === 'تم التسليم' || r.status === 'مغلق' || r.status === 'الإجابة جاهزة'
  ).length;

  const inProgressCount = customerRequests.filter(
    (r) => r.status === 'قيد المعالجة' || r.status === 'قيد المراجعة' || r.status === 'تم إرسال الطلب للجهة'
  ).length;

  const overdueCount = customerRequests.filter((r) => r.deadlineStatus === 'متأخر').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/customers')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{customer.name}</h1>
              <StatusBadge status={customer.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              تاريخ التسجيل: <span className="font-mono font-bold">{customer.createdAt}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdateCustomer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              icon={<Edit className="w-4 h-4" />}
            >
              تعديل الملف
            </Button>
          )}
          {canCreateRequest && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/requests/new`)}
              icon={<Plus className="w-4 h-4" />}
            >
              + إضافة معاملة جديدة
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info & 4 Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الطلبات"
          value={customerRequests.length}
          subtitle="كافة المعاملات"
          icon={<FileText className="w-5 h-5" />}
          color="slate"
        />
        <StatCard
          title="مكتملة ومسلمة"
          value={completedCount}
          subtitle="معاملات منجزة"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="قيد المعالجة"
          value={inProgressCount}
          subtitle="جاري المتابعة"
          icon={<Clock className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="طلبات متأخرة"
          value={overdueCount}
          subtitle="تجاوزت SLA"
          icon={<Flame className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="bg-slate-50/70">
          <CardTitle className="text-base">بيانات المراجع والتواصل</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">رقم هاتف واتساب</span>
            <p className="font-bold text-slate-800 font-mono text-sm">{customer.phone}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">رقم الهاتف اتصال</span>
            <p className="font-bold text-slate-800 font-mono text-sm">{customer.altPhone || '---'}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">رقم الهوية الوطنية / البطاقة الموحدة</span>
            <p className="font-bold text-slate-800 font-mono text-sm">{customer.nationalId || '---'}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">البريد الإلكتروني</span>
            <p className="font-bold text-slate-800 font-mono text-sm">{customer.email || '---'}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">المهنة / العمل</span>
            <p className="font-bold text-slate-800 text-sm">{customer.occupation || '---'}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">سنة الميلاد</span>
            <p className="font-bold text-slate-800 font-mono text-sm">{customer.birthYear || '---'}</p>
          </div>

          <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">عنوان السكن / أقرب نقطة دالة</span>
            <p className="font-bold text-slate-800">{customer.address || '---'}</p>
          </div>

          <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block mb-1">ملاحظات إضافية</span>
            <p className="font-bold text-slate-800">{customer.notes || 'لا توجد ملاحظات مسجلة.'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Related Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>طلبات ومعاملات المراجع ({customerRequests.length})</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">اضغط على أي معاملة لعرض تفاصيلها ومسارها الزمني</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/requests/new?customerId=${customer.id}`)}
              icon={<Plus className="w-4 h-4" />}
            >
              + إضافة معاملة
            </Button>
          </div>
        </CardHeader>

        {customerRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            لا توجد معاملات مسجلة لهذا المراجع بعد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">رقم الطلب</th>
                  <th className="py-3 px-4 font-bold">عنوان المعاملة</th>
                  <th className="py-3 px-4 font-bold">الجهة</th>
                  <th className="py-3 px-4 font-bold">الحالة</th>
                  <th className="py-3 px-4 font-bold">الأولوية</th>
                  <th className="py-3 px-4 font-bold">تاريخ الاستلام</th>
                  <th className="py-3 px-4 font-bold">الموعد المتوقع</th>
                  <th className="py-3 px-4 font-bold">الحالة الزمنية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/requests/${req.id}`)}
                    className="hover:bg-blue-50/40 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-bold text-blue-600 font-mono group-hover:underline">
                      {req.requestNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {req.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{req.ministryName}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{req.receiveDate}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-bold font-mono">
                      {req.expectedCompletionDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <DeadlineBadge
                        status={req.deadlineStatus}
                        daysRemainingOrOverdue={req.daysRemainingOrOverdue}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
