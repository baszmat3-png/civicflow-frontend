import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { UserStatus } from '@prisma/client';

const createUserSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().optional().nullable(),
  roleId: z.string().min(1, 'الدور مطلوب'),
  department: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'نشط', 'غير نشط']).default('ACTIVE'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').optional()
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  roleId: z.string().optional(),
  department: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'نشط', 'غير نشط']).optional(),
  password: z.string().min(6).optional(),
  assignedMinistries: z.array(z.string()).optional(),
  isAutoAssignEnabled: z.boolean().optional()
});

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        role: true,
        assignedRequests: {
          where: {
            status: { notIn: ['تم التسليم', 'مرفوض', 'ملغي', 'مكتمل'] }
          },
          select: { id: true }
        }
      }
    });

    const employees = rawUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      roleId: u.roleId,
      role: u.role.name,
      department: u.department || 'إدارة المتابعة',
      assignedRequestsCount: u.assignedRequests.length,
      assignedMinistries: u.assignedMinistries || [],
      isAutoAssignEnabled: u.isAutoAssignEnabled ?? true,
      status: u.status === UserStatus.ACTIVE ? 'نشط' : 'غير نشط',
      lastLogin: u.lastLogin ? u.lastLogin.toISOString().replace('T', ' ').substring(0, 16) : 'لم يسجل دخول بعد',
      avatarUrl: u.avatarUrl || undefined
    }));

    return sendSuccess(res, employees);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        assignedRequests: {
          include: {
            customer: { select: { name: true, phone: true } },
            ministry: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      throw new AppError('الموظف غير موجود', 404, 'USER_NOT_FOUND');
    }

    const formattedRequests = user.assignedRequests.map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      customerId: r.customerId,
      customerName: r.customer.name,
      customerPhone: r.customer.phone,
      title: r.title,
      details: r.details,
      requestType: r.requestType,
      ministryId: r.ministryId,
      ministryName: r.ministry.name,
      status: r.status,
      priority: r.priority === 'URGENT' ? 'عاجل' : r.priority === 'IMPORTANT' ? 'مهم' : 'عادي',
      assignedEmployeeId: user.id,
      assignedEmployeeName: user.name,
      receiveDate: r.receiveDate.toISOString().split('T')[0],
      expectedCompletionDate: r.expectedCompletionDate.toISOString().split('T')[0],
      completedDate: r.completedDate ? r.completedDate.toISOString().split('T')[0] : undefined,
      deadlineStatus: r.deadlineStatus,
      daysRemainingOrOverdue: r.daysRemainingOrOverdue,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));

    const formatted = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      roleId: user.roleId,
      role: user.role.name,
      department: user.department || 'إدارة المتابعة',
      assignedRequestsCount: user.assignedRequests.length,
      status: user.status === UserStatus.ACTIVE ? 'نشط' : 'غير نشط',
      lastLogin: user.lastLogin ? user.lastLogin.toISOString().replace('T', ' ').substring(0, 16) : 'لم يسجل دخول بعد',
      avatarUrl: user.avatarUrl || undefined,
      requests: formattedRequests
    };

    return sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('البريد الإلكتروني مسجل مسبقاً لموظف آخر', 409, 'DUPLICATE_EMAIL');
    }

    let role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) {
      role = await prisma.role.findFirst({
        where: {
          OR: [
            { name: data.roleId },
            ...(data.roleId === 'role-1' ? [{ name: 'مدير النظام' }] : []),
            ...(data.roleId === 'role-2' ? [{ name: 'مشرف' }] : []),
            ...(data.roleId === 'role-3' ? [{ name: 'موظف متابعة' }] : []),
            ...(data.roleId === 'role-4' ? [{ name: 'موظف استقبال' }] : [])
          ]
        }
      });
    }

    if (!role) {
      // Fallback to first available role (usually admin or supervisor)
      role = await prisma.role.findFirst();
    }

    if (!role) {
      throw new AppError('لم يتم العثور على أي دور إداري في النظام', 404, 'ROLE_NOT_FOUND');
    }

    const statusVal =
      data.status === 'غير نشط' || data.status === 'INACTIVE'
        ? UserStatus.INACTIVE
        : UserStatus.ACTIVE;

    const passwordHash = await hashPassword(data.password || 'CivicFlow@2026!');

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        phone: data.phone || null,
        roleId: role.id,
        department: data.department || 'إدارة المتابعة',
        status: statusVal,
        passwordHash
      },
      include: { role: true }
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'تعديل إعدادات',
          entity: 'User',
          entityId: newUser.id,
          details: `إضافة موظف جديد: ${newUser.name} - الدور: ${role.name}`,
          ipAddress: req.ip
        }
      });
    }

    const formatted = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || '',
      roleId: newUser.roleId,
      role: newUser.role.name,
      department: newUser.department || '',
      assignedRequestsCount: 0,
      status: newUser.status === UserStatus.ACTIVE ? 'نشط' : 'غير نشط',
      lastLogin: 'لم يسجل دخول بعد'
    };

    return sendSuccess(res, formatted, 'تم إنشاء حساب الموظف بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('الموظف غير موجود', 404, 'USER_NOT_FOUND');
    }

    let statusVal: UserStatus | undefined;
    if (data.status) {
      statusVal =
        data.status === 'غير نشط' || data.status === 'INACTIVE'
          ? UserStatus.INACTIVE
          : UserStatus.ACTIVE;
    }

    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await hashPassword(data.password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.roleId && { roleId: data.roleId }),
        ...(data.department !== undefined && { department: data.department || null }),
        ...(data.assignedMinistries !== undefined && { assignedMinistries: data.assignedMinistries }),
        ...(data.isAutoAssignEnabled !== undefined && { isAutoAssignEnabled: data.isAutoAssignEnabled }),
        ...(statusVal && { status: statusVal }),
        ...(passwordHash && { passwordHash })
      },
      include: {
        role: true,
        assignedRequests: {
          where: {
            status: { notIn: ['تم التسليم', 'مرفوض', 'ملغي', 'مكتمل'] }
          },
          select: { id: true }
        }
      }
    });

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'تعديل إعدادات',
          entity: 'User',
          entityId: updated.id,
          details: `تحديث بيانات وتوزيع الموظف: ${updated.name}`,
          ipAddress: req.ip
        }
      });
    }

    const formatted = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone || '',
      roleId: updated.roleId,
      role: updated.role.name,
      department: updated.department || '',
      assignedRequestsCount: updated.assignedRequests.length,
      assignedMinistries: updated.assignedMinistries || [],
      isAutoAssignEnabled: updated.isAutoAssignEnabled ?? true,
      status: updated.status === UserStatus.ACTIVE ? 'نشط' : 'غير نشط',
      lastLogin: updated.lastLogin ? updated.lastLogin.toISOString().replace('T', ' ').substring(0, 16) : 'لم يسجل دخول بعد'
    };

    return sendSuccess(res, formatted, 'تم تحديث بيانات الموظف بنجاح');
  } catch (error) {
    next(error);
  }
};

export const saveDistributionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees)) {
      throw new AppError('بيانات التوزيع غير صحيحة', 400, 'INVALID_DISTRIBUTION_DATA');
    }

    for (const emp of employees) {
      if (!emp.id) continue;
      await prisma.user.update({
        where: { id: emp.id },
        data: {
          assignedMinistries: Array.isArray(emp.assignedMinistries) ? emp.assignedMinistries : [],
          isAutoAssignEnabled: typeof emp.isAutoAssignEnabled === 'boolean' ? emp.isAutoAssignEnabled : true
        }
      });
    }

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'تعديل إعدادات',
          entity: 'DistributionSettings',
          details: 'تحديث قواعد توزيع وتخصيص المعاملات والوزارات على الموظفين',
          ipAddress: req.ip
        }
      });
    }

    return sendSuccess(res, { success: true }, 'تم حفظ إعدادات توزيع المعاملات بنجاح');
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { assignedRequests: { select: { id: true } } }
    });

    if (!existing) {
      throw new AppError('الموظف غير موجود', 404, 'USER_NOT_FOUND');
    }

    if (existing.assignedRequests.length > 0) {
      // Deactivate rather than delete
      await prisma.user.update({
        where: { id },
        data: { status: UserStatus.INACTIVE }
      });
      return sendSuccess(res, null, 'تم تعطيل حساب الموظف بدلاً من الحذف لوجود معاملات مسندة إليه');
    }

    await prisma.user.delete({ where: { id } });
    return sendSuccess(res, null, 'تم حذف حساب الموظف بنجاح');
  } catch (error) {
    next(error);
  }
};