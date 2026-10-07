import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { sendSuccess } from '../utils/apiResponse.js';

const DEFAULT_WA_TEMPLATES = [
  {
    key: 'receive_request',
    title: 'استلام الطلب',
    content: 'عزيزي المراجع {{customer_name}}، تم استلام طلبك رقم {{request_number}} بنجاح لدى {{ministry}}. الموعد المتوقع للإنجاز: {{expected_date}}. يمكنك متابعة الطلب عبر الرابط: {{tracking_link}}',
    variables: ['customer_name', 'request_number', 'ministry', 'expected_date', 'tracking_link']
  },
  {
    key: 'status_changed',
    title: 'تغيير الحالة',
    content: 'مرحباً {{customer_name}}، نود إحاطتك بأن حالة طلبك رقم {{request_number}} أصبحت الآن: ({{status}}) لدى {{ministry}}. الرابط: {{tracking_link}}',
    variables: ['customer_name', 'request_number', 'status', 'ministry', 'tracking_link']
  },
  {
    key: 'docs_required',
    title: 'طلب مستندات',
    content: 'عزيزي المراجع {{customer_name}}، يلزم استكمال بعض المستندات للطلب {{request_number}} لدى {{ministry}}. يرجى مراجعة المنصة أو زيارة الفرع في أقرب وقت. الرابط: {{tracking_link}}',
    variables: ['customer_name', 'request_number', 'ministry', 'tracking_link']
  },
  {
    key: 'approved',
    title: 'الموافقة',
    content: 'بشرى سارة {{customer_name}}، تمت الموافقة على طلبك رقم {{request_number}} من قبل {{ministry}}. جاري إعداد الوثائق النهائية. الرابط: {{tracking_link}}',
    variables: ['customer_name', 'request_number', 'ministry', 'tracking_link']
  },
  {
    key: 'ready_for_pickup',
    title: 'الإجابة جاهزة',
    content: 'عزيزي المراجع {{customer_name}}، الإجابة والوثائق الرسمية للطلب رقم {{request_number}} جاهزة للاستلام. يمكنك مراجعتنا أو تحميلها مباشرة عبر: {{tracking_link}}',
    variables: ['customer_name', 'request_number', 'tracking_link']
  },
  {
    key: 'appointment_approved',
    title: 'قبول وتأكيد موعد حجز مقابلة',
    content: 'الأخ/الأخت {{customer_name}} المحترم، تمت الموافقة على موعدك برقم ({{appointment_number}}) لمقابلة ({{target_person}}). التاريخ: {{appointment_date}}، الوقت: {{appointment_time}}. {{notes}}يرجى الحضور في الموعد المحدد.',
    variables: ['customer_name', 'appointment_number', 'target_person', 'appointment_date', 'appointment_time', 'notes']
  },
  {
    key: 'appointment_rejected',
    title: 'الاعتذار عن موعد حجز مقابلة',
    content: 'الأخ/الأخت {{customer_name}} المحترم، نعتذر عن عدم إمكانية اعتماد موعد المقابلة برقم ({{appointment_number}}) ليوم {{appointment_date}} في الوقت الحالي. {{reason}}يمكنك اختيار موعد آخر عبر المنظومة.',
    variables: ['customer_name', 'appointment_number', 'appointment_date', 'reason']
  },
  {
    key: 'appointment_reminder',
    title: 'تذكير بموعد المقابلة (قبل 30 دقيقة)',
    content: 'تذكير: الأخ/الأخت {{customer_name}}، نود تذكيرك بموعد مقابلتك اليوم {{appointment_date}} في تمام الساعة {{appointment_time}} لمقابلة ({{target_person}}). نتمنى لك يوماً سعيداً.',
    variables: ['customer_name', 'appointment_number', 'target_person', 'appointment_date', 'appointment_time']
  },
  {
    key: 'bulk_custom_message',
    title: 'رسالة جماعية مخصصة للمراجعين',
    content: 'السلام عليكم الأخ/الأخت {{customer_name}} المحترم،\nنود إعلامكم بخصوص معاملتكم ({{request_number}}) لدى ({{ministry}}):\n{{custom_message}}\n\nلمتابعة تفاصيل الطلب: {{tracking_link}}\nمع تحيات مكتب المتابعة.',
    variables: ['customer_name', 'request_number', 'ministry', 'title', 'custom_message', 'tracking_link', 'phone']
  }
];

export const getSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ensure all standard WhatsApp templates exist in DB
    for (const dt of DEFAULT_WA_TEMPLATES) {
      const existing = await prisma.whatsAppTemplate.findUnique({ where: { key: dt.key } });
      if (!existing) {
        await prisma.whatsAppTemplate.create({
          data: {
            key: dt.key,
            title: dt.title,
            content: dt.content,
            variables: dt.variables
          }
        });
      }
    }

    const [generalSet, notifSet, waSet, statuses, slaList, waTemplates] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'general' } }),
      prisma.systemSetting.findUnique({ where: { key: 'notificationPreferences' } }),
      prisma.systemSetting.findUnique({ where: { key: 'whatsapp' } }),
      prisma.requestStatus.findMany({ orderBy: { order: 'asc' } }),
      prisma.sLASetting.findMany({
        include: { ministry: { select: { name: true } } }
      }),
      prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: 'asc' } })
    ]);

    const formattedStatuses = statuses.map((s) => ({
      id: s.id,
      name: s.name as any,
      color: s.color,
      order: s.order,
      isActive: s.isActive,
      isInitial: s.isInitial,
      isTerminal: s.isTerminal,
      requiresNotes: s.requiresNotes
    }));

    const formattedSla = slaList.map((s) => ({
      id: s.id,
      ministryId: s.ministryId,
      ministryName: s.ministry.name,
      defaultDays: s.defaultDays,
      urgentDays: s.urgentDays,
      importantDays: s.importantDays,
      autoAlertBeforeDays: s.autoAlertBeforeDays
    }));

    const formattedTemplates = waTemplates.map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      content: t.content,
      variables: Array.isArray(t.variables) ? (t.variables as string[]) : [],
      lastUpdated: t.updatedAt.toISOString().split('T')[0]
    }));

    const general = (generalSet?.value as any) || {
      systemName: 'منظومة إدارة المعاملات',
      systemSubName: 'منظومة إدارة وتتبع معاملات المراجعين',
      officePhone: '',
      taxNumber: '',
      officeAddress: 'العراق_بغداد',
      officeEmail: '',
      workingDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
      workingHours: '08:00 ص - 04:00 م'
    };

    const notificationPreferences = (notifSet?.value as any) || {
      enableInApp: true,
      enableOverdueAlerts: true,
      enableStatusAlerts: true,
      enableWhatsApp: true,
      autoNotifyCustomerOnStatusChange: true
    };

    const whatsapp = (waSet?.value as any) || {
      isConnected: true,
      phoneNumber: '+966 50 123 9988',
      instanceName: 'CivicFlow-Gov-Gateway-01',
      lastSync: '2026-09-04 10:00',
      triggers: []
    };

    const fullSettings = {
      general,
      statuses: formattedStatuses,
      sla: formattedSla,
      whatsapp,
      whatsappTemplates: formattedTemplates,
      notificationPreferences
    };

    return sendSuccess(res, fullSettings);
  } catch (error) {
    next(error);
  }
};

export const updateSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;

    await prisma.$transaction(async (tx) => {
      if (data.general) {
        await tx.systemSetting.upsert({
          where: { key: 'general' },
          create: { key: 'general', value: data.general },
          update: { value: data.general }
        });
      }

      if (data.notificationPreferences) {
        await tx.systemSetting.upsert({
          where: { key: 'notificationPreferences' },
          create: { key: 'notificationPreferences', value: data.notificationPreferences },
          update: { value: data.notificationPreferences }
        });
      }

      if (data.whatsapp) {
        await tx.systemSetting.upsert({
          where: { key: 'whatsapp' },
          create: { key: 'whatsapp', value: data.whatsapp },
          update: { value: data.whatsapp }
        });
      }

      if (Array.isArray(data.statuses)) {
        for (const s of data.statuses) {
          if (s.id) {
            await tx.requestStatus.update({
              where: { id: s.id },
              data: {
                ...(s.name && { name: s.name }),
                ...(s.color && { color: s.color }),
                ...(s.order !== undefined && { order: s.order }),
                ...(s.isActive !== undefined && { isActive: s.isActive }),
                ...(s.isInitial !== undefined && { isInitial: s.isInitial }),
                ...(s.isTerminal !== undefined && { isTerminal: s.isTerminal }),
                ...(s.requiresNotes !== undefined && { requiresNotes: s.requiresNotes })
              }
            });
          }
        }
      }

      if (Array.isArray(data.sla)) {
        for (const sla of data.sla) {
          if (sla.ministryId) {
            await tx.sLASetting.upsert({
              where: { ministryId: sla.ministryId },
              create: {
                ministryId: sla.ministryId,
                defaultDays: sla.defaultDays || 7,
                urgentDays: sla.urgentDays || 3,
                importantDays: sla.importantDays || 5,
                autoAlertBeforeDays: sla.autoAlertBeforeDays || 2
              },
              update: {
                defaultDays: sla.defaultDays,
                urgentDays: sla.urgentDays,
                importantDays: sla.importantDays,
                autoAlertBeforeDays: sla.autoAlertBeforeDays
              }
            });
          }
        }
      }

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'تعديل إعدادات',
            entity: 'SystemSetting',
            details: 'تحديث الإعدادات العامة للمنظومة',
            ipAddress: req.ip
          }
        });
      }
    });

    return sendSuccess(res, data, 'تم تحديث الإعدادات بنجاح');
  } catch (error) {
    next(error);
  }
};