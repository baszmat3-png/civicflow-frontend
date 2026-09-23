import { Request, Response, NextFunction } from 'express';
import { backupService } from '../services/backup.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../middlewares/error.middleware.js';

export const listBackups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backups = await backupService.listBackups();
    return sendSuccess(res, { backups }, 'تم جلب قائمة النسخ الاحتياطية بنجاح');
  } catch (error) {
    next(error);
  }
};

export const createManualBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const label = req.body?.label || 'manual';
    const backup = await backupService.createBackup(label);
    return sendSuccess(res, backup, 'تم إنشاء النسخة الاحتياطية بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const downloadBackupFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    const filePath = backupService.getBackupFilePath(filename);

    if (!filePath) {
      throw new AppError('ملف النسخة الاحتياطية غير موجود', 404, 'BACKUP_NOT_FOUND');
    }

    return res.download(filePath, filename);
  } catch (error) {
    next(error);
  }
};

export const exportInstantBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backup = await backupService.createBackup('export');
    const filePath = backupService.getBackupFilePath(backup.filename);

    if (!filePath) {
      throw new AppError('تعذر تصدير ملف النسخة الاحتياطية', 500, 'EXPORT_FAILED');
    }

    return res.download(filePath, backup.filename);
  } catch (error) {
    next(error);
  }
};

export const restoreBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let payload = req.body;

    if (req.file) {
      const content = req.file.buffer
        ? req.file.buffer.toString('utf8')
        : (await import('fs')).readFileSync(req.file.path, 'utf8');
      payload = JSON.parse(content);
    }

    if (!payload || !payload.data) {
      throw new AppError('بيانات النسخة الاحتياطية غير صالحة', 400, 'INVALID_BACKUP_PAYLOAD');
    }

    const result = await backupService.restoreFromPayload(payload);
    return sendSuccess(res, result, 'تم استعادة البيانات من النسخة الاحتياطية بنجاح');
  } catch (error) {
    next(error);
  }
};
