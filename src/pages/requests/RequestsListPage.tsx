import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PriorityBadge, DeadlineBadge } from '../../components/common/PriorityBadge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ChangeStatusModal } from '../../components/request/ChangeStatusModal';
import { BulkChangeStatusModal } from '../../components/request/BulkChangeStatusModal';
import { ExportColumnModal } from '../../components/common/ExportColumnModal';
import { RequestItem, RequestStatus, RequestPriority } from '../../types';
import { reportService } from '../../services/reportService';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Clock,
  ArrowUpDown,
  Flame,
  FileSpreadsheet,
  FileText,
  X,
  Layers,
  Inbox,
  Building2,
  Globe,
  CheckSquare,
  Square
} from 'lucide-react';

export const RequestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requests, ministries, employees, handleDeleteRequest, handleChangeStatus } = useData();
  const { success } = useToast();
  const {
    canCreateRequest,
    canUpdateRequest,
    canDeleteRequest,
    canChangeStatus,
    canExportReports
  } = usePermissions();

  // URL query params
  const urlStatus = searchParams.get('status') || 'all';
  const urlOverdue = searchParams.get('overdue') === 'true';

  // Source Filter Tab: 'all' | 'received' | 'internal' | 'overdue'
  const [sourceTab, setSourceTab] = useState<'all' | 'received' | 'internal' | 'overdue'>(
    urlOverdue ? 'overdue' : 'all'
  );

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(urlOverdue);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState<'receiveDate' | 'expectedCompletionDate' | 'requestNumber'>('receiveDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);

  // Modals state
  const [statusModalRequest, setStatusModalRequest] = useState<RequestItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to distinguish portal received requests
  const isPublicReceived = (r: RequestItem) => {
    const hasPortalTimeline =
      r.timeline?.some((h: any) =>
        h.employeeName?.includes('بوابة') ||
        h.employeeName?.includes('Portal') ||
        h.actorName?.includes('بوابة') ||
        h.actorName?.includes('Portal') ||
        h.note?.includes('البوابة العامة للمراجعين') ||
        h.note?.includes('بوابة المراجع')
      ) ||
      (r as any).statusHistory?.some((h: any) =>
        h.employeeName?.includes('بوابة') ||
        h.employeeName?.includes('Portal') ||
        h.actorName?.includes('بوابة') ||
        h.actorName?.includes('Portal') ||
        h.note?.includes('البوابة العامة للمراجعين') ||
        h.note?.includes('بوابة المراجع')
      );

    const hasPortalTitleOrDetails =
      r.title?.includes('بوابة المراجع') ||
      r.title?.includes('البوابة الإلكترونية') ||
      r.title?.includes('طلب مراجع عبر البوابة') ||
      r.details?.includes('البوابة العامة للمراجعين') ||
      r.details?.includes('بوابة المراجع الإلكترونية');

    return Boolean(hasPortalTimeline || hasPortalTitleOrDetails || (r as any).source === 'PORTAL' || (r as any).isPublic === true);
  };

  // Metrics for tab counters
  const receivedCount = useMemo(() => requests.filter(isPublicReceived).length, [requests]);
  const internalCount = useMemo(() => requests.filter((r) => !isPublicReceived(r)).length, [requests]);
  const overdueCount = useMemo(() => requests.filter((r) => r.deadlineStatus === 'متأخر').length, [requests]);

  // Filtering Logic
  const filteredRequests = useMemo(() => {
    let list = [...requests];

    // 1. Source Tab Isolation
    if (sourceTab === 'received') {
      list = list.filter(isPublicReceived);
    } else if (sourceTab === 'internal') {
      list = list.filter((r) => !isPublicReceived(r));
    } else if (sourceTab === 'overdue') {
      list = list.filter((r) => r.deadlineStatus === 'متأخر');
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.requestNumber.toLowerCase().includes(q) ||
          (r.customerNumber && r.customerNumber.toLowerCase().includes(q)) ||
          (r.nationalId && r.nationalId.includes(q)) ||
          (r.cityName && r.cityName.toLowerCase().includes(q)) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (ministryFilter !== 'all') {
      list = list.filter((r) => r.ministryId === ministryFilter);
    }

    if (employeeFilter !== 'all') {
      list = list.filter((r) => r.assignedEmployeeId === employeeFilter);
    }

    if (priorityFilter !== 'all') {
      list = list.filter((r) => r.priority === priorityFilter);
    }

    if (typeFilter !== 'all') {
      list = list.filter((r) => r.requestType === typeFilter);
    }

    if (overdueOnly) {
      list = list.filter((r) => r.deadlineStatus === 'متأخر');
    }

    if (fromDate) {
      list = list.filter((r) => r.receiveDate >= fromDate);
    }

    if (toDate) {
      list = list.filter((r) => r.receiveDate <= toDate);
    }

    // Sort
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      if (sortDirection === 'asc') return aVal.localeCompare(bVal);
      return bVal.localeCompare(aVal);
    });

    return list;
  }, [
    requests,
    sourceTab,
    search,
    statusFilter,
    ministryFilter,
    employeeFilter,
    priorityFilter,
    typeFilter,
    overdueOnly,
    fromDate,
    toDate,
    sortField,
    sortDirection
  ]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Bulk Selection Helpers
  const isAllPageSelected =
    paginatedRequests.length > 0 && paginatedRequests.every((r) => selectedIds.includes(r.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedRequests.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = paginatedRequests.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkChangeStatus = async (
    newStatus: RequestStatus,
    note?: string,
    file?: File,
    rejectionReason?: string
  ) => {
    for (const reqId of selectedIds) {
      await handleChangeStatus(reqId, newStatus, note, file, rejectionReason);
    }
    success('تم تحديث الحالات بنجاح', `تم تحديث حالة (${selectedIds.length}) طلبات بنجاح إلى "${newStatus}"`);
    setSelectedIds([]);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSourceTab('all');
    setStatusFilter('all');
    setMinistryFilter('all');
    setEmployeeFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
    setOverdueOnly(false);
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
    setSearchParams({});
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await handleDeleteRequest(deleteId);
      success('تم حذف المعاملة', 'تم حذف الطلب من المنظومة بنجاح');
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'all' ||
    ministryFilter !== 'all' ||
    employeeFilter !== 'all' ||
    priorityFilter !== 'all' ||
    typeFilter !== 'all' ||
    overdueOnly ||
    fromDate !== '' ||
    toDate !== '';

  const handleOpenExport = (format: 'excel' | 'pdf') => {
    setExportFormat(format);
    setIsExportModalOpen(true);
  };

  const handleExport = async (format: 'excel' | 'pdf', selectedColumns: string[]) => {
    try {
      setIsExporting(true);
      const filters = {
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        ministryId: ministryFilter !== 'all' ? ministryFilter : undefined,
        employeeId: employeeFilter !== 'all' ? employeeFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        requestType: typeFilter !== 'all' ? typeFilter : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      };

      if (format === 'excel') {
        await reportService.exportRequestsExcel(filters, selectedColumns);
      } else {
        await reportService.exportRequestsPdf(filters, selectedColumns, filteredRequests);
      }
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Main Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">الطلبات والمعاملات</h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة ومتابعة كافة المعاملات الصادرة والواردة، وتحديث الحالات ومدد الإنجاز
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {canExportReports && (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => handleOpenExport('pdf')}
                className="text-red-600 border-red-200 hover:bg-red-50"
                icon={<FileText className="w-4 h-4" />}
              >
                تصدير PDF
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => handleOpenExport('excel')}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                icon={<FileSpreadsheet className="w-4 h-4" />}
              >
                تصدير Excel مخصص
              </Button>
            </>
          )}
          {canCreateRequest && (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/requests/new')}
              icon={<Plus className="w-4 h-4" />}
            >
              + إضافة طلب
            </Button>
          )}
        </div>
      </div>

      {/* Source Isolation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <button
          type="button"
          onClick={() => {
            setSourceTab('all');
            setOverdueOnly(false);
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition select-none shadow-xs border ${
            sourceTab === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>كافة المعاملات</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
              sourceTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {requests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSourceTab('received');
            setOverdueOnly(false);
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition select-none shadow-xs border ${
            sourceTab === 'received'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-300'
              : 'bg-white text-blue-900 hover:bg-blue-50/70 border-blue-200'
          }`}
        >
          <Inbox className="w-4 h-4 text-blue-500" />
          <span>الطلبات المستلمة (بوابة المراجعين)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
              sourceTab === 'received' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800 font-bold'
            }`}
          >
            {receivedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSourceTab('internal');
            setOverdueOnly(false);
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition select-none shadow-xs border ${
            sourceTab === 'internal'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4 text-slate-500" />
          <span>معاملات النظام الداخلية</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
              sourceTab === 'internal' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {internalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSourceTab('overdue');
            setOverdueOnly(true);
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition select-none shadow-xs border ${
            sourceTab === 'overdue'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
              : 'bg-white text-rose-800 hover:bg-rose-50 border-rose-200'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-600" />
          <span>الطلبات المتأخرة</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
              sourceTab === 'overdue' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {overdueCount}
          </span>
        </button>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
        {/* Main Search Row */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ابحث باسم المراجع أو رقم الطلب أو رقم الهاتف..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Quick Overdue Filter Toggle */}
            <button
              onClick={() => {
                setOverdueOnly(!overdueOnly);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition border select-none ${
                overdueOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Flame className={`w-4 h-4 ${overdueOnly ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>الطلبات المتأخرة فقط</span>
            </button>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition border select-none ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 text-blue-600" />
              <span>فلاتر متقدمة</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                <option value="all">كافة الحالات</option>
                <option value="استلام الطلب">استلام الطلب</option>
                <option value="قيد المراجعة">قيد المراجعة</option>
                <option value="تم إرسال الطلب للجهة">تم إرسال الطلب للجهة</option>
                <option value="قيد المعالجة">قيد المعالجة</option>
                <option value="مطلوب مستندات">مطلوب مستندات</option>
                <option value="موافقة">موافقة</option>
                <option value="مرفوض">مرفوض</option>
                <option value="الإجابة جاهزة">الإجابة جاهزة</option>
                <option value="تم إشعار المراجع">تم إشعار المراجع</option>
                <option value="تم التسليم">تم التسليم</option>
                <option value="مغلق">مغلق</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الجهة / الوزارة</label>
              <select
                value={ministryFilter}
                onChange={(e) => {
                  setMinistryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                <option value="all">كافة الجهات الحكومية</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الموظف المسؤول</label>
              <select
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                <option value="all">كافة الموظفين</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">الأولوية</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              >
                <option value="all">كافة الأولويات</option>
                <option value="عاجل">عاجل</option>
                <option value="مهم">مهم</option>
                <option value="عادي">عادي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div className="sm:col-span-2 flex items-end justify-end gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                  إعادة ضبط الفلاتر
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold">
              تم تحديد {selectedIds.length} معاملة من أصل {filteredRequests.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canChangeStatus && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBulkStatusModalOpen(true)}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                تغيير حالة الطلبات المحددة
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-slate-300 border-slate-700 hover:bg-slate-800"
            >
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* Requests Table / Cards Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {paginatedRequests.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات تطابق معايير البحث"
            description="جرب تعديل خيارات البحث أو الفلاتر المحددة، أو قم بإنشاء معاملة جديدة."
            actionText="+ إضافة معاملة جديدة"
            onAction={() => navigate('/requests/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200">
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
                  <th
                    onClick={() => handleSort('requestNumber')}
                    className="py-3.5 px-4 font-bold cursor-pointer hover:text-blue-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>رقم الطلب</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-bold">المراجع</th>
                  <th className="py-3.5 px-4 font-bold">الهاتف</th>
                  <th className="py-3.5 px-4 font-bold">عنوان المعاملة</th>
                  <th className="py-3.5 px-4 font-bold">الجهة / الوزارة</th>
                  <th className="py-3.5 px-4 font-bold">الحالة</th>
                  <th className="py-3.5 px-4 font-bold">الأولوية</th>
                  <th className="py-3.5 px-4 font-bold">الموظف</th>
                  <th
                    onClick={() => handleSort('receiveDate')}
                    className="py-3.5 px-4 font-bold cursor-pointer hover:text-blue-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>تاريخ الاستلام</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('expectedCompletionDate')}
                    className="py-3.5 px-4 font-bold cursor-pointer hover:text-blue-600 select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>الموعد المتوقع</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-bold">الحالة الزمنية</th>
                  <th className="py-3.5 px-4 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRequests.map((req) => {
                  const isSelected = selectedIds.includes(req.id);
                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-blue-50/30 transition group cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                      onClick={(e) => {
                        // Prevent navigation if clicking action buttons or checkbox
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                        navigate(`/requests/${req.id}`);
                      }}
                    >
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(req.id, e as any)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600 font-mono group-hover:underline">
                        <div className="flex flex-col gap-1">
                          <span>{req.requestNumber}</span>
                          {isPublicReceived(req) ? (
                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              بوابة المراجعين
                            </span>
                          ) : (
                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              داخل النظام
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{req.customerName}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{req.customerPhone}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 font-medium">
                        {req.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">{req.ministryName}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{req.assignedEmployeeName}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{req.receiveDate}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold font-mono">
                        {req.expectedCompletionDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <DeadlineBadge
                          status={req.deadlineStatus}
                          daysRemainingOrOverdue={req.daysRemainingOrOverdue}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canChangeStatus && (
                            <button
                              onClick={() => setStatusModalRequest(req)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="تغيير الحالة"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/requests/${req.id}`)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canUpdateRequest && (
                            <button
                              onClick={() => navigate(`/requests/${req.id}/edit`)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteRequest && (
                            <button
                              onClick={() => setDeleteId(req.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="حذف"
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
          totalItems={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Bulk Change Status Modal */}
      {isBulkStatusModalOpen && (
        <BulkChangeStatusModal
          isOpen={isBulkStatusModalOpen}
          onClose={() => setIsBulkStatusModalOpen(false)}
          selectedCount={selectedIds.length}
          onSubmit={handleBulkChangeStatus}
        />
      )}

      {/* Change Status Modal */}
      {statusModalRequest && (
        <ChangeStatusModal
          isOpen={!!statusModalRequest}
          onClose={() => setStatusModalRequest(null)}
          request={statusModalRequest}
          onSubmit={async (newStatus, note, file, rejectionReason) => {
            await handleChangeStatus(statusModalRequest.id, newStatus, note, file, rejectionReason);
            success('تم تغيير الحالة بنجاح', `تم تحديث حالة المعاملة #${statusModalRequest.requestNumber}`);
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="تأكيد حذف المعاملة"
        message="هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً؟ لن يمكن استرجاع بياناته بعد الحذف."
        confirmText="نعم، احذف المعاملة"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Export Customization Modal */}
      <ExportColumnModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        defaultFormat={exportFormat}
        isExporting={isExporting}
      />
    </div>
  );
};
