import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Customer } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Plus,
  Search,
  Eye,
  Edit,
  FilePlus,
  Phone,
  MapPin,
  Building,
  ChevronLeft,
  Calendar
} from 'lucide-react';

export const CustomersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { customers, requests } = useData();
  const { canCreateCustomer, canUpdateCustomer } = usePermissions();

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.nationalId && c.nationalId.includes(q)) ||
        c.address.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">سجل المراجعين</h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة قاعدة بيانات المراجعين وتاريخ معاملاتهم وتفاصيل الاتصال
          </p>
        </div>

        {canCreateCustomer && (
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/customers/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            + إضافة مراجع جديد
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ابحث بالاسم، رقم هاتف واتساب، رقم الهوية الوطنية، أو العنوان..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition"
          />
        </div>
      </div>

      {/* Customers Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {paginatedCustomers.length === 0 ? (
          <EmptyState
            title="لم يتم العثور على مراجعين"
            description="جرب البحث بكلمات أخرى أو قم بإضافة مراجع جديد إلى النظام."
            actionText="+ إضافة مراجع جديد"
            onAction={() => navigate('/customers/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-bold">اسم المراجع</th>
                  <th className="py-3.5 px-4 font-bold">رقم هاتف واتساب</th>
                  <th className="py-3.5 px-4 font-bold">رقم الهوية</th>
                  <th className="py-3.5 px-4 font-bold">عنوان السكن</th>
                  <th className="py-3.5 px-4 font-bold text-center">عدد الطلبات</th>
                  <th className="py-3.5 px-4 font-bold">آخر طلب</th>
                  <th className="py-3.5 px-4 font-bold">تاريخ التسجيل</th>
                  <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((cust) => {
                  const actualCustRequests = requests.filter((r) => r.customerId === cust.id);
                  const custReqCount = actualCustRequests.length || cust.requestsCount || 0;
                  const latestReqDate = actualCustRequests[0]?.receiveDate || cust.lastRequestDate || '---';

                  return (
                    <tr
                      key={cust.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        navigate(`/customers/${cust.id}`);
                      }}
                      className="hover:bg-blue-50/30 transition group cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-blue-600">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {cust.name[0]}
                          </div>
                          <span>{cust.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{cust.phone}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{cust.nationalId || '---'}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{cust.address || '---'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {custReqCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{latestReqDate}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{cust.createdAt}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/requests/create?customerId=${cust.id}`)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                          title="إنشاء معاملة جديدة لهذا المراجع"
                        >
                          <FilePlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/customers/${cust.id}`)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="عرض ملف المراجع"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUpdateCustomer && (
                          <button
                            onClick={() => navigate(`/customers/${cust.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="تعديل البيانات"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};
