import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  Users
} from 'lucide-react';
import { customerService } from '../../services/customerService';

interface BulkImportCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportCustomersModal: React.FC<BulkImportCustomersModalProps> = ({
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
    const headers = 'اسم_المراجع,رقم_الهاتف,عنوان_السكن,رقم_الهوية';
    const sample1 = '"ظاهر نجم عبد","07829352265","الحسينية منطقة 4","198512345678"';
    const sample2 = '"رفاه نجاح عبد الامير","07721318134","العطيفية جامع براثا","199087654321"';
    const sample3 = '"الشيخ كريم فلاح الشيخ حسين","07709046865","قضاء الصادق","197855443322"';

    const csv = '\uFEFF' + [headers, sample1, sample2, sample3].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'قالب_استيراد_المراجعين.csv';
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
              name: cols[0],
              phone: cols[1],
              address: cols[2] || '',
              nationalId: cols[3] || undefined
            });
          }
        }

        if (rows.length === 0) {
          setErrorMsg('لم يتم العثور على سجلات صالحة في الملف، تأكد من مطابقة الأعمدة للقالب.');
          return;
        }

        setParsedRows(rows);
      } catch (parseErr: any) {
        setErrorMsg('فشل قراءة الملف، يرجى التأكد من اختيار ملف CSV أو Excel سليم.');
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg('يرجى اختيار ملف يحتوي على بيانات صالحة أولاً');
      return;
    }

    try {
      setImporting(true);
      setErrorMsg('');

      const result = await customerService.bulkImport(parsedRows);
      setImportResult(result);

      if (result && result.successCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل استيراد المراجعين');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative border border-slate-100 dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              استيراد سجل المراجعين الجماعي (Excel / CSV)
            </h2>
            <p className="text-xs text-slate-500">
              رفع مئات سجلات المراجعين دفعة واحدة مع اسم المراجع، رقم هاتفه، وعنوانه
            </p>
          </div>
        </div>

        {/* Download Template Box */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-blue-950 dark:text-blue-200 space-y-1 text-center sm:text-right">
            <strong className="block">حمّل القالب النموذجي الجاهز (Excel / CSV)</strong>
            <span className="text-[11px] text-blue-700 dark:text-blue-300">
              يحتوي فقط على الأعمدة: اسم_المراجع، رقم_الهاتف، عنوان_السكن، رقم_الهوية
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            icon={<Download className="w-4 h-4 text-blue-600" />}
            className="shrink-0 bg-white dark:bg-gray-800"
          >
            تحميل القالب النموذجي
          </Button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {importResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                اكتمل الاستيراد: تم حفظ وتحديث {importResult.successCount} مراجع بنجاح!
              </span>
            </div>
            {importResult.failCount > 0 && (
              <div className="text-rose-700 text-[11px] pt-2 border-t border-emerald-200">
                فشل استيراد {importResult.failCount} صف.
              </div>
            )}
          </div>
        )}

        {/* Upload Box */}
        {!importResult && (
          <div className="space-y-4">
            <div className="p-6 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-2xl text-center bg-slate-50/50 dark:bg-gray-850 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="file"
                id="customers-bulk-file-input"
                className="hidden"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <label htmlFor="customers-bulk-file-input" className="cursor-pointer block space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  {file ? file.name : 'اضغط لاختيار أو سحب ملف المراجعين (CSV / Excel)'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'ملفات CSV أو نصية حتى 10 ميجابايت'}
                </div>
              </label>
            </div>

            {parsedRows.length > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-gray-750 rounded-xl border border-slate-200 dark:border-gray-700 text-xs flex items-center justify-between font-mono">
                <span>تم التعرف على: <strong>{parsedRows.length}</strong> مراجع جاهز للاستيراد</span>
                <span className="text-emerald-600 font-bold">جاهز للحفظ</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-gray-700">
          {!importResult ? (
            <>
              <Button
                type="button"
                variant="primary"
                className="w-full font-bold"
                onClick={handleExecuteImport}
                disabled={parsedRows.length === 0}
                isLoading={importing}
                icon={<Upload className="w-4 h-4" />}
              >
                بدء استيراد المراجعين ({parsedRows.length})
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="primary"
              className="w-full font-bold"
              onClick={() => {
                onClose();
              }}
            >
              تم وإغلاق النافذة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
