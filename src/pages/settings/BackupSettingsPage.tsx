import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { backupService, BackupItem } from '../../services/backupService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HardDrive,
  FileText,
  Calendar
} from 'lucide-react';

export const BackupSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadBackups = async () => {
    try {
      setIsLoading(true);
      const data = await backupService.getBackups();
      setBackups(data);
    } catch (err: any) {
      console.error('Failed to load backups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateSnapshot = async () => {
    try {
      setIsCreating(true);
      const newBackup = await backupService.createBackup('manual');
      success('تم إنشاء النسخة الاحتياطية بنجاح', `تم حفظ نقطة الاستعادة: ${newBackup.filename}`);
      loadBackups();
    } catch (err: any) {
      toastError('فشل إنشاء النسخة الاحتياطية', err?.message || 'حدث خطأ في السيرفر');
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportInstant = async () => {
    try {
      setIsExporting(true);
      await backupService.exportBackup();
      success('تم بدء تنزيل النسخة الاحتياطية', 'يتم الآن حفظ ملف النسخة الكاملة على جهازك بصيغة JSON');
      loadBackups();
    } catch (err: any) {
      toastError('فشل تنزيل النسخة الاحتياطية', err?.message || 'حدث خطأ في السيرفر');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`هل أنت متأكد من رغبتك في استعادة البيانات من الملف (${file.name})؟ لن يتم حذف أي بيانات حالية، وسيتم دمج وتحديث السجلات.`)) {
      e.target.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      await backupService.restoreBackup(file);
      success('تمت استعادة البيانات بنجاح', 'تم استيراد كافة الجداول والسجلات إلى قاعدة البيانات');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toastError('فشل استعادة النسخة الاحتياطية', err?.message || 'الملف المرفوع غير صالح');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-600"
            title="العودة للإعدادات"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Database className="w-6 h-6 text-blue-600" />
              النسخ الاحتياطي وحماية البيانات
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة النسخ الاحتياطية التلقائية واليدوية وتصدير واستعادة قاعدة بيانات PostgreSQL بالكامل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBackups}
            isLoading={isLoading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            تحديث القائمة
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportInstant}
            isLoading={isExporting}
            icon={<Download className="w-4 h-4" />}
          >
            تنزيل نسخة فورية للجهاز (JSON)
          </Button>
        </div>
      </div>

      {/* Info Status Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">النسخ التلقائي اليومي</p>
              <p className="text-[11px] text-emerald-700 font-medium">مفعل يومياً في 03:00 ص تلقائياً</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">حفظ الملفات والمرفقات</p>
              <p className="text-[11px] text-blue-700 font-medium">مدمجة بصيغة Binary داخل النسخة</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-950">نقاط الاستعادة المحفوظة</p>
              <p className="text-[11px] text-purple-700 font-medium">{backups.length} نقاط استعادة متاحة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">إجراءات النسخ والاستعادة السريعة</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  إنشاء نقطة استعادة على السيرفر
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  يقوم بأخذ لقطة فورية كاملة لكافة جداول النظام والطلبات والمرفقات وحفظها في السيرفر الداخلي.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCreateSnapshot}
                isLoading={isCreating}
              >
                إنشاء نقطة استعادة الآن
              </Button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  استعادة من ملف نسخة احتياطية (.json)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  استيراد واستعادة البيانات من ملف نسخة احتياطية محفوظ على جهازك بأمان وبدون حذف أي بيانات سابقة.
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestoreFile}
                  disabled={isRestoring}
                />
                <div className="w-full text-center py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition flex items-center justify-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  {isRestoring ? 'جاري استعادة البيانات...' : 'اختيار ملف النسخة لاستعادته'}
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>سجل النسخ الاحتياطية ونقاط الاستعادة</span>
            <span className="text-xs font-normal text-slate-400">يتم الاحتفاظ بآخر 30 نسخة تلقائياً</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-400">جاري قراءة سجل النسخ الاحتياطية...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Database className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد نسخ احتياطية مسجلة بعد</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                يمكنك الضغط على زر "إنشاء نقطة استعادة الآن" أو "تنزيل نسخة فورية" لإنشاء أول نسخة.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {backups.map((b) => (
                <div key={b.filename} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 font-mono" dir="ltr">
                        {b.filename}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(b.createdAt).toLocaleString('ar-EG')}
                        </span>
                        <span>•</span>
                        <span>الحجم: {b.sizeFormatted}</span>
                        <span>•</span>
                        <span>الطلبات: {b.counts.requests || 0}</span>
                        <span>•</span>
                        <span>المراجعين: {b.counts.customers || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => backupService.downloadBackup(b.filename)}
                      icon={<Download className="w-3.5 h-3.5" />}
                    >
                      تنزيل
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
