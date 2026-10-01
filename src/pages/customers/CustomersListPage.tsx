import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Customer } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { BulkImportCustomersModal } from '../../components/customers/BulkImportCustomersModal';
import { BulkWhatsAppModal } from '../../components/common/BulkWhatsAppModal';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  FilePlus,
  Phone,
  MapPin,
  Building,
  ChevronLeft,
  Calendar,
  FileSpreadsheet,
  MessageSquare,
  AlertTriangle,
  X
} from 'lucide-react';

export const CustomersListPage: React.FC = () => {
  const navigate = useNavigate();
  const { customers, requests, handleDeleteCustomer, handleBulkDeleteCustomers } = useData();
  const { success, error: toastError } = useToast();
  const { canCreateCustomer, canUpdateCustomer, canDeleteCustomer } = usePermissions();

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);

  // Deletion States
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Bulk Selection Helpers
  const isAllPageSelected =
    paginatedCustomers.length > 0 && paginatedCustomers.every((c) => selectedIds.includes(c.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedCustomers.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = paginatedCustomers.map((c) => c.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Build recipients for bulk WhatsApp modal
  const selectedRecipients = useMemo(() => {
    return selectedIds
      .map((id) => {
        const cust = customers.find((c) => c.id === id);
        if (!cust) return null;
        const custReq = requests.find((r) => r.customerId === cust.id);
        return {
          id: cust.id,
          phoneNumber: cust.phone,
          customerName: cust.name,
          requestNumber: custReq?.requestNumber || cust.customerNumber || `CUST-${cust.id.substring(0, 5)}`,
          ministry: custReq?.ministryName || 'الجهة الحكومية',
          title: custReq?.title || 'معاملة المراجع',
          requestId: custReq?.id
        };
      })
      .filter(Boolean) as any[];
  }, [selectedIds, customers, requests]);

  // Single Delete Execution
  const confirmDeleteCustomer = async (force: boolean = false) => {
    if (!customerToDelete) return;
    try {
      setIsDeleting(true);
      await handleDeleteCustomer(customerToDelete.id, force);
      success('تم حذف المراجع', `تم حذف المراجع ${customerToDelete.name} بنجاح من النظام.`);
      setCustomerToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== customerToDelete.id));
    } catch (err: any) {
      toastError('فشل حذف المراجع', err?.response?.data?.message || err?.message || 'حدث خطأ أثناء محاولة الحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete Execution
  const confirmBulkDelete = async (force: boolean = false) => {
    if (selectedIds.length === 0) return;
    try {
      setIsDeleting(true);
      const res = await handleBulkDeleteCustomers(selectedIds, force);
      success(
        'تم الحذف بنجاح',
        `تم حذف ${res.deletedCount} مراجع بنجاح${res.blockedCount > 0 ? ` (وتم تعطيل ${res.blockedCount} مراجع لوجود معاملات سابقة)` : ''}`
      );
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      toastError('فشل الحذف الجماعي', err?.response?.data?.message || err?.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">سجل المراجعين</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة بيانات المراجعين وسجل معاملاتهم وأرقام هواتفهم للتواصل والإشعارات
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreateCustomer && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsBulkImportOpen(true)}
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              >
                استيراد من Excel / CSV
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/customers/new')}
                icon={<Plus className="w-4 h-4" />}
              >
                + إضافة مراجع جديد
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ابحث بالاسم، رقم هاتف واتساب، رقم الهوية الوطنية، أو العنوان..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-bold">
          إجمالي المراجعين المسجلين:{' '}
          <span className="font-mono text-blue-600 font-black">{customers.length}</span>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold">
              تم تحديد {selectedIds.length} مراجع من أصل {filteredCustomers.length}
            </span>
            {selectedIds.length < filteredCustomers.length && (
              <button
                type="button"
                onClick={() => setSelectedIds(filteredCustomers.map((c) => c.id))}
                className="text-[11px] text-blue-300 hover:text-white underline font-medium"
              >
                تحديد كافة الـ ({filteredCustomers.length}) مراجع
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBulkWhatsAppOpen(true)}
              icon={<MessageSquare className="w-4 h-4 text-emerald-300" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              إرسال رسالة واتساب مخصصة للمحددين
            </Button>

            {canDeleteCustomer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                icon={<Trash2 className="w-4 h-4 text-rose-400" />}
                className="text-rose-300 border-rose-700 hover:bg-rose-950/60 hover:text-white"
              >
                حذف المحددين ({selectedIds.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 font-bold"
            >
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

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
          <div className="overflow-x-auto custom-scrollbar-x">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectAllPage}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="تحديد الكل في هذه الصفحة"
                    />
                  </th>
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
                  const isSelected = selectedIds.includes(cust.id);
                  const actualCustRequests = requests.filter((r) => r.customerId === cust.id);
                  const custReqCount = actualCustRequests.length || cust.requestsCount || 0;
                  const latestReqDate = actualCustRequests[0]?.receiveDate || cust.lastRequestDate || '---';

                  return (
                    <tr
                      key={cust.id}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                        navigate(`/customers/${cust.id}`);
                      }}
                      className={`hover:bg-blue-50/30 transition group cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(cust.id, e as any)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px] group-hover:bg-blue-600 group-hover:text-white transition">
                            {cust.name.substring(0, 1)}
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
                            onClick={() => navigate(`/requests/new?customerId=${cust.id}`)}
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
                          {canDeleteCustomer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerToDelete(cust);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="حذف المراجع من المنظومة"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Single Customer Delete Confirmation Modal */}
      {customerToDelete && (
        <Modal
          isOpen={Boolean(customerToDelete)}
          onClose={() => setCustomerToDelete(null)}
          title="تأكيد حذف المراجع"
          maxWidth="md"
        >
          <div className="space-y-4 text-right" dir="rtl">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950">هل أنت متأكد من رغبتك في حذف هذا المراجع؟</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  سيتم حذف بيانات المراجع <span className="font-bold text-rose-900">({customerToDelete.name})</span> المسجل برقم هاتف <span className="font-mono font-bold">({customerToDelete.phone})</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={() => confirmDeleteCustomer(false)}
                isLoading={isDeleting}
                icon={<Trash2 className="w-4 h-4" />}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          title="تأكيد الحذف الجماعي للمراجعين"
          maxWidth="md"
        >
          <div className="space-y-4 text-right" dir="rtl">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950">
                  هل أنت متأكد من حذف ({selectedIds.length}) مراجع محدد؟
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  سيتم إزالة جميع المراجعين المحددين من سجل المنظومة. لا يمكن التراجع عن هذه العملية بعد إتمامها.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                onClick={() => confirmBulkDelete(false)}
                isLoading={isDeleting}
                icon={<Trash2 className="w-4 h-4" />}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                حذف ({selectedIds.length}) مراجع الآن
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Import Modal */}
      <BulkImportCustomersModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      {/* Bulk WhatsApp Messages Modal */}
      {isBulkWhatsAppOpen && (
        <BulkWhatsAppModal
          isOpen={isBulkWhatsAppOpen}
          onClose={() => setIsBulkWhatsAppOpen(false)}
          recipients={selectedRecipients}
          onSuccess={() => {
            setSelectedIds([]);
          }}
        />
      )}
    </div>
  );
};
export default CustomersListPage;
