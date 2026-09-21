import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface SendOtpOptions {
  email: string;
  otp: string;
  purpose?: 'reset_password' | 'verify_email' | 'account_activation';
  userName?: string;
  expiresInMinutes?: number;
}

export type OtpEmailPurpose = NonNullable<SendOtpOptions['purpose']>;

/**
 * إخفاء جزء من البريد الإلكتروني في سجلات النظام للأمان
 * مثال: "youssef.eid@gmail.com" -> "y***d@gmail.com"
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

/**
 * تجهيز عنوان واسم المرسل
 */
const getSenderAddress = (rawFrom?: string, userEmail?: string): string => {
  if (rawFrom && rawFrom.trim()) {
    return rawFrom.trim();
  }
  if (userEmail && userEmail.trim()) {
    return `"منظومة CivicFlow" <${userEmail.trim()}>`;
  }
  return '"منظومة CivicFlow" <no-reply@civicflow.gov>';
};

/**
 * كائن النقل Singleton الخاص بـ Nodemailer و Gmail SMTP
 */
let cachedTransporter: Transporter | null = null;

export const getTransporter = (): Transporter | null => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = (process.env.SMTP_HOST || env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || env.SMTP_PASS || '').trim().replace(/\s+/g, '');

  if (!user || !pass) {
    return null;
  }

  // منفذ 587 في Gmail يستخدم STARTTLS (secure: false)، ومنفذ 465 يستخدم SSL (secure: true)
  const isSecure = port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  return cachedTransporter;
};

/**
 * اختبار الاتصال بخادم البريد SMTP
 */
export const verifySmtpConnection = async (): Promise<{ success: boolean; error?: string }> => {
  const user = (process.env.SMTP_USER || env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || env.SMTP_PASS || '').trim();
  const host = (process.env.SMTP_HOST || env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || env.SMTP_PORT || 587);

  if (!user || !pass) {
    const errorMsg = 'بيانات SMTP مفقودة: SMTP_USER أو SMTP_PASS فارغ';
    console.warn(`⚠️ [EMAIL] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  const transporter = getTransporter();
  if (!transporter) {
    const errorMsg = 'تعذر تهيئة ناقل البريد Nodemailer';
    console.warn(`⚠️ [EMAIL] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    console.log(`[EMAIL] Verifying SMTP connection (${host}:${port}) for ${maskEmail(user)}...`);
    await transporter.verify();
    console.log('✅ [EMAIL] SMTP connection verified successfully.');
    return { success: true };
  } catch (err: any) {
    const rawError = err?.message || 'SMTP verification failed';
    const sanitizedError = pass ? rawError.split(pass).join('***') : rawError;
    console.error(`❌ [EMAIL] SMTP verification failed: ${sanitizedError}`);
    return { success: false, error: sanitizedError };
  }
};

/**
 * إنشاء قالب بريد عربي رسمي (RTL) مع رمز الـ OTP
 */
export const buildOtpEmailHtml = ({
  otp,
  purpose = 'verify_email',
  userName = 'المستخدم الكريم',
  expiresInMinutes = 5
}: {
  otp: string;
  purpose?: OtpEmailPurpose;
  userName?: string;
  expiresInMinutes?: number;
}): { subject: string; html: string; text: string } => {
  const isReset = purpose === 'reset_password';
  const isActivation = purpose === 'account_activation';

  let subject = 'رمز التحقق - منظومة CivicFlow';
  let titleHeader = 'رمز التحقق لتأكيد الحساب';
  let actionText = 'يرجى استخدام رمز التحقق أدناه لتأكيد وتفعيل بريدك الإلكتروني في منظومة CivicFlow.';

  if (isReset) {
    subject = 'رمز إعادة تعيين كلمة المرور - منظومة CivicFlow';
    titleHeader = 'إعادة تعيين كلمة المرور';
    actionText = 'لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منظومة CivicFlow.';
  } else if (isActivation) {
    subject = 'تفعيل حسابك في منظومة CivicFlow';
    titleHeader = 'تفعيل الحساب الجديد';
    actionText = 'مرحباً بك في منظومة CivicFlow! يرجى استخدام الرمز أدناه لتفعيل حسابك.';
  }

  const text = `منظومة CivicFlow لإدارة المعاملات الحكومية\n\nمرحباً ${userName}،\n${actionText}\n\nرمز التحقق الخاص بك هو:\n${otp}\n\n⏳ هذا الرمز صالح لمدة ${expiresInMinutes} دقائق فقط.\nإذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.\n\nتنبيه أمني: لا تشارك هذا الرمز مع أي شخص إطلاقاً. فريق الدعم في CivicFlow لن يطلب منك هذا الرمز أبداً.`;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Cairo', Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      color: #0f172a;
    }
    .container {
      max-width: 560px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header-logo {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      font-size: 24px;
      margin-bottom: 12px;
    }
    .header-title {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }
    .header-subtitle {
      font-size: 13px;
      color: #93c5fd;
      margin: 0;
    }
    .content {
      padding: 32px 28px;
    }
    .badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid #bfdbfe;
      margin-bottom: 18px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
    }
    .message {
      font-size: 14px;
      line-height: 1.8;
      color: #334155;
      margin: 0 0 24px 0;
    }
    .otp-box {
      background: #f8fafc;
      border: 2px dashed #3b82f6;
      border-radius: 14px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .otp-code {
      font-size: 38px;
      font-weight: 900;
      font-family: 'Courier New', Courier, monospace;
      letter-spacing: 12px;
      color: #1d4ed8;
      margin: 8px 0;
      direction: ltr;
      display: inline-block;
    }
    .otp-expiry {
      font-size: 13px;
      color: #059669;
      font-weight: 600;
      margin-top: 8px;
    }
    .security-card {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-right: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 14px 16px;
      margin: 24px 0 16px 0;
    }
    .security-title {
      font-size: 13px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 4px;
    }
    .security-text {
      font-size: 12px;
      line-height: 1.6;
      color: #78350f;
      margin: 0;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer-links {
      margin-top: 8px;
    }
    .footer-links a {
      color: #3b82f6;
      text-decoration: none;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">🏛️</div>
      <h1 class="header-title">منظومة CivicFlow</h1>
      <p class="header-subtitle">المنظومة الوطنية لإدارة ومتابعة المعاملات الحكومية</p>
    </div>

    <div class="content">
      <div class="badge">${titleHeader}</div>
      <p class="greeting">مرحباً ${userName}،</p>
      <p class="message">${actionText}</p>

      <div class="otp-box">
        <div class="otp-label">رمز التحقق السريع (OTP)</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏳ الرمز صالح لمدة ${expiresInMinutes} دقائق فقط</div>
      </div>

      <p class="message" style="font-size: 13px; color: #64748b;">
        إذا لم تكن أنت من قام بطلب هذا الرمز، يُرجى تجاهل هذه الرسالة أو إبلاغ المشرف لحماية حسابك.
      </p>

      <div class="security-card">
        <div class="security-title">🛡️ تنبيه أمني هام</div>
        <p class="security-text">
          رمز التحقق هذا خاص وسري. لا تشاركه مع أي شخص إطلاقاً. موظفو الدعم الفني في CivicFlow لن يطلبوا منك هذا الرمز أبداً.
        </p>
      </div>
    </div>

    <div class="footer">
      <div>جميع الحقوق محفوظة © ${new Date().getFullYear()} منظومة CivicFlow الحكومية.</div>
      <div class="footer-links">
        <span>رسالة آلية تم إنشاؤها عبر النظام — يُرجى عدم الرد على هذا البريد</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
};

/**
 * إرسال رسالة بريد إلكتروني حقيقية عبر Resend HTTP API أو Nodemailer SMTP
 */
export const sendOTPEmail = async ({
  email,
  otp,
  purpose = 'verify_email',
  userName = 'المستخدم الكريم',
  expiresInMinutes = 5
}: SendOtpOptions): Promise<{ success: boolean; messageId: string }> => {
  const masked = maskEmail(email);
  const { subject, html, text } = buildOtpEmailHtml({ otp, purpose, userName, expiresInMinutes });

  const emailjsServiceId = (process.env.EMAILJS_SERVICE_ID || (env as any).EMAILJS_SERVICE_ID || 'service_lvsou99').trim();
  const emailjsTemplateId = (process.env.EMAILJS_TEMPLATE_ID || (env as any).EMAILJS_TEMPLATE_ID || 'template_sbp4dbc').trim();
  const emailjsPublicKey = (process.env.EMAILJS_PUBLIC_KEY || (env as any).EMAILJS_PUBLIC_KEY || 'OwmoePpWQZnCiaCkf').trim();
  const emailjsPrivateKey = (process.env.EMAILJS_PRIVATE_KEY || (env as any).EMAILJS_PRIVATE_KEY || 'U9uC6g2XpWD4Vr82w15eV').trim();

  // 1. استخدام EmailJS REST API (Port 443 HTTPS - يرسل مباشرة وموثوق 100% بدون حظر من Render)
  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    console.log(`[EMAIL] Dispatching OTP email via EmailJS HTTP API to ${masked}`);
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://civicflow-frontend-1-hoy9.onrender.com'
        },
        body: JSON.stringify({
          service_id: emailjsServiceId,
          template_id: emailjsTemplateId,
          user_id: emailjsPublicKey,
          accessToken: emailjsPrivateKey || undefined,
          template_params: {
            to_email: email,
            email: email,
            user_email: email,
            name: userName || 'المستخدم الكريم',
            user_name: userName || 'المستخدم الكريم',
            subject: subject,
            otp: otp,
            expires_in: expiresInMinutes,
            message: `رمز التحقق الخاص بك في منظومة CivicFlow هو: ${otp} (صالح لمدة ${expiresInMinutes} دقائق)`
          }
        })
      });

      if (res.ok) {
        const messageId = `emailjs-${Date.now()}`;
        console.log(`✅ [EMAIL] OTP email sent successfully via EmailJS (${masked}) [ID: ${messageId}]`);
        return { success: true, messageId };
      } else {
        const errText = await res.text();
        console.error(`❌ [EMAIL] EmailJS error (${res.status}): ${errText}`);
      }
    } catch (emailjsErr: any) {
      console.error(`⚠️ [EMAIL] EmailJS failed for (${masked}):`, emailjsErr?.message || emailjsErr);
    }
  }

  const brevoApiKey = (process.env.BREVO_API_KEY || (env as any).BREVO_API_KEY || '').trim();
  const resendApiKey = (process.env.RESEND_API_KEY || (env as any).RESEND_API_KEY || '').trim();

  // 2. استخدام Brevo HTTP API (Port 443 HTTPS)
  if (brevoApiKey) {
    console.log(`[EMAIL] Dispatching OTP email via Brevo HTTP API to ${masked}`);
    try {
      const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'baszmat3@gmail.com').trim();
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'منظومة CivicFlow', email: senderEmail },
          to: [{ email: email, name: userName || 'المستخدم الكريم' }],
          subject: subject,
          htmlContent: html,
          textContent: text
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = data?.message || `HTTP ${res.status}`;
        console.error(`❌ [EMAIL] Brevo API error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const messageId = data?.messageId || `brevo-${Date.now()}`;
      console.log(`✅ [EMAIL] OTP email sent successfully via Brevo (${masked}) [ID: ${messageId}]`);
      return { success: true, messageId };
    } catch (brevoErr: any) {
      console.error(`⚠️ [EMAIL] Brevo failed for (${masked}):`, brevoErr?.message || brevoErr);
    }
  }

  // 2. استخدام Resend HTTP API (Port 443 HTTPS)
  if (resendApiKey) {
    console.log(`[EMAIL] Dispatching OTP email via Resend HTTP API to ${masked}`);
    try {
      const resendFrom = (process.env.RESEND_FROM || 'منظومة CivicFlow <onboarding@resend.dev>').trim();
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [email],
          subject,
          html,
          text
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = data?.message || `HTTP ${res.status}`;
        console.error(`❌ [EMAIL] Resend API error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const messageId = data?.id || `resend-${Date.now()}`;
      console.log(`✅ [EMAIL] OTP email sent successfully via Resend (${masked}) [ID: ${messageId}]`);
      return { success: true, messageId };
    } catch (resendErr: any) {
      console.error(`⚠️ [EMAIL] Resend failed for (${masked}):`, resendErr?.message || resendErr);
    }
  }

  // 3. استخدام Nodemailer SMTP كـ Fallback
  console.log(`[EMAIL] Dispatching OTP email via Nodemailer SMTP to ${masked}`);

  const transporter = getTransporter();
  const smtpUser = (process.env.SMTP_USER || env.SMTP_USER || '').trim();

  if (!transporter || !smtpUser) {
    console.error(`❌ [EMAIL] SMTP transporter not configured for user (${masked})`);
    throw new AppError('خدمة إرسال البريد الإلكتروني غير مهيأة بالشكل الصحيح في الخادم', 500, 'SMTP_CONFIG_ERROR');
  }

  try {
    const sender = getSenderAddress(process.env.SMTP_FROM || env.SMTP_FROM, smtpUser);
    const info = await transporter.sendMail({
      from: sender,
      to: email,
      subject,
      text,
      html
    });

    console.log(`✅ [EMAIL] OTP email sent successfully via SMTP (${masked}) [MessageID: ${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (smtpErr: any) {
    const pass = (process.env.SMTP_PASS || env.SMTP_PASS || '').trim();
    const rawMsg = smtpErr?.message || 'SMTP error';
    const sanitizedMsg = pass ? rawMsg.split(pass).join('***') : rawMsg;
    console.error(`❌ [EMAIL] SMTP send failed for (${masked}): ${sanitizedMsg}`);
    throw new AppError(
      'تعذر إرسال رسالة البريد الإلكتروني المحتوية على رمز التحقق، يرجى التحقق من صحة البريد والمحاولة لاحقاً',
      500,
      'EMAIL_SEND_FAILED'
    );
  }
};

// Backward-compatible alias
export const sendOtpEmail = sendOTPEmail;