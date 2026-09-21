import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, Lock, KeyRound, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // Step 1: 'EMAIL_ENTRY' | Step 2: 'OTP_AND_NEW_PASSWORD'
  const [step, setStep] = useState<'EMAIL_ENTRY' | 'OTP_AND_NEW_PASSWORD'>('EMAIL_ENTRY');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      await authService.requestPasswordResetOTP(email.trim());
      success('تم إرسال رمز التحقق', 'تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني');
      setStep('OTP_AND_NEW_PASSWORD');
    } catch (err: any) {
      const msg = err.message || 'تعذر إرسال رمز التحقق. يرجى التأكد من البريد المدخل';
      setErrorMessage(msg);
      toastError('خطأ', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('كلمتا المرور غير متطابقتين');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPasswordWithOTP(email.trim(), otp.trim(), newPassword);
      success('تم تعيين كلمة المرور بنجاح', 'يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة');
      navigate('/login');
    } catch (err: any) {
      const msg = err.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته';
      setErrorMessage(msg);
      toastError('فشل التعيين', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div dir="rtl">
      <div className="mb-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">استعادة وتأكيد الحساب</h2>
        <p className="text-xs text-slate-500 mt-1">
          {step === 'EMAIL_ENTRY'
            ? 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رمز تحقق (OTP) فوري'
            : 'أدخل رمز التحقق (OTP) وكلمة المرور الجديدة لتأكيد حسابك'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {step === 'EMAIL_ENTRY' ? (
        <form onSubmit={handleRequestOTP} className="space-y-4">
          <Input
            label="البريد الإلكتروني المسجل"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            required
            icon={<Mail className="w-4 h-4" />}
          />

          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
              إرسال رمز التحقق (OTP)
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in duration-200">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
            <div>
              تم إرسال الرمز إلى: <strong className="font-mono font-bold text-blue-950">{email}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('EMAIL_ENTRY');
                setOtp('');
                setErrorMessage('');
              }}
              className="text-blue-700 underline font-bold hover:text-blue-900 text-[11px]"
            >
              تغيير البريد
            </button>
          </div>

          <Input
            label="رمز التحقق (OTP) المكون من 6 أرقام"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
            icon={<ShieldCheck className="w-4 h-4" />}
          />

          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            icon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            icon={<Lock className="w-4 h-4" />}
          />

          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
              تأكيد وتعيين كلمة المرور
            </Button>
          </div>
        </form>
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
          <ArrowRight className="w-3.5 h-3.5" />
          العودة لتسجيل الدخول
        </Link>
      </div>
    </div>
  );
};
