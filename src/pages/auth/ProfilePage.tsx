import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { User, Mail, Phone, Shield, Clock, KeyRound, Edit, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { authService } from '../../services/authService';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { success, error: toastError } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isVerifyPhoneModalOpen, setIsVerifyPhoneModalOpen] = useState(false);

  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(
    Boolean(user?.emailVerified || (user?.email && localStorage.getItem(`email_verified_${user.email}`) === 'true'))
  );
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Phone WhatsApp verification state
  const [isPhoneVerified, setIsPhoneVerified] = useState(
    Boolean(user?.phone && localStorage.getItem(`phone_verified_${user.phone}`) === 'true')
  );
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneVerificationError, setPhoneVerificationError] = useState('');

  useEffect(() => {
    if (user?.emailVerified || (user?.email && localStorage.getItem(`email_verified_${user.email}`) === 'true')) {
      setIsEmailVerified(true);
    } else {
      setIsEmailVerified(false);
    }

    if (user?.phone && localStorage.getItem(`phone_verified_${user.phone}`) === 'true') {
      setIsPhoneVerified(true);
    } else {
      setIsPhoneVerified(false);
    }
  }, [user?.email, user?.emailVerified, user?.phone]);

  // Edit state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleStartEmailVerification = async () => {
    if (!user?.email) return;
    setIsSendingOtp(true);
    setVerificationError('');
    try {
      await authService.sendVerificationOTP(user.email);
      success('تم إرسال رمز التحقق', `تم إرسال رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني (${user.email})`);
      setIsVerifyModalOpen(true);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'تعذر إرسال رمز التحقق';
      setVerificationError(msg);
      toastError('خطأ في الإرسال', msg);
      setIsVerifyModalOpen(true);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleConfirmEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || !user?.email) return;

    setIsVerifyingOtp(true);
    setVerificationError('');
    try {
      await authService.verifyEmailOTP(user.email, otpInput.trim());
      setIsEmailVerified(true);
      localStorage.setItem(`email_verified_${user.email}`, 'true');
      if (user) {
        const updatedUser = { ...user, emailVerified: true };
        localStorage.setItem('civicflow_user', JSON.stringify(updatedUser));
      }
      success('تم تأكيد الحساب', 'تم التحقق من بريدك الإلكتروني وتأكيد الحساب بنجاح ✓');
      setIsVerifyModalOpen(false);
      setOtpInput('');
    } catch (err: any) {
      setVerificationError(err.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleStartPhoneVerification = async () => {
    if (!user?.phone) return;
    setIsSendingPhoneOtp(true);
    setPhoneVerificationError('');
    try {
      await authService.sendPhoneVerificationOTP(user.phone);
      success('تم إرسال رمز التحقق (WhatsApp)', `تم إرسال رمز التحقق المكون من 6 أرقام إلى رقم الواتساب (${user.phone}) عبر WPSenderX`);
      setIsVerifyPhoneModalOpen(true);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'تعذر إرسال رمز التحقق عبر الواتساب';
      setPhoneVerificationError(msg);
      toastError('خطأ في الإرسال', msg);
      setIsVerifyPhoneModalOpen(true);
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleConfirmPhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOtpInput || !user?.phone) return;

    setIsVerifyingPhoneOtp(true);
    setPhoneVerificationError('');
    try {
      await authService.verifyPhoneOTP(user.phone, phoneOtpInput.trim());
      setIsPhoneVerified(true);
      localStorage.setItem(`phone_verified_${user.phone}`, 'true');
      success('تم تأكيد رقم الواتساب', 'تم التحقق من رقم الهاتف وتأكيد الواتساب بنجاح ✓');
      setIsVerifyPhoneModalOpen(false);
      setPhoneOtpInput('');
    } catch (err: any) {
      setPhoneVerificationError(err.message || 'رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name, email, phone, department });
      success('تم تحديث الملف الشخصي', 'تم حفظ التعديلات بنجاح');
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      return;
    }
    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      success('تم تغيير كلمة المرور بنجاح', 'تم تحديث كلمة المرور في قاعدة البيانات. يرجى استخدامها للدخول القادم.');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error('Change password error:', err);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <Card>
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-blue-600 border-4 border-slate-700 text-white flex items-center justify-center font-black text-3xl shadow-xl">
            {user?.name ? user.name[0] : 'U'}
          </div>

          <div className="flex-1 text-center sm:text-right space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                <p className="text-slate-300 text-sm">{user?.department || 'الإدارة العامة والمتابعة'}</p>
              </div>
              <div className="flex items-center gap-2 justify-center sm:justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  icon={<Edit className="w-3.5 h-3.5" />}
                >
                  تعديل الملف الشخصي
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  icon={<KeyRound className="w-3.5 h-3.5" />}
                >
                  تغيير كلمة المرور
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" />
                الدور: <strong className="text-white">{user?.role}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                آخر تسجيل دخول: <strong className="text-white">{user?.lastLogin}</strong>
              </span>
            </div>
          </div>
        </div>

        <CardContent>
          <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
            البيانات الشخصية والوظيفية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">الاسم الكامل</span>
              <p className="font-bold text-slate-800">{user?.name}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">البريد الإلكتروني</span>
              <div className="flex flex-col items-start gap-2">
                <p className="font-bold text-slate-800 font-mono break-all" dir="ltr">{user?.email}</p>
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    مؤكد ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartEmailVerification}
                    disabled={isSendingOtp}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <span>تأكيد برمز OTP</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">رقم الهاتف الجوال</span>
              <div className="flex flex-col items-start gap-2">
                <p className="font-bold text-slate-800 font-mono break-all" dir="ltr">{user?.phone || 'غير مسجل'}</p>
                {isPhoneVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    موثق واتساب ✓
                  </span>
                ) : user?.phone ? (
                  <button
                    type="button"
                    onClick={handleStartPhoneVerification}
                    disabled={isSendingPhoneOtp}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer border border-emerald-200"
                  >
                    {isSendingPhoneOtp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تأكيد برمز واتساب</span>
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">الدور الإداري</span>
              <p className="font-bold text-blue-600">{user?.role}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">حالة الحساب</span>
              <div>
                <StatusBadge status="نشط" size="sm" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">آخر جلسة عمل</span>
              <p className="font-bold text-slate-800">{user?.lastLogin}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل بيانات الملف الشخصي"
        maxWidth="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input label="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="البريد الإلكتروني" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="رقم الجوال" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label="القسم / الإدارة" value={department} onChange={(e) => setDepartment(e.target.value)} />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary">
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="تغيير كلمة المرور"
        maxWidth="sm"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="كلمة المرور الحالية"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" isLoading={isChangingPassword}>
              تحديث كلمة المرور
            </Button>
          </div>
        </form>
      </Modal>

      {/* Verify Email OTP Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="تأكيد البريد الإلكتروني برمز تحقق"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmEmailVerification} className="space-y-4" dir="rtl">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            تم إرسال رمز تحقق مكون من 6 أرقام إلى:
            <p className="font-bold font-mono text-blue-950 mt-1">{user?.email}</p>
          </div>

          {verificationError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {verificationError}
            </div>
          )}

          <Input
            label="رمز التحقق (OTP)"
            type="text"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
            autoFocus
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleStartEmailVerification}
              disabled={isSendingOtp}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
            >
              {isSendingOtp ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
            </button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsVerifyModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isVerifyingOtp}>
                تأكيد البريد
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Verify WhatsApp Phone OTP Modal */}
      <Modal
        isOpen={isVerifyPhoneModalOpen}
        onClose={() => setIsVerifyPhoneModalOpen(false)}
        title="تأكيد وتوثيق رقم الواتساب"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmPhoneVerification} className="space-y-4" dir="rtl">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold mb-1 text-emerald-800">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>رمز التحقق عبر الواتساب (WPSenderX)</span>
            </div>
            تم إرسال رمز تحقق فوري إلى رقم الواتساب:
            <p className="font-bold font-mono text-emerald-900 text-sm mt-1">{user?.phone}</p>
          </div>

          {phoneVerificationError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {phoneVerificationError}
            </div>
          )}

          <Input
            label="رمز التحقق (OTP)"
            type="text"
            value={phoneOtpInput}
            onChange={(e) => setPhoneOtpInput(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
            autoFocus
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleStartPhoneVerification}
              disabled={isSendingPhoneOtp}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 underline"
            >
              {isSendingPhoneOtp ? 'جاري الإرسال...' : 'إعادة إرسال رمز الواتساب'}
            </button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsVerifyPhoneModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isVerifyingPhoneOtp}>
                تأكيد الواتساب
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

