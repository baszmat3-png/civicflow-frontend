import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';
import { getIraqTimeParts } from '../utils/dateTime.js';

export const checkAndSendAppointmentReminders = async () => {
  try {
    const iraqTime = getIraqTimeParts();
    
    // Bounds for today's date in Iraq timezone (UTC+3)
    const todayStart = new Date(Date.UTC(iraqTime.year, iraqTime.month, iraqTime.day, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(iraqTime.year, iraqTime.month, iraqTime.day, 23, 59, 59, 999));

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent: false,
        appointmentDate: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    const currentMinutes = iraqTime.totalMinutes;

    for (const apt of appointments) {
      if (!apt.timeSlot) continue;

      // Extract slot start time e.g. "09:00 - 09:30" or "09:00"
      const startTimePart = apt.timeSlot.split('-')[0]?.trim();
      if (!startTimePart) continue;

      const [slotHour, slotMin] = startTimePart.split(':').map(Number);
      if (isNaN(slotHour) || isNaN(slotMin)) continue;

      const slotTotalMinutes = slotHour * 60 + slotMin;
      const minutesUntilSlot = slotTotalMinutes - currentMinutes;

      // Send reminder only BEFORE the appointment: within 15 to 45 minutes ahead (e.g. ~30 mins before)
      if (minutesUntilSlot > 0 && minutesUntilSlot <= 45) {
        const targetPersonTitle = apt.targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب';
        const msg = `تذكير بموعد المقابلة ⏰\n\nالأخ/الأخت ${apt.customerName} المحترم،\nنود تذكيركم بموعدكم القادم لمقابلة (${targetPersonTitle}) بعد قليل في تمام الساعة (${startTimePart}).\n\n📌 رقم الموعد: ${apt.appointmentNumber}\n📍 الموقع: مقر مكتب النائب\n\nيرجى الحضور في الوقت المحدد مع جلب كافة المستندات ذات الصلة. أهلاً وسهلاً بك.`;

        try {
          await whatsappNotificationService.sendDirectWhatsApp(apt.customerPhone, msg, apt.id);
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminderSent: true }
          });
          console.log(`✅ Sent 30-min WhatsApp reminder for appointment ${apt.appointmentNumber} (${startTimePart}) to ${apt.customerPhone} [Current Iraq Time: ${String(iraqTime.hour).padStart(2, '0')}:${String(iraqTime.minute).padStart(2, '0')}]`);
        } catch (waErr) {
          console.warn(`⚠️ Failed sending WhatsApp reminder for appointment ${apt.appointmentNumber}:`, waErr);
        }
      } else if (minutesUntilSlot < 0) {
        // The appointment time has already passed today, mark reminderSent = true to avoid late reminders
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { reminderSent: true }
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('❌ Error in appointment reminder job:', error);
  }
};

export const startAppointmentReminderJob = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await checkAndSendAppointmentReminders();
  });
  console.log('⏰ Appointment 30-min WhatsApp reminder cron job initialized (aligned with Iraq UTC+3).');
};
