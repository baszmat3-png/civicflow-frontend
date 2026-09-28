import { Router } from 'express';
import {
  getAvailableScheduleSlots,
  bookPublicAppointment,
  getAppointments,
  updateAppointmentStatus,
  getScheduleSettings,
  saveScheduleSettings
} from '../controllers/appointment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

export const appointmentRouter = Router();

// Public routes (Citizen portal)
appointmentRouter.get('/public/slots', getAvailableScheduleSlots);
appointmentRouter.post('/public/book', bookPublicAppointment);

// Admin routes
appointmentRouter.get('/', authenticate, requirePermission('requests.view'), getAppointments);
appointmentRouter.patch('/:id/status', authenticate, requirePermission('requests.update'), updateAppointmentStatus);
appointmentRouter.get('/settings/schedules', authenticate, requirePermission('settings.manage'), getScheduleSettings);
appointmentRouter.post('/settings/schedules', authenticate, requirePermission('settings.manage'), saveScheduleSettings);
