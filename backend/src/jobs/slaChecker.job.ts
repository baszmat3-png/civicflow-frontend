import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';

export const checkAndUpdateRequestSLAs = async () => {
  try {
    const terminalStatuses = ['تم التسليم', 'مغلق', 'الإجابة جاهزة', 'مرفوض', 'ملغي'];

    const [pendingRequests, notifSetting] = await Promise.all([
      prisma.request.findMany({
        where: {
          status: { notIn: terminalStatuses }
        },
        include: {
          customer: true,
          ministry: {
            include: {
              slaSetting: true
            }
          },
          assignedEmployee: true
        }
      }),
      prisma.systemSetting.findUnique({ where: { key: 'notificationPreferences' } })
    ]);

    const notifPrefs = (notifSetting?.value as any) || {};
    const deputyPhone = notifPrefs.deputyOfficePhone || notifPrefs.emergencyPhone;
    const isOverdueWhatsAppEnabled = notifPrefs.enableOverdueWhatsAppToDeputy !== false && Boolean(deputyPhone);

    const now = new Date();
    let updatedCount = 0;
    let alertsCreated = 0;

    for (const req of pendingRequests) {
      const expected = new Date(req.expectedCompletionDate);
      const diffTime = expected.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const autoAlertBeforeDays = req.ministry?.slaSetting?.autoAlertBeforeDays || 2;

      let newDeadlineStatus = 'ضمن المدة';
      if (diffDays < 0) {
        newDeadlineStatus = 'متأخر';
      } else if (diffDays <= autoAlertBeforeDays) {
        newDeadlineStatus = 'اقترب الموعد';
      }

      const statusChanged = req.deadlineStatus !== newDeadlineStatus || req.daysRemainingOrOverdue !== diffDays;

      if (statusChanged) {
        await prisma.request.update({
          where: { id: req.id },
          data: {
            deadlineStatus: newDeadlineStatus,
            daysRemainingOrOverdue: diffDays
          }
        });
        updatedCount++;

        // If status transitioned to OVERDUE, generate alert notification & dispatch WhatsApp to Deputy office
        if (newDeadlineStatus === 'متأخر' && req.deadlineStatus !== 'متأخر') {
          const targetUserId = req.assignedEmployeeId || undefined;
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              title: `تنبيه: تأخر المعاملة #${req.requestNumber}`,
              message: `تجاوزت المعاملة #${req.requestNumber} (${req.title}) المدة المحددة للإنجاز لدى ${req.ministry.name}`,
              requestId: req.id,
              requestNumber: req.requestNumber,
              type: 'overdue',
              link: `/requests/${req.id}`
            }
          });
          alertsCreated++;

          // Automated WhatsApp Dispatch to Deputy Office Phone
          if (isOverdueWhatsAppEnabled && deputyPhone) {
            try {
              const overdueDaysCount = Math.abs(diffDays);
              const customTpl = notifPrefs.overdueAlertTemplate ||
                `⚠️ *تنبيه عاجل لمكتب النائب - معاملة متأخرة*\n\n` +
                `📋 رقم المعاملة: {{request_number}}\n` +
                `👤 صاحب المعاملة: {{customer_name}} ({{customer_phone}})\n` +
                `🏛️ الجهة/الوزارة: {{ministry}}\n` +
                `⏳ مدة التأخير: {{overdue_days}} يوم\n` +
                `📝 موضوع المعاملة: {{title}}\n` +
                `👨‍💼 الموظف المسؤول: {{employee_name}}\n\n` +
                `يرجى التوجيه والمتابعة مع الجهة المعنية.`;

              const msg = customTpl
                .replace(/\{\{request_number\}\}/g, req.requestNumber)
                .replace(/\{\{customer_name\}\}/g, req.customer?.name || 'مراجع')
                .replace(/\{\{customer_phone\}\}/g, req.customer?.phone || 'غير مسجل')
                .replace(/\{\{ministry\}\}/g, req.ministry?.name || '')
                .replace(/\{\{overdue_days\}\}/g, String(overdueDaysCount))
                .replace(/\{\{title\}\}/g, req.title)
                .replace(/\{\{employee_name\}\}/g, req.assignedEmployee?.name || 'غير معين');

              await whatsappNotificationService.sendDirectWhatsApp(deputyPhone, msg, req.id);
              console.log(`🚨 [SLA OVERDUE] Dispatched WhatsApp overdue alert to Deputy Office (${deputyPhone}) for request #${req.requestNumber}`);
            } catch (deputyErr) {
              console.warn('⚠️ Could not dispatch WhatsApp overdue alert to deputy office:', deputyErr);
            }
          }
        } else if (newDeadlineStatus === 'اقترب الموعد' && req.deadlineStatus === 'ضمن المدة') {
          const targetUserId = req.assignedEmployeeId || undefined;
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              title: `تنبيه: اقتراب موعد إنجاز المعاملة #${req.requestNumber}`,
              message: `المعاملة #${req.requestNumber} متبقي عليها ${diffDays} يوم/أيام فقط للإنجاز`,
              requestId: req.id,
              requestNumber: req.requestNumber,
              type: 'overdue',
              link: `/requests/${req.id}`
            }
          });
          alertsCreated++;
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`⏱️ SLA Background Job: Evaluated ${pendingRequests.length} requests, updated ${updatedCount}, created ${alertsCreated} alerts.`);
    }
  } catch (error) {
    console.error('❌ Error executing SLA Background Job:', error);
  }
};

export const startSlaBackgroundJob = () => {
  // Run every hour
  cron.schedule('0 * * * *', () => {
    checkAndUpdateRequestSLAs();
  });

  // Run once immediately on startup
  setTimeout(() => {
    checkAndUpdateRequestSLAs();
  }, 3000);

  console.log('⏰ SLA Background Cron Job scheduled (hourly check).');
};