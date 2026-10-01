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
  Send,
  User
} from 'lucide-react';
import { registryService, OutgoingLetterItem } from '../../services/registryService';
import { CreateLetterModal } from '../../components/registry/CreateLetterModal';
import { RegistryExportModal } from '../../components/registry/RegistryExportModal';

const OUTGOING_COLUMNS = [
  { key: 'letterNumber', label: 'رقم الكتاب (العدد)' },
  { key: 'issueDate', label: 'تاريخ الكتاب' },
  { key: 'subject', label: 'عنوان وموضوع الكتاب' },
  { key: 'recipientEntity', label: 'الجهة الصادر إليها' },
  { key: 'ministry', label: 'الوزارة ذات العلاقة' },
  { key: 'citizenName', label: 'صاحب الشأن' },
  { key: 'citizenPhone', label: 'رقم الهاتف' },
  { key: 'summary', label: 'الملخص' }
];

export const OutgoingLettersPage: React.FC = () => {
  const [letters, setLetters] = useState<OutgoingLetterItem[]>([]);
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
      await registryService.downloadOutgoingLetter(id, fileName || 'outgoing_document.pdf');
    } catch (err: any) {
      alert(err.message || 'فشل تحميل الملف');
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const data = await registryService.getOutgoingLetters({
        search,
        fromDate,
        toDate
      });
      setLetters(data);
    } catch (err) {
      console.error('Failed to fetch outgoing letters:', err);
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
    if (!window.confirm('هل أنت متأكد من حذف هذا القيد من سجل الصادر؟')) return;
    try {
      await registryService.deleteOutgoingLetter(id);
      fetchLetters();
    } catch (err: any) {
      alert(err.message || 'فشل حذف القيد');
    }
  };

  const [createModalType, setCreateModalType] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');

  const handleOpenCreate = (type: 'OUTGOING' | 'INCOMING') => {
    setCreateModalType(type);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Registry Type Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <a
          href="/registry/incoming"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          <span>📥 سجل الكتب الواردة (الوارد)</span>
        </a>
        <a
          href="/registry/outgoing"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-600 text-white shadow-md shadow-blue-600/20"
        >
          <span>📤 سجل الكتب الصادرة (الصادر)</span>
        </a>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-600" />
            سجل الكتب الصادرة (الصادر)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وتوثيق وأرشفة كافة المخاطبات والكتب الرسمية الصادرة من المكتب إلى الوزارات والجهات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExportOpen(true)}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            تصدير تقرير (Excel / PDF)
          </Button>

          <Button
            variant="outline"
            onClick={() => handleOpenCreate('INCOMING')}
            icon={<Plus className="w-4 h-4 text-emerald-600" />}
            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            + تسجيل كتاب وارد
          </Button>

          <Button
            variant="primary"
            onClick={() => handleOpenCreate('OUTGOING')}
            icon={<Plus className="w-4 h-4" />}
          >
            + تسجيل كتاب صادر
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
                placeholder="بحث برقم الكتاب أو العنوان أو صاحب الشأن..."
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
            <div className="py-16 text-center text-xs text-slate-400">جاري تحميل سجل الصادر...</div>
          ) : letters.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">لا توجد كتب صادرة مسجلة حالياً.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-gray-800 text-slate-500 font-bold border-b border-slate-200 dark:border-gray-700">
                  <tr>
                    <th className="p-4">رقم الكتاب (العدد)</th>
                    <th className="p-4">تاريخ الكتاب</th>
                    <th className="p-4">رقم ملف الحفظ</th>
                    <th className="p-4">صادر القسم</th>
                    <th className="p-4">عنوان الموضوع</th>
                    <th className="p-4">الجهة الصادر إليها</th>
                    <th className="p-4">صاحب الشأن</th>
                    <th className="p-4 text-center">المرفق</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {letters.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-gray-750/50 transition">
                      <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.letterNumber}
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-gray-300">
                        {new Date(row.issueDate).toISOString().split('T')[0]}
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
                          <span>{row.recipientEntity?.name || row.recipientName || 'جهة عامة'}</span>
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
                      <td className="p-4 text-center">
                        {row.hasAttachment ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(row.id, row.fileName)}
                            disabled={downloadingId === row.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 transition disabled:opacity-50 cursor-pointer"
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
        type={createModalType}
        onSuccess={fetchLetters}
      />

      <RegistryExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="تقرير_سجل_الصادر"
        data={letters}
        defaultColumns={OUTGOING_COLUMNS}
      />
    </div>
  );
};
