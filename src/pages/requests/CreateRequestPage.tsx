import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { calculateExpectedDate } from '../../services/api';
import { cityService } from '../../services/cityService';
import { requestTypeService } from '../../services/requestTypeService';
import { requestService } from '../../services/requestService';
import { RequestPriority, RequestType, RequestAttachment, City, RequestTypeEntity } from '../../types';
import {
  User,
  UserPlus,
  FileText,
  Building2,
  Calendar,
  Clock,
  UploadCloud,
  File,
  X,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  MapPin,
  Layers,
  Search,
  Check,
  ChevronDown,
  Phone,
  Briefcase,
  Hash
} from 'lucide-react';
import { IRAQI_GOVERNORATES } from '../../constants/iraqGovernorates';

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerIdFromQuery = searchParams.get('customerId');
  const { customers, ministries, employees, handleCreateRequest, handleCreateCustomer } = useData();
  const { success, warning, error } = useToast();

  // Dynamic lists from backend
  const [cities, setCities] = useState<City[]>([]);
  const [dbRequestTypes, setDbRequestTypes] = useState<RequestTypeEntity[]>([]);

  // Customer selection mode: 'existing' or 'new'
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  // New Customer Fields
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAltPhone, setCustAltPhone] = useState('');
  const [custNationalId, setCustNationalId] = useState('');
  const [custOccupation, setCustOccupation] = useState<'موظف حكومي' | 'كاسب' | 'طالب' | 'عاطل عن العمل' | 'قطاع خاص' | 'أخرى' | string>('كاسب');
  const [custBirthYear, setCustBirthYear] = useState('');
  const [custCityId, setCustCityId] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Request Fields
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('إصدار تصريح');
  const [requestTypeId, setRequestTypeId] = useState<string>('');
  const [ministryId, setMinistryId] = useState<string>(ministries[0]?.id || '');
  const [priority, setPriority] = useState<RequestPriority>('عادي');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [receiveDate, setReceiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<RequestAttachment[]>([]);
  const [mockFileName, setMockFileName] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [cList, tList] = await Promise.all([
          cityService.getActive().catch(() => []),
          requestTypeService.getActive().catch(() => [])
        ]);
        if (cList.length > 0) setCities(cList);
        if (tList.length > 0) {
          setDbRequestTypes(tList);
          setRequestType(tList[0].name);
          setRequestTypeId(tList[0].id);
        }
      } catch (err) {
        console.warn('Could not load dynamic cities or request types:', err);
      }
    };
    fetchOptions();
  }, []);

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync defaults or URL query params when context data loads
  useEffect(() => {
    if (customerIdFromQuery && customers.some((c) => c.id === customerIdFromQuery)) {
      setCustomerMode('existing');
      setSelectedCustomerId(customerIdFromQuery);
    } else if (customers.length > 0) {
      if (!selectedCustomerId || !customers.some((c) => c.id === selectedCustomerId)) {
        setSelectedCustomerId(customers[0].id);
      }
    }
  }, [customers, customerIdFromQuery]);

  // Click outside to close customer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredExistingCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.altPhone && c.altPhone.includes(q)) ||
        (c.nationalId && c.nationalId.includes(q)) ||
        (c.customerNumber && c.customerNumber.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [customers, customerSearchQuery]);

  useEffect(() => {
    if (ministries.length > 0) {
      if (!ministryId || !ministries.some((m) => m.id === ministryId)) {
        setMinistryId(ministries[0].id);
      }
    }
  }, [ministries, ministryId]);

  useEffect(() => {
    if (employees.length > 0) {
      if (!assignedEmployeeId || !employees.some((e) => e.id === assignedEmployeeId)) {
        setAssignedEmployeeId(employees[0].id);
      }
    }
  }, [employees, assignedEmployeeId]);

  // Recalculate SLA expected completion date whenever ministry, priority, or receiveDate changes
  useEffect(() => {
    if (receiveDate) {
      const selectedMinistry = ministries.find((m) => m.id === ministryId);
      const calculated = calculateExpectedDate(receiveDate, selectedMinistry?.slaDays || 7, priority);
      setExpectedDate(calculated);
    }
  }, [ministryId, priority, receiveDate, ministries]);

  // Selected existing customer helper
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Duplicate Check
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateList, setDuplicateList] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const targetPhone = customerMode === 'existing' ? selectedCustomer?.phone : custPhone;
        const targetNationalId = customerMode === 'existing' ? selectedCustomer?.nationalId : custNationalId;
        const targetCustId = customerMode === 'existing' ? selectedCustomerId : undefined;

        if (!targetPhone && !targetNationalId && !targetCustId) {
          setDuplicateWarning(null);
          setDuplicateList([]);
          return;
        }

        const res = await requestService.checkDuplicate({
          phone: targetPhone,
          nationalId: targetNationalId,
          customerId: targetCustId,
          ministryId: ministryId || undefined,
          requestType: requestType || undefined,
          daysWindow: 30
        });

        if (res.isDuplicate) {
          setDuplicateWarning(res.message || 'تنبيه: هذا المراجع لديه معاملة سابقة مسجلة لنفس الجهة خلال آخر 30 يوماً');
          setDuplicateList(res.duplicates || []);
        } else {
          setDuplicateWarning(null);
          setDuplicateList([]);
        }
      } catch (err) {
        console.warn('Duplicate check error:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [customerMode, selectedCustomerId, selectedCustomer, custPhone, custNationalId, ministryId, requestType]);

  interface UploadItem {
    id: string;
    file: File;
    name: string;
    size: string;
    type: string;
    documentType: string;
    isPublic: boolean;
  }

  const [uploadFiles, setUploadFiles] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: UploadItem[] = Array.from(fileList).map((f) => {
      const sizeStr =
        f.size > 1024 * 1024
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(f.size / 1024))} KB`;
      const typeStr = f.type.includes('pdf')
        ? 'PDF'
        : f.type.includes('image')
        ? 'Image'
        : f.type.includes('sheet') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        ? 'Excel'
        : 'Word';

      let docType = 'GENERAL';
      if (f.name.includes('هوية') || f.name.includes('اقامة') || f.name.includes('إقامة')) {
        docType = 'IDENTITY';
      } else if (f.name.includes('طلب') || f.name.includes('معاملة')) {
        docType = 'REQUEST_DOCUMENT';
      }

      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        file: f,
        name: f.name,
        size: sizeStr,
        type: typeStr,
        documentType: docType,
        isPublic: docType !== 'IDENTITY'
      };
    });

    setUploadFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveUploadFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async (stayOnPage = false) => {
    if (!title.trim()) {
      warning('حقل مطلوب', 'يرجى إدخال عنوان الطلب');
      return;
    }

    setIsLoading(true);

    try {
      let finalCustomerId = selectedCustomerId;
      let finalCustomerName = selectedCustomer?.name || '';
      let finalCustomerPhone = selectedCustomer?.phone || '';

      // If creating a new customer
      if (customerMode === 'new') {
        if (!custName.trim() || !custPhone.trim()) {
          warning('بيانات المراجع ناقصة', 'يرجى إدخال اسم المراجع ورقم هاتف واتساب');
          setIsLoading(false);
          return;
        }

        if (!custOccupation || !custBirthYear.trim() || !custCityId || !custAddress.trim()) {
          warning('بيانات المراجع ناقصة', 'يرجى إدخال جميع الحقول الإلزامية للمراجع (المهنة، سنة الميلاد، المحافظة، عنوان السكن)');
          setIsLoading(false);
          return;
        }

        const newCust = await handleCreateCustomer({
          name: custName.trim(),
          phone: custPhone.trim(),
          altPhone: custAltPhone.trim() || undefined,
          nationalId: custNationalId.trim() || undefined,
          occupation: custOccupation,
          birthYear: custBirthYear.trim() || undefined,
          cityId: custCityId || undefined,
          address: custAddress.trim() || '',
          notes: custNotes.trim() || undefined
        });

        finalCustomerId = newCust.id;
        finalCustomerName = newCust.name;
        finalCustomerPhone = newCust.phone;
      } else {
        if (!finalCustomerId) {
          warning('يرجى اختيار مراجع', 'يرجى اختيار مراجع من القائمة أو الضغط على "مراجع جديد"');
          setIsLoading(false);
          return;
        }
      }

      const assignedEmp = employees.find((e) => e.id === assignedEmployeeId);
      const selectedMin = ministries.find((m) => m.id === ministryId) || ministries[0];

      const created = await handleCreateRequest({
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerOccupation: (custOccupation || selectedCustomer?.occupation) as any,
        customerBirthYear: custBirthYear || selectedCustomer?.birthYear,
        cityId: custCityId || selectedCustomer?.cityId || undefined,
        requestTypeId: requestTypeId || undefined,
        title: title.trim(),
        details: details.trim(),
        requestType,
        ministryId: selectedMin?.id || ministryId,
        ministryName: selectedMin?.name || 'جهة حكومية',
        priority,
        assignedEmployeeId: assignedEmp?.id || assignedEmployeeId || undefined,
        assignedEmployeeName: assignedEmp?.name || 'فريق الخدمة',
        receiveDate,
        expectedCompletionDate: expectedDate,
        attachments,
        internalNotes: internalNotes.trim() || undefined
      });

      // Upload all real selected files to the created request
      if (uploadFiles.length > 0) {
        try {
          await Promise.all(
            uploadFiles.map((item) =>
              requestService.addAttachment(created.id, {
                name: item.name,
                type: item.type,
                size: item.size,
                documentType: item.documentType,
                isPublic: item.isPublic,
                file: item.file
              })
            )
          );
        } catch (attErr) {
          console.warn('Error uploading attachments:', attErr);
        }
      }

      success('تم إنشاء الطلب بنجاح', `تم تسجيل المعاملة رقم ${created.requestNumber}`);

      if (stayOnPage) {
        setTitle('');
        setDetails('');
        setInternalNotes('');
        setAttachments([]);
        setUploadFiles([]);
      } else {
        navigate(`/requests/${created.id}`);
      }
    } catch (err: any) {
      console.error('Error creating request:', err);
      const msg = err.response?.data?.message || err.message || 'حدث خطأ أثناء إنشاء المعاملة، يرجى المحاولة مرة أخرى';
      error('تعذر إنشاء المعاملة', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const activeMinistry = ministries.find((m) => m.id === ministryId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">إضافة معاملة وطلب جديد</h1>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل بيانات المراجع، تحديد الجهة الحكومية، واحتساب موعد الإنجاز المعتمد آلياً
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/requests')} icon={<ArrowRight className="w-4 h-4" />}>
          إلغاء والعودة
        </Button>
      </div>

      <div className="space-y-6">
        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 shadow-sm space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <strong className="text-xs">{duplicateWarning}</strong>
            </div>
            {duplicateList.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[11px] pt-1 border-t border-amber-200">
                {duplicateList.map((d: any) => (
                  <span key={d.id} className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200 font-mono">
                    #{d.requestNumber} - {d.title} ({d.status}) - {d.createdAt}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 1: Customer Information */}
        <Card>
          <CardHeader className="bg-slate-50/70">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <CardTitle>1. بيانات المراجع / صاحب المعاملة</CardTitle>
              </div>

              {/* Mode switch */}
              <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setCustomerMode('existing')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    customerMode === 'existing'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  اختيار مراجع مسجل
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('new')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                    customerMode === 'new'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + مراجع جديد
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {customerMode === 'existing' ? (
              <div className="space-y-4">
                {/* Searchable Customer Picker */}
                <div ref={dropdownRef} className="relative">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>
                      البحث في المراجعين المسجلين مسبقاً <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[11px] text-blue-600 font-normal">
                      إجمالي المسجلين: {customers.length} مراجع
                    </span>
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      placeholder={
                        selectedCustomer
                          ? `المراجع المختار حالياً: ${selectedCustomer.name} (اضغط للبحث أو التغيير)`
                          : 'ابحث بالاسم، رقم الهاتف، أو رقم الهوية الوطنية...'
                      }
                      className="w-full text-xs pr-10 pl-10 py-3 rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans shadow-xs transition"
                    />

                    {customerSearchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchQuery('');
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="absolute left-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                        className="absolute left-3 top-3 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {isCustomerDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-700 animate-in fade-in slide-in-from-top-2 duration-150">
                      {filteredExistingCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          لا توجد نتائج مطابقة لبحثك "{customerSearchQuery}".
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerMode('new');
                              setCustName(customerSearchQuery);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="block mx-auto mt-2 text-blue-600 font-bold hover:underline"
                          >
                            + تسجيل كمراجع جديد بالاسم "{customerSearchQuery}"
                          </button>
                        </div>
                      ) : (
                        filteredExistingCustomers.map((c) => {
                          const isSelected = c.id === selectedCustomerId;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setIsCustomerDropdownOpen(false);
                                setCustomerSearchQuery('');
                              }}
                              className={`p-3 text-xs cursor-pointer flex items-center justify-between transition ${
                                isSelected
                                  ? 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-950 dark:text-blue-200 font-bold'
                                  : 'hover:bg-slate-50 dark:hover:bg-gray-750 text-slate-800 dark:text-gray-200'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm">{c.name}</span>
                                  {c.nationalId && (
                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-[10px] text-slate-600 dark:text-gray-300 font-mono">
                                      هوية: {c.nationalId}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-3 font-mono">
                                  <span>📞 {c.phone}</span>
                                  {c.altPhone && <span>📱 {c.altPhone}</span>}
                                  {c.address && <span>📍 {c.address}</span>}
                                </div>
                              </div>
                              {isSelected && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Full Auto-filled Profile Card of the selected customer */}
                {selectedCustomer && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-200/80 dark:bg-gray-800/80 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/60 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          {selectedCustomer.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {selectedCustomer.name}
                          </h4>
                          <span className="text-[10px] text-blue-700 dark:text-blue-400 font-mono">
                            معرّف المراجع: {selectedCustomer.customerNumber || selectedCustomer.id.substring(0, 8)}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        ✓ تم استيراد البيانات تلقائياً
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white/80 dark:bg-gray-800 p-2.5 rounded-xl border border-blue-100 dark:border-gray-700">
                        <span className="text-slate-400 text-[10px] block">رقم هاتف واتساب</span>
                        <strong className="text-slate-800 dark:text-white font-mono">{selectedCustomer.phone}</strong>
                      </div>

                      <div className="bg-white/80 dark:bg-gray-800 p-2.5 rounded-xl border border-blue-100 dark:border-gray-700">
                        <span className="text-slate-400 text-[10px] block">رقم الهاتف اتصال</span>
                        <strong className="text-slate-800 dark:text-white font-mono">
                          {selectedCustomer.altPhone || 'غير مسجل'}
                        </strong>
                      </div>

                      <div className="bg-white/80 dark:bg-gray-800 p-2.5 rounded-xl border border-blue-100 dark:border-gray-700">
                        <span className="text-slate-400 text-[10px] block">رقم الهوية الوطنية</span>
                        <strong className="text-slate-800 dark:text-white font-mono">
                          {selectedCustomer.nationalId || 'غير مسجل'}
                        </strong>
                      </div>

                      <div className="bg-white/80 dark:bg-gray-800 p-2.5 rounded-xl border border-blue-100 dark:border-gray-700">
                        <span className="text-slate-400 text-[10px] block">سنة التولد / المواليد</span>
                        <strong className="text-slate-800 dark:text-white font-mono">
                          {selectedCustomer.birthYear || 'غير مسجل'}
                        </strong>
                      </div>

                      <div className="bg-white/80 dark:bg-gray-800 p-2.5 rounded-xl border border-blue-100 dark:border-gray-700">
                        <span className="text-slate-400 text-[10px] block">المهنة والوظيفة</span>
                        <strong className="text-slate-800 dark:text-white">
                          {selectedCustomer.occupation || 'غير مسجل'}
                        </strong>
                      </div>

                      <div className="bg-white/80 dark:bg-gray-800 p-2.5 rounded-xl border border-blue-100 dark:border-gray-700">
                        <span className="text-slate-400 text-[10px] block">المحافظة / العنوان</span>
                        <strong className="text-slate-800 dark:text-white truncate block">
                          {selectedCustomer.address || 'العراق'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="اسم المراجع الكامل"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="مثال: علي حسن كاظم"
                />

                <Input
                  label="رقم هاتف واتساب"
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="077********"
                />

                <Input
                  label="رقم الهاتف اتصال (اختياري)"
                  type="tel"
                  value={custAltPhone}
                  onChange={(e) => setCustAltPhone(e.target.value)}
                  placeholder="078********"
                />

                <Input
                  label="رقم الهوية الوطنية / البطاقة الموحدة"
                  value={custNationalId}
                  onChange={(e) => setCustNationalId(e.target.value)}
                  placeholder="19xxxxxxxxxx"
                />

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    العمل / المهنة <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={custOccupation}
                    onChange={(e) => setCustOccupation(e.target.value)}
                    required
                  >
                    <option value="موظف حكومي">موظف حكومي</option>
                    <option value="كاسب">كاسب</option>
                    <option value="طالب">طالب</option>
                    <option value="عاطل عن العمل">عاطل عن العمل</option>
                    <option value="قطاع خاص">قطاع خاص</option>
                    <option value="أخرى">أخرى</option>
                  </Select>
                </div>

                <Input
                  label="المواليد (سنة الميلاد)"
                  type="text"
                  required
                  value={custBirthYear}
                  onChange={(e) => setCustBirthYear(e.target.value)}
                  placeholder="مثال: 1995"
                />

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    المحافظة <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={custCityId}
                    onChange={(e) => setCustCityId(e.target.value)}
                    required
                  >
                    <option value="">اختر المحافظة...</option>
                    {IRAQI_GOVERNORATES.map((gov, idx) => {
                      const matched = cities.find((c) => c.name === gov);
                      return (
                        <option key={gov} value={matched ? matched.id : gov}>
                          {idx + 1}. {gov}
                        </option>
                      );
                    })}
                  </Select>
                </div>

                <Input
                  label="عنوان السكن / أقرب نقطة دالة"
                  required
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="المحافظة، الحي، أقرب نقطة دالة..."
                />

                <div className="sm:col-span-2">
                  <Input
                    label="ملاحظات المراجع"
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    placeholder="أي تفاصيل خاصة بالمراجع..."
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: Request Details */}
        <Card>
          <CardHeader className="bg-slate-50/70">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <CardTitle>2. بيانات وتفاصيل المعاملة</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="عنوان / الطلب"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: طلب نقل، تظلم، استثناء..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  نوع المعاملة <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={requestTypeId || requestType}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const matchedType = dbRequestTypes.find((t) => t.id === selectedVal || t.name === selectedVal);
                    if (matchedType) {
                      setRequestTypeId(matchedType.id);
                      setRequestType(matchedType.name);
                    } else {
                      setRequestType(selectedVal as RequestType);
                    }
                  }}
                >
                  {dbRequestTypes.length > 0 ? (
                    dbRequestTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="إصدار تصريح">إصدار تصريح</option>
                      <option value="تجديد رخصة">تجديد رخصة</option>
                      <option value="طلب شهادة رسمية">طلب شهادة رسمية</option>
                      <option value="شكوى وتظلم">شكوى وتظلم</option>
                      <option value="استعلام إداري">استعلام إداري</option>
                      <option value="طلب إعفاء">طلب إعفاء</option>
                      <option value="معاملة توثيق">معاملة توثيق</option>
                      <option value="أخرى">أخرى</option>
                    </>
                  )}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  الجهة الحكومية المعنية <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={ministryId}
                  onChange={(e) => setMinistryId(e.target.value)}
                >
                  {ministries.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.slaDays} أيام إنجاز)
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  أولوية المعاملة <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as RequestPriority)}
                >
                  <option value="عادي">عادي (المدة النظامية الكاملة)</option>
                  <option value="مهم">مهم (تسريع الإجراء 25%)</option>
                  <option value="عاجل">عاجل (أولوية قصوى 50%)</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  الموظف المسؤول عن المتابعة
                </label>
                <Select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Input
                  label="تاريخ استلام المعاملة"
                  type="date"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  الموعد المتوقع للإنجاز (محسوب آلياً بناءً على SLA)
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold text-sm">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{expectedDate || '---'}</span>
                  <span className="text-xs text-emerald-700 font-normal mr-auto">
                    ({activeMinistry?.name} • مدة {activeMinistry?.slaDays} أيام)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                تفاصيل ووصف المعاملة
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="اكتب شرحاً وافياً عن المعاملة والمستندات المرفقة والتوجيه المطلوب..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ملاحظات داخلية خاصة بالموظفين (سرية)
              </label>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="ملاحظات لا تظهر للمراجع أو في بوابة الاستعلام العام..."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Real Attachments & Documents */}
        <Card>
          <CardHeader className="bg-slate-50/70">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <CardTitle>3. المرفقات والمستندات الأولية</CardTitle>
              </div>
              <span className="text-xs text-slate-500">
                {uploadFiles.length > 0 ? `(${uploadFiles.length} ملفات محددة)` : 'اختياري'}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hidden"
            />

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60 shadow-inner'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/70 bg-slate-50/30'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                اسحب وأفلت الملفات هنا، أو <span className="text-blue-600 hover:underline">اضغط للاختيار من جهازك</span>
              </h4>
              <p className="text-xs text-slate-500">
                يدعم كافة المستندات: PDF, Word, Excel, وصور الهويات (PNG, JPG) حتى 10MB لكل ملف
              </p>
            </div>

            {/* Uploaded Files List */}
            {uploadFiles.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="text-xs font-bold text-slate-700">الملفات المرفقة الجاهزة للرفع:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {uploadFiles.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <File className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-bold text-xs text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">({item.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadFile(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="حذف المرفق"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* File Classification & Visibility */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        <select
                          value={item.documentType}
                          onChange={(e) => {
                            const newDocType = e.target.value;
                            setUploadFiles((prev) =>
                              prev.map((f) =>
                                f.id === item.id
                                  ? {
                                      ...f,
                                      documentType: newDocType,
                                      isPublic: newDocType !== 'IDENTITY'
                                    }
                                  : f
                              )
                            );
                          }}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium text-[11px]"
                        >
                          <option value="GENERAL">مستند عام</option>
                          <option value="IDENTITY">صورة الهوية / الإقامة</option>
                          <option value="REQUEST_DOCUMENT">مستند الطلب الأساسي</option>
                          <option value="COMMERCIAL_REG">سجل تجاري / ترخيص</option>
                        </select>

                        <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.isPublic}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setUploadFiles((prev) =>
                                prev.map((f) => (f.id === item.id ? { ...f, isPublic: checked } : f))
                              );
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                          />
                          <span>متاح للمراجع</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/requests')}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSave(true)}
            isLoading={isLoading}
          >
            حفظ وإضافة طلب آخر
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => handleSave(false)}
            isLoading={isLoading}
          >
            حفظ وإنشاء الطلب
          </Button>
        </div>
      </div>
    </div>
  );
};
