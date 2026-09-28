import React, { useState } from 'react';
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

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headers = 'اسم_المراجع,رقم_الهاتف,الرقم_الوطني,المدينة,عنوان_المراجع,الجهة_المعنية,نوع_المعاملة,عنوان_الطلب,التفاصيل';
    const sample1 = '"علي حسين جاسم","07701234567","198812345678","بغداد","الكرادة","وزارة العمل والشؤون الاجتماعية","صرف ماستر كارد معاق","طلب إصدار بطاقة ماستر كارد لذوي الإعاقة","تفاصيل الطلب ومرفقات الحالة..."';
    const sample2 = '"سارة عمار كاظم","07809876543","199587654321","البصرة","الجبيلة","وزارة التربية","طلب نقل مدرس","طلب نقل إلى مدرسة قريبة من السكن","..."';

    const csv = '\uFEFF' + [headers, sample1, sample2].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'قالب_استيراد_المعاملات_الجماعي.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Parse CSV File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setImportResult(null);
    if (!e.target.files || !e.target.files[0]) return;

    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setErrorMsg('الملف فارغ أو لا يحتوي على صفوف بيانات');
          return;
        }

        // Simple CSV splitter handling quotes
        const parseCSVLine = (line: string) => {
          const values: string[] = [];
          let current = '';
          let inQuote = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          return values.map((v) => v.replace(/^"|"$/g, ''));
        };

        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length >= 2 && cols[0]) {
            rows.push({
              customerName: cols[0],
              customerPhone: cols[1],
              nationalId: cols[2] || undefined,
              cityName: cols[3] || undefined,
              address: cols[4] || undefined,
              ministryName: cols[5] || undefined,
              requestType: cols[6] || undefined,
              title: cols[7] || `طلب مراجع: ${cols[0]}`,
              details: cols[8] || ''
            });
          }
        }

        setParsedRows(rows);
      } catch (err) {
        setErrorMsg('تعذر قراءة ملف الـ CSV، يرجى التأكد من التنسيق');
      }
    };

    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    try {
      setImporting(true);
      setErrorMsg('');
      const res = await requestService.bulkImport(parsedRows);
      setImportResult(res);
      onSuccess();
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
          <div className="space-y-4 py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              اكتملت عملية الاستيراد بنجاح
            </h3>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold">
                تم استيرادها: {importResult.successCount}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-slate-600 font-bold">
                تعذر: {importResult.failCount}
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-800 text-right max-h-32 overflow-y-auto">
                <p className="font-bold mb-1">الملاحظات والأخطاء:</p>
                {importResult.errors.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}

            <Button variant="primary" onClick={onClose} className="w-full">
              إغلاق
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Download Sample */}
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-300 block">
                  1. تحميل نموذج القالب الجاهز:
                </span>
                <span className="text-blue-700 dark:text-blue-400 text-[11px]">
                  حمّل القالب المعتمد واملأ بيانات المراجعين ثم ارفعه هنا.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="shrink-0 text-xs text-blue-700 border-blue-300 bg-white"
                icon={<Download className="w-3.5 h-3.5" />}
              >
                تحميل القالب CSV
              </Button>
            </div>

            {/* Step 2: Upload File */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 mb-2">
                2. اختر ملف البيانات (CSV):
              </label>
              <div className="p-6 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-2xl text-center bg-slate-50/50 dark:bg-gray-850 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="file"
                  id="bulk-csv-input"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="bulk-csv-input" className="cursor-pointer block space-y-2">
                  <Upload className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    {file ? file.name : 'اضغط لاختيار ملف الـ CSV'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {parsedRows.length > 0 ? `تم التعرف على ${parsedRows.length} سجل جاهز للاستيراد` : 'ملفات CSV المرمزة بـ UTF-8'}
                  </div>
                </label>
              </div>
            </div>

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-gray-300">
                  معاينة أول {Math.min(3, parsedRows.length)} سجلات:
                </span>
                <div className="p-3 bg-slate-50 dark:bg-gray-750 rounded-2xl border border-slate-200 dark:border-gray-700 max-h-40 overflow-y-auto space-y-2 text-xs">
                  {parsedRows.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                      <div>
                        <strong>{r.customerName}</strong> ({r.customerPhone})
                        <div className="text-[10px] text-slate-400">{r.title} - {r.ministryName || 'جهة عامة'}</div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">جاهز ✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-gray-700">
              <Button
                variant="primary"
                className="w-full font-bold bg-emerald-600 hover:bg-emerald-700"
                onClick={handleExecuteImport}
                isLoading={importing}
                disabled={parsedRows.length === 0}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                تنفيذ استيراد {parsedRows.length} معاملة
              </Button>
              <Button variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
