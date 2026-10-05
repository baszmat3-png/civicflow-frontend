import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RolePermissionMatrix } from '../../types';
import { ArrowRight, Save, Shield, Check, X, Lock } from 'lucide-react';

const ALL_MODULES = [
  'الطلبات',
  'المراجعون',
  'الوزارات',
  'الموظفون',
  'إدارة المواعيد',
  'الصادر والوارد',
  'التقارير',
  'الإشعارات',
  'الإعدادات',
  'سجل العمليات'
];

export const RolePermissionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roles, handleUpdateRole } = useData();
  const { success, error } = useToast();

  const role = roles.find((r) => r.id === id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<RolePermissionMatrix[]>([]);
  const [extraPermissions, setExtraPermissions] = useState({
    changeStatus: true,
    uploadAttachments: true,
    exportExcel: true,
    sendNotifications: true,
    manageWhatsapp: false,
    viewAuditLogs: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const initializedRoleIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (role && initializedRoleIdRef.current !== role.id) {
      initializedRoleIdRef.current = role.id;
      setName(role.name);
      setDescription(role.description);

      // Fill in any missing modules
      const map = new Map((role.permissions || []).map((p) => [p.module, p]));
      const completeList: RolePermissionMatrix[] = ALL_MODULES.map((mod) => {
        return (
          map.get(mod) || {
            module: mod,
            view: false,
            create: false,
            edit: false,
            delete: false
          }
        );
      });
      setPermissions(completeList);

      if (role.extraPermissions) {
        setExtraPermissions(role.extraPermissions);
      }
    }
  }, [role]);

  if (!role) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">الدور غير موجود</p>
        <Button variant="primary" onClick={() => navigate('/roles')}>
          العودة للأدوار
        </Button>
      </div>
    );
  }

  const togglePermission = (moduleName: string, action: 'view' | 'create' | 'edit' | 'delete') => {
    setPermissions((prev) =>
      prev.map((item) => {
        if (item.module === moduleName) {
          return { ...item, [action]: !item[action] };
        }
        return item;
      })
    );
  };

  const toggleRowAll = (moduleName: string, enable: boolean) => {
    setPermissions((prev) =>
      prev.map((item) => {
        if (item.module === moduleName) {
          return {
            ...item,
            view: enable,
            create: enable,
            edit: enable,
            delete: enable
          };
        }
        return item;
      })
    );
  };

  const toggleExtra = (key: keyof typeof extraPermissions) => {
    setExtraPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await handleUpdateRole(role.id, {
        name,
        description,
        permissions,
        extraPermissions
      });

      success('تم حفظ الصلاحيات بنجاح', `تم تحديث مصفوفة صلاحيات دور (${name})`);
      navigate('/roles');
    } catch (err) {
      error('حدث خطأ', 'تعذر حفظ الصلاحيات');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/roles')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              مصفوفة صلاحيات الدور: {role.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد الإجراءات المسموحة والمحظورة للمستخدمين المعينين في هذا الدور
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          isLoading={isLoading}
          icon={<Save className="w-4 h-4" />}
        >
          حفظ الصلاحيات
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Role Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">بيانات الدور الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم الدور"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="الوصف"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Matrix Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-base">مصفوفة صلاحيات الوحدات (CRUD Permissions)</CardTitle>
              <CardDescription>
                تحكم بالعمليات الأساسية (مشاهدة، إضافة، تعديل، حذف) لكل وحدة في النظام
              </CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6 font-bold">الوحدة / القسم</th>
                  <th className="py-3.5 px-4 font-bold text-center">مشاهدة (View)</th>
                  <th className="py-3.5 px-4 font-bold text-center">إضافة (Create)</th>
                  <th className="py-3.5 px-4 font-bold text-center">تعديل (Edit)</th>
                  <th className="py-3.5 px-4 font-bold text-center">حذف (Delete)</th>
                  <th className="py-3.5 px-4 font-bold text-center">إجراء سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.map((perm) => (
                  <tr key={perm.module} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-6 font-bold text-slate-900 text-sm">
                      {perm.module}
                    </td>

                    {/* View */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={perm.view}
                        onChange={() => togglePermission(perm.module, 'view')}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Create */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={perm.create}
                        onChange={() => togglePermission(perm.module, 'create')}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Edit */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={perm.edit}
                        onChange={() => togglePermission(perm.module, 'edit')}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* Delete */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={perm.delete}
                        onChange={() => togglePermission(perm.module, 'delete')}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                      />
                    </td>

                    {/* Fast row toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleRowAll(perm.module, true)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          تحديد الكل
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRowAll(perm.module, false)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          إلغاء
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Extra Action Permissions */}
        <Card>
          <CardHeader className="bg-slate-50/70">
            <div>
              <CardTitle className="text-base">الصلاحيات والإجراءات الخاصة</CardTitle>
              <CardDescription>صلاحيات متقدمة للعمليات الحساسة في المنظومة</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              onClick={() => toggleExtra('changeStatus')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                extraPermissions.changeStatus
                  ? 'bg-blue-50/60 border-blue-300 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div>
                <p className="font-bold text-xs">تغيير حالة المعاملات</p>
                <p className="text-[11px] text-slate-500">نقل المعاملات بين مراحل المعالجة</p>
              </div>
              <input
                type="checkbox"
                checked={extraPermissions.changeStatus}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            <div
              onClick={() => toggleExtra('uploadAttachments')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                extraPermissions.uploadAttachments
                  ? 'bg-blue-50/60 border-blue-300 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div>
                <p className="font-bold text-xs">رفع وإرفاق المستندات</p>
                <p className="text-[11px] text-slate-500">إضافة ملفات ووثائق للطلبات</p>
              </div>
              <input
                type="checkbox"
                checked={extraPermissions.uploadAttachments}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            <div
              onClick={() => toggleExtra('exportExcel')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                extraPermissions.exportExcel
                  ? 'bg-blue-50/60 border-blue-300 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div>
                <p className="font-bold text-xs">تصدير التقارير وExcel</p>
                <p className="text-[11px] text-slate-500">تحميل وتصدير بيانات المنظومة</p>
              </div>
              <input
                type="checkbox"
                checked={extraPermissions.exportExcel}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            <div
              onClick={() => toggleExtra('sendNotifications')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                extraPermissions.sendNotifications
                  ? 'bg-blue-50/60 border-blue-300 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div>
                <p className="font-bold text-xs">إرسال إشعارات للمراجعين</p>
                <p className="text-[11px] text-slate-500">إرسال تنبيهات SMS وWhatsApp</p>
              </div>
              <input
                type="checkbox"
                checked={extraPermissions.sendNotifications}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            <div
              onClick={() => toggleExtra('manageWhatsapp')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                extraPermissions.manageWhatsapp
                  ? 'bg-blue-50/60 border-blue-300 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div>
                <p className="font-bold text-xs">إدارة إعدادات WhatsApp</p>
                <p className="text-[11px] text-slate-500">تعديل القوالب والربط</p>
              </div>
              <input
                type="checkbox"
                checked={extraPermissions.manageWhatsapp}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>

            <div
              onClick={() => toggleExtra('viewAuditLogs')}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                extraPermissions.viewAuditLogs
                  ? 'bg-blue-50/60 border-blue-300 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div>
                <p className="font-bold text-xs">مشاهدة سجل العمليات</p>
                <p className="text-[11px] text-slate-500">تتبع نشاط المستخدمين</p>
              </div>
              <input
                type="checkbox"
                checked={extraPermissions.viewAuditLogs}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Bottom */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/roles')}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            icon={<Save className="w-4 h-4" />}
          >
            حفظ واعتماد الصلاحيات
          </Button>
        </div>
      </form>
    </div>
  );
};
