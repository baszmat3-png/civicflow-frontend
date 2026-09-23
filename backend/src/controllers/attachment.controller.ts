import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.js';
import { DocumentType } from '@prisma/client';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileTypeLabel = (mimeOrExt: string): string => {
  const lower = mimeOrExt.toLowerCase();
  if (lower.includes('pdf')) return 'PDF';
  if (lower.includes('image') || lower.includes('jpg') || lower.includes('jpeg') || lower.includes('png')) return 'Image';
  if (lower.includes('excel') || lower.includes('sheet') || lower.includes('xls')) return 'Excel';
  if (lower.includes('word') || lower.includes('doc')) return 'Word';
  return 'Document';
};

const mapDocumentType = (type?: string): DocumentType => {
  if (!type) return DocumentType.GENERAL;
  const upper = type.toUpperCase();
  if (upper in DocumentType) return upper as DocumentType;
  if (upper === 'IDENTITY' || upper === 'صورة الهوية' || upper === 'الهوية') return DocumentType.IDENTITY;
  if (upper === 'SENDING_DOCUMENT' || upper === 'مستند الإرسال') return DocumentType.SENDING_DOCUMENT;
  if (upper === 'APPROVAL_DOCUMENT' || upper === 'مستند الموافقة') return DocumentType.APPROVAL_DOCUMENT;
  if (upper === 'REJECTION_DOCUMENT' || upper === 'مستند الرفض') return DocumentType.REJECTION_DOCUMENT;
  if (upper === 'FINAL_RESPONSE' || upper === 'مستند الإجابة') return DocumentType.FINAL_RESPONSE;
  if (upper === 'DELIVERY_PROOF' || upper === 'إثبات التسليم') return DocumentType.DELIVERY_PROOF;
  if (upper === 'REQUEST_DOCUMENT' || upper === 'مستند الطلب') return DocumentType.REQUEST_DOCUMENT;
  return DocumentType.GENERAL;
};

import { verifyAndValidateUploadedFile, cleanupFile, formatBytes } from '../utils/fileIntegrity.js';

export const addAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: requestId } = req.params;
    const file = req.file;
    const bodyName = req.body.name;
    const bodyType = req.body.type;
    const bodySize = req.body.size;
    const clientExpectedSize = req.body.expectedSize ? Number(req.body.expectedSize) : undefined;
    const clientChecksum = req.body.checksum || req.body.fileChecksum;
    const docTypeRaw = req.body.documentType;
    const isPublicBool = req.body.isPublic === 'true' || req.body.isPublic === true;
    const uploadedBy = req.body.uploadedBy || req.user?.name || 'أحمد علي';

    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) {
      if (file?.path) cleanupFile(file.path);
      throw new AppError('المعاملة غير موجودة', 404, 'REQUEST_NOT_FOUND');
    }

    // Perform strict file integrity & size verification if a file was uploaded
    if (file) {
      const integrity = verifyAndValidateUploadedFile(file, {
        expectedSize: clientExpectedSize,
        expectedChecksum: clientChecksum
      });

      if (!integrity.valid) {
        throw new AppError(integrity.error || 'فشل التحقق من سلامة الملف المرفوع', 400, 'FILE_INTEGRITY_FAILED');
      }
    }

    const documentType = mapDocumentType(docTypeRaw);
    const isIdentity = documentType === DocumentType.IDENTITY;
    const isPublic = isIdentity ? false : (isPublicBool || documentType === DocumentType.SENDING_DOCUMENT || documentType === DocumentType.FINAL_RESPONSE);

    let fileName = bodyName || (file ? file.originalname : 'مستند_مرفق.pdf');
    let filePath = file ? file.filename : 'demo_document.pdf';
    let fileSize = file ? formatFileSize(file.size) : (bodySize || '1.5 MB');
    let fileType = bodyType || (file ? getFileTypeLabel(file.mimetype || file.originalname) : 'PDF');
    let mimeType = file ? file.mimetype : 'application/pdf';

    const newAttachment = await prisma.$transaction(async (tx) => {
      const att = await tx.requestAttachment.create({
        data: {
          requestId: request.id,
          customerId: request.customerId,
          name: fileName,
          filePath,
          fileSize,
          fileType,
          mimeType,
          documentType,
          isPublic,
          isIdentity,
          uploadedBy
        }
      });

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'إضافة مرفق',
            requestNumber: request.requestNumber,
            entity: 'RequestAttachment',
            entityId: att.id,
            details: `إرفاق مستند (${att.name}) نوع [${att.documentType}] للطلب ${request.requestNumber}`,
            documentName: att.name,
            afterValue: { name: att.name, documentType: att.documentType, isPublic: att.isPublic },
            ipAddress: req.ip
          }
        });
      }

      return att;
    });

    const formatted = {
      id: newAttachment.id,
      name: newAttachment.name,
      size: newAttachment.fileSize,
      type: newAttachment.fileType,
      documentType: newAttachment.documentType,
      isPublic: newAttachment.isPublic,
      isIdentity: newAttachment.isIdentity,
      uploadedAt: newAttachment.uploadedAt.toISOString().replace('T', ' ').substring(0, 16),
      uploadedBy: newAttachment.uploadedBy,
      url: `/uploads/${newAttachment.filePath}`
    };

    return sendSuccess(res, formatted, 'تم رفع المستند والتحقق من سلامته بنجاح', 201);
  } catch (error) {
    if (req.file?.path) cleanupFile(req.file.path);
    next(error);
  }
};

export const downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: requestId, attachmentId } = req.params;
    const targetAttachmentId = attachmentId || requestId;

    const attachment = await prisma.requestAttachment.findFirst({
      where: {
        id: targetAttachmentId,
        ...(requestId && attachmentId ? { requestId } : {})
      }
    });

    if (!attachment) {
      throw new AppError('المستند المطلوب غير موجود في المنظومة', 404, 'ATTACHMENT_NOT_FOUND');
    }

    const safeFileName = path.basename(attachment.filePath);
    const fullPath = path.resolve(process.cwd(), env.UPLOAD_DIR, safeFileName);

    if (!fs.existsSync(fullPath)) {
      // Check if it exists in base demo uploads
      const fallbackDemoPath = path.resolve(process.cwd(), 'uploads', safeFileName);
      if (fs.existsSync(fallbackDemoPath)) {
        return res.download(fallbackDemoPath, attachment.name);
      }
      throw new AppError(
        `ملف المستند (${attachment.name}) غير موجود على الخادم (ربما تم تنظيف القرص المؤقت أو لم يكتمل الرفع سابقاً).`,
        404,
        'FILE_NOT_FOUND_ON_DISK'
      );
    }

    // Send the binary file cleanly without corruption
    return res.download(fullPath, attachment.name);
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: requestId, attachmentId } = req.params;

    const attachment = await prisma.requestAttachment.findFirst({
      where: {
        id: attachmentId,
        requestId
      },
      include: {
        request: true
      }
    });

    if (!attachment) {
      throw new AppError('المستند غير موجود', 404, 'ATTACHMENT_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.requestAttachment.delete({ where: { id: attachmentId } });

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'حذف مرفق',
            requestNumber: attachment.request.requestNumber,
            entity: 'RequestAttachment',
            entityId: attachmentId,
            details: `حذف المستند المرفق (${attachment.name}) من الطلب ${attachment.request.requestNumber}`,
            beforeValue: { name: attachment.name, documentType: attachment.documentType },
            documentName: attachment.name,
            ipAddress: req.ip
          }
        });
      }
    });

    // Clean up physical file if present
    const safeFileName = path.basename(attachment.filePath);
    const fullPath = path.resolve(process.cwd(), env.UPLOAD_DIR, safeFileName);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn('Could not delete physical file:', err);
      }
    }

    return sendSuccess(res, null, 'تم حذف المستند بنجاح');
  } catch (error) {
    next(error);
  }
};