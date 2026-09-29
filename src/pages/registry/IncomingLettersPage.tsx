import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  FileText,
  Search,
  Plus,
  Download,
  Trash2,
  Building2,
  Calendar,
  Paperclip,
  Printer,
  FileSpreadsheet,
  Inbox,
  User,
  AlertCircle
} from 'lucide-react';
import { registryService, IncomingLetterItem } from '../../services/registryService';
import { CreateLetterModal } from '../../components/registry/CreateLetterModal';
import { RegistryExportModal } from '../../components/registry/RegistryExportModal';

const INCOMING_COLUMNS = [
  { key: 'incomingNumber', label: 'رقم الوارد' },
  { key: 'externalLetterNumber', label: 'رقم كتاب الجهة الأصلي' },
  { key: 'receiveDate', label: 'تاريخ الورود' },
  { key: 'subject', label: 'عنوان وموضوع الكتاب' },
  { key: 'senderEntity', label: 'الجهة الوارد منها' },
  { key: 'ministry', label: 'الوزارة ذات العلاقة' },
  { key: 'citizenName', label: 'صاحب الشأن' },
  { key: 'priority', label: 'الأولوية' },
  { key: 'actionRequired', label: 'الإجراء المطلوب' },
  { key: 'summary', label: 'الملخص' }
];

export const IncomingLettersPage: React.FC = () => {
  const [letters, setLetters] = useState<IncomingLetterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (id: string, fileName?: string) => {
    try {
      setDownloadingId(id);
      await registryService.downloadIncomingLetter(id, fileName || 'incoming_document.pdf');
    } catch (err: any) {
      alert(err.message || 'فشل تحميل الملف');
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const data = await registryService.getIncomingLetters({
        search,
        fromDate,
        toDate
      });
      setLetters(data);
    } catch (err) {
      console.error('Failed to fetch incoming letters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, [fromDate, toDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLetters();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القيد من سجل الوارد؟')) return;
    try {
      await registryService.deleteIncomingLetter(id);
      fetchLetters();
    } catch (err: any) {
      alert(err.message || 'فشل حذف القيد');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-emerald-600" />
            سجل الكتب الواردة (الوارد)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وقيد الكتب والمخاطبات الرسمية الواردة إلى المكتب ومتابعة إجراءاتها وأرشفتها.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExportOpen(true)}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            تصدير تقرير (Excel / PDF)
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            تسجيل كتاب وارد
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="rounded-2xl border-slate-200 dark:border-gray-700 shadow-xs">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الوارد أو العنوان أو الجهة أو صاحب الشأن..."
                className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">من:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 font-mono focus:outline-none"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="rounded-3xl border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">جاري تحميل سجل الوارد...</div>
          ) : letters.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">لا توجد كتب واردة مسجلة حالياً.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-gray-800 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700">
                  <tr>
                    <th className="p-4">رقم الوارد</th>
                    <th className="p-4">تاريخ الورود</th>
                    <th className="p-4">رقم ملف الحفظ</th>
                    <th className="p-4">وارد القسم</th>
                    <th className="p-4">عنوان الموضوع</th>
                    <th className="p-4">الجهة الوارد منها</th>
                    <th className="p-4">صاحب الشأن</th>
                    <th className="p-4">الأولوية</th>
                    <th className="p-4 text-center">المرفق</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {letters.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-750/50 transition">
                      <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.incomingNumber}
                        {row.externalLetterNumber && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            أصلي: {row.externalLetterNumber}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-gray-300">
                        {new Date(row.receiveDate).toISOString().split('T')[0]}
                      </td>
                      <td className="p-4 font-mono text-slate-700 dark:text-gray-300">
                        {row.archiveFileNumber ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-[11px] font-bold">
                            {row.archiveFileNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-gray-300 text-[11px]">
                        {row.departmentNumber || '-'}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {row.subject}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.senderEntity?.name || row.senderName || 'جهة عامة'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 dark:text-gray-300">
                        {row.citizenName ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{row.citizenName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-800'
                              : row.priority === 'IMPORTANT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.priority === 'URGENT' ? 'عاجل' : row.priority === 'IMPORTANT' ? 'مهم' : 'عادي'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {row.hasAttachment ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(row.id, row.fileName)}
                            disabled={downloadingId === row.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition disabled:opacity-50 cursor-pointer"
                          >
                            <Download className={`w-3.5 h-3.5 ${downloadingId === row.id ? 'animate-bounce' : ''}`} />
                            {downloadingId === row.id ? 'جارٍ التحميل...' : 'تحميل'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">بدون مرفق</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="حذف القيد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateLetterModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        type="INCOMING"
        onSuccess={fetchLetters}
      />

      <RegistryExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="تقرير_سجل_الوارد"
        data={letters}
        defaultColumns={INCOMING_COLUMNS}
      />
    </div>
  );
};
