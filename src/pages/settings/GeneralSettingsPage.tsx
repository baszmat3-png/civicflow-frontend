import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowRight, Save, Settings, Building, Phone, Mail } from 'lucide-react';

export const GeneralSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, handleUpdateSettings } = useData();
  const { success, error } = useToast();

  const [systemName, setSystemName] = useState('');
  const [systemSubName, setSystemSubName] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [officeEmail, setOfficeEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings?.general) {
      setSystemName(settings.general.systemName);
      setSystemSubName(settings.general.systemSubName);
      setOfficePhone(settings.general.officePhone);
      setOfficeAddress(settings.general.officeAddress);
      setOfficeEmail(settings.general.officeEmail);
      setTaxNumber(settings.general.taxNumber || '');
      setWorkingHours(settings.general.workingHours);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsLoading(true);
    try {
      await handleUpdateSettings({
        general: {
          ...settings.general,
          systemName,
          systemSubName,
          officePhone,
          officeAddress,
          officeEmail,
          taxNumber,
          workingHours
        }
      });

      success('تم حفظ الإعدادات العامة بنجاح');
    } catch (err) {
      error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            العودة للإعدادات
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات النظام العامة</h1>
            <p className="text-xs text-slate-500 mt-0.5">بيانات المنظومة والترويسة ومعلومات الاتصال الرسمية</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          isLoading={isLoading}
          icon={<Save className="w-4 h-4" />}
        >
          حفظ التغييرات
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">بيانات الهوية والاسم الرسمي</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="اسم النظام / المنصة (بالعربية)"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="CivicFlow"
                required
              />

              <Input
                label="الاسم الفرعي / الإنجليزي"
                value={systemSubName}
                onChange={(e) => setSystemSubName(e.target.value)}
                placeholder="منظومة إدارة وتتبع معاملات المراجعين الحكومية"
              />

              <Input
                label="رقم هاتف المكتب / السنترال"
                value={officePhone}
                onChange={(e) => setOfficePhone(e.target.value)}
                placeholder="اتركه فارغاً أو أدخل رقم الهاتف"
              />

              <Input
                label="البريد الإلكتروني الرسمي"
                type="email"
                value={officeEmail}
                onChange={(e) => setOfficeEmail(e.target.value)}
                placeholder="support@civicflow.gov.iq"
              />

              <Input
                label="الرقم الضريبي / السجل التجاري"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="فارغ"
              />

              <Input
                label="أوقات العمل الرسمية"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="08:00 ص - 04:00 م"
              />

              <div className="sm:col-span-2">
                <Input
                  label="عنوان المقر الرئيسي"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="العراق_بغداد"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/settings')}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} icon={<Save className="w-4 h-4" />}>
            حفظ التغييرات
          </Button>
        </div>
      </form>
    </div>
  );
};
