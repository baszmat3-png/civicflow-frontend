import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Settings,
  Sliders,
  Clock,
  Bell,
  MessageSquare,
  Users,
  Lock,
  RotateCcw,
  ChevronLeft,
  CheckCircle2,
  FileCode2,
  MapPin,
  Layers,
  Database
} from 'lucide-react';

export const SettingsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetData } = useData();
  const { success } = useToast();

  const settingsCards = [
    {
      title: 'إعدادات النظام العامة',
      desc: 'اسم المنظومة، معلومات المكتب، العنوان، وأوقات العمل الرسمية',
      icon: <Settings className="w-6 h-6 text-blue-600" />,
      path: '/settings/general'
    },
    {
      title: 'النسخ الاحتياطي وحماية البيانات',
      desc: 'تصدير واستعادة نسخة كاملة من قاعدة البيانات، وجدولة النسخ اليومي التلقائي',
      icon: <Database className="w-6 h-6 text-emerald-600" />,
      path: '/settings/backup'
    },
    {
      title: 'إدارة المدن والمحافظات',
      desc: 'إدارة قائمة المدن والمناطق المعتمدة وربطها بالمراجعين والمعاملات',
      icon: <MapPin className="w-6 h-6 text-brand-600" />,
      path: '/settings/cities'
    },
    {
      title: 'أنواع وتصنيفات الطلبات',
      desc: 'تهيئة أنواع المعاملات، الأوصاف، وربطها ببوابة التقديم الإلكترونية',
      icon: <Layers className="w-6 h-6 text-violet-600" />,
      path: '/settings/request-types'
    },
    {
      title: 'تهيئة حالات الطلبات',
      desc: 'إدارة مراحل المعاملات، الألوان، الترتيب وتفعيل/تعطيل الحالات',
      icon: <Sliders className="w-6 h-6 text-indigo-600" />,
      path: '/settings/statuses'
    },
    {
      title: 'محددات مدد الإنجاز (SLA)',
      desc: 'المدد الزمنية الافتراضية لكل وزارة وجهة ونسب تسريع الأولويات',
      icon: <Clock className="w-6 h-6 text-emerald-600" />,
      path: '/settings/sla'
    },
    {
      title: 'تفضيلات الإشعارات',
      desc: 'تفعيل التنبيهات المباشرة وتنبيهات تأخر المعاملات الحرجة',
      icon: <Bell className="w-6 h-6 text-amber-600" />,
      path: '/settings/notifications'
    },
    {
      title: 'ربط بوابة WhatsApp',
      desc: 'حالة الاتصال، رقم الإرسال الرسمي، وضبط أحداث الإرسال التلقائي',
      icon: <MessageSquare className="w-6 h-6 text-teal-600" />,
      path: '/settings/whatsapp'
    },
    {
      title: 'قوالب رسائل WhatsApp',
      desc: 'تعديل نصوص الرسائل والمتغيرات التلقائية (الاسم، رقم الطلب، الرابط)',
      icon: <FileCode2 className="w-6 h-6 text-cyan-600" />,
      path: '/settings/whatsapp/templates'
    },
    {
      title: 'المستخدمون وفريق العمل',
      desc: 'إدارة حسابات الموظفين والمشرفين وكلمات المرور',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      path: '/employees'
    },
    {
      title: 'الأدوار والصلاحيات',
      desc: 'مصفوفة التحكم في الوصول وصلاحيات الإجراءات الخاصة',
      icon: <Lock className="w-6 h-6 text-rose-600" />,
      path: '/roles'
    }
  ];

  const handleReset = () => {
    if (window.confirm('هل تريد إعادة تعيين كافة البيانات إلى الحالة الافتراضية الأولية؟')) {
      resetData();
      success('تمت إعادة التعيين بنجاح', 'تمت استعادة البيانات الافتراضية للمنظومة');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">إعدادات المنظومة والتهيئة</h1>
          <p className="text-xs text-slate-500 mt-1">
            التحكم الشامل في إعدادات النظام، مدد SLA، الحالات، وقنوات المراسلة
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="text-rose-600 border-rose-200 hover:bg-rose-50"
          icon={<RotateCcw className="w-4 h-4" />}
        >
          استعادة البيانات الافتراضية للنموذج
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card) => (
          <Card
            key={card.title}
            hover
            onClick={() => navigate(card.path)}
            className="cursor-pointer transition-all border-slate-200 hover:border-blue-300"
          >
            <CardHeader className="bg-slate-50/70 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white shadow-xs border border-slate-200/80">
                  {card.icon}
                </div>
                <CardTitle className="text-base">{card.title}</CardTitle>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 leading-relaxed min-h-10">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
