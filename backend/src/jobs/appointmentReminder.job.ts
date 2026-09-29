import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';

export const checkAndSendAppointmentReminders = async () => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

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

    const currentMinutes = today.getHours() * 60 + today.getMinutes();

    for (const apt of appointments) {
      if (!apt.timeSlot) continue;

      // Extract slot start time e.g. "10:00 - 10:30" or "09:30"
      const startTimePart = apt.timeSlot.split('-')[0]?.trim();
      if (!startTimePart) continue;

      const [slotHour, slotMin] = startTimePart.split(':').map(Number);
      if (isNaN(slotHour) || isNaN(slotMin)) continue;

      const slotTotalMinutes = slotHour * 60 + slotMin;
      const minutesUntilSlot = slotTotalMinutes - currentMinutes;

      // Send reminder if appointment is within 15 to 45 minutes from now
      if (minutesUntilSlot > 0 && minutesUntilSlot <= 45) {
        const targetPersonTitle = apt.targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب';
        const msg = `تذكير بموعد المقابلة ⏰\n\nالأخ/الأخت ${apt.customerName} المحترم،\nنود تذكيركم بموعدكم القادم لمقابلة (${targetPersonTitle}) بعد قليل في تمام الساعة (${startTimePart}).\n\n📌 رقم الموعد: ${apt.appointmentNumber}\n📍 الموقع: مقر مكتب النائب\n\nيرجى الحضور في الوقت المحدد مع جلب كافة المستندات ذات الصلة. أهلاً وسهلاً بك.`;

        try {
          await whatsappNotificationService.sendDirectWhatsApp(apt.customerPhone, msg, apt.id);
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminderSent: true }
          });
          console.log(`✅ Sent 30-min WhatsApp reminder for appointment ${apt.appointmentNumber} to ${apt.customerPhone}`);
        } catch (waErr) {
          console.warn(`⚠️ Failed sending WhatsApp reminder for appointment ${apt.appointmentNumber}:`, waErr);
        }
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
  console.log('⏰ Appointment 30-min WhatsApp reminder cron job initialized (every 5 mins).');
};
