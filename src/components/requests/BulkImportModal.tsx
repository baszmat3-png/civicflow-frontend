import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '../ui/Button';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import { requestService } from '../../services/requestService';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failCount: number;
    errors: string[];
  } | null>(null);

  if (!isOpen) return null;

  // Download Sample Template
  const handleDownloadTemplate = () => {
    try {
      const data = [
        {
          'اسم_المراجع': 'علي حسين جاسم',
          'رقم_الهاتف': '07701234567',
          'الرقم_الوطني': '198812345678',
          'المدينة': 'بغداد',
          'عنوان_المراجع': 'الكرادة',
          'الجهة_المعنية': 'وزارة العمل والشؤون الاجتماعية',
          'نوع_المعاملة': 'صرف ماستر كارد معاق',
          'عنوان_الطلب': 'طلب إصدار بطاقة ماستر كارد لذوي الإعاقة',
          'التفاصيل': 'تفاصيل الطلب ومرفقات الحالة...'
        },
        {
          'اسم_المراجع': 'سارة عمار كاظم',
          'رقم_الهاتف': '07809876543',
          'الرقم_الوطني': '199587654321',
          'المدينة': 'البصرة',
          'عنوان_المراجع': 'الجبيلة',
          'الجهة_المعنية': 'وزارة التربية',
          'نوع_المعاملة': 'طلب نقل مدرس',
          'عنوان_الطلب': 'طلب نقل إلى مدرسة قريبة من السكن',
          'التفاصيل': 'يرجى التفضل بالموافقة على نقل المعلمة...'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المعاملات');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'قالب_استيراد_المعاملات_الجماعي.xlsx';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
    } catch {
      // Fallback to standard CSV if Excel Blob generation fails on older webviews
      const headers = ['اسم_المراجع', 'رقم_الهاتف', 'الرقم_الوطني', 'المدينة', 'عنوان_المراجع', 'الجهة_المعنية', 'نوع_المعاملة', 'عنوان_الطلب', 'التفاصيل'];
      const row1 = ['علي حسين جاسم', '07701234567', '198812345678', 'بغداد', 'الكرادة', 'وزارة العمل والشؤون الاجتماعية', 'صرف ماستر كارد معاق', 'طلب إصدار بطاقة ماستر كارد لذوي الإعاقة', 'تفاصيل الطلب ومرفقات الحالة...'];
      const csvContent = '\uFEFF' + [headers.join(','), row1.join(',')].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'قالب_استيراد_المعاملات.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
    }
  };

  // Robust parsing using XLSX supporting .xlsx, .xls, .csv, .txt
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setImportResult(null);
    if (!e.target.files || !e.target.files[0]) return;

    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setErrorMsg('الملف لا يحتوي على أي صفحات بيانات صالحة.');
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawData || rawData.length < 2) {
        setErrorMsg('الملف فارغ أو لا يحتوي على صفوف بيانات كافية.');
        return;
      }

      const headers = (rawData[0] || []).map((h) => String(h || '').trim().toLowerCase());

      const findColIdx = (aliases: string[], fallbackIdx: number) => {
        const found = headers.findIndex((h) => aliases.some((a) => h.includes(a.toLowerCase())));
        return found !== -1 ? found : fallbackIdx;
      };

      const nameIdx = findColIdx(['اسم_المراجع', 'اسم المراجع', 'الاسم', 'اسم', 'مراجع', 'name', 'customer'], 0);
      const phoneIdx = findColIdx(['رقم_الهاتف', 'رقم الهاتف', 'الهاتف', 'الموبايل', 'هاتف', 'phone', 'mobile'], 1);
      const nidIdx = findColIdx(['الرقم_الوطني', 'رقم_الهوية', 'الرقم الوطني', 'الهوية', 'nationalid'], 2);
      const cityIdx = findColIdx(['المدينة', 'المحافظة', 'city'], 3);
      const addrIdx = findColIdx(['عنوان_المراجع', 'عنوان السكن', 'العنوان', 'السكن', 'address'], 4);
      const minIdx = findColIdx(['الجهة_المعنية', 'الجهة', 'الوزارة', 'ministry', 'entity'], 5);
      const typeIdx = findColIdx(['نوع_المعاملة', 'نوع الطلب', 'النوع', 'type'], 6);
      const titleIdx = findColIdx(['عنوان_الطلب', 'عنوان المعاملة', 'موضوع الطلب', 'العنوان', 'title'], 7);
      const descIdx = findColIdx(['التفاصيل', 'تفاصيل الطلب', 'الوصف', 'details', 'description'], 8);

      const rows: any[] = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;

        const customerName = String(row[nameIdx] !== undefined ? row[nameIdx] : '').trim();
        const rawPhone = String(row[phoneIdx] !== undefined ? row[phoneIdx] : '').trim();
        const customerPhone = rawPhone.replace(/\s+/g, '');
        const nationalId = String(row[nidIdx] !== undefined ? row[nidIdx] : '').trim();
        const cityName = String(row[cityIdx] !== undefined ? row[cityIdx] : '').trim();
        const address = String(row[addrIdx] !== undefined ? row[addrIdx] : '').trim();
        const ministryName = String(row[minIdx] !== undefined ? row[minIdx] : '').trim();
        const requestType = String(row[typeIdx] !== undefined ? row[typeIdx] : '').trim();
        const title = String(row[titleIdx] !== undefined ? row[titleIdx] : '').trim();
        const details = String(row[descIdx] !== undefined ? row[descIdx] : '').trim();

        if (!customerName && !customerPhone) continue;

        if (customerName && customerPhone) {
          rows.push({
            customerName,
            customerPhone,
            nationalId: nationalId || undefined,
            cityName: cityName || undefined,
            address: address || undefined,
            ministryName: ministryName || undefined,
            requestType: requestType || undefined,
            title: title || `طلب مراجع: ${customerName}`,
            details: details || ''
          });
        }
      }

      if (rows.length === 0) {
        setErrorMsg('لم يتم العثور على سجلات صالحة في الملف، تأكد من وجود عمودي اسم المراجع ورقم الهاتف.');
        return;
      }

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Error parsing request bulk file:', err);
      setErrorMsg('فشل قراءة ملف الـ Excel أو CSV، يرجى التأكد من اختيار ملف صالح.');
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    try {
      setImporting(true);
      setErrorMsg('');
      const res = await requestService.bulkImport(parsedRows);
      setImportResult(res);
      if (res && res.successCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تنفيذ عملية الاستيراد');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 relative border border-slate-100 dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              استيراد جماعي للمراجعين والمعاملات (Excel / CSV)
            </h2>
            <p className="text-xs text-slate-500">
              رفع ملف وإدخال دفعة كبيرة من المواطنين وطلباتهم دفعة واحدة في المنظومة.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {importResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>تم إكمال عملية الاستيراد الجماعي!</span>
              </div>
              <p>تم إدخال وتحديث <strong>{importResult.successCount}</strong> معاملة بنجاح.</p>
              {importResult.failCount > 0 && (
                <p className="text-rose-600">تعذر إدخال {importResult.failCount} صف لعدم اكتمال البيانات.</p>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full font-bold"
              onClick={onClose}
            >
              إغلاق
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Download Template Box */}
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-blue-900 dark:text-blue-100">
                  هل تحتاج إلى نموذج لتعبئة البيانات؟
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  حمّل قالب Excel الجاهز الذي يحتوي على ترتيب الأعمدة الصحيح.
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                icon={<Download className="w-4 h-4 text-blue-600" />}
                className="shrink-0 bg-white dark:bg-gray-800"
              >
                تحميل القالب
              </Button>
            </div>

            {/* Upload Area */}
            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-2xl text-center bg-slate-50/50 dark:bg-gray-850 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="file"
                id="requests-bulk-file-input"
                className="hidden"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
              />
              <label htmlFor="requests-bulk-file-input" className="cursor-pointer block space-y-2">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-white">
                  {file ? file.name : 'اضغط لاختيار ملف أو اسحبه إلى هنا'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'ملفات Excel (.xlsx, .xls) أو CSV حتى 20 ميجابايت'}
                </div>
              </label>
            </div>

            {parsedRows.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-gray-750 rounded-xl border border-slate-200 dark:border-gray-700 text-xs flex items-center justify-between font-mono">
                <span>تم التعرف على: <strong>{parsedRows.length}</strong> معاملة جاهزة للاستيراد</span>
                <span className="text-emerald-600 font-bold">جاهز للحفظ</span>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-gray-700">
              <Button
                type="button"
                variant="primary"
                className="w-full font-bold"
                onClick={handleExecuteImport}
                disabled={parsedRows.length === 0}
                isLoading={importing}
                icon={<Upload className="w-4 h-4" />}
              >
                بدء الاستيراد الآن ({parsedRows.length})
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
