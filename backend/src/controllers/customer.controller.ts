import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { CustomerStatus } from '@prisma/client';
import { generateNextCustomerNumber } from '../services/customerNumber.service.js';

const customerSchema = z.object({
  name: z.string().min(1, 'اسم المراجع مطلوب'),
  phone: z.string().min(6, 'رقم الهاتف غير صالح'),
  altPhone: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  occupation: z.string().optional().nullable().or(z.literal('')),
  birthYear: z.string().optional().nullable().or(z.literal('')),
  email: z.string().email('صيغة البريد الإلكتروني غير صحيحة').optional().nullable().or(z.literal('')),
  cityId: z.string().optional().nullable(),
  address: z.string().optional().nullable().or(z.literal('')).default(''),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'BLOCKED', 'نشط', 'محظور']).optional().default('ACTIVE')
});

const updateCustomerSchema = customerSchema.partial();

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      status,
      cityId,
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
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { altPhone: { contains: q } },
        { nationalId: { contains: q } },
        { customerNumber: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { city: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    if (cityId && cityId !== 'all') {
      where.cityId = cityId as string;
    }

    if (status && status !== 'all') {
      where.status = status === 'نشط' || status === 'ACTIVE' ? CustomerStatus.ACTIVE : CustomerStatus.BLOCKED;
    }

    const [total, rawCustomers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc'
        },
        include: {
          city: { select: { id: true, name: true } },
          requests: {
            select: {
              id: true,
              receiveDate: true
            },
            orderBy: {
              receiveDate: 'desc'
            }
          }
        }
      })
    ]);

    const customers = rawCustomers.map((c) => {
      const latestReq = c.requests[0];
      return {
        id: c.id,
        customerNumber: c.customerNumber || `CUST-${c.id.substring(0, 6)}`,
        name: c.name,
        phone: c.phone,
        altPhone: c.altPhone || undefined,
        nationalId: c.nationalId || undefined,
        occupation: c.occupation || undefined,
        birthYear: c.birthYear || undefined,
        email: c.email || undefined,
        cityId: c.cityId || undefined,
        cityName: c.city?.name || undefined,
        address: c.address,
        notes: c.notes || undefined,
        requestsCount: c.requests.length,
        lastRequestDate: latestReq ? latestReq.receiveDate.toISOString().split('T')[0] : c.createdAt.toISOString().split('T')[0],
        createdAt: c.createdAt.toISOString().split('T')[0],
        status: c.status === CustomerStatus.ACTIVE ? 'نشط' : 'محظور'
      };
    });

    return sendSuccess(res, {
      customers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id }, { customerNumber: id }, { nationalId: id }, { phone: id }]
      },
      include: {
        city: { select: { id: true, name: true } },
        requests: {
          include: {
            ministry: { select: { name: true } },
            assignedEmployee: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) {
      throw new AppError('المراجع غير موجود في النظام', 404, 'CUSTOMER_NOT_FOUND');
    }

    const formattedRequests = customer.requests.map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      customerName: customer.name,
      customerPhone: customer.phone,
      title: r.title,
      details: r.details,
      requestType: r.requestType,
      ministryId: r.ministryId,
      ministryName: r.ministry.name,
      status: r.status,
      priority: r.priority === 'URGENT' ? 'عاجل' : r.priority === 'IMPORTANT' ? 'مهم' : 'عادي',
      assignedEmployeeId: r.assignedEmployeeId || '',
      assignedEmployeeName: r.assignedEmployee?.name || 'غير معين',
      receiveDate: r.receiveDate.toISOString().split('T')[0],
      expectedCompletionDate: r.expectedCompletionDate.toISOString().split('T')[0],
      completedDate: r.completedDate ? r.completedDate.toISOString().split('T')[0] : undefined,
      deadlineStatus: r.deadlineStatus,
      daysRemainingOrOverdue: r.daysRemainingOrOverdue,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));

    const formattedCustomer = {
      id: customer.id,
      customerNumber: customer.customerNumber || `CUST-${customer.id.substring(0, 6)}`,
      name: customer.name,
      phone: customer.phone,
      altPhone: customer.altPhone || undefined,
      nationalId: customer.nationalId || undefined,
      occupation: customer.occupation || undefined,
      birthYear: customer.birthYear || undefined,
      email: customer.email || undefined,
      cityId: customer.cityId || undefined,
      cityName: customer.city?.name || undefined,
      address: customer.address,
      notes: customer.notes || undefined,
      requestsCount: customer.requests.length,
      lastRequestDate: customer.requests[0] ? customer.requests[0].receiveDate.toISOString().split('T')[0] : customer.createdAt.toISOString().split('T')[0],
      createdAt: customer.createdAt.toISOString().split('T')[0],
      status: customer.status === CustomerStatus.ACTIVE ? 'نشط' : 'محظور',
      requests: formattedRequests
    };

    return sendSuccess(res, formattedCustomer);
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = customerSchema.parse(req.body);

    const statusVal =
      data.status === 'محظور' || data.status === 'BLOCKED'
        ? CustomerStatus.BLOCKED
        : CustomerStatus.ACTIVE;

    let validCityId: string | null = null;
    if (data.cityId) {
      const city = await prisma.city.findFirst({
        where: {
          OR: [
            { id: data.cityId },
            { name: { equals: data.cityId, mode: 'insensitive' } }
          ],
          status: 'ACTIVE'
        }
      });
      validCityId = city ? city.id : null;
    }

    const newCustomer = await prisma.$transaction(async (tx) => {
      const customerNumber = await generateNextCustomerNumber(tx);

      const cust = await tx.customer.create({
        data: {
          customerNumber,
          name: data.name,
          phone: data.phone,
          altPhone: data.altPhone || null,
          nationalId: data.nationalId || null,
          occupation: data.occupation || null,
          birthYear: data.birthYear || null,
          email: data.email || null,
          cityId: validCityId,
          address: data.address || '',
          notes: data.notes || null,
          status: statusVal
        },
        include: {
          city: { select: { id: true, name: true } }
        }
      });

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'إضافة مراجع',
            entity: 'Customer',
            entityId: cust.id,
            details: `تسجيل مراجع جديد: ${cust.name} (رقم المراجع: ${customerNumber}) - هاتف: ${cust.phone}`,
            afterValue: { customerNumber, name: cust.name, phone: cust.phone, nationalId: cust.nationalId },
            ipAddress: req.ip
          }
        });
      }

      return cust;
    });

    const formatted = {
      id: newCustomer.id,
      customerNumber: newCustomer.customerNumber,
      name: newCustomer.name,
      phone: newCustomer.phone,
      altPhone: newCustomer.altPhone || undefined,
      nationalId: newCustomer.nationalId || undefined,
      occupation: newCustomer.occupation || undefined,
      birthYear: newCustomer.birthYear || undefined,
      email: newCustomer.email || undefined,
      cityId: newCustomer.cityId || undefined,
      cityName: (newCustomer as any).city?.name || undefined,
      address: newCustomer.address,
      notes: newCustomer.notes || undefined,
      requestsCount: 0,
      lastRequestDate: newCustomer.createdAt.toISOString().split('T')[0],
      createdAt: newCustomer.createdAt.toISOString().split('T')[0],
      status: newCustomer.status === CustomerStatus.ACTIVE ? 'نشط' : 'محظور'
    };

    return sendSuccess(res, formatted, 'تم تسجيل المراجع بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateCustomerSchema.parse(req.body);

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('المراجع غير موجود في النظام', 404, 'CUSTOMER_NOT_FOUND');
    }

    let statusVal: CustomerStatus | undefined;
    if (data.status) {
      statusVal =
        data.status === 'محظور' || data.status === 'BLOCKED'
          ? CustomerStatus.BLOCKED
          : CustomerStatus.ACTIVE;
    }

    let validCityId: string | null | undefined = undefined;
    if (data.cityId !== undefined) {
      if (data.cityId) {
        const city = await prisma.city.findFirst({
          where: {
            OR: [
              { id: data.cityId },
              { name: { equals: data.cityId, mode: 'insensitive' } }
            ],
            status: 'ACTIVE'
          }
        });
        validCityId = city ? city.id : null;
      } else {
        validCityId = null;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const custUpdated = await tx.customer.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.phone && { phone: data.phone }),
          ...(data.altPhone !== undefined && { altPhone: data.altPhone || null }),
          ...(data.nationalId !== undefined && { nationalId: data.nationalId || null }),
          ...(data.occupation !== undefined && { occupation: data.occupation || null }),
          ...(data.birthYear !== undefined && { birthYear: data.birthYear || null }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(validCityId !== undefined && { cityId: validCityId }),
          ...(data.address && { address: data.address }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
          ...(statusVal && { status: statusVal })
        },
        include: {
          city: { select: { id: true, name: true } },
          requests: {
            select: { id: true, receiveDate: true },
            orderBy: { receiveDate: 'desc' }
          }
        }
      });

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'تعديل مراجع',
            entity: 'Customer',
            entityId: id,
            details: `تحديث بيانات المراجع: ${custUpdated.name} (${custUpdated.customerNumber})`,
            beforeValue: { name: existing.name, phone: existing.phone, nationalId: existing.nationalId },
            afterValue: { name: custUpdated.name, phone: custUpdated.phone, nationalId: custUpdated.nationalId },
            ipAddress: req.ip
          }
        });
      }

      return custUpdated;
    });

    const formatted = {
      id: updated.id,
      customerNumber: updated.customerNumber || `CUST-${updated.id.substring(0, 6)}`,
      name: updated.name,
      phone: updated.phone,
      altPhone: updated.altPhone || undefined,
      nationalId: updated.nationalId || undefined,
      email: updated.email || undefined,
      cityId: updated.cityId || undefined,
      cityName: updated.city?.name || undefined,
      address: updated.address,
      notes: updated.notes || undefined,
      requestsCount: updated.requests.length,
      lastRequestDate: updated.requests[0] ? updated.requests[0].receiveDate.toISOString().split('T')[0] : updated.createdAt.toISOString().split('T')[0],
      createdAt: updated.createdAt.toISOString().split('T')[0],
      status: updated.status === CustomerStatus.ACTIVE ? 'نشط' : 'محظور'
    };

    return sendSuccess(res, formatted, 'تم تحديث بيانات المراجع بنجاح');
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true' || req.body.force === true;

    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { requests: { select: { id: true } } }
    });

    if (!existing) {
      throw new AppError('المراجع غير موجود في النظام', 404, 'CUSTOMER_NOT_FOUND');
    }

    if (existing.requests.length > 0 && !force) {
      await prisma.customer.update({
        where: { id },
        data: { status: CustomerStatus.BLOCKED }
      });

      return sendSuccess(
        res,
        null,
        'تم تعطيل وحظر حساب المراجع بدلاً من الحذف لوجود معاملات سابقة مرتبطة به'
      );
    }

    await prisma.$transaction(async (tx) => {
      const requestIds = existing.requests.map((r) => r.id);
      if (requestIds.length > 0) {
        await tx.citizenRating.deleteMany({ where: { requestId: { in: requestIds } } }).catch(() => {});
        await tx.requestStatusHistory.deleteMany({ where: { requestId: { in: requestIds } } }).catch(() => {});
        await tx.requestAttachment.deleteMany({ where: { requestId: { in: requestIds } } }).catch(() => {});
        await tx.request.deleteMany({ where: { id: { in: requestIds } } }).catch(() => {});
      }
      await tx.requestAttachment.deleteMany({ where: { customerId: id } }).catch(() => {});
      await tx.customer.delete({ where: { id } });

      if (req.user) {
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            userName: req.user.name,
            userRole: req.user.role,
            action: 'حذف مراجع',
            entity: 'Customer',
            entityId: id,
            details: `حذف المراجع: ${existing.name} (${existing.customerNumber})`,
            beforeValue: { name: existing.name, customerNumber: existing.customerNumber },
            ipAddress: req.ip
          }
        });
      }
    });

    return sendSuccess(res, null, 'تم حذف المراجع بنجاح');
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, force } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('يرجى تحديد مراجع واحد على الأقل للحذف', 400, 'NO_CUSTOMERS_SELECTED');
    }

    let deletedCount = 0;
    let blockedCount = 0;

    for (const id of ids) {
      const existing = await prisma.customer.findUnique({
        where: { id },
        include: { requests: { select: { id: true } } }
      });
      if (!existing) continue;

      if (existing.requests.length > 0 && !force) {
        await prisma.customer.update({
          where: { id },
          data: { status: CustomerStatus.BLOCKED }
        });
        blockedCount++;
      } else {
        await prisma.$transaction(async (tx) => {
          const requestIds = existing.requests.map((r) => r.id);
          if (requestIds.length > 0) {
            await tx.citizenRating.deleteMany({ where: { requestId: { in: requestIds } } }).catch(() => {});
            await tx.requestStatusHistory.deleteMany({ where: { requestId: { in: requestIds } } }).catch(() => {});
            await tx.requestAttachment.deleteMany({ where: { requestId: { in: requestIds } } }).catch(() => {});
            await tx.request.deleteMany({ where: { id: { in: requestIds } } }).catch(() => {});
          }
          await tx.requestAttachment.deleteMany({ where: { customerId: id } }).catch(() => {});
          await tx.customer.delete({ where: { id } });
        });
        deletedCount++;
      }
    }

    return sendSuccess(
      res,
      { deletedCount, blockedCount, total: ids.length },
      `تم حذف ${deletedCount} مراجع بنجاح${blockedCount > 0 ? ` (وتم تعطيل ${blockedCount} مراجع لوجود معاملات سابقة)` : ''}`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkImportCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new AppError('قائمة المراجعين للاستيراد فارغة', 400, 'EMPTY_ROWS');
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = (row.name || row.customerName || '').trim();
        const phone = (row.phone || row.customerPhone || '').trim();
        const address = (row.address || '').trim();
        const nationalId = (row.nationalId || '').trim() || null;

        if (!name || !phone) {
          failCount++;
          errors.push(`صف ${i + 1}: اسم المراجع ورقم الهاتف مطلوبان`);
          continue;
        }

        // Check if customer already exists by phone
        let existing = await prisma.customer.findFirst({
          where: { phone }
        });

        if (existing) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              ...(address && !existing.address ? { address } : {}),
              ...(nationalId && !existing.nationalId ? { nationalId } : {})
            }
          });
          successCount++;
        } else {
          const customerNumber = await generateNextCustomerNumber();
          await prisma.customer.create({
            data: {
              customerNumber,
              name,
              phone,
              address: address || 'العراق',
              nationalId,
              status: CustomerStatus.ACTIVE
            }
          });
          successCount++;
        }
      } catch (err: any) {
        failCount++;
        errors.push(`صف ${i + 1}: ${err.message}`);
      }
    }

    return sendSuccess(res, { successCount, failCount, errors }, `تم استيراد ${successCount} مراجع بنجاح`);
  } catch (error) {
    next(error);
  }
};