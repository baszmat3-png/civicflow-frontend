import { Router } from 'express';
import multer from 'multer';
import {
  getRegistryEntities,
  createRegistryEntity,
  updateRegistryEntity,
  deleteRegistryEntity,
  getOutgoingLetters,
  createOutgoingLetter,
  downloadOutgoingAttachment,
  deleteOutgoingLetter,
  getIncomingLetters,
  createIncomingLetter,
  downloadIncomingAttachment,
  deleteIncomingLetter
} from '../controllers/registry.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

export const registryRouter = Router();

// Entities
registryRouter.get('/entities', authenticate, getRegistryEntities);
registryRouter.post('/entities', authenticate, requirePermission('settings.manage'), createRegistryEntity);
registryRouter.patch('/entities/:id', authenticate, requirePermission('settings.manage'), updateRegistryEntity);
registryRouter.delete('/entities/:id', authenticate, requirePermission('settings.manage'), deleteRegistryEntity);

// Outgoing
registryRouter.get('/outgoing', authenticate, requirePermission('requests.view'), getOutgoingLetters);
registryRouter.post('/outgoing', authenticate, requirePermission('requests.create'), uploadMemory.single('attachment'), createOutgoingLetter);
registryRouter.get('/outgoing/:id/download', authenticate, downloadOutgoingAttachment);
registryRouter.delete('/outgoing/:id', authenticate, requirePermission('requests.delete'), deleteOutgoingLetter);

// Incoming
registryRouter.get('/incoming', authenticate, requirePermission('requests.view'), getIncomingLetters);
registryRouter.post('/incoming', authenticate, requirePermission('requests.create'), uploadMemory.single('attachment'), createIncomingLetter);
registryRouter.get('/incoming/:id/download', authenticate, downloadIncomingAttachment);
registryRouter.delete('/incoming/:id', authenticate, requirePermission('requests.delete'), deleteIncomingLetter);
