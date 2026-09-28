import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  Download,
  Printer,
  FileSpreadsheet,
  X,
  CheckSquare,
  Square,
  Calendar,
  Layers
} from 'lucide-react';

interface RegistryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  defaultColumns: Array<{ key: string; label: string }>;
}

export const RegistryExportModal: React.FC<RegistryExportModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  defaultColumns
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    defaultColumns.map((c) => c.key)
  );
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter((k) => k !== key));
      }
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const selectAll = () => setSelectedColumns(defaultColumns.map((c) => c.key));
  const deselectAll = () => setSelectedColumns([defaultColumns[0].key]);

  // Filter rows by date
  const filteredData = data.filter((item) => {
    const itemDate = item.issueDate || item.receiveDate || item.createdAt;
    if (!itemDate) return true;
    const d = new Date(itemDate).toISOString().split('T')[0];
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  // Export to CSV / Excel
  const handleExportExcel = () => {
    const activeCols = defaultColumns.filter((c) => selectedColumns.includes(c.key));
    const headerRow = activeCols.map((c) => `"${c.label}"`).join(',');

    const rows = filteredData.map((row) => {
      return activeCols
        .map((col) => {
          let val = row[col.key];
          if (col.key === 'recipientEntity') val = row.recipientEntity?.name || row.recipientName;
          if (col.key === 'senderEntity') val = row.senderEntity?.name || row.senderName;
          if (col.key === 'ministry') val = row.ministry?.name;
          if (col.key === 'issueDate' || col.key === 'receiveDate') {
            val = val ? new Date(val).toISOString().split('T')[0] : '';
          }
          if (val === undefined || val === null) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  // Export / Print PDF view
  const handlePrintPDF = () => {
    const activeCols = defaultColumns.filter((c) => selectedColumns.includes(c.key));

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; padding: 20px; direction: rtl; }
            h2 { text-align: center; margin-bottom: 5px; }
            .meta { text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f4f8; font-weight: bold; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <div class="meta">
            تاريخ التصدير: ${new Date().toLocaleDateString('ar-IQ')} | إجمالي السجلات: ${filteredData.length}
            ${fromDate || toDate ? ` | الفترة من: ${fromDate || 'البداية'} إلى: ${toDate || 'الآن'}` : ''}
          </div>
          <table>
            <thead>
              <tr>
                ${activeCols.map((c) => `<th>${c.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredData
                .map((row) => {
                  return `<tr>
                    ${activeCols
                      .map((col) => {
                        let val = row[col.key];
                        if (col.key === 'recipientEntity') val = row.recipientEntity?.name || row.recipientName;
                        if (col.key === 'senderEntity') val = row.senderEntity?.name || row.senderName;
                        if (col.key === 'ministry') val = row.ministry?.name;
                        if (col.key === 'issueDate' || col.key === 'receiveDate') {
                          val = val ? new Date(val).toISOString().split('T')[0] : '';
                        }
                        return `<td>${val || '-'}</td>`;
                      })
                      .join('')}
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative border border-slate-100 dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            تصدير مخصص (Excel و PDF)
          </h2>
          <p className="text-xs text-slate-500">
            حدد الخانات والأعمدة المراد تضمينها في التقرير ونطاق التاريخ:
          </p>
        </div>

        {/* Date Range */}
        <div className="p-4 bg-slate-50 dark:bg-gray-750 rounded-2xl border border-slate-100 dark:border-gray-700 space-y-3">
          <label className="block text-xs font-bold text-slate-800 dark:text-gray-200 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            نطاق التواريخ (اختياري):
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">من تاريخ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">إلى تاريخ:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Columns Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 dark:text-gray-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              الخانات والأعمدة المراد إظهارها:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-blue-600 hover:underline font-bold"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[11px] text-slate-400 hover:underline"
              >
                إلغاء الكل
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-gray-750 rounded-2xl border border-slate-100 dark:border-gray-700">
            {defaultColumns.map((col) => {
              const isChecked = selectedColumns.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  className={`p-2 rounded-xl text-xs flex items-center gap-2 border text-right transition ${
                    isChecked
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 text-blue-800 dark:text-blue-300 font-bold'
                      : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-600'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span>{col.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-gray-700 flex gap-2">
          <Button
            variant="primary"
            className="flex-1 text-xs"
            onClick={handleExportExcel}
            icon={<FileSpreadsheet className="w-4 h-4" />}
          >
            تصدير إلى Excel ({filteredData.length} سجل)
          </Button>

          <Button
            variant="secondary"
            className="flex-1 text-xs"
            onClick={handlePrintPDF}
            icon={<Printer className="w-4 h-4" />}
          >
            طباعة تقرير PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
