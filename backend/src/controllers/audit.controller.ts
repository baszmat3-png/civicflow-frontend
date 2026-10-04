import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { generateAuditLogsPdf } from '../services/pdf.service.js';
import { formatDatePlus3, formatTimePlus3 } from '../utils/dateTime.js';

const buildAuditWhere = (params: any) => {
  const { user, action, date, fromDate, toDate, requestNumber, search } = params;
  const where: any = {};

  if (user && user !== 'all') {
    where.userName = user as string;
  }

  if (action && action !== 'all') {
    where.action = action as string;
  }

  if (requestNumber) {
    where.requestNumber = { contains: (requestNumber as string).trim(), mode: 'insensitive' };
  }

  if (date) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  } else {
    if (fromDate) {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(fromDate as string) };
    }
    if (toDate) {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(toDate as string) };
    }
  }

  if (search) {
    const q = (search as string).trim();
    where.OR = [
      { details: { contains: q, mode: 'insensitive' } },
      { requestNumber: { contains: q, mode: 'insensitive' } },
      { userName: { contains: q, mode: 'insensitive' } },
      { action: { contains: q, mode: 'insensitive' } }
    ];
  }

  return where;
};

const formatAuditItem = (l: any) => {
  const d = new Date(l.createdAt);
  return {
    id: l.id,
    userId: l.userId || 'system',
    userName: l.userName,
    userRole: l.userRole,
    action: l.action,
    requestNumber: l.requestNumber || undefined,
    entity: l.entity || undefined,
    entityId: l.entityId || undefined,
    details: l.details,
    beforeValue: l.beforeValue || undefined,
    afterValue: l.afterValue || undefined,
    documentName: l.documentName || undefined,
    ipAddress: l.ipAddress || '127.0.0.1',
    userAgent: l.userAgent || undefined,
    date: formatDatePlus3(d),
    time: formatTimePlus3(d),
    createdAt: l.createdAt.toISOString()
  };
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '100' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit as string, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const where = buildAuditWhere(req.query);

    const [total, rawLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const auditLogs = rawLogs.map(formatAuditItem);

    return sendSuccess(res, {
      auditLogs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id }
    });

    if (!log) {
      throw new AppError('سجل العملية غير موجود', 404, 'AUDIT_LOG_NOT_FOUND');
    }

    return sendSuccess(res, formatAuditItem(log));
  } catch (error) {
    next(error);
  }
};

export const exportAuditLogsPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = { ...req.query, ...req.body };
    const where = buildAuditWhere(params);

    const rawLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    const formattedLogs = rawLogs.map(formatAuditItem);

    const filtersSummary: Record<string, string> = {
      'المستخدم': params.user ? String(params.user) : '',
      'نوع العملية': params.action ? String(params.action) : '',
      'رقم المعاملة': params.requestNumber ? String(params.requestNumber) : '',
      'التاريخ': params.date ? String(params.date) : ''
    };

    await generateAuditLogsPdf(formattedLogs, filtersSummary, res, 'سجل_العمليات_الرقابية_CivicFlow.pdf');
  } catch (error) {
    next(error);
  }
};