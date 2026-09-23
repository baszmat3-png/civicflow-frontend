import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { PriorityLevel, DocumentType, CustomerStatus } from '@prisma/client';
import { calculateRequestSLA } from '../services/sla.service.js';
import { generateNextRequestNumber } from '../services/requestNumber.service.js';
import { generateNextCustomerNumber } from '../services/customerNumber.service.js';
import { whatsappNotificationService } from '../services/whatsapp/whatsappNotification.service.js';
import { env } from '../config/env.js';
import { verifyAndValidateUploadedFile, cleanupFile, formatBytes } from '../utils/fileIntegrity.js';

const optionalString = z.preprocess(
  (v) => (v === null || v === undefined || v === '' ? undefined : String(v).trim()),
  z.string().optional().nullable()
);

const publicRequestSchema = z.object({
  name: z.preprocess((v) => (!v ? 'مراجع' : String(v).trim()), z.string().default('مراجع')),
  phone: z.preprocess((v) => (!v ? '' : String(v).trim()), z.string().min(3, 'يرجى إدخال رقم هاتف صالح')),
  altPhone: optionalString,
  nationalId: optionalString,
  occupation: optionalString,
  birthYear: optionalString,
  cityId: optionalString,
  address: optionalString,
  ministryId: optionalString,
  requestTypeId: optionalString,
  requestType: optionalString,
  title: optionalString,
  details: optionalString,
  identityDocName: optionalString,
  requestDocName: optionalString
});

const IRAQI_GOVERNORATES = [
  'دهوك',
  'نينوى',
  'أربيل',
  'كركوك',
  'السليمانية',
  'صلاح الدين',
  'الأنبار',
  'ديالى',
  'بغداد',
  'واسط',
  'بابل',
  'كربلاء',
  'النجف',
  'القادسية',
  'ميسان',
  'ذي قار',
  'المثنى',
  'البصرة',
  'حلبجة'
];

export const getPublicFormData = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [ministries, cities, requestTypes] = await Promise.all([
      prisma.ministry.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true, slaDays: true }
      }),
      prisma.city.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true }
      }),
      prisma.requestType.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
      })
    ]);

    // Sort cities in exact Iraqi Governorates order (North to South)
    const sortedCities = [...cities].sort((a, b) => {
      const indexA = IRAQI_GOVERNORATES.indexOf(a.name);
      const indexB = IRAQI_GOVERNORATES.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name, 'ar');
    });

    return sendSuccess(res, {
      ministries,
      cities: sortedCities,
      requestTypes
    });
  } catch (error) {
    next(error);
  }
};

export const submitPublicRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = publicRequestSchema.parse(req.body);

    let ministry = null;
    if (data.ministryId) {
      ministry = await prisma.ministry.findUnique({
        where: { id: data.ministryId }
      });
    }
    if (!ministry) {
      ministry = await prisma.ministry.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' }
      });
    }
    if (!ministry) {
      ministry = await prisma.ministry.findFirst();
    }
    if (!ministry) {
      throw new AppError('لا توجد جهة حكومية مسجلة في المنظومة', 404, 'MINISTRY_NOT_FOUND');
    }

    let city = null;
    if (data.cityId) {
      city = await prisma.city.findFirst({
        where: { id: data.cityId, status: 'ACTIVE' }
      });
      if (!city) {
        city = await prisma.city.findFirst({
          where: { name: { equals: data.cityId, mode: 'insensitive' }, status: 'ACTIVE' }
        });
      }
    }
    if (!city) {
      city = await prisma.city.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });
    }

    let requestTypeName = data.requestType || 'طلب عام';
    if (data.requestTypeId) {
      const rt = await prisma.requestType.findUnique({
        where: { id: data.requestTypeId, status: 'ACTIVE' }
      });
      if (rt) requestTypeName = rt.name;
    }

    // Handle uploaded files from upload.any() or upload.fields()
    let rawFilesList: Express.Multer.File[] = [];
    if (Array.isArray(req.files)) {
      rawFilesList = req.files;
    } else if (req.files && typeof req.files === 'object') {
      rawFilesList = Object.values(req.files).flat();
    }
    if (req.file) {
      rawFilesList.push(req.file);
    }

    // Deduplicate files by filename and size to prevent repeated uploads
    const seenFiles = new Set<string>();
    rawFilesList = rawFilesList.filter((f) => {
      const key = `${f.originalname}_${f.size}`;
      if (seenFiles.has(key)) {
        cleanupFile(f.path);
        return false;
      }
      seenFiles.add(key);
      return true;
    });

    // Parse client checksums map if provided: e.g. req.body.fileChecksums = JSON string or object
    let clientChecksumsMap: Record<string, string> = {};
    if (req.body.fileChecksums) {
      try {
        clientChecksumsMap = typeof req.body.fileChecksums === 'string'
          ? JSON.parse(req.body.fileChecksums)
          : req.body.fileChecksums;
      } catch {
        // ignore parse error
      }
    }

    // Strictly validate all uploaded files before proceeding
    for (const f of rawFilesList) {
      const expectedChecksum = clientChecksumsMap[f.originalname];
      const integrity = verifyAndValidateUploadedFile(f, {
        expectedChecksum
      });

      if (!integrity.valid) {
        // Clean up all uploaded files
        rawFilesList.forEach((fileToClean) => cleanupFile(fileToClean.path));
        throw new AppError(integrity.error || `فشل التحقق من سلامة الملف (${f.originalname})`, 400, 'FILE_INTEGRITY_FAILED');
      }
    }

    const identityFiles: Express.Multer.File[] = rawFilesList.filter(
      (f) =>
        f.fieldname === 'identityFiles' ||
        f.fieldname === 'identityFile' ||
        f.fieldname === 'identityDocument' ||
        f.originalname.includes('هوية') ||
        f.originalname.includes('بطاقة') ||
        f.originalname.includes('اقامة')
    );

    const requestFiles: Express.Multer.File[] = rawFilesList.filter(
      (f) => !identityFiles.includes(f)
    );

    const receiveDate = new Date();
    const slaResult = await calculateRequestSLA(ministry.id, PriorityLevel.NORMAL, receiveDate);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create Customer
      let customer = null;
      if (data.nationalId) {
        customer = await tx.customer.findFirst({
          where: {
            OR: [
              { nationalId: data.nationalId },
              { phone: data.phone }
            ]
          }
        });
      } else {
        customer = await tx.customer.findFirst({
          where: { phone: data.phone }
        });
      }

      if (!customer) {
        const customerNumber = await generateNextCustomerNumber(tx);
        customer = await tx.customer.create({
          data: {
            customerNumber,
            name: data.name,
            phone: data.phone,
            altPhone: data.altPhone || null,
            nationalId: data.nationalId || null,
            occupation: data.occupation || null,
            birthYear: data.birthYear || null,
            cityId: city?.id || null,
            address: data.address || '',
            status: CustomerStatus.ACTIVE
          }
        });
      } else {
        // Update customer details if missing
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: data.name,
            altPhone: data.altPhone || customer.altPhone,
            occupation: data.occupation || customer.occupation,
            birthYear: data.birthYear || customer.birthYear,
            cityId: customer.cityId || city?.id,
            address: customer.address || data.address || ''
          }
        });
      }

      // 2. Generate Request Number
      const requestNumber = await generateNextRequestNumber(tx);

      // 3. Create Request
      const newRequest = await tx.request.create({
        data: {
          requestNumber,
          customerId: customer.id,
          ministryId: ministry.id,
          cityId: city?.id || null,
          requestTypeId: data.requestTypeId || null,
          title: data.title?.trim() || 'طلب مراجع عبر البوابة الإلكترونية',
          details: data.details || '',
          requestType: requestTypeName,
          status: 'استلام الطلب',
          priority: PriorityLevel.NORMAL,
          receiveDate,
          expectedCompletionDate: slaResult.expectedCompletionDate,
          deadlineStatus: slaResult.deadlineStatus,
          daysRemainingOrOverdue: slaResult.daysRemainingOrOverdue,
          statusHistory: {
            create: {
              newStatus: 'استلام الطلب',
              employeeName: 'بوابة المراجع الإلكترونية',
              note: 'تم تقديم المعاملة بنجاح من خلال البوابة العامة للمراجعين.'
            }
          }
        }
      });

      // 4. Save Identity Documents (Classified IDENTITY, isPublic: false, isIdentity: true)
      if (identityFiles.length > 0) {
        for (const idFile of identityFiles) {
          const idSize = `${(idFile.size / (1024 * 1024)).toFixed(1)} MB`;
          let idBuffer: Buffer | null = null;
          if (idFile.buffer) {
            idBuffer = idFile.buffer;
          } else if (idFile.path && fs.existsSync(idFile.path)) {
            idBuffer = fs.readFileSync(idFile.path);
          }

          await tx.requestAttachment.create({
            data: {
              requestId: newRequest.id,
              customerId: customer.id,
              name: idFile.originalname,
              filePath: idFile.filename,
              fileSize: idSize,
              fileType: idFile.mimetype.includes('pdf') ? 'PDF' : 'Image',
              mimeType: idFile.mimetype,
              documentType: DocumentType.IDENTITY,
              isPublic: false,
              isIdentity: true,
              fileData: idBuffer || undefined,
              uploadedBy: data.name
            }
          });
        }
      } else if (data.identityDocName) {
        await tx.requestAttachment.create({
          data: {
            requestId: newRequest.id,
            customerId: customer.id,
            name: data.identityDocName,
            filePath: 'demo_national_id.jpg',
            fileSize: '1.2 MB',
            fileType: 'Image',
            mimeType: 'image/jpeg',
            documentType: DocumentType.IDENTITY,
            isPublic: false,
            isIdentity: true,
            uploadedBy: data.name
          }
        });
      }

      // 5. Save Request Documents (Classified REQUEST_DOCUMENT, isPublic: false)
      if (requestFiles.length > 0) {
        for (const rFile of requestFiles) {
          const reqDocSize = `${(rFile.size / (1024 * 1024)).toFixed(1)} MB`;
          let rBuffer: Buffer | null = null;
          if (rFile.buffer) {
            rBuffer = rFile.buffer;
          } else if (rFile.path && fs.existsSync(rFile.path)) {
            rBuffer = fs.readFileSync(rFile.path);
          }

          await tx.requestAttachment.create({
            data: {
              requestId: newRequest.id,
              customerId: customer.id,
              name: rFile.originalname,
              filePath: rFile.filename,
              fileSize: reqDocSize,
              fileType: rFile.mimetype.includes('pdf') ? 'PDF' : 'Image',
              mimeType: rFile.mimetype,
              documentType: DocumentType.REQUEST_DOCUMENT,
              isPublic: false,
              isIdentity: false,
              fileData: rBuffer || undefined,
              uploadedBy: data.name
            }
          });
        }
      } else if (data.requestDocName) {
        await tx.requestAttachment.create({
          data: {
            requestId: newRequest.id,
            customerId: customer.id,
            name: data.requestDocName,
            filePath: 'demo_request_doc.pdf',
            fileSize: '2.1 MB',
            fileType: 'PDF',
            mimeType: 'application/pdf',
            documentType: DocumentType.REQUEST_DOCUMENT,
            isPublic: false,
            isIdentity: false,
            uploadedBy: data.name
          }
        });
      }

      // 6. Create Audit Log
      await tx.auditLog.create({
        data: {
          userName: data.name,
          userRole: 'مراجع عام',
          action: 'تقديم طلب مراجع عام',
          requestNumber,
          entity: 'Request',
          entityId: newRequest.id,
          details: `تقديم طلب جديد إلكترونياً عبر البوابة العامة برقم ${requestNumber} للجهة (${ministry.name})`,
          afterValue: {
            requestNumber,
            customerName: data.name,
            nationalId: data.nationalId,
            ministry: ministry.name,
            city: city?.name || 'غير محدد'
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      return newRequest;
    });

    // Send instant WhatsApp notification to the citizen
    const formattedDate = result.expectedCompletionDate ? result.expectedCompletionDate.toISOString().split('T')[0] : undefined;
    try {
      await whatsappNotificationService.sendRequestReceivedWhatsApp({
        to: data.phone,
        customerName: data.name,
        requestNumber: result.requestNumber,
        ministryName: ministry.name,
        expectedDate: formattedDate,
        requestId: result.id
      });
      console.log(`✅ [PUBLIC REQUEST] WhatsApp confirmation dispatched to ${data.phone} for ${result.requestNumber}`);
    } catch (waErr) {
      console.warn('⚠️ Could not send WhatsApp to citizen:', waErr);
    }

    return sendSuccess(
      res,
      {
        requestNumber: result.requestNumber,
        trackingToken: result.publicTrackingToken,
        publicTrackingToken: result.publicTrackingToken,
        status: result.status,
        expectedCompletionDate: result.expectedCompletionDate.toISOString().split('T')[0],
        trackingUrl: `/track/${result.requestNumber}`
      },
      'تم استلام طلبك بنجاح وتسجيل المعاملة في المنظومة',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const trackPublicRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenOrNumber } = req.params;
    const cleanQuery = (tokenOrNumber || '').trim();

    if (!cleanQuery) {
      throw new AppError('يرجى إدخال رقم المعاملة أو رقم الجوال أو الهوية أو الاسم للاستعلام', 400, 'QUERY_REQUIRED');
    }

    const strippedReqNum = cleanQuery.replace(/^#/, '');
    const numOnly = cleanQuery.replace(/[^0-9]/g, '');

    const matchingRequests = await prisma.request.findMany({
      where: {
        OR: [
          { requestNumber: { equals: strippedReqNum, mode: 'insensitive' } },
          { requestNumber: { equals: `REQ-${strippedReqNum}`, mode: 'insensitive' } },
          { requestNumber: { contains: strippedReqNum, mode: 'insensitive' } },
          { publicTrackingToken: cleanQuery },
          ...(numOnly.length >= 4 ? [
            { customer: { phone: { contains: numOnly } } },
            { customer: { altPhone: { contains: numOnly } } },
            { customer: { nationalId: { contains: numOnly } } }
          ] : []),
          { customer: { name: { contains: cleanQuery, mode: 'insensitive' } } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true, nationalId: true } },
        ministry: { select: { name: true } },
        city: { select: { name: true } },
        attachments: {
          where: { isPublic: true, isIdentity: false }
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            newStatus: true,
            createdAt: true,
            note: true,
            reason: true,
            documentName: true,
            documentPath: true,
            isPublicDoc: true
          }
        },
        finalResponse: {
          select: {
            id: true,
            decision: true,
            summary: true,
            documentNumber: true,
            issuedAt: true,
            attachmentName: true,
            deliveredToCustomer: true,
            deliveryDate: true
          }
        }
      }
    });

    if (!matchingRequests || matchingRequests.length === 0) {
      throw new AppError('لم يتم العثور على أي معاملة مطابقة لبيانات البحث المدخلة', 404, 'REQUEST_NOT_FOUND');
    }

    // If multiple requests match
    if (matchingRequests.length > 1) {
      const summaryList = matchingRequests.map((r) => ({
        requestNumber: r.requestNumber,
        title: r.title,
        status: r.status,
        customerName: r.customer?.name,
        ministryName: r.ministry.name,
        cityName: r.city?.name || 'المدينة المعتمدة',
        receiveDate: r.receiveDate.toISOString().split('T')[0],
        expectedCompletionDate: r.expectedCompletionDate.toISOString().split('T')[0],
        deadlineStatus: r.deadlineStatus
      }));

      return sendSuccess(res, {
        isMultiple: true,
        query: cleanQuery,
        total: summaryList.length,
        customerName: matchingRequests[0].customer?.name,
        requests: summaryList
      });
    }

    // Single request match
    const request = matchingRequests[0];
    const timeline = request.statusHistory.map((h) => {
      const d = new Date(h.createdAt);
      return {
        id: h.id,
        status: h.newStatus,
        date: d.toISOString().split('T')[0],
        time: d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        employeeName: 'فريق خدمة المعاملات',
        note: h.note || `تم تحديث حالة المعاملة إلى: ${h.newStatus}`,
        reason: h.reason || undefined,
        documentName: h.isPublicDoc ? h.documentName : undefined,
        isPublicDoc: h.isPublicDoc,
        completed: true
      };
    });

    // Public visible documents (Sending letter, approval letter, answer document, etc.)
    const stageDocuments = request.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.fileType,
      size: a.fileSize,
      documentType: a.documentType,
      uploadedAt: a.uploadedAt.toISOString().split('T')[0],
      downloadUrl: `/api/public/attachments/${a.id}/download`
    }));

    const publicData = {
      isMultiple: false,
      requestNumber: request.requestNumber,
      title: request.title,
      details: request.details,
      requestType: request.requestType,
      customerName: request.customer?.name,
      ministryName: request.ministry.name,
      cityName: request.city?.name || 'المدينة المعتمدة',
      status: request.status,
      receiveDate: request.receiveDate.toISOString().split('T')[0],
      expectedCompletionDate: request.expectedCompletionDate.toISOString().split('T')[0],
      completedDate: request.completedDate ? request.completedDate.toISOString().split('T')[0] : undefined,
      deadlineStatus: request.deadlineStatus,
      daysRemainingOrOverdue: request.daysRemainingOrOverdue,
      timeline,
      stageDocuments,
      publicDocuments: stageDocuments,
      finalResponse: request.finalResponse
        ? {
            id: request.finalResponse.id,
            decision: request.finalResponse.decision,
            summary: request.finalResponse.summary,
            documentNumber: request.finalResponse.documentNumber || undefined,
            issuedAt: request.finalResponse.issuedAt.toISOString().replace('T', ' ').substring(0, 16),
            attachmentName: request.finalResponse.attachmentName || undefined,
            deliveredToCustomer: request.finalResponse.deliveredToCustomer,
            deliveryDate: request.finalResponse.deliveryDate ? request.finalResponse.deliveryDate.toISOString().split('T')[0] : undefined
          }
        : undefined
    };

    return sendSuccess(res, publicData);
  } catch (error) {
    next(error);
  }
};

export const downloadPublicAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.requestAttachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      throw new AppError('المستند غير موجود', 404, 'ATTACHMENT_NOT_FOUND');
    }

    // STRICT PRIVACY ENFORCEMENT
    if (!attachment.isPublic || attachment.isIdentity || attachment.documentType === DocumentType.IDENTITY) {
      throw new AppError('عذراً، هذا المستند خاص وسري ولا يمكن تحميله عبر البوابة العامة للمراجعين.', 403, 'SENSITIVE_DOCUMENT_FORBIDDEN');
    }

    // 1. Direct from PostgreSQL Binary Storage (100% permanent, never lost)
    if (attachment.fileData && attachment.fileData.length > 0) {
      const buffer = Buffer.from(attachment.fileData);
      const mime = attachment.mimeType || 'application/octet-stream';
      const encodedName = encodeURIComponent(attachment.name);

      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
      return res.send(buffer);
    }

    // 2. Fallback to local uploads directory
    const safeFileName = path.basename(attachment.filePath);
    const fullPath = path.resolve(process.cwd(), env.UPLOAD_DIR, safeFileName);

    if (fs.existsSync(fullPath)) {
      return res.download(fullPath, attachment.name);
    }

    // 3. Fallback to demo uploads
    const fallbackDemoPath = path.resolve(process.cwd(), 'uploads', safeFileName);
    if (fs.existsSync(fallbackDemoPath)) {
      return res.download(fallbackDemoPath, attachment.name);
    }

    throw new AppError(
      `ملف المستند (${attachment.name}) غير متوفر حالياً على الخادم للتحميل.`,
      404,
      'FILE_NOT_FOUND_ON_DISK'
    );
  } catch (error) {
    next(error);
  }
};