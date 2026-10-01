import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { cityService } from '../../services/cityService';
import { City } from '../../types';
import { ArrowRight, Save, User } from 'lucide-react';
import { IRAQI_GOVERNORATES } from '../../constants/iraqGovernorates';

export const EditCustomerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, handleUpdateCustomer } = useData();
  const { success, error, warning } = useToast();

  const customer = customers.find((c) => c.id === id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [occupation, setOccupation] = useState<'موظف حكومي' | 'كاسب' | 'طالب' | 'عاطل عن العمل' | 'قطاع خاص' | 'أخرى' | string>('كاسب');
  const [birthYear, setBirthYear] = useState('');
  const [email, setEmail] = useState('');
  const [cityId, setCityId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'نشط' | 'محظور'>('نشط');
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const initializedIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    cityService.getActive().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    if (customer && initializedIdRef.current !== customer.id) {
      initializedIdRef.current = customer.id;
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setAltPhone(customer.altPhone || '');
      setNationalId(customer.nationalId || '');
      setOccupation(customer.occupation || 'كاسب');
      setBirthYear(customer.birthYear || '');
      setEmail(customer.email || '');
      setCityId(customer.cityId || '');
      setAddress(customer.address || '');
      setNotes(customer.notes || '');
      setStatus(customer.status || 'نشط');
    }
  }, [customer]);

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">المراجع غير موجود في النظام</p>
        <Button variant="primary" onClick={() => navigate('/customers')}>
          العودة لقائمة المراجعين
        </Button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !occupation || !birthYear.trim() || !cityId || !address.trim()) {
      warning('حقول مطلوبة', 'يرجى إدخال جميع الحقول الإلزامية (الاسم، الهاتف، العمل، سنة الميلاد، المحافظة، عنوان السكن)');
      return;
    }
    setIsLoading(true);

    try {
      await handleUpdateCustomer(customer.id, {
        name,
        phone,
        altPhone,
        nationalId,
        occupation,
        birthYear: birthYear.trim() || undefined,
        email,
        cityId: cityId || undefined,
        address,
        notes,
        status
      });

      success('تم تحديث البيانات بنجاح', `تم حفظ تعديلات ${name}`);
      navigate(`/customers/${customer.id}`);
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">تعديل ملف المراجع</h1>
          <p className="text-xs text-slate-500 mt-1">{customer.name}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/customers/${customer.id}`)}
          icon={<ArrowRight className="w-4 h-4" />}
        >
          إلغاء والعودة للتفاصيل
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <CardTitle>تعديل بيانات المراجع</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="رقم هاتف واتساب"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="077********"
                required
              />

              <Input
                label="رقم الهاتف اتصال"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder="078********"
              />

              <Input
                label="رقم الهوية الوطنية / البطاقة الموحدة"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="19xxxxxxxxxx"
              />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  العمل / المهنة <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  required
                >
                  <option value="موظف حكومي">موظف حكومي</option>
                  <option value="كاسب">كاسب</option>
                  <option value="طالب">طالب</option>
                  <option value="عاطل عن العمل">عاطل عن العمل</option>
                  <option value="قطاع خاص">قطاع خاص</option>
                  <option value="أخرى">أخرى</option>
                </Select>
              </div>

              <Input
                label="المواليد (سنة الميلاد)"
                type="text"
                required
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="مثال: 1995"
              />

              <Input
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Select
                label="حالة المراجع"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'نشط' | 'محظور')}
              >
                <option value="نشط">نشط</option>
                <option value="محظور">محظور</option>
              </Select>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  المحافظة <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  required
                >
                  <option value="">اختر المحافظة...</option>
                  {IRAQI_GOVERNORATES.map((gov, idx) => {
                    const matched = cities.find((c) => c.name === gov);
                    return (
                      <option key={gov} value={matched ? matched.id : gov}>
                        {idx + 1}. {gov}
                      </option>
                    );
                  })}
                </Select>
              </div>

              <Input
                label="عنوان السكن / أقرب نقطة دالة"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="المحافظة - الحي - أقرب نقطة دالة"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                الملاحظات
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
          <Button type="button" variant="outline" onClick={() => navigate(`/customers/${customer.id}`)}>
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
