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
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    currentBatch: number;
    totalBatches: number;
  } | null>(null);

  if (!isOpen) return null;

  // Download Sample Template (both CSV and Excel supported with 100% mobile compatibility)
  const handleDownloadTemplate = () => {
    try {
      const data = [
        {
          'اسم_المراجع': 'ظاهر نجم عبد',
          'رقم_الهاتف': '07829352265',
          'عنوان_السكن': 'الحسينية منطقة 4',
          'رقم_الهوية': '198512345678'
        },
        {
          'اسم_المراجع': 'رفاه نجاح عبد الامير',
          'رقم_الهاتف': '07721318134',
          'عنوان_السكن': 'العطيفية جامع براثا',
          'رقم_الهوية': '199087654321'
        },
        {
          'اسم_المراجع': 'الشيخ كريم فلاح الشيخ حسين',
          'رقم_الهاتف': '07709046865',
          'عنوان_السكن': 'قضاء الصادق',
          'رقم_الهوية': '197855443322'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المراجعين');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'قالب_استيراد_المراجعين.xlsx';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    } catch (err) {
      // Direct CSV Fallback
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
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
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
        setErrorMsg('الملف فارغ أو لا يحتوي على صفوف بيانات كافية (يجب أن يحتوي على صف عناوين وبيانات).');
        return;
      }

      const headers = (rawData[0] || []).map((h) => String(h || '').trim().toLowerCase());

      // Helper to find column index by matching aliases
      const findColIdx = (aliases: string[], fallbackIdx: number) => {
        const found = headers.findIndex((h) => aliases.some((a) => h.includes(a.toLowerCase())));
        return found !== -1 ? found : fallbackIdx;
      };

      const nameIdx = findColIdx(['اسم_المراجع', 'اسم المراجع', 'الاسم', 'اسم', 'مراجع', 'name', 'customer'], 0);
      const phoneIdx = findColIdx(['رقم_الهاتف', 'رقم الهاتف', 'الهاتف', 'الموبايل', 'هاتف', 'phone', 'mobile'], 1);
      const addrIdx = findColIdx(['عنوان_السكن', 'عنوان السكن', 'العنوان', 'السكن', 'المنطقة', 'address'], 2);
      const nidIdx = findColIdx(['رقم_الهوية', 'رقم الهوية', 'الرقم الوطني', 'الهوية الوطنية', 'الرقم_الوطني', 'nationalid', 'id'], 3);

      const rows: any[] = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !Array.isArray(row)) continue;

        const name = String(row[nameIdx] !== undefined ? row[nameIdx] : '').trim();
        const rawPhone = String(row[phoneIdx] !== undefined ? row[phoneIdx] : '').trim();
        const phone = rawPhone.replace(/\s+/g, '');
        const address = String(row[addrIdx] !== undefined ? row[addrIdx] : '').trim();
        const nationalId = String(row[nidIdx] !== undefined ? row[nidIdx] : '').trim();

        // Skip completely empty rows
        if (!name && !phone) continue;

        if (name && phone) {
          rows.push({
            name,
            phone,
            address: address || '',
            nationalId: nationalId || undefined
          });
        }
      }

      if (rows.length === 0) {
        setErrorMsg('لم يتم العثور على سجلات صالحة في الملف، تأكد من وجود عمودي الاسم ورقم الهاتف.');
        return;
      }

      setParsedRows(rows);
    } catch (parseErr: any) {
      console.error('Error parsing file:', parseErr);
      setErrorMsg('فشل قراءة الملف، يرجى التأكد من اختيار ملف Excel أو CSV صالح.');
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg('يرجى اختيار ملف يحتوي على بيانات صالحة أولاً');
      return;
    }

    try {
      setImporting(true);
      setErrorMsg('');
      setImportResult(null);

      const BATCH_SIZE = 50;
      const totalRows = parsedRows.length;
      const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

      let accumulatedSuccess = 0;
      let accumulatedFail = 0;
      const accumulatedErrors: string[] = [];

      for (let b = 0; b < totalBatches; b++) {
        const batchStart = b * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRows);
        const batchRows = parsedRows.slice(batchStart, batchEnd);

        setProgress({
          current: batchEnd,
          total: totalRows,
          percent: Math.round((batchEnd / totalRows) * 100),
          currentBatch: b + 1,
          totalBatches
        });

        try {
          const result = await customerService.bulkImport(batchRows);
          if (result) {
            accumulatedSuccess += result.successCount || 0;
            accumulatedFail += result.failCount || 0;
            if (Array.isArray(result.errors)) {
              accumulatedErrors.push(...result.errors);
            }
          }
        } catch (batchErr: any) {
          console.error(`Error importing batch ${b + 1}:`, batchErr);
          accumulatedFail += batchRows.length;
          accumulatedErrors.push(`الدفعة ${b + 1}: ${batchErr?.message || 'تعذر استيراد هذه الدفعة'}`);
        }
      }

      const finalResult = {
        successCount: accumulatedSuccess,
        failCount: accumulatedFail,
        errors: accumulatedErrors
      };

      setImportResult(finalResult);
      setProgress(null);

      if (accumulatedSuccess > 0) {
        try {
          onSuccess();
        } catch (succErr) {
          console.error('onSuccess callback error:', succErr);
        }
      }
    } catch (err: any) {
      console.error('Import execution error:', err);
      setErrorMsg(err?.message || 'فشل استيراد المراجعين، يرجى المحاولة مرة أخرى');
      setProgress(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative border border-slate-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
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

        {/* Live Batch Import Progress */}
        {progress && (
          <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span>جاري استيراد الدفعة {progress.currentBatch} من {progress.totalBatches}...</span>
              <span className="font-mono">{progress.current} / {progress.total} ({progress.percent}%)</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-300">
              يتم حفظ السجلات في قواعد البيانات بسرعة وأمان، يرجى الانتظار لحين اكتمال الرفع...
            </p>
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
                فشل استيراد {importResult.failCount} صف بسبب أخطاء في البيانات.
                {importResult.errors.length > 0 && (
                  <ul className="list-disc list-inside mt-1 max-h-24 overflow-y-auto font-mono text-[10px] space-y-0.5">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>...و {importResult.errors.length - 10} أخطاء أخرى</li>
                    )}
                  </ul>
                )}
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
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileChange}
              />
              <label htmlFor="customers-bulk-file-input" className="cursor-pointer block space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  {file ? file.name : 'اضغط لاختيار أو سحب ملف المراجعين (Excel / CSV)'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'ملفات Excel (.xlsx, .xls) أو CSV حتى 20 ميجابايت'}
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
                disabled={parsedRows.length === 0 || importing}
                isLoading={importing}
                icon={<Upload className="w-4 h-4" />}
              >
                بدء استيراد المراجعين ({parsedRows.length})
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={importing}>
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
