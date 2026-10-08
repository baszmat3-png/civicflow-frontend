import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ArrowRight, Save, Building2 } from 'lucide-react';

export const EditMinistryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ministries, handleUpdateMinistry } = useData();
  const { success, error } = useToast();

  const ministry = ministries.find((m) => m.id === id);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [slaDays, setSlaDays] = useState(7);
  const [status, setStatus] = useState<'نشط' | 'غير نشط'>('نشط');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const initializedIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (ministry && initializedIdRef.current !== ministry.id) {
      initializedIdRef.current = ministry.id;
      setName(ministry.name || '');
      setCode(ministry.code || '');
      setSlaDays(ministry.slaDays || 7);
      setStatus(ministry.status || 'نشط');
      setContactPerson(ministry.contactPerson || '');
      setContactPhone(ministry.contactPhone || '');
      setContactEmail(ministry.contactEmail || '');
      setNotes(ministry.notes || '');
    }
  }, [ministry]);

  if (!ministry) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">الجهة غير موجودة</p>
        <Button variant="primary" onClick={() => navigate('/ministries')}>
          العودة للوزارات
        </Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await handleUpdateMinistry(ministry.id, {
        name,
        code,
        slaDays: Number(slaDays),
        status,
        contactPerson,
        contactPhone,
        contactEmail,
        notes
      });

      success('تم تحديث بيانات الجهة', `تم حفظ التعديلات لـ ${name}`);
      navigate(`/ministries/${ministry.id}`);
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">تعديل بيانات الجهة الحكومية</h1>
          <p className="text-xs text-slate-500 mt-1">{ministry.name}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/ministries/${ministry.id}`)}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          إلغاء والعودة للتفاصيل
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <CardTitle>بيانات الجهة ومحددات SLA</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="اسم الجهة أو الوزارة"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="الرمز المختصر (Code)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />

              <Input
                label="مدة الإنجاز الافتراضية (SLA بالأيام)"
                type="number"
                min={1}
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                required
              />

              <Select
                label="الحالة"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'نشط' | 'غير نشط')}
              >
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </Select>

              <Input
                label="مسؤول الاتصال"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />

              <Input
                label="هاتف التواصل"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />

              <Input
                label="البريد الإلكتروني"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ملاحظات
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/ministries/${ministry.id}`)}>
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
