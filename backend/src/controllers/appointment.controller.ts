import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Generate Next Appointment Number (APT-2026-0001)
async function generateNextAppointmentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `APT-${year}-`;

  const last = await prisma.appointment.findFirst({
    where: { appointmentNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' }
  });

  let nextSeq = 1;
  if (last && last.appointmentNumber) {
    const parts = last.appointmentNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// -------------------------------------------------------------
// PUBLIC: Get available schedule slots for citizen booking
// -------------------------------------------------------------
export const getAvailableScheduleSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetPerson = (req.query.targetPerson as string) || 'DEPUTY'; // DEPUTY or OFFICE_DIRECTOR

    let schedules = await prisma.appointmentSchedule.findMany({
      where: { targetPerson, isWorkingDay: true },
      orderBy: { dayOfWeek: 'asc' }
    });

    // If no schedule configured yet, provide sensible default Iraqi working week (Sun to Thu, 9 AM - 2 PM)
    if (schedules.length === 0) {
      const defaultSchedules = [
        { dayOfWeek: 0, dayName: 'الأحد', isWorkingDay: true, startTime: '09:00', endTime: '14:00', slotDurationMinutes: 30, maxPerSlot: 2 },
        { dayOfWeek: 1, dayName: 'الإثنين', isWorkingDay: true, startTime: '09:00', endTime: '14:00', slotDurationMinutes: 30, maxPerSlot: 2 },
        { dayOfWeek: 2, dayName: 'الثلاثاء', isWorkingDay: true, startTime: '09:00', endTime: '14:00', slotDurationMinutes: 30, maxPerSlot: 2 },
        { dayOfWeek: 3, dayName: 'الأربعاء', isWorkingDay: true, startTime: '09:00', endTime: '14:00', slotDurationMinutes: 30, maxPerSlot: 2 },
        { dayOfWeek: 4, dayName: 'الخميس', isWorkingDay: true, startTime: '09:00', endTime: '14:00', slotDurationMinutes: 30, maxPerSlot: 2 }
      ];

      for (const ds of defaultSchedules) {
        await prisma.appointmentSchedule.upsert({
          where: { targetPerson_dayOfWeek: { targetPerson, dayOfWeek: ds.dayOfWeek } },
          create: { ...ds, targetPerson },
          update: ds
        });
      }

      schedules = await prisma.appointmentSchedule.findMany({
        where: { targetPerson, isWorkingDay: true },
        orderBy: { dayOfWeek: 'asc' }
      });
    }

    // Generate upcoming 14 days dates with their available time slots
    const availableDates: any[] = [];
    const today = new Date();

    for (let i = 1; i <= 14; i++) {
      const candidateDate = new Date(today);
      candidateDate.setDate(today.getDate() + i);
      const dayOfWeek = candidateDate.getDay();

      const matchedSchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
      if (!matchedSchedule) continue;

      // Generate time slots (e.g. 09:00 - 09:30, 09:30 - 10:00)
      const slots: string[] = [];
      const [startHour, startMin] = matchedSchedule.startTime.split(':').map(Number);
      const [endHour, endMin] = matchedSchedule.endTime.split(':').map(Number);

      let current = startHour * 60 + startMin;
      const end = endHour * 60 + endMin;
      const duration = matchedSchedule.slotDurationMinutes || 30;

      while (current + duration <= end) {
        const sh = Math.floor(current / 60);
        const sm = current % 60;
        const eh = Math.floor((current + duration) / 60);
        const em = (current + duration) % 60;

        const slotLabel = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')} - ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
        slots.push(slotLabel);
        current += duration;
      }

      const dateStr = candidateDate.toISOString().split('T')[0];

      availableDates.push({
        date: dateStr,
        dayName: matchedSchedule.dayName,
        targetPerson,
        slots
      });
    }

    return sendSuccess(res, {
      targetPerson,
      targetPersonTitle: targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب',
      availableDates
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// PUBLIC: Book an appointment
// -------------------------------------------------------------
export const bookPublicAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerName, customerPhone, customerNationalId, targetPerson, appointmentDate, timeSlot, purpose, notes } = req.body;

    if (!customerName || !customerPhone || !appointmentDate || !timeSlot || !purpose) {
      throw new AppError('يرجى ملء جميع الحقول الإلزامية لحجز الموعد', 400, 'FIELDS_REQUIRED');
    }

    const appointmentNumber = await generateNextAppointmentNumber();
    const dateObj = new Date(appointmentDate);

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNationalId: customerNationalId ? customerNationalId.trim() : null,
        targetPerson: targetPerson || 'DEPUTY',
        appointmentDate: dateObj,
        timeSlot: timeSlot.trim(),
        purpose: purpose.trim(),
        notes: notes ? notes.trim() : null,
        status: 'PENDING'
      }
    });

    const targetPersonTitle = appointment.targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب';

    // WhatsApp confirmation to citizen
    try {
      const msg = `مرحباً ${appointment.customerName}،\nتم استلام طلب حجز موعدك بنجاح لمقابلة (${targetPersonTitle}).\n\n📌 رقم طلب الموعد: ${appointment.appointmentNumber}\n📅 التاريخ: ${appointmentDate}\n⏰ الوقت: ${timeSlot}\n\nسيتم مراجعة الطلب والتأكيد عليك عبر واتساب قريباً.`;
      await whatsappNotificationService.sendDirectWhatsApp(appointment.customerPhone, msg, appointment.id);
    } catch (waErr) {
      console.warn('⚠️ Could not send WhatsApp for appointment booking:', waErr);
    }

    return sendSuccess(
      res,
      appointment,
      'تم إرسال طلب حجز الموعد بنجاح، وسيتم إشعارك فور اعتماد الموعد',
      201
    );
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// ADMIN: List & Filter Appointments
// -------------------------------------------------------------
export const getAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, targetPerson, search, date } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') where.status = String(status);
    if (targetPerson && targetPerson !== 'ALL') where.targetPerson = String(targetPerson);
    if (date) {
      const d = new Date(String(date));
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      where.appointmentDate = { gte: d, lt: nextD };
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { appointmentNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { purpose: { contains: q, mode: 'insensitive' } }
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'desc' }]
    });

    return sendSuccess(res, appointments);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// ADMIN: Update Appointment Status & Notes
// -------------------------------------------------------------
export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('طلب الموعد غير موجود', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {})
      }
    });

    const targetPersonTitle = updated.targetPerson === 'DEPUTY' ? 'سعادة النائب' : 'مدير المكتب';
    const dateStr = updated.appointmentDate.toISOString().split('T')[0];

    // WhatsApp Notification on Status Change
    if (status === 'CONFIRMED') {
      try {
        const msg = `الأخ/الأخت ${updated.customerName} المحترم،\nتمت الموافقة على موعدك لمقابلة (${targetPersonTitle}).\n\n📌 رقم الموعد: ${updated.appointmentNumber}\n📅 التاريخ: ${dateStr}\n⏰ التوقيت: ${updated.timeSlot}\n${adminNotes ? `📝 ملاحظات: ${adminNotes}\n` : ''}\nنرجو الحضور قبل الموعد بـ 10 دقائق في مقر المكتب. أهلاً وسهلاً بك.`;
        await whatsappNotificationService.sendDirectWhatsApp(updated.customerPhone, msg, updated.id);
      } catch (waErr) {
        console.warn('⚠️ Could not send WhatsApp for confirmed appointment:', waErr);
      }
    } else if (status === 'REJECTED') {
      try {
        const msg = `الأخ/الأخت ${updated.customerName} المحترم،\nنعتذر عن عدم إمكانية اعتماد موعد المقابلة برقم (${updated.appointmentNumber}) في الوقت الحالي.\n${adminNotes ? `سبب الاعتذار: ${adminNotes}\n` : ''}يمكنك حجز موعد آخر أو مراجعة سكرتارية المكتب.`;
        await whatsappNotificationService.sendDirectWhatsApp(updated.customerPhone, msg, updated.id);
      } catch (waErr) {
        console.warn('⚠️ Could not send WhatsApp for rejected appointment:', waErr);
      }
    }

    return sendSuccess(res, updated, 'تم تحديث حالة الموعد بنجاح');
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// ADMIN: Get/Set Schedule Settings (Days, Hours, Durations)
// -------------------------------------------------------------
export const getScheduleSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetPerson = 'DEPUTY' } = req.query;

    const schedules = await prisma.appointmentSchedule.findMany({
      where: { targetPerson: String(targetPerson) },
      orderBy: { dayOfWeek: 'asc' }
    });

    return sendSuccess(res, schedules);
  } catch (error) {
    next(error);
  }
};

export const saveScheduleSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetPerson = 'DEPUTY', schedules } = req.body;

    if (!Array.isArray(schedules)) {
      throw new AppError('بيانات الجدول غير صالحة', 400, 'INVALID_SCHEDULE_DATA');
    }

    for (const item of schedules) {
      await prisma.appointmentSchedule.upsert({
        where: {
          targetPerson_dayOfWeek: {
            targetPerson,
            dayOfWeek: item.dayOfWeek
          }
        },
        create: {
          targetPerson,
          dayOfWeek: item.dayOfWeek,
          dayName: item.dayName || DAYS_AR[item.dayOfWeek],
          isWorkingDay: item.isWorkingDay ?? true,
          startTime: item.startTime || '09:00',
          endTime: item.endTime || '14:00',
          slotDurationMinutes: item.slotDurationMinutes || 30,
          maxPerSlot: item.maxPerSlot || 1
        },
        update: {
          dayName: item.dayName || DAYS_AR[item.dayOfWeek],
          isWorkingDay: item.isWorkingDay ?? true,
          startTime: item.startTime || '09:00',
          endTime: item.endTime || '14:00',
          slotDurationMinutes: item.slotDurationMinutes || 30,
          maxPerSlot: item.maxPerSlot || 1
        }
      });
    }

    const saved = await prisma.appointmentSchedule.findMany({
      where: { targetPerson },
      orderBy: { dayOfWeek: 'asc' }
    });

    return sendSuccess(res, saved, 'تم حفظ إعدادات أوقات المواعيد بنجاح');
  } catch (error) {
    next(error);
  }
};
