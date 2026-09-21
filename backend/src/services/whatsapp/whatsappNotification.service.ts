import { whatsAppProvider } from './index.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';

const getBaseTrackingUrl = (): string => {
  let frontUrl = (process.env.FRONTEND_URL || env.FRONTEND_URL || '').trim();
  if (!frontUrl || frontUrl.includes('localhost') || frontUrl.includes('127.0.0.1')) {
    frontUrl = 'https://civicflow-frontend-1-hoy9.onrender.com';
  }
  return frontUrl.replace(/\/+$/, '');
};

const renderTemplate = async (
  templateKey: string,
  variables: Record<string, string>,
  defaultFallback: string
): Promise<string> => {
  try {
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { key: templateKey }
    });

    if (template && template.content) {
      let rendered = template.content;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        rendered = rendered.replace(regex, value || '');
      }
      return rendered;
    }
  } catch (err) {
    console.warn(`⚠️ Could not load template ${templateKey} from database, using fallback:`, err);
  }

  return defaultFallback;
};

export const whatsappNotificationService = {
  /**
   * إرسال رسالة ترحيب وتأكيد استلام الطلب مع رقم المعاملة ورابط التتبع
   */
  sendRequestReceivedWhatsApp: async (params: {
    to: string;
    customerName: string;
    requestNumber: string;
    ministryName: string;
    expectedDate?: string;
    requestId?: string;
  }) => {
    if (!params.to) return;
    try {
      const trackingUrl = `${getBaseTrackingUrl()}/track/${params.requestNumber}`;
      const fallbackMessage = [
        `مرحباً بك عزيزي المراجع ${params.customerName}،`,
        `تم استلام طلبكم وقيده في منظومة CivicFlow بنجاح.`,
        `📋 رقم المعاملة: ${params.requestNumber}`,
        `🏛️ الجهة المعنية: ${params.ministryName}`,
        params.expectedDate ? `📅 تاريخ الإنجاز المتوقع: ${params.expectedDate}` : '',
        `🔗 لمتابعة حالة المعاملة لحظة بلحظة:`,
        `${trackingUrl}`
      ]
        .filter(Boolean)
        .join('\n');

      const message = await renderTemplate(
        'request_received',
        {
          customer_name: params.customerName,
          request_number: params.requestNumber,
          ministry: params.ministryName,
          expected_date: params.expectedDate || 'قريباً',
          tracking_link: trackingUrl
        },
        fallbackMessage
      );

      return await whatsAppProvider.sendMessage({
        to: params.to,
        message,
        templateKey: 'request_received',
        requestId: params.requestId
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp request received notification skipped:', err);
    }
  },

  /**
   * إرسال إشعار تحديث حالة المعاملة
   */
  sendStatusChangeWhatsApp: async (params: {
    to: string;
    customerName: string;
    requestNumber: string;
    ministryName: string;
    newStatus: string;
    note?: string | null;
    requestId?: string;
  }) => {
    if (!params.to) return;
    try {
      const trackingUrl = `${getBaseTrackingUrl()}/track/${params.requestNumber}`;
      const fallbackMessage = [
        `عزيزي المراجع ${params.customerName}،`,
        `نود إحاطتكم بتحديث جديد على معاملتكم رقم ${params.requestNumber} لدى ${params.ministryName}:`,
        `🔄 الحالة الحالية: ${params.newStatus}`,
        params.note ? `📝 ملاحظات: ${params.note}` : '',
        `🔗 للاطلاع على المستندات ومسار المعاملة:`,
        `${trackingUrl}`
      ]
        .filter(Boolean)
        .join('\n');

      const message = await renderTemplate(
        'status_updated',
        {
          customer_name: params.customerName,
          request_number: params.requestNumber,
          ministry: params.ministryName,
          status: params.newStatus,
          notes: params.note || '',
          tracking_link: trackingUrl
        },
        fallbackMessage
      );

      return await whatsAppProvider.sendMessage({
        to: params.to,
        message,
        templateKey: 'status_updated',
        requestId: params.requestId
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp status update notification skipped:', err);
    }
  },

  /**
   * إرسال إشعار صدور الإجابة والقرار النهائي
   */
  sendFinalResponseWhatsApp: async (params: {
    to: string;
    customerName: string;
    requestNumber: string;
    ministryName: string;
    decision: string;
    summary?: string;
    requestId?: string;
  }) => {
    if (!params.to) return;
    try {
      const trackingUrl = `${getBaseTrackingUrl()}/track/${params.requestNumber}`;
      const fallbackMessage = [
        `عزيزي المراجع ${params.customerName}،`,
        `يسعدنا إبلاغكم بصدور الإجابة والقرار النهائي لمعاملتكم رقم ${params.requestNumber}:`,
        `📜 القرار: ${params.decision}`,
        params.summary ? `📄 الملخص: ${params.summary}` : '',
        `🔗 لتحميل الوثيقة الرسمية المعتمدة:`,
        `${trackingUrl}`
      ]
        .filter(Boolean)
        .join('\n');

      const message = await renderTemplate(
        'final_response_ready',
        {
          customer_name: params.customerName,
          request_number: params.requestNumber,
          ministry: params.ministryName,
          decision: params.decision,
          summary: params.summary || '',
          tracking_link: trackingUrl
        },
        fallbackMessage
      );

      return await whatsAppProvider.sendMessage({
        to: params.to,
        message,
        templateKey: 'final_response_ready',
        requestId: params.requestId
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp final response notification skipped:', err);
    }
  },

  /**
   * إرسال رمز التحقق (OTP) عبر واتساب
   */
  sendOtpWhatsApp: async (params: {
    to: string;
    userName: string;
    otp: string;
    purpose: 'verify_email' | 'reset_password' | 'account_activation';
    expiresInMinutes?: number;
  }) => {
    if (!params.to) return { success: false };
    try {
      const isReset = params.purpose === 'reset_password';
      const actionTitle = isReset ? 'استعادة وتعيين كلمة المرور' : 'تأكيد وتفعيل الحساب';
      const message = [
        `🔒 *منظومة CivicFlow - رمز التحقق (OTP)*`,
        `مرحباً بك ${params.userName || 'عزيزنا المستخدم'}،`,
        `طلبكم لـ: *${actionTitle}*`,
        ``,
        `🔑 رمز التحقق الخاص بك هو: *${params.otp}*`,
        `⏳ الرمز صالح لمدة ${params.expiresInMinutes || 10} دقائق فقط.`,
        ``,
        `⚠️ تنبيه أمني: لا تشارك هذا الرمز مع أي شخص لحماية حسابك.`
      ].join('\n');

      return await whatsAppProvider.sendMessage({
        to: params.to,
        message,
        templateKey: 'otp_verification'
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp OTP notification skipped:', err);
      return { success: false };
    }
  }
};

