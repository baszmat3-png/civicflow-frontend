import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { PriorityLevel } from '@prisma/client';

// -------------------------------------------------------------
// 1. REGISTRY ENTITIES (إدارة الجهات والمؤسسات)
// -------------------------------------------------------------
export const getRegistryEntities = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const entities = await prisma.registryEntity.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });
    return sendSuccess(res, entities);
  } catch (error) {
    next(error);
  }
};

export const createRegistryEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, code, phone, email, address } = req.body;
    if (!name) {
      throw new AppError('يرجى إدخال اسم الجهة', 400, 'NAME_REQUIRED');
    }

    const entity = await prisma.registryEntity.create({
      data: {
        name: name.trim(),
        type: type || 'GOVERNMENT',
        code: code ? code.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        status: 'ACTIVE'
      }
    });

    return sendSuccess(res, entity, 'تمت إضافة الجهة بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const updateRegistryEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, type, code, phone, email, address, status } = req.body;

    const updated = await prisma.registryEntity.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(type ? { type } : {}),
        ...(code !== undefined ? { code: code ? code.trim() : null } : {}),
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        ...(email !== undefined ? { email: email ? email.trim() : null } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
        ...(status ? { status } : {})
      }
    });

    return sendSuccess(res, updated, 'تم تحديث بيانات الجهة بنجاح');
  } catch (error) {
    next(error);
  }
};

export const deleteRegistryEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.registryEntity.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });
    return sendSuccess(res, null, 'تم تعطيل الجهة بنجاح');
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 2. OUTGOING LETTERS (سجل الصادر)
// -------------------------------------------------------------
export const getOutgoingLetters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, recipientEntityId, ministryId, status, fromDate, toDate } = req.query;

    const where: any = {};
    if (recipientEntityId && recipientEntityId !== 'ALL') where.recipientEntityId = String(recipientEntityId);
    if (ministryId && ministryId !== 'ALL') where.ministryId = String(ministryId);
    if (status && status !== 'ALL') where.status = String(status);

    if (fromDate || toDate) {
      where.issueDate = {};
      if (fromDate) where.issueDate.gte = new Date(String(fromDate));
      if (toDate) {
        const t = new Date(String(toDate));
        t.setDate(t.getDate() + 1);
        where.issueDate.lt = t;
      }
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { letterNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { citizenName: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { departmentNumber: { contains: q, mode: 'insensitive' } },
        { archiveFileNumber: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } }
      ];
    }

    const letters = await prisma.outgoingLetter.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      include: {
        recipientEntity: { select: { id: true, name: true } },
        ministry: { select: { id: true, name: true } }
      }
    });

    // Strip raw binary for list performance
    const formatted = letters.map(({ fileData, ...rest }) => ({
      ...rest,
      hasAttachment: !!rest.fileName
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

export const createOutgoingLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      letterNumber,
      issueDate,
      subject,
      recipientEntityId,
      recipientName,
      ministryId,
      citizenName,
      citizenPhone,
      departmentNumber,
      archiveFileNumber,
      summary,
      notes,
      status
    } = req.body;

    if (!letterNumber || !subject) {
      throw new AppError('يرجى إدخال رقم الكتاب وموضوع الكتاب الصادر', 400, 'FIELDS_REQUIRED');
    }

    let fileBuffer: Buffer | null = null;
    let fileName: string | null = null;
    let fileSize: string | null = null;
    let mimeType: string | null = null;

    if (req.file) {
      fileBuffer = req.file.buffer || null;
      fileName = req.file.originalname;
      fileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
      mimeType = req.file.mimetype;
    }

    const letter = await prisma.outgoingLetter.create({
      data: {
        letterNumber: letterNumber.trim(),
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        subject: subject.trim(),
        recipientEntityId: recipientEntityId || null,
        recipientName: recipientName ? recipientName.trim() : null,
        ministryId: ministryId || null,
        citizenName: citizenName ? citizenName.trim() : null,
        citizenPhone: citizenPhone ? citizenPhone.trim() : null,
        departmentNumber: departmentNumber ? departmentNumber.trim() : null,
        archiveFileNumber: archiveFileNumber ? archiveFileNumber.trim() : null,
        summary: summary ? summary.trim() : null,
        notes: notes ? notes.trim() : null,
        status: status || 'SENT',
        fileName,
        fileSize,
        mimeType,
        fileData: fileBuffer || undefined,
        createdById: (req as any).user?.id || null
      },
      include: {
        recipientEntity: { select: { id: true, name: true } },
        ministry: { select: { id: true, name: true } }
      }
    });

    return sendSuccess(res, letter, 'تم تسجيل الكتاب الصادر بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const downloadOutgoingAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const letter = await prisma.outgoingLetter.findUnique({ where: { id } });

    if (!letter || !letter.fileData) {
      throw new AppError('مرفق الكتاب الصادر غير متوفر', 404, 'ATTACHMENT_NOT_FOUND');
    }

    const buffer = Buffer.from(letter.fileData);
    const mime = letter.mimeType || 'application/octet-stream';
    const encodedName = encodeURIComponent(letter.fileName || 'outgoing_document.pdf');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const deleteOutgoingLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.outgoingLetter.delete({ where: { id } });
    return sendSuccess(res, null, 'تم حذف القيد من سجل الصادر بنجاح');
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// 3. INCOMING LETTERS (سجل الوارد)
// -------------------------------------------------------------
export const getIncomingLetters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, senderEntityId, ministryId, status, priority, fromDate, toDate } = req.query;

    const where: any = {};
    if (senderEntityId && senderEntityId !== 'ALL') where.senderEntityId = String(senderEntityId);
    if (ministryId && ministryId !== 'ALL') where.ministryId = String(ministryId);
    if (status && status !== 'ALL') where.status = String(status);
    if (priority && priority !== 'ALL') where.priority = priority as PriorityLevel;

    if (fromDate || toDate) {
      where.receiveDate = {};
      if (fromDate) where.receiveDate.gte = new Date(String(fromDate));
      if (toDate) {
        const t = new Date(String(toDate));
        t.setDate(t.getDate() + 1);
        where.receiveDate.lt = t;
      }
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { incomingNumber: { contains: q, mode: 'insensitive' } },
        { externalLetterNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { citizenName: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { departmentNumber: { contains: q, mode: 'insensitive' } },
        { archiveFileNumber: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } }
      ];
    }

    const letters = await prisma.incomingLetter.findMany({
      where,
      orderBy: { receiveDate: 'desc' },
      include: {
        senderEntity: { select: { id: true, name: true } },
        ministry: { select: { id: true, name: true } }
      }
    });

    const formatted = letters.map(({ fileData, ...rest }) => ({
      ...rest,
      hasAttachment: !!rest.fileName
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

export const createIncomingLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      incomingNumber,
      externalLetterNumber,
      departmentNumber,
      archiveFileNumber,
      receiveDate,
      subject,
      senderEntityId,
      senderName,
      ministryId,
      citizenName,
      citizenPhone,
      summary,
      notes,
      actionRequired,
      priority,
      status
    } = req.body;

    if (!incomingNumber || !subject) {
      throw new AppError('يرجى إدخال رقم الوارد وعنوان الكتاب الوارد', 400, 'FIELDS_REQUIRED');
    }

    let fileBuffer: Buffer | null = null;
    let fileName: string | null = null;
    let fileSize: string | null = null;
    let mimeType: string | null = null;

    if (req.file) {
      fileBuffer = req.file.buffer || null;
      fileName = req.file.originalname;
      fileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
      mimeType = req.file.mimetype;
    }

    const letter = await prisma.incomingLetter.create({
      data: {
        incomingNumber: incomingNumber.trim(),
        externalLetterNumber: externalLetterNumber ? externalLetterNumber.trim() : null,
        departmentNumber: departmentNumber ? departmentNumber.trim() : null,
        archiveFileNumber: archiveFileNumber ? archiveFileNumber.trim() : null,
        receiveDate: receiveDate ? new Date(receiveDate) : new Date(),
        subject: subject.trim(),
        senderEntityId: senderEntityId || null,
        senderName: senderName ? senderName.trim() : null,
        ministryId: ministryId || null,
        citizenName: citizenName ? citizenName.trim() : null,
        citizenPhone: citizenPhone ? citizenPhone.trim() : null,
        summary: summary ? summary.trim() : null,
        notes: notes ? notes.trim() : null,
        actionRequired: actionRequired ? actionRequired.trim() : null,
        priority: (priority as PriorityLevel) || PriorityLevel.NORMAL,
        status: status || 'RECEIVED',
        fileName,
        fileSize,
        mimeType,
        fileData: fileBuffer || undefined,
        createdById: (req as any).user?.id || null
      },
      include: {
        senderEntity: { select: { id: true, name: true } },
        ministry: { select: { id: true, name: true } }
      }
    });

    return sendSuccess(res, letter, 'تم تسجيل الكتاب الوارد بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const downloadIncomingAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const letter = await prisma.incomingLetter.findUnique({ where: { id } });

    if (!letter || !letter.fileData) {
      throw new AppError('مرفق الكتاب الوارد غير متوفر', 404, 'ATTACHMENT_NOT_FOUND');
    }

    const buffer = Buffer.from(letter.fileData);
    const mime = letter.mimeType || 'application/octet-stream';
    const encodedName = encodeURIComponent(letter.fileName || 'incoming_document.pdf');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const deleteIncomingLetter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.incomingLetter.delete({ where: { id } });
    return sendSuccess(res, null, 'تم حذف القيد من سجل الوارد بنجاح');
  } catch (error) {
    next(error);
  }
};
