import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { PriorityLevel, DocumentType } from '@prisma/client';
import { calculateRequestSLA } from '../services/sla.service.js';
import { generateNextRequestNumber } from '../services/requestNumber.service.js';
import { generateNextCustomerNumber } from '../services/customerNumber.service.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';
import { verifyAndValidateUploadedFile, cleanupFile } from '../utils/fileIntegrity.js';

const createRequestSchema = z.object({
  customerId: z.string().min(1, 'المراجع مطلوب'),
  ministryId: z.string().min(1, 'الجهة/الوزارة مطلوبة'),
  cityId: z.string().optional().nullable(),
  requestTypeId: z.string().optional().nullable(),
  title: z.string().min(3, 'عنوان المعاملة مطلوب (3 أحرف على الأقل)'),
  details: z.string().default(''),
  requestType: z.string().default('إصدار تصريح'),
  priority: z.enum(['عادي', 'مهم', 'عاجل', 'NORMAL', 'IMPORTANT', 'URGENT']).default('عادي'),
  assignedEmployeeId: z.string().optional().nullable(),
  receiveDate: z.string().optional(),
  internalNotes: z.string().optional().nullable()
});

const updateRequestSchema = z.object({
  title: z.string().min(3).optional(),
  details: z.string().optional(),
  requestType: z.string().optional(),
  cityId: z.string().optional().nullable(),
  requestTypeId: z.string().optional().nullable(),
  priority: z.enum(['عادي', 'مهم', 'عاجل', 'NORMAL', 'IMPORTANT', 'URGENT']).optional(),
  assignedEmployeeId: z.string().optional().nullable(),
  receiveDate: z.string().optional(),
  internalNotes: z.string().optional().nullable()
});

const changeStatusSchema = z.object({
  newStatus: z.string().min(1, 'الحالة الجديدة مطلوبة'),
  note: z.string().optional().default(''),
  reason: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  documentName: z.string().optional().nullable(),
  documentType: z.string().optional().nullable(),
  isPublicDoc: z.boolean().optional().default(false),
  approvalNumber: z.string().optional().nullable()
});

const assignEmployeeSchema = z.object({
  assignedEmployeeId: z.string().min(1, 'معرف الموظف مطلوب')
});

const priorityToEnum = (p?: string): PriorityLevel => {
  if (p === 'عاجل' || p === 'URGENT') return PriorityLevel.URGENT;
  if (p === 'مهم' || p === 'IMPORTANT') return PriorityLevel.IMPORTANT;
  return PriorityLevel.NORMAL;
};

const priorityToAr = (p: PriorityLevel): 'عادي' | 'مهم' | 'عاجل' => {
  if (p === PriorityLevel.URGENT) return 'عاجل';
  if (p === PriorityLevel.IMPORTANT) return 'مهم';
  return 'عادي';
};

const formatRequestItem = (r: any) => {
  const timeline = (r.statusHistory || []).map((h: any) => {
    const d = new Date(h.createdAt);
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    return {
      id: h.id,
      status: h.newStatus,
      date: dateStr,
      time: timeStr,
      employeeName: h.employeeName || h.changedBy?.name || 'النظام',
      note: h.note || `تم تغيير الحالة إلى ${h.newStatus}`,
      reason: h.reason || undefined,
      documentName: h.documentName || undefined,
      documentPath: h.documentPath || undefined,
      documentId: h.documentId || undefined,
      isPublicDoc: h.isPublicDoc || false,
      completed: true
    };
  });

  const attachments = (r.attachments || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    size: a.fileSize,
    type: a.fileType,
    documentType: a.documentType,
    isPublic: a.isPublic,
    isIdentity: a.isIdentity,
    uploadedAt: new Date(a.uploadedAt).toISOString().replace('T', ' ').substring(0, 16),
    uploadedBy: a.uploadedBy,
    url: `/uploads/${a.filePath}`
  }));

  const finalResponse = r.finalResponse
    ? {
        id: r.finalResponse.id,
        decision: r.finalResponse.decision,
        summary: r.finalResponse.summary,
        documentNumber: r.finalResponse.documentNumber || undefined,
        issuedAt: new Date(r.finalResponse.issuedAt).toISOString().replace('T', ' ').substring(0, 16),
        issuedBy: r.finalResponse.issuedBy,
        attachmentName: r.finalResponse.attachmentName || undefined,
        attachmentPath: r.finalResponse.attachmentPath || undefined,
        deliveredToCustomer: r.finalResponse.deliveredToCustomer,
        deliveryDate: r.finalResponse.deliveryDate ? r.finalResponse.deliveryDate.toISOString().split('T')[0] : undefined
      }
    : undefined;

  return {
    id: r.id,
    requestNumber: r.requestNumber,
    publicTrackingToken: r.publicTrackingToken,
    customerId: r.customerId,
    customerNumber: r.customer?.customerNumber || `CUST-${r.customerId.substring(0, 6)}`,
    nationalId: r.customer?.nationalId || undefined,
    customerName: r.customer?.name || 'مراجع غير محدد',
    customerPhone: r.customer?.phone || '',
    customerAltPhone: r.customer?.altPhone || undefined,
    customerOccupation: r.customer?.occupation || r.occupation || undefined,
    customerBirthYear: r.customer?.birthYear || r.birthYear || undefined,
    customerAddress: r.customer?.address || undefined,
    cityId: r.cityId || r.customer?.cityId || undefined,
    cityName: r.city?.name || r.customer?.city?.name || 'غير محدد',
    title: r.title,
    details: r.details,
    requestTypeId: r.requestTypeId || undefined,
    requestType: r.requestTypeRel?.name || r.requestType,
    ministryId: r.ministryId,
    ministryName: r.ministry?.name || 'جهة غير محددة',
    status: r.status,
    priority: priorityToAr(r.priority),
    assignedEmployeeId: r.assignedEmployeeId || '',
    assignedEmployeeName: r.assignedEmployee?.name || 'غير معين',
    receiveDate: new Date(r.receiveDate).toISOString().split('T')[0],
    expectedCompletionDate: new Date(r.expectedCompletionDate).toISOString().split('T')[0],
    completedDate: r.completedDate ? new Date(r.completedDate).toISOString().split('T')[0] : undefined,
    deadlineStatus: r.deadlineStatus,
    daysRemainingOrOverdue: r.daysRemainingOrOverdue,
    attachments,
    timeline,
    finalResponse,
    internalNotes: r.internalNotes || '',
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString()
  };
};

export const getRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      status,
      ministryId,
      cityId,
      requestTypeId,
      requestType,
      employeeId,
      assignedEmployeeId,
      priority,
      isOverdue,
      fromDate,
      toDate,
      page = '1',
      limit = '100',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { requestNumber: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q } } },
        { customer: { altPhone: { contains: q } } },
        { customer: { nationalId: { contains: q } } },
        { customer: { customerNumber: { contains: q, mode: 'insensitive' } } },
        { ministry: { name: { contains: q, mode: 'insensitive' } } },
        { city: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status as string;
    }

    if (ministryId && ministryId !== 'all') {
      where.ministryId = ministryId as string;
    }

    if (cityId && cityId !== 'all') {
      where.OR = [
        { cityId: cityId as string },
        { customer: { cityId: cityId as string } }
      ];
    }

    if (requestTypeId && requestTypeId !== 'all') {
      where.requestTypeId = requestTypeId as string;
    } else if (requestType && requestType !== 'all') {
      where.requestType = requestType as string;
    }

    const targetEmpId = employeeId || assignedEmployeeId;
    if (targetEmpId && targetEmpId !== 'all') {
      where.assignedEmployeeId = targetEmpId as string;
    }

    if (priority && priority !== 'all') {
      where.priority = priorityToEnum(priority as string);
    }

    if (isOverdue !== undefined && isOverdue !== 'all') {
      const isOverdueBool = isOverdue === 'true' || isOverdue === '1';
      if (isOverdueBool) {
        where.deadlineStatus = 'متأخر';
      } else {
        where.deadlineStatus = { not: 'متأخر' };
      }
    }

    if (fromDate) {
      where.receiveDate = { ...(where.receiveDate || {}), gte: new Date(fromDate as string) };
    }

    if (toDate) {
      where.receiveDate = { ...(where.receiveDate || {}), lte: new Date(toDate as string) };
    }

    const [total, rawRequests] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc'
        },
        include: {
          customer: { include: { city: true } },
          ministry: true,
          city: true,
          requestTypeRel: true,
          assignedEmployee: true,
          statusHistory: {
            include: { changedBy: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
          },
          attachments: true,
          finalResponse: true
        }
      })
    ]);

    const requests = rawRequests.map(formatRequestItem);

    return sendSuccess(res, {
      requests,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

export const getRequestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const request = await prisma.request.findFirst({
      where: {
        OR: [{ id }, { requestNumber: id }, { publicTrackingToken: id }]
      },
      include: {
        customer: { include: { city: true } },
        ministry: true,
        city: true,
        requestTypeRel: true,
        assignedEmployee: true,
        statusHistory: {
          include: { changedBy: { select: { name: true } } },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        finalResponse: true
      }
    });

    if (!request) {
      throw new AppError('المعاملة غير موجودة في النظام', 404, 'REQUEST_NOT_FOUND');
    }

    return sendSuccess(res, formatRequestItem(request));
  } catch (error) {
    next(error);
  }
};

export const createRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRequestSchema.parse(req.body);

    let customer = null;
    if (data.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
        include: { city: true }
      });
    }

    if (!customer && data.customerId) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { id: data.customerId },
            { customerNumber: data.customerId },
            { phone: data.customerId },
            { nationalId: data.customerId }
          ]
        },
        include: { city: true }
      });
    }

    if (!customer) {
      const custName = (req.body as any).customerName;
      const custPhone = (req.body as any).customerPhone;
      if (custPhone || custName) {
        customer = await prisma.customer.findFirst({
          where: {
            OR: [
              custPhone ? { phone: custPhone } : {},
              custName ? { name: { equals: custName, mode: 'insensitive' } } : {}
            ]
          },
          include: { city: true }
        });
      }
    }

    if (!customer) {
      const customerName = (req.body as any).customerName || 'مراجع عام';
      const customerPhone = (req.body as any).customerPhone || `077${Date.now().toString().slice(-8)}`;
      const customerNumber = await generateNextCustomerNumber(prisma);
      customer = await prisma.customer.create({
        data: {
          customerNumber,
          name: customerName,
          phone: customerPhone,
          address: '',
          status: 'ACTIVE'
        },
        include: { city: true }
      });
    }

    if (!customer) {
      throw new AppError('تعذر العثور على المراجع أو إنشاؤه في قاعدة البيانات', 404, 'CUSTOMER_NOT_FOUND');
    }

    let ministry = await prisma.ministry.findUnique({ where: { id: data.ministryId } });
    if (!ministry) {
      ministry = await prisma.ministry.findFirst({
        where: {
          OR: [
            { id: data.ministryId },
            { name: (req.body as any).ministryName || undefined }
          ]
        }
      });
    }
    if (!ministry) {
      ministry = await prisma.ministry.findFirst({ where: { status: 'ACTIVE' } }) || await prisma.ministry.findFirst();
    }
    if (!ministry) {
      throw new AppError('لا توجد جهة حكومية معتمدة في النظام', 404, 'MINISTRY_NOT_FOUND');
    }

    const validCustomer = customer;
    let finalCityId: string | null = null;
    const candidateCity = data.cityId || validCustomer.cityId;
    if (candidateCity) {
      const city = await prisma.city.findFirst({
        where: {
          OR: [
            { id: candidateCity },
            { name: { equals: candidateCity, mode: 'insensitive' } }
          ],
          status: 'ACTIVE'
        }
      });
      finalCityId = city ? city.id : null;
    }

    let finalRequestTypeId: string | null = null;
    let finalRequestTypeName = data.requestType || 'طلب عام';

    if (data.requestTypeId) {
      const rt = await prisma.requestType.findFirst({
        where: {
          OR: [
            { id: data.requestTypeId },
            { name: { equals: data.requestTypeId, mode: 'insensitive' } }
          ],
          status: 'ACTIVE'
        }
      });
      if (rt) {
        finalRequestTypeId = rt.id;
        finalRequestTypeName = rt.name;
      }
    }

    let assignedEmpId: string | null = null;
    let assignedEmpName = 'غير معين';

    if (data.assignedEmployeeId) {
      const emp = await prisma.user.findUnique({ where: { id: data.assignedEmployeeId } });
      if (emp) {
        assignedEmpId = emp.id;
        assignedEmpName = emp.name;
      }
    }
    if (!assignedEmpId && req.user) {
      assignedEmpId = req.user.id;
      assignedEmpName = req.user.name;
    }

    const priorityEnum = priorityToEnum(data.priority);
    const receiveDateObj = data.receiveDate ? new Date(data.receiveDate) : new Date();

    const slaResult = await calculateRequestSLA(ministry.id, priorityEnum, receiveDateObj);

    const newRequest = await prisma.$transaction(async (tx) => {
      const requestNumber = await generateNextRequestNumber(tx);

      const created = await tx.request.create({
        data: {
          requestNumber,
          customerId: validCustomer.id,
          ministryId: ministry.id,
          cityId: finalCityId,
          requestTypeId: finalRequestTypeId,
          assignedEmployeeId: assignedEmpId,
          title: data.title,
          details: data.details,
          requestType: finalRequestTypeName,
          status: 'استلام الطلب',
          priority: priorityEnum,
          receiveDate: receiveDateObj,
          expectedCompletionDate: slaResult.expectedCompletionDate,
          deadlineStatus: slaResult.deadlineStatus,
          daysRemainingOrOverdue: slaResult.daysRemainingOrOverdue,
          internalNotes: data.internalNotes || null,
          statusHistory: {
            create: {
              newStatus: 'استلام الطلب',
              changedById: req.user?.id || null,
              employeeName: req.user?.name || assignedEmpName,
              note: 'تم إنشاء المعاملة واستلام الوثائق الأولية.'
            }
          }
        },
        include: {
          customer: { include: { city: true } },
          ministry: true,
          city: true,
          requestTypeRel: true,
          assignedEmployee: true,
          statusHistory: {
            include: { changedBy: { select: { name: true } } }
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
            action: 'إضافة طلب',
            requestNumber,
            entity: 'Request',
            entityId: created.id,
            details: `إنشاء طلب جديد رقم ${requestNumber} للمراجع ${validCustomer.name}`,
            afterValue: { requestNumber, title: created.title, status: created.status, ministry: ministry.name },
            ipAddress: req.ip
          }
        });

        await tx.notification.create({
          data: {
            userId: req.user.id,
            title: 'استلام طلب جديد',
            message: `تم تسجيل المعاملة #${requestNumber} بنجاح لدى ${ministry.name}`,
            requestId: created.id,
            requestNumber,
            type: 'system',
            link: `/requests/${created.id}`
          }
        });
      }

      return created;
    });

    if (newRequest.customer?.phone) {
      const formattedDate = newRequest.expectedCompletionDate ? new Date(newRequest.expectedCompletionDate).toISOString().split('T')[0] : undefined;
      try {
        await whatsappNotificationService.sendRequestReceivedWhatsApp({
          to: newRequest.customer.phone,
          customerName: newRequest.customer.name,
          requestNumber: newRequest.requestNumber,
          ministryName: newRequest.ministry.name,
          expectedDate: formattedDate,
          requestId: newRequest.id
        });
      } catch (waErr) {
        console.warn('⚠️ Could not send WhatsApp to customer:', waErr);
      }
    }

    return sendSuccess(res, formatRequestItem(newRequest), 'تم إنشاء المعاملة بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const updateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateRequestSchema.parse(req.body);

    const existing = await prisma.request.findUnique({
      where: { id },
      include: { customer: true, ministry: true }
    });

    if (!existing) {
      throw new AppError('المعاملة غير موجودة في النظام', 404, 'REQUEST_NOT_FOUND');
    }

    const priorityEnum = data.priority ? priorityToEnum(data.priority) : existing.priority;
    const receiveDateObj = data.receiveDate ? new Date(data.receiveDate) : existing.receiveDate;

    let slaUpdate: any = {};
    if (data.priority || data.receiveDate) {
      const sla = await calculateRequestSLA(
        existing.ministryId,
        priorityEnum,
        receiveDateObj,
        existing.completedDate
      );
      slaUpdate = {
        expectedCompletionDate: sla.expectedCompletionDate,
        deadlineStatus: sla.deadlineStatus,
        daysRemainingOrOverdue: sla.daysRemainingOrOverdue
      };
    }

    let finalRequestTypeName = data.requestType;
    if (data.requestTypeId) {
      const rt = await prisma.requestType.findUnique({ where: { id: data.requestTypeId } });
      if (rt) finalRequestTypeName = rt.name;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.request.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.details !== undefined && { details: data.details }),
          ...(finalRequestTypeName && { requestType: finalRequestTypeName }),
          ...(data.requestTypeId !== undefined && { requestTypeId: data.requestTypeId || null }),
          ...(data.cityId !== undefined && { cityId: data.cityId || null }),
          ...(data.priority && { priority: priorityEnum }),
          ...(data.assignedEmployeeId !== undefined && { assignedEmployeeId: data.assignedEmployeeId || null }),
          ...(data.receiveDate && { receiveDate: receiveDateObj }),
          ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes || null }),
          ...slaUpdate
        },
        include: {
          customer: { include: { city: true } },
          ministry: true,
          city: true,
          requestTypeRel: true,
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
            action: 'تعديل طلب',
            requestNumber: existing.requestNumber,
            entity: 'Request',
            entityId: id,
            details: `تحديث بيانات المعاملة ${existing.requestNumber}`,
            beforeValue: { title: existing.title, priority: existing.priority },
            afterValue: { title: reqUpdated.title, priority: reqUpdated.priority },
            ipAddress: req.ip
          }
        });
      }

      return reqUpdated;
    });

    return sendSuccess(res, formatRequestItem(updated), 'تم تحديث بيانات المعاملة بنجاح');
  } catch (error) {
    next(error);
  }
};

/**
 * MANDATORY STATUS TRANSITION WITH BACKEND DOCUMENT ENFORCEMENT
 */
export const changeRequestStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bodyData = changeStatusSchema.parse(req.body);
    const file = req.file;

    const existing = await prisma.request.findUnique({
      where: { id },
      include: {
        customer: true,
        ministry: true,
        attachments: true,
        finalResponse: true
      }
    });

    if (!existing) {
      throw new AppError('المعاملة غير موجودة في النظام', 404, 'REQUEST_NOT_FOUND');
    }

    const newStatus = bodyData.newStatus.trim();
    let attachedDocName = bodyData.documentName || (file ? file.originalname : null);
    let attachedDocPath = file ? file.filename : null;
    let attachedDocType = bodyData.documentType ? (bodyData.documentType as DocumentType) : DocumentType.GENERAL;
    let isPublicDoc = bodyData.isPublicDoc;

    // ==========================================
    // BACKEND DOCUMENT ENFORCEMENT RULES
    // ==========================================

    // Rule 1: تم إرسال الطلب للجهة -> Mandatory Sending Document
    if (newStatus === 'تم إرسال الطلب للجهة' || newStatus === 'تم إرساله للجهة') {
      const hasSendingDoc = file || bodyData.documentName || existing.attachments.some(a => a.documentType === DocumentType.SENDING_DOCUMENT);
      if (!hasSendingDoc) {
        throw new AppError(
          'لا يمكن تغيير الحالة إلى "تم إرسال الطلب للجهة" بدون إرفاق مستند الإرسال الرسمي.',
          400,
          'DOCUMENT_REQUIRED_SENDING'
        );
      }
      attachedDocType = DocumentType.SENDING_DOCUMENT;
      isPublicDoc = true; // Reviewer can view sending document
    }

    // Rule 2: موافقة -> Mandatory Approval Document
    if (newStatus === 'موافقة' || newStatus === 'الموافقة') {
      const hasApprovalDoc = file || bodyData.documentName || existing.attachments.some(a => a.documentType === DocumentType.APPROVAL_DOCUMENT);
      if (!hasApprovalDoc) {
        throw new AppError(
          'لا يمكن تغيير الحالة إلى "موافقة" بدون إرفاق مستند الموافقة الرسمي.',
          400,
          'DOCUMENT_REQUIRED_APPROVAL'
        );
      }
      attachedDocType = DocumentType.APPROVAL_DOCUMENT;
      isPublicDoc = true;
    }

    // Rule 3: مرفوض -> Mandatory Rejection Reason
    if (newStatus === 'مرفوض' || newStatus === 'الرفض') {
      const rejectionReason = (bodyData.rejectionReason || bodyData.reason || bodyData.note || '').trim();
      if (!rejectionReason) {
        throw new AppError(
          'سبب الرفض إلزامي عند تغيير حالة المعاملة إلى مرفوض.',
          400,
          'REASON_REQUIRED_REJECTION'
        );
      }
      attachedDocType = DocumentType.REJECTION_DOCUMENT;
      if (file || bodyData.documentName) {
        isPublicDoc = true;
      }
    }

    // Rule 4: الإجابة جاهزة -> Mandatory Answer Document
    if (newStatus === 'الإجابة جاهزة') {
      const hasAnswerDoc = file || bodyData.documentName || existing.finalResponse?.attachmentName || existing.attachments.some(a => a.documentType === DocumentType.FINAL_RESPONSE);
      if (!hasAnswerDoc) {
        throw new AppError(
          'لا يمكن تغيير الحالة إلى "الإجابة جاهزة" بدون إرفاق مستند الإجابة والقرار النهائي.',
          400,
          'DOCUMENT_REQUIRED_FINAL_ANSWER'
        );
      }
      attachedDocType = DocumentType.FINAL_RESPONSE;
      isPublicDoc = true;
    }

    // Rule 5: تم التسليم -> Mandatory Delivery Proof Document
    if (newStatus === 'تم التسليم') {
      const hasDeliveryProof = file || bodyData.documentName || existing.attachments.some(a => a.documentType === DocumentType.DELIVERY_PROOF);
      if (!hasDeliveryProof) {
        throw new AppError(
          'لا يمكن تغيير الحالة إلى "تم التسليم" بدون إرفاق مستند إثبات التسليم والتوقيع.',
          400,
          'DOCUMENT_REQUIRED_DELIVERY_PROOF'
        );
      }
      attachedDocType = DocumentType.DELIVERY_PROOF;
      isPublicDoc = true;
    }

    const isTerminal = ['تم التسليم', 'مغلق', 'الإجابة جاهزة'].includes(newStatus);
    const completedDate = isTerminal ? new Date() : existing.completedDate;

    // Validate uploaded file integrity
    if (file) {
      const integrity = verifyAndValidateUploadedFile(file);
      if (!integrity.valid) {
        throw new AppError(integrity.error || 'فشل التحقق من سلامة الملف المرفوع مع تغيير الحالة', 400, 'FILE_INTEGRITY_FAILED');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      let createdAttachmentId: string | undefined;

      // If a file was uploaded with status transition, create attachment record
      if (file || (bodyData.documentName && !existing.attachments.some(a => a.name === bodyData.documentName))) {
        const attName = file ? file.originalname : (bodyData.documentName || 'مستند_الإجراء.pdf');
        const attPath = file ? file.filename : 'demo_document.pdf';
        const attSize = file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '1.5 MB';
        const attMime = file ? file.mimetype : 'application/pdf';

        const att = await tx.requestAttachment.create({
          data: {
            requestId: existing.id,
            customerId: existing.customerId,
            name: attName,
            filePath: attPath,
            fileSize: attSize,
            fileType: attMime.includes('pdf') ? 'PDF' : 'Image',
            mimeType: attMime,
            documentType: attachedDocType,
            isPublic: isPublicDoc,
            isIdentity: false,
            uploadedBy: req.user?.name || 'أحمد علي'
          }
        });
        createdAttachmentId = att.id;
        attachedDocName = att.name;
        attachedDocPath = att.filePath;
      }

      // Update Request
      const reqUpdated = await tx.request.update({
        where: { id },
        data: {
          status: newStatus,
          completedDate,
          statusHistory: {
            create: {
              oldStatus: existing.status,
              newStatus,
              changedById: req.user?.id || null,
              employeeName: req.user?.name || 'أحمد علي',
              note: bodyData.note || `تم تغيير الحالة إلى ${newStatus}`,
              reason: bodyData.reason || null,
              documentId: createdAttachmentId || null,
              documentName: attachedDocName || null,
              documentPath: attachedDocPath || null,
              isPublicDoc
            }
          }
        },
        include: {
          customer: { include: { city: true } },
          ministry: true,
          city: true,
          requestTypeRel: true,
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
            action: 'تغيير حالة',
            requestNumber: existing.requestNumber,
            entity: 'Request',
            entityId: id,
            details: `تغيير حالة الطلب ${existing.requestNumber} من (${existing.status}) إلى (${newStatus})${attachedDocName ? ` مع إرفاق المستند [${attachedDocName}]` : ''}${bodyData.reason ? `. السبب: ${bodyData.reason}` : ''}`,
            beforeValue: { status: existing.status },
            afterValue: { status: newStatus, reason: bodyData.reason, document: attachedDocName },
            documentName: attachedDocName || null,
            ipAddress: req.ip
          }
        });

        let notifType = 'status_change';
        if (newStatus === 'مطلوب مستندات') notifType = 'docs_required';
        if (newStatus === 'الإجابة جاهزة') notifType = 'final_response';
        if (newStatus === 'موافقة') notifType = 'approved';

        await tx.notification.create({
          data: {
            userId: req.user.id,
            title: `تحديث حالة المعاملة #${existing.requestNumber}`,
            message: `أصبحت حالة الطلب الآن: ${newStatus}`,
            requestId: id,
            requestNumber: existing.requestNumber,
            type: notifType,
            link: `/requests/${id}`
          }
        });
      }

      return reqUpdated;
    });

    if (updated.customer?.phone) {
      try {
        await whatsappNotificationService.sendStatusChangeWhatsApp({
          to: updated.customer.phone,
          customerName: updated.customer.name,
          requestNumber: updated.requestNumber,
          ministryName: updated.ministry.name,
          newStatus: updated.status,
          note: bodyData.note || bodyData.reason || null,
          requestId: updated.id
        });
      } catch (waErr) {
        console.warn('⚠️ Could not send status change WhatsApp to customer:', waErr);
      }
    }

    return sendSuccess(res, formatRequestItem(updated), 'تم تغيير حالة المعاملة بنجاح');
  } catch (error) {
    next(error);
  }
};

export const assignRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { assignedEmployeeId } = assignEmployeeSchema.parse(req.body);

    const employee = await prisma.user.findUnique({ where: { id: assignedEmployeeId } });
    if (!employee || employee.status !== 'ACTIVE') {
      throw new AppError('الموظف المحدد غير موجود أو غير نشط في النظام', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('المعاملة غير موجودة', 404, 'REQUEST_NOT_FOUND');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reqUpdated = await tx.request.update({
        where: { id },
        data: { assignedEmployeeId: employee.id },
        include: {
          customer: { include: { city: true } },
          ministry: true,
          city: true,
          requestTypeRel: true,
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
            action: 'إسناد معاملة',
            requestNumber: existing.requestNumber,
            entity: 'Request',
            entityId: id,
            details: `إسناد المعاملة ${existing.requestNumber} إلى الموظف (${employee.name})`,
            beforeValue: { assignedEmployeeId: existing.assignedEmployeeId },
            afterValue: { assignedEmployeeId: employee.id, employeeName: employee.name },
            ipAddress: req.ip
          }
        });

        await tx.notification.create({
          data: {
            userId: employee.id,
            title: 'إسناد معاملة جديدة',
            message: `تم إسناد المعاملة #${existing.requestNumber} لمتابعتها والعمل عليها`,
            requestId: id,
            requestNumber: existing.requestNumber,
            type: 'system',
            link: `/requests/${id}`
          }
        });
      }

      return reqUpdated;
    });

    return sendSuccess(res, formatRequestItem(updated), `تم إسناد المعاملة للموظف ${employee.name} بنجاح`);
  } catch (error) {
    next(error);
  }
};

export const deleteRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.request.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('المعاملة غير موجودة', 404, 'REQUEST_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.request.delete({ where: { id } });

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'حذف طلب',
            requestNumber: existing.requestNumber,
            entity: 'Request',
            entityId: id,
            details: `حذف المعاملة رقم ${existing.requestNumber}`,
            beforeValue: { requestNumber: existing.requestNumber, title: existing.title },
            ipAddress: req.ip
          }
        });
      }
    });

    return sendSuccess(res, null, 'تم حذف المعاملة بنجاح');
  } catch (error) {
    next(error);
  }
};