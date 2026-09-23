import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import fs from 'fs';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';

const finalResponseSchema = z.object({
  decision: z.enum(['موافقة', 'رفض', 'إنجاز المعاملة', 'إحالة لجهة أخرى']),
  summary: z.string().min(3, 'ملخص القرار مطلوب (3 أحرف على الأقل)'),
  documentNumber: z.string().optional().nullable(),
  issuedBy: z.string().default('أحمد علي'),
  attachmentName: z.string().optional().nullable(),
  deliveredToCustomer: z.boolean().default(false),
  deliveryDate: z.string().optional().nullable()
});

export const addOrUpdateFinalResponse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: requestId } = req.params;
    const file = req.file;
    const data = finalResponseSchema.parse(req.body);

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { customer: true, ministry: true, finalResponse: true }
    });

    if (!request) {
      throw new AppError('المعاملة غير موجودة', 404, 'REQUEST_NOT_FOUND');
    }

    const issuedBy = data.issuedBy || req.user?.name || 'أحمد علي';
    const attachmentPath = file ? file.filename : (request.finalResponse?.attachmentPath || 'demo_final_response.pdf');
    const attachmentName = data.attachmentName || (file ? file.originalname : (request.finalResponse?.attachmentName || 'الوثيقة_الرسمية_المعتمدة.pdf'));
    const docNumber = data.documentNumber || `DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newStatus = data.deliveredToCustomer ? 'تم التسليم' : 'الإجابة جاهزة';

    let fileBuffer: Buffer | null = null;
    if (file) {
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.path && fs.existsSync(file.path)) {
        fileBuffer = fs.readFileSync(file.path);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Upsert final response
      const fr = await tx.finalResponse.upsert({
        where: { requestId: request.id },
        create: {
          requestId: request.id,
          decision: data.decision,
          summary: data.summary,
          documentNumber: docNumber,
          issuedBy,
          attachmentName,
          attachmentPath,
          attachmentData: fileBuffer || undefined,
          deliveredToCustomer: data.deliveredToCustomer,
          deliveryDate: data.deliveredToCustomer ? new Date() : null
        },
        update: {
          decision: data.decision,
          summary: data.summary,
          documentNumber: docNumber,
          issuedBy,
          attachmentName,
          attachmentPath,
          ...(fileBuffer ? { attachmentData: fileBuffer } : {}),
          deliveredToCustomer: data.deliveredToCustomer,
          deliveryDate: data.deliveredToCustomer ? new Date() : null
        }
      });

      // Update request status to 'الإجابة جاهزة' / 'تم التسليم'
      const updatedReq = await tx.request.update({
        where: { id: request.id },
        data: {
          status: newStatus,
          completedDate: new Date(),
          statusHistory: {
            create: {
              oldStatus: request.status,
              newStatus,
              changedById: req.user?.id || null,
              employeeName: issuedBy,
              note: `تم اعتماد الإجابة والقرار النهائي (${data.decision}). ${data.summary}`
            }
          }
        },
        include: {
          customer: true,
          ministry: true,
          assignedEmployee: true,
          statusHistory: {
            include: { changedBy: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
          },
          attachments: true,
          finalResponse: true
        }
      });

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'إضافة إجابة نهائية',
            requestNumber: request.requestNumber,
            entity: 'FinalResponse',
            entityId: fr.id,
            details: `إضافة الإجابة والقرار النهائي (${data.decision}) للطلب ${request.requestNumber}`,
            ipAddress: req.ip
          }
        });

        await tx.notification.create({
          data: {
            userId: req.user.id,
            title: `الإجابة جاهزة للطلب #${request.requestNumber}`,
            message: `صدرت الإجابة والوثيقة الرسمية للطلب #${request.requestNumber} بقرار: (${data.decision})`,
            requestId: request.id,
            requestNumber: request.requestNumber,
            type: 'final_response',
            link: `/requests/${request.id}`
          }
        });
      }

      return { fr, updatedReq };
    });

    if (request.customer?.phone) {
      try {
        await whatsappNotificationService.sendFinalResponseWhatsApp({
          to: request.customer.phone,
          customerName: request.customer.name,
          requestNumber: request.requestNumber,
          ministryName: request.ministry.name,
          decision: data.decision,
          summary: data.summary,
          requestId: request.id
        });
      } catch (waErr) {
        console.warn('⚠️ Could not send final response WhatsApp to customer:', waErr);
      }
    }

    const formattedFr = {
      id: result.fr.id,
      decision: result.fr.decision,
      summary: result.fr.summary,
      documentNumber: result.fr.documentNumber || undefined,
      issuedAt: result.fr.issuedAt.toISOString().replace('T', ' ').substring(0, 16),
      issuedBy: result.fr.issuedBy,
      attachmentName: result.fr.attachmentName || undefined,
      deliveredToCustomer: result.fr.deliveredToCustomer,
      deliveryDate: result.fr.deliveryDate ? result.fr.deliveryDate.toISOString().split('T')[0] : undefined
    };

    return sendSuccess(res, formattedFr, 'تم اعتماد وحفظ الإجابة النهائية بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const getFinalResponse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: requestId } = req.params;

    const fr = await prisma.finalResponse.findUnique({
      where: { requestId }
    });

    if (!fr) {
      throw new AppError('لا توجد إجابة نهائية مسجلة لهذه المعاملة بعد', 404, 'FINAL_RESPONSE_NOT_FOUND');
    }

    const formatted = {
      id: fr.id,
      decision: fr.decision,
      summary: fr.summary,
      documentNumber: fr.documentNumber || undefined,
      issuedAt: fr.issuedAt.toISOString().replace('T', ' ').substring(0, 16),
      issuedBy: fr.issuedBy,
      attachmentName: fr.attachmentName || undefined,
      deliveredToCustomer: fr.deliveredToCustomer,
      deliveryDate: fr.deliveryDate ? fr.deliveryDate.toISOString().split('T')[0] : undefined
    };

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};