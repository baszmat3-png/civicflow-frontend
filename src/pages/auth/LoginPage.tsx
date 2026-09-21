import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Lock, Mail, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toastError('كلمة المرور مطلوبة', 'يرجى إدخال كلمة المرور للمتابعة');
      return;
    }
    setIsLoading(true);

    try {
      await login(email, password);
      success('تم تسجيل الدخول بنجاح', 'مرحباً بك في منظومة CivicFlow');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      toastError('فشل تسجيل الدخول', err?.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900">تسجيل الدخول للنظام</h2>
        <p className="text-xs text-slate-500 mt-1">أدخل بيانات الاعتماد المعتمدة للوصول إلى لوحة الإدارة</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="البريد الإلكتروني"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          required
          icon={<Mail className="w-4 h-4" />}
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-slate-700">كلمة المرور</label>
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            icon={<Lock className="w-4 h-4" />}
          />
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
            تسجيل الدخول
          </Button>
        </div>
      </form>

      <div className="mt-8 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          منظومة آمنة ومخصصة للموظفين والمشرفين المصرح لهم فقط
        </p>
      </div>
    </div>
  );
};
