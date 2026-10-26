import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';
import { formatDatePlus3 } from '../utils/dateTime.js';

const BAGHDAD_OFFSET_MS = 3 * 3600 * 1000;
const MIN = 60 * 1000;

// Reminder windows (minutes before the appointment starts)
const ONE_HOUR_MAX = 75; // send once we are inside the last 75 min (catches a late/paused job)
const DAY_BEFORE_MIN = 180; // don't send the "tomorrow" reminder if the visit is within 3h
const DAY_BEFORE_MAX = 25 * 60; // ...and only inside the last 25h
const STALE_AFTER_MIN = -30; // appointment started >30 min ago -> stop considering it

const toLatinDigits = (v: string) =>
  v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

/** "09:00 - 09:30" | "٩:٣٠" -> { h, m } or null */
export const parseSlotStart = (slot: string | null | undefined): { h: number; m: number } | null => {
  if (!slot) return null;
  const first = toLatinDigits(slot).split('-')[0]?.trim() || '';
  const match = first.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return { h, m };
};

/** Real UTC epoch (ms) of the appointment start, interpreting date + slot in Baghdad time */
export const appointmentStartEpoch = (appointmentDate: Date, timeSlot: string): number | null => {
  const slot = parseSlotStart(timeSlot);
  if (!slot) return null;
  const dateStr = formatDatePlus3(appointmentDate); // YYYY-MM-DD in Baghdad
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (!y || !mo || !d) return null;
  return Date.UTC(y, mo - 1, d, slot.h, slot.m) - BAGHDAD_OFFSET_MS;
};

let running = false;

export const checkAndSendAppointmentReminders = async () => {
  if (running) return; // never overlap runs
  running = true;
  try {
    const now = Date.now();

    // One narrow, indexed query: confirmed visits in the next ~3 days (+ a little past) that still owe a reminder
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        appointmentDate: {
          gte: new Date(now - 2 * 24 * 3600 * 1000),
          lte: new Date(now + 3 * 24 * 3600 * 1000)
        },
        OR: [{ reminderSent: false }, { reminder24Sent: false }]
      },
      take: 500
    });

    for (const apt of appointments) {
      const start = appointmentStartEpoch(apt.appointmentDate, apt.timeSlot);
      if (start === null) continue;

      const minutesUntil = (start - now) / MIN;
      const targetPersonTitle = apt.targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب';
      const slot = parseSlotStart(apt.timeSlot)!;
      const common = {
        to: apt.customerPhone,
        customerName: apt.customerName,
        appointmentNumber: apt.appointmentNumber,
        targetPerson: targetPersonTitle,
        appointmentDate: formatDatePlus3(apt.appointmentDate),
        appointmentTime: `${String(slot.h).padStart(2, '0')}:${String(slot.m).padStart(2, '0')}`,
        appointmentId: apt.id
      };

      // Past appointments: close them out
      if (minutesUntil < STALE_AFTER_MIN) {
        await prisma.appointment
          .updateMany({ where: { id: apt.id }, data: { reminderSent: true, reminder24Sent: true } })
          .catch(() => {});
        continue;
      }

      // 1-hour reminder
      if (!apt.reminderSent && minutesUntil > 0 && minutesUntil <= ONE_HOUR_MAX) {
        const res = await whatsappNotificationService.sendAppointmentReminderWhatsApp({
          ...common,
          stage: '1h',
          dedupeKey: `apt-rem-1h:${apt.id}:${start}`
        });
        if (res) {
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { reminderSent: true, reminder24Sent: true }
          });
          console.log(`✅ Queued 1-hour reminder for ${apt.appointmentNumber} (${common.appointmentTime})`);
        }
        continue;
      }

      // Day-before reminder (only when there is real notice left)
      if (!apt.reminder24Sent) {
        if (minutesUntil > DAY_BEFORE_MIN && minutesUntil <= DAY_BEFORE_MAX) {
          const res = await whatsappNotificationService.sendAppointmentReminderWhatsApp({
            ...common,
            stage: '24h',
            dedupeKey: `apt-rem-24h:${apt.id}:${start}`
          });
          if (res) {
            await prisma.appointment.update({ where: { id: apt.id }, data: { reminder24Sent: true } });
            console.log(`✅ Queued day-before reminder for ${apt.appointmentNumber}`);
          }
        } else if (minutesUntil <= DAY_BEFORE_MIN) {
          // Too close for a day-before message; the 1h reminder will cover it
          await prisma.appointment
            .updateMany({ where: { id: apt.id }, data: { reminder24Sent: true } })
            .catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in appointment reminder job:', error);
  } finally {
    running = false;
  }
};

export const startAppointmentReminderJob = () => {
  checkAndSendAppointmentReminders().catch((err) => {
    console.warn('⚠️ Initial appointment reminder check error:', err);
  });

  // Every minute: reminders land within ~1 min of their target time. Overlap-guarded + indexed query.
  cron.schedule('* * * * *', () => {
    void checkAndSendAppointmentReminders();
  });
  console.log('⏰ Appointment reminder job started (every minute: day-before + 1-hour, Baghdad UTC+3).');
};
