import { Router } from 'express';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getLogs,
  getQueueStats,
  getGateway,
  updateGateway,
  testGateway,
  retryFailedQueue,
  sendManualWhatsApp,
  sendBulkWhatsApp
} from '../controllers/whatsapp.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

export const whatsAppRouter = Router();

whatsAppRouter.use(authenticate);

whatsAppRouter.get('/templates', requirePermission('whatsapp.view'), getTemplates);
whatsAppRouter.post('/templates', requirePermission('whatsapp.manage'), createTemplate);
whatsAppRouter.patch('/templates/:id', requirePermission('whatsapp.manage'), updateTemplate);
whatsAppRouter.delete('/templates/:id', requirePermission('whatsapp.manage'), deleteTemplate);
whatsAppRouter.get('/gateway', requirePermission('whatsapp.manage'), getGateway);
whatsAppRouter.put('/gateway', requirePermission('whatsapp.manage'), updateGateway);
whatsAppRouter.post('/gateway/test', requirePermission('whatsapp.manage'), testGateway);
whatsAppRouter.get('/queue', requirePermission('whatsapp.view'), getQueueStats);
whatsAppRouter.post('/queue/retry', requirePermission('whatsapp.manage'), retryFailedQueue);
whatsAppRouter.get('/logs', requirePermission('whatsapp.view'), getLogs);
whatsAppRouter.post('/send', requirePermission('whatsapp.send'), upload.single('document'), sendManualWhatsApp);
whatsAppRouter.post('/send-bulk', requirePermission('whatsapp.send'), upload.single('document'), sendBulkWhatsApp);