import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ArrowRight, Save, UserCheck } from 'lucide-react';

export const EditEmployeePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employees, roles, handleUpdateEmployee } = useData();
  const { success, error } = useToast();

  const employee = employees.find((e) => e.id === id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'نشط' | 'غير نشط'>('نشط');
  const [isLoading, setIsLoading] = useState(false);
  const initializedIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (employee && initializedIdRef.current !== employee.id) {
      initializedIdRef.current = employee.id;
      setName(employee.name || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setRoleId(employee.roleId || '');
      setDepartment(employee.department || '');
      setStatus(employee.status || 'نشط');
    }
  }, [employee]);

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">الموظف غير موجود</p>
        <Button variant="primary" onClick={() => navigate('/employees')}>
          العودة للموظفين
        </Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const selectedRole = roles.find((r) => r.id === roleId);
      await handleUpdateEmployee(employee.id, {
        name,
        email,
        phone,
        roleId,
        role: selectedRole?.name || employee.role,
        department,
        status
      });

      success('تم تحديث بيانات الموظف', `تم حفظ التعديلات لـ ${name}`);
      navigate(`/employees/${employee.id}`);
    } catch (err) {
      error('حدث خطأ', 'تعذر حفظ البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">تعديل بيانات الموظف</h1>
          <p className="text-xs text-slate-500 mt-1">{employee.name}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/employees/${employee.id}`)}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          إلغاء والعودة للتفاصيل
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <CardTitle>بيانات الحساب</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="الاسم الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="رقم الهاتف"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <Select
                label="الدور الإداري"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>

              <Select
                label="الحالة"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'نشط' | 'غير نشط')}
              >
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </Select>

              <div className="sm:col-span-2">
                <Input
                  label="القسم / الإدارة"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/employees/${employee.id}`)}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} icon={<Save className="w-4 h-4" />}>
            حفظ التعديلات
          </Button>
        </div>
      </form>
    </div>
  );
};
