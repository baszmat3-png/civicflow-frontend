import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';

export const checkAndSendAppointmentReminders = async () => {
  try {
    const nowUtc = new Date();
    // Baghdad is strictly UTC+3 (+3 hours)
    const baghdadTimeMs = nowUtc.getTime() + 3 * 3600 * 1000;
    const baghdadDate = new Date(baghdadTimeMs);

    const curYear = baghdadDate.getUTCFullYear();
    const curMonth = baghdadDate.getUTCMonth();
    const curDay = baghdadDate.getUTCDate();
    const curHour = baghdadDate.getUTCHours();
    const curMin = baghdadDate.getUTCMinutes();
    const currentBaghdadMinutes = curHour * 60 + curMin;
    const todayDateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(curDay).padStart(2, '0')}`;

    // Broad search window (+/- 1 day) to catch any UTC/local stored dates
    const windowStart = new Date(Date.UTC(curYear, curMonth, curDay - 1, 0, 0, 0));
    const windowEnd = new Date(Date.UTC(curYear, curMonth, curDay + 1, 23, 59, 59));

    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent: false,
        appointmentDate: {
          gte: windowStart,
          lte: windowEnd
        }
      }
    });

    for (const apt of appointments) {
      if (!apt.timeSlot) continue;

      // Check if this appointment is for TODAY in Baghdad
      const aptIso = apt.appointmentDate.toISOString().split('T')[0];
      const aptBaghdadMs = apt.appointmentDate.getTime() + 3 * 3600 * 1000;
      const aptBaghdadDate = new Date(aptBaghdadMs);
      const aptBaghdadStr = `${aptBaghdadDate.getUTCFullYear()}-${String(aptBaghdadDate.getUTCMonth() + 1).padStart(2, '0')}-${String(aptBaghdadDate.getUTCDate()).padStart(2, '0')}`;

      const isToday = aptIso === todayDateStr || aptBaghdadStr === todayDateStr;
      if (!isToday) continue;

      // Extract slot start time e.g. "09:00 - 09:30" or "09:00" (normalize Arabic digits)
      const rawSlot = apt.timeSlot.split('-')[0]?.trim() || '';
      const normalizedSlot = rawSlot.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
      const match = normalizedSlot.match(/(\d{1,2}):(\d{2})/);
      if (!match) continue;

      const slotHour = parseInt(match[1], 10);
      const slotMin = parseInt(match[2], 10);
      if (isNaN(slotHour) || isNaN(slotMin)) continue;

      const slotTotalMinutes = slotHour * 60 + slotMin;
      const minutesUntilSlot = slotTotalMinutes - currentBaghdadMinutes;

      // Send reminder ~30 mins before appointment: window of 15 to 45 mins ahead
      if (minutesUntilSlot >= 15 && minutesUntilSlot <= 45) {
        const targetPersonTitle = apt.targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب';
        const formattedTime = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
        const msg = `تذكير بموعد المقابلة ⏰\n\nالأخ/الأخت ${apt.customerName} المحترم،\nنود تذكيركم بموعدكم القادم لمقابلة (${targetPersonTitle}) بعد قليل في تمام الساعة (${formattedTime}).\n\n📌 رقم الموعد: ${apt.appointmentNumber}\n📍 الموقع: مقر مكتب النائب\n\nيرجى الحضور في الوقت المحدد مع جلب كافة المستندات ذات الصلة. أهلاً وسهلاً بك.`;

        try {
          await whatsappNotificationService.sendDirectWhatsApp(apt.customerPhone, msg, apt.id);
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminderSent: true }
          });
          console.log(`✅ Sent 30-min WhatsApp reminder for appointment ${apt.appointmentNumber} (${formattedTime}) to ${apt.customerPhone} [Current Baghdad Time: ${String(curHour).padStart(2, '0')}:${String(curMin).padStart(2, '0')}]`);
        } catch (waErr) {
          console.warn(`⚠️ Failed sending WhatsApp reminder for appointment ${apt.appointmentNumber}:`, waErr);
        }
      } else if (minutesUntilSlot < -30) {
        // If the appointment time has already passed today by more than 30 mins, mark reminderSent = true
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
  // Run every 2 minutes for precise ~30-min window detection
  cron.schedule('*/2 * * * *', async () => {
    await checkAndSendAppointmentReminders();
  });
  console.log('⏰ Appointment 30-min WhatsApp reminder cron job initialized (2-minute interval, aligned with Baghdad UTC+3).');
};
