import { Router } from 'express';
import {
  getRequests,
  getRequestById,
  createRequest,
  updateRequest,
  changeRequestStatus,
  assignRequest,
  deleteRequest,
  checkDuplicate,
  bulkImportRequests
} from '../controllers/request.controller.js';
import {
  addAttachment,
  downloadAttachment,
  deleteAttachment
} from '../controllers/attachment.controller.js';
import {
  addOrUpdateFinalResponse,
  getFinalResponse
} from '../controllers/finalResponse.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

export const requestRouter = Router();

requestRouter.use(authenticate);

// Duplicate check & Bulk Import
requestRouter.get('/check-duplicate', requirePermission('requests.view'), checkDuplicate);
requestRouter.post('/bulk-import', requirePermission('requests.create'), bulkImportRequests);

// Main Request CRUD
requestRouter.get('/', requirePermission('requests.view'), getRequests);
requestRouter.get('/:id', requirePermission('requests.view'), getRequestById);
requestRouter.post('/', requirePermission('requests.create'), createRequest);
requestRouter.patch('/:id', requirePermission('requests.update'), updateRequest);
requestRouter.patch(
  '/:id/status',
  requirePermission('requests.change_status'),
  upload.single('file'),
  changeRequestStatus
);
requestRouter.patch('/:id/assign', requirePermission('requests.update'), assignRequest);
requestRouter.delete('/:id', requirePermission('requests.delete'), deleteRequest);

// Attachments
requestRouter.post(
  '/:id/attachments',
  requirePermission('requests.attachments'),
  upload.single('file'),
  addAttachment
);
requestRouter.get(
  '/:id/attachments/:attachmentId/download',
  requirePermission('requests.attachments'),
  downloadAttachment
);
requestRouter.get(
  '/attachments/:attachmentId/download',
  requirePermission('requests.attachments'),
  downloadAttachment
);
requestRouter.delete(
  '/:id/attachments/:attachmentId',
  requirePermission('requests.attachments'),
  deleteAttachment
);

// Final Response
requestRouter.post(
  '/:id/final-response',
  requirePermission('requests.final_response'),
  upload.single('file'),
  addOrUpdateFinalResponse
);
requestRouter.get(
  '/:id/final-response',
  requirePermission('requests.view'),
  getFinalResponse
);