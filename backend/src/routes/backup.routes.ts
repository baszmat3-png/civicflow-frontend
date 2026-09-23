import { Router } from 'express';
import {
  listBackups,
  createManualBackup,
  downloadBackupFile,
  exportInstantBackup,
  restoreBackup
} from '../controllers/backup.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

export const backupRouter = Router();

// All backup routes require authentication
backupRouter.use(authenticate);

backupRouter.get('/', listBackups);
backupRouter.post('/create', createManualBackup);
backupRouter.get('/export', exportInstantBackup);
backupRouter.get('/download/:filename', downloadBackupFile);
backupRouter.post('/restore', upload.single('backupFile'), restoreBackup);
