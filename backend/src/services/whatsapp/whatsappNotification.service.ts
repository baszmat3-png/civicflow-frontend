import { whatsAppProvider } from './index.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { messageQueue } from '../messageQueue.service.js';

const getBaseTrackingUrl = (): string => {
  let frontUrl = (process.env.FRONTEND_URL || env.FRONTEND_URL || '').trim();
  if (!frontUrl || frontUrl.includes('localhost') || frontUrl.includes('127.0.0.1')) {
    frontUrl = 'https://civicflow-frontend-1-hoy9.onrender.com';
  }
  return frontUrl.replace(/\/+$/, '');
};

// Templates change rarely: cache them so each message doesn't cost a DB round-trip.
const TEMPLATE_TTL_MS = 60_000;
const templateCache = new Map<string, { content: string | null; at: number }>();

/** Call after any template create/update/delete so edits apply immediately */
export const invalidateTemplateCache = () => templateCache.clear();

const loadTemplateContent = async (templateKey: string): Promise<string | null> => {
  const hit = templateCache.get(templateKey);
  if (hit && Date.now() - hit.at < TEMPLATE_TTL_MS) return hit.content;
  const template = await prisma.whatsAppTemplate.findUnique({ where: { key: templateKey } });
  const content = template?.content || null;
  templateCache.set(templateKey, { content, at: Date.now() });
  return content;
};

const renderTemplate = async (
  templateKey: string | string[],
  variables: Record<string, string>,
  defaultFallback: string
): Promise<string> => {
  // Several keys may be tried in order (e.g. the pre-designed 'receive_request' template)
  const keys = Array.isArray(templateKey) ? templateKey : [templateKey];
  for (const key of keys) {
    try {
      const content = await loadTemplateContent(key);
      if (content) {
        let rendered = content;
        for (const [name, value] of Object.entries(variables)) {
          rendered = rendered.split(`{{${name}}}`).join(value || '');
        }
        return rendered;
      }
    } catch (err) {
      console.warn(`⚠️ Could not load template ${key} from database:`, err);
    }
  }
  return defaultFallback;
};

/** Pick the pre-designed template that matches the new request status */
const statusTemplateKeys = (status: string): string[] => {
  const st = status || '';
  if (st.includes('مستند') || st.includes('نواقص')) return ['docs_required', 'status_updated', 'status_changed'];
  if (st.includes('موافق') || st.includes('معتمد')) return ['approved', 'status_updated', 'status_changed'];
  if (st.includes('جاهز')) return ['ready_for_pickup', 'status_updated', 'status_changed'];
  return ['status_updated', 'status_changed'];
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
        ['request_received', 'receive_request'],
        {
          customer_name: params.customerName,
          request_number: params.requestNumber,
          ministry: params.ministryName,
          expected_date: params.expectedDate || 'قريباً',
          tracking_link: trackingUrl
        },
        fallbackMessage
      );

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey: 'request_received',
        requestId: params.requestId,
        priority: 3
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
        statusTemplateKeys(params.newStatus),
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

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey: 'status_updated',
        requestId: params.requestId,
        priority: 3
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
        ['final_response_ready', 'ready_for_pickup'],
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

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey: 'final_response_ready',
        requestId: params.requestId,
        priority: 3
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
  },

  /**
   * إرسال رسالة قبول واعتماد موعد المقابلة (تستخدم قالب appointment_approved)
   */
  sendAppointmentApprovedWhatsApp: async (params: {
    to: string;
    customerName: string;
    appointmentNumber: string;
    targetPerson: string;
    appointmentDate: string;
    appointmentTime: string;
    notes?: string | null;
    appointmentId?: string;
  }) => {
    if (!params.to) return;
    try {
      const fallbackMessage = [
        `الأخ/الأخت ${params.customerName} المحترم،`,
        `تمت الموافقة على طلب موعد المقابلة الخاص بك لمقابلة (${params.targetPerson}).`,
        ``,
        `📌 رقم الموعد: ${params.appointmentNumber}`,
        `📅 التاريخ: ${params.appointmentDate}`,
        `⏰ الوقت: ${params.appointmentTime}`,
        params.notes ? `📝 توجيهات وملاحظات: ${params.notes}` : '',
        ``,
        `نرجو الحضور قبل الموعد بـ 10 دقائق في مقر المكتب. أهلاً وسهلاً بك.`
      ]
        .filter(Boolean)
        .join('\n');

      const message = await renderTemplate(
        'appointment_approved',
        {
          customer_name: params.customerName,
          appointment_number: params.appointmentNumber,
          target_person: params.targetPerson,
          appointment_date: params.appointmentDate,
          appointment_time: params.appointmentTime,
          notes: params.notes ? `\nملاحظات: ${params.notes}\n` : ''
        },
        fallbackMessage
      );

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey: 'appointment_approved',
        requestId: params.appointmentId,
        priority: 2
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp appointment approved notification skipped:', err);
    }
  },

  /**
   * إرسال رسالة الاعتذار عن موعد المقابلة (تستخدم قالب appointment_rejected)
   */
  sendAppointmentRejectedWhatsApp: async (params: {
    to: string;
    customerName: string;
    appointmentNumber: string;
    appointmentDate: string;
    reason?: string | null;
    appointmentId?: string;
  }) => {
    if (!params.to) return;
    try {
      const fallbackMessage = [
        `الأخ/الأخت ${params.customerName} المحترم،`,
        `نعتذر عن عدم إمكانية اعتماد موعد المقابلة برقم (${params.appointmentNumber}) ليوم ${params.appointmentDate} في الوقت الحالي.`,
        params.reason ? `سبب الاعتذار: ${params.reason}` : '',
        `يمكنك حجز موعد آخر متاح عبر المنظومة أو مراجعة سكرتارية المكتب.`
      ]
        .filter(Boolean)
        .join('\n');

      const message = await renderTemplate(
        'appointment_rejected',
        {
          customer_name: params.customerName,
          appointment_number: params.appointmentNumber,
          appointment_date: params.appointmentDate,
          reason: params.reason ? `\nسبب الاعتذار: ${params.reason}\n` : ''
        },
        fallbackMessage
      );

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey: 'appointment_rejected',
        requestId: params.appointmentId,
        priority: 2
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp appointment rejected notification skipped:', err);
    }
  },

  /**
   * تأكيد استلام طلب حجز موعد (قالب appointment_received)
   */
  sendAppointmentReceivedWhatsApp: async (params: {
    to: string;
    customerName: string;
    appointmentNumber: string;
    targetPerson: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId?: string;
  }) => {
    if (!params.to) return;
    try {
      const fallbackMessage = [
        `مرحباً ${params.customerName}،`,
        `تم استلام طلب حجز موعدك بنجاح لمقابلة (${params.targetPerson}).`,
        ``,
        `📌 رقم طلب الموعد: ${params.appointmentNumber}`,
        `📅 التاريخ: ${params.appointmentDate}`,
        `⏰ الوقت: ${params.appointmentTime}`,
        ``,
        `سيتم مراجعة الطلب والتأكيد عليك عبر واتساب قريباً.`
      ].join('\n');

      const message = await renderTemplate(
        'appointment_received',
        {
          customer_name: params.customerName,
          appointment_number: params.appointmentNumber,
          target_person: params.targetPerson,
          appointment_date: params.appointmentDate,
          appointment_time: params.appointmentTime
        },
        fallbackMessage
      );

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey: 'appointment_received',
        requestId: params.appointmentId,
        priority: 2
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp appointment received notification skipped:', err);
    }
  },

  /**
   * إشعار إلغاء الموعد (قالب appointment_cancelled)
   */
  sendAppointmentCancelledWhatsApp: async (params: {
    to: string;
    customerName: string;
    appointmentNumber: string;
    appointmentDate: string;
    reason?: string | null;
    appointmentId?: string;
  }) => {
    if (!params.to) return;
    try {
      const fallbackMessage = [
        `الأخ/الأخت ${params.customerName} المحترم،`,
        `نود إعلامكم بأنه تم إلغاء موعد المقابلة رقم (${params.appointmentNumber}) المحدد ليوم ${params.appointmentDate}.`,
        params.reason ? `السبب: ${params.reason}` : '',
        `يمكنك حجز موعد جديد عبر المنظومة في أي وقت.`
      ]
        .filter(Boolean)
        .join('\n');

      const message = await renderTemplate(
        'appointment_cancelled',
        {
          customer_name: params.customerName,
          appointment_number: params.appointmentNumber,
          appointment_date: params.appointmentDate,
          reason: params.reason ? `\nالسبب: ${params.reason}\n` : ''
        },
        fallbackMessage
      );

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey: 'appointment_cancelled',
        requestId: params.appointmentId,
        priority: 2
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp appointment cancelled notification skipped:', err);
    }
  },

  /**
   * تذكير بالموعد: stage = '1h' (قبل ساعة) أو '24h' (قبل يوم)
   * dedupeKey يمنع تكرار الإرسال حتى لو تشغّلت المهمة مرتين أو من أكثر من نسخة.
   */
  sendAppointmentReminderWhatsApp: async (params: {
    to: string;
    customerName: string;
    appointmentNumber: string;
    targetPerson: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId?: string;
    stage?: '1h' | '24h';
    dedupeKey?: string;
    immediate?: boolean;
  }) => {
    if (!params.to) return;
    try {
      const stage = params.stage || '1h';
      const templateKey = stage === '24h' ? 'appointment_reminder_24h' : 'appointment_reminder';
      const when = stage === '24h' ? `غداً ${params.appointmentDate}` : `اليوم ${params.appointmentDate} خلال ساعة`;
      const fallbackMessage = [
        `تذكير بموعد المقابلة ⏰`,
        ``,
        `الأخ/الأخت ${params.customerName} المحترم،`,
        `نود تذكيركم بموعد مقابلتكم ${when} في تمام الساعة ${params.appointmentTime} لمقابلة (${params.targetPerson}).`,
        ``,
        `📌 رقم الموعد: ${params.appointmentNumber}`,
        `📍 الموقع: مقر مكتب النائب`,
        ``,
        `يرجى الحضور في الوقت المحدد مع جلب كافة المستندات ذات الصلة. أهلاً وسهلاً بك.`
      ].join('\n');

      const message = await renderTemplate(
        templateKey,
        {
          customer_name: params.customerName,
          appointment_number: params.appointmentNumber,
          target_person: params.targetPerson,
          appointment_date: params.appointmentDate,
          appointment_time: params.appointmentTime
        },
        fallbackMessage
      );

      if (params.immediate) {
        return await whatsAppProvider.sendMessage({
          to: params.to,
          message,
          templateKey,
          requestId: params.appointmentId
        });
      }

      return await messageQueue.enqueue({
        to: params.to,
        message,
        templateKey,
        requestId: params.appointmentId,
        priority: 2,
        dedupeKey: params.dedupeKey
      });
    } catch (err) {
      console.warn('⚠️ WhatsApp appointment reminder skipped:', err);
    }
  },

  /**
   * إرسال رسالة واتساب مخصصة مباشرة
   */
  sendDirectWhatsApp: async (
    to: string,
    message: string,
    requestId?: string,
    opts?: { immediate?: boolean; priority?: number; dedupeKey?: string }
  ): Promise<{ success: boolean; queued?: boolean; messageId?: string }> => {
    if (!to) return { success: false };
    try {
      // Time-critical single messages (e.g. tracking OTP) skip the queue hop
      if (opts?.immediate) {
        const r = await whatsAppProvider.sendMessage({ to, message, requestId });
        return { success: r.success, messageId: r.messageId };
      }
      const r = await messageQueue.enqueue({
        to,
        message,
        requestId,
        priority: opts?.priority ?? 4,
        dedupeKey: opts?.dedupeKey
      });
      return { success: r.success, queued: r.queued };
    } catch (err) {
      console.warn('⚠️ WhatsApp direct notification skipped:', err);
      return { success: false };
    }
  }
};
