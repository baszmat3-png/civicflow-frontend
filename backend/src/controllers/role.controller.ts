import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const MODULES_LIST = [
  'الطلبات',
  'المراجعون',
  'الوزارات',
  'الموظفون',
  'إدارة المواعيد',
  'الصادر والوارد',
  'التقارير',
  'الإشعارات',
  'الإعدادات',
  'سجل العمليات'
];

export const getModulePrefix = (mod: string): string => {
  if (mod === 'المراجعون') return 'customers';
  if (mod === 'الوزارات') return 'ministries';
  if (mod === 'الموظفون') return 'users';
  if (mod === 'إدارة المواعيد' || mod === 'المواعيد والمقابلات' || mod === 'المواعيد') return 'appointments';
  if (mod === 'الصادر والوارد' || mod === 'السجل الإداري' || mod === 'الصادر والوارد (السجل الإداري)') return 'registry';
  if (mod === 'التقارير') return 'reports';
  if (mod === 'الإشعارات') return 'notifications';
  if (mod === 'الإعدادات') return 'settings';
  if (mod === 'سجل العمليات') return 'audit_logs';
  return 'requests';
};

export const ALL_SYSTEM_PERMISSIONS = [
  // الطلبات
  { key: 'requests.view', module: 'الطلبات', description: 'عرض قائمة وتفاصيل الطلبات والمعاملات' },
  { key: 'requests.create', module: 'الطلبات', description: 'تسجيل معاملة جديدة في النظام' },
  { key: 'requests.update', module: 'الطلبات', description: 'تعديل بيانات المعاملات' },
  { key: 'requests.delete', module: 'الطلبات', description: 'حذف المعاملات من النظام' },
  { key: 'requests.change_status', module: 'الطلبات', description: 'تغيير وتحديث حالة المعاملة' },
  { key: 'requests.attachments', module: 'الطلبات', description: 'إرفاق وتحميل المستندات والملفات' },
  { key: 'requests.final_response', module: 'الطلبات', description: 'اعتماد وتسجيل الإجابة والقرار النهائي' },
  { key: 'requests.manage', module: 'الطلبات', description: 'إدارة كاملة لمعاملات النظام' },

  // المراجعون
  { key: 'customers.view', module: 'المراجعون', description: 'عرض قائمة وسجلات المراجعين' },
  { key: 'customers.create', module: 'المراجعون', description: 'إضافة مراجع جديد' },
  { key: 'customers.update', module: 'المراجعون', description: 'تعديل بيانات مراجع' },
  { key: 'customers.delete', module: 'المراجعون', description: 'حذف مراجع' },
  { key: 'customers.manage', module: 'المراجعون', description: 'إدارة كاملة لسجلات المراجعين' },

  // الوزارات
  { key: 'ministries.view', module: 'الوزارات', description: 'عرض الوزارات والجهات الحكومية' },
  { key: 'ministries.create', module: 'الوزارات', description: 'إضافة وزارة أو جهة جديدة' },
  { key: 'ministries.update', module: 'الوزارات', description: 'تعديل بيانات ومدد إنجاز الوزارات' },
  { key: 'ministries.delete', module: 'الوزارات', description: 'حذف جهة أو وزارة' },
  { key: 'ministries.manage', module: 'الوزارات', description: 'إدارة كاملة لجهات الربط والوزارات' },

  // الموظفون
  { key: 'users.view', module: 'الموظفون', description: 'عرض قائمة الموظفين والمستخدمين' },
  { key: 'users.create', module: 'الموظفون', description: 'إضافة موظف جديد' },
  { key: 'users.update', module: 'الموظفون', description: 'تعديل بيانات وصلاحيات الموظف' },
  { key: 'users.delete', module: 'الموظفون', description: 'تعطيل أو حذف حساب موظف' },
  { key: 'users.manage', module: 'الموظفون', description: 'إدارة كاملة لحسابات الموظفين' },

  // إدارة المواعيد
  { key: 'appointments.view', module: 'إدارة المواعيد', description: 'عرض جدول وقائمة المواعيد والمقابلات' },
  { key: 'appointments.create', module: 'إدارة المواعيد', description: 'حجز موعد أو مقابلة جديدة' },
  { key: 'appointments.update', module: 'إدارة المواعيد', description: 'تعديل أو قبول/رفض المواعيد' },
  { key: 'appointments.delete', module: 'إدارة المواعيد', description: 'إلغاء أو حذف المواعيد' },
  { key: 'appointments.manage', module: 'إدارة المواعيد', description: 'إدارة شاملة للمواعيد وأوقات المقابلات' },

  // الصادر والوارد
  { key: 'registry.view', module: 'الصادر والوارد', description: 'عرض سجل الكتب الصادرة والواردة' },
  { key: 'registry.create', module: 'الصادر والوارد', description: 'تسجيل كتاب صادر أو وارد جديد' },
  { key: 'registry.update', module: 'الصادر والوارد', description: 'تعديل بيانات وأرشفة الكتب' },
  { key: 'registry.delete', module: 'الصادر والوارد', description: 'حذف الكتب من السجل' },
  { key: 'registry.manage', module: 'الصادر والوارد', description: 'إدارة كاملة للسجل الإداري' },

  // التقارير
  { key: 'reports.view', module: 'التقارير', description: 'عرض لوحة مؤشرات الأداء والتقارير' },
  { key: 'reports.create', module: 'التقارير', description: 'إنشاء وحفظ تقارير مخصصة' },
  { key: 'reports.update', module: 'التقارير', description: 'تعديل نماذج ومؤشرات التقارير' },
  { key: 'reports.delete', module: 'التقارير', description: 'حذف تقارير مخصصة' },
  { key: 'reports.export', module: 'التقارير', description: 'تصدير التقارير إلى Excel' },
  { key: 'reports.export_pdf', module: 'التقارير', description: 'تصدير التقارير إلى PDF' },
  { key: 'reports.manage', module: 'التقارير', description: 'إدارة كاملة للتقارير والإحصاءات' },

  // الإشعارات
  { key: 'notifications.view', module: 'الإشعارات', description: 'استقبال وعرض إشعارات النظام' },
  { key: 'notifications.create', module: 'الإشعارات', description: 'إرسال إشعار يدوي' },
  { key: 'notifications.update', module: 'الإشعارات', description: 'تعديل إعدادات التنبيهات' },
  { key: 'notifications.delete', module: 'الإشعارات', description: 'حذف الإشعارات' },
  { key: 'notifications.manage', module: 'الإشعارات', description: 'إدارة كاملة لنظام الإشعارات' },

  // الإعدادات
  { key: 'settings.view', module: 'الإعدادات', description: 'عرض إعدادات النظام' },
  { key: 'settings.create', module: 'الإعدادات', description: 'إضافة خيارات وضبط جديد' },
  { key: 'settings.update', module: 'الإعدادات', description: 'تعديل إعدادات النظام' },
  { key: 'settings.delete', module: 'الإعدادات', description: 'حذف أو استعادة الإعدادات الافتراضية' },
  { key: 'settings.manage', module: 'الإعدادات', description: 'إدارة شاملة لإعدادات النظام' },

  // سجل العمليات
  { key: 'audit_logs.view', module: 'سجل العمليات', description: 'عرض سجل تدقيق العمليات' },
  { key: 'audit_logs.create', module: 'سجل العمليات', description: 'تسجيل حدث يدوي في السجل' },
  { key: 'audit_logs.update', module: 'سجل العمليات', description: 'أرشفة وتصنيف السجلات' },
  { key: 'audit_logs.delete', module: 'سجل العمليات', description: 'حذف أو تصفية السجلات المؤرشفة' },
  { key: 'audit_logs.export_pdf', module: 'سجل العمليات', description: 'تصدير سجل العمليات إلى PDF' },
  { key: 'audit_logs.manage', module: 'سجل العمليات', description: 'إدارة كاملة لسجل العمليات' },

  // المدن
  { key: 'cities.view', module: 'المدن', description: 'عرض قائمة المدن والمناطق' },
  { key: 'cities.create', module: 'المدن', description: 'إضافة مدينة جديدة' },
  { key: 'cities.update', module: 'المدن', description: 'تعديل وتفعيل المدن' },
  { key: 'cities.delete', module: 'المدن', description: 'حذف مدينة' },

  // أنواع الطلبات
  { key: 'request_types.view', module: 'أنواع الطلبات', description: 'عرض أنواع وتصنيفات المعاملات' },
  { key: 'request_types.create', module: 'أنواع الطلبات', description: 'إضافة نوع معاملة جديد' },
  { key: 'request_types.update', module: 'أنواع الطلبات', description: 'تعديل نوع المعاملة' },
  { key: 'request_types.delete', module: 'أنواع الطلبات', description: 'حذف نوع معاملة' },

  // واتساب
  { key: 'whatsapp.view', module: 'واتساب', description: 'عرض قوالب وسجلات رسائل WhatsApp' },
  { key: 'whatsapp.manage', module: 'واتساب', description: 'إدارة إعدادات وتكامل WhatsApp' },
  { key: 'whatsapp.send', module: 'واتساب', description: 'إرسال إشعارات عبر WhatsApp' }
];

export async function ensureSystemPermissions() {
  try {
    for (const perm of ALL_SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: perm.key },
        update: { module: perm.module, description: perm.description },
        create: perm
      });
    }
    console.log('✅ Ensured all system RBAC permissions are registered in the database.');
  } catch (err) {
    console.warn('⚠️ Permissions sync notice:', err);
  }
}

export const formatRoleObject = (role: any) => {
  const permKeys = role.rolePermissions?.map((rp: any) => rp.permission?.key) || [];

  const matrix = MODULES_LIST.map((mod) => {
    const prefix = getModulePrefix(mod);

    return {
      module: mod,
      view: permKeys.includes(`${prefix}.view`) || permKeys.includes(`${prefix}.manage`),
      create: permKeys.includes(`${prefix}.create`) || permKeys.includes(`${prefix}.manage`),
      edit: permKeys.includes(`${prefix}.update`) || permKeys.includes(`${prefix}.manage`),
      delete: permKeys.includes(`${prefix}.delete`) || permKeys.includes(`${prefix}.manage`)
    };
  });

  const extraPermissions = {
    changeStatus: permKeys.includes('requests.change_status') || permKeys.includes('requests.manage'),
    uploadAttachments: permKeys.includes('requests.attachments') || permKeys.includes('requests.manage'),
    exportExcel: permKeys.includes('reports.export') || permKeys.includes('reports.manage'),
    sendNotifications: permKeys.includes('notifications.view') || permKeys.includes('whatsapp.send') || permKeys.includes('notifications.manage'),
    manageWhatsapp: permKeys.includes('whatsapp.manage'),
    viewAuditLogs: permKeys.includes('audit_logs.view') || permKeys.includes('audit_logs.manage')
  };

  return {
    id: role.id,
    name: role.name,
    description: role.description || '',
    usersCount: role.users?.length || 0,
    permissions: matrix,
    extraPermissions
  };
};

export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        users: { select: { id: true } },
        rolePermissions: {
          include: { permission: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const formattedRoles = roles.map(formatRoleObject);
    return sendSuccess(res, formattedRoles);
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: { select: { id: true } },
        rolePermissions: {
          include: { permission: true }
        }
      }
    });

    if (!role) {
      throw new AppError('الدور غير موجود', 404, 'ROLE_NOT_FOUND');
    }

    return sendSuccess(res, formatRoleObject(role));
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, extraPermissions } = req.body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new AppError('الدور غير موجود', 404, 'ROLE_NOT_FOUND');
    }

    // Collect all requested permission keys
    const requestedKeys: string[] = [];

    if (Array.isArray(permissions)) {
      permissions.forEach((p: any) => {
        const prefix = getModulePrefix(p.module);

        if (p.view) requestedKeys.push(`${prefix}.view`);
        if (p.create) requestedKeys.push(`${prefix}.create`);
        if (p.edit) requestedKeys.push(`${prefix}.update`);
        if (p.delete) requestedKeys.push(`${prefix}.delete`);
      });
    }

    if (extraPermissions) {
      if (extraPermissions.changeStatus) requestedKeys.push('requests.change_status');
      if (extraPermissions.uploadAttachments) requestedKeys.push('requests.attachments');
      if (extraPermissions.exportExcel) requestedKeys.push('reports.export');
      if (extraPermissions.sendNotifications) requestedKeys.push('notifications.view', 'whatsapp.send');
      if (extraPermissions.manageWhatsapp) requestedKeys.push('whatsapp.manage', 'whatsapp.view');
      if (extraPermissions.viewAuditLogs) requestedKeys.push('audit_logs.view');
    }

    // Ensure all requested permissions exist in the DB
    for (const key of requestedKeys) {
      const existing = await prisma.permission.findUnique({ where: { key } });
      if (!existing) {
        const foundDefinition = ALL_SYSTEM_PERMISSIONS.find((p) => p.key === key);
        await prisma.permission.create({
          data: {
            key,
            module: foundDefinition?.module || 'عام',
            description: foundDefinition?.description || key
          }
        });
      }
    }

    const dbPermissions = await prisma.permission.findMany({
      where: { key: { in: requestedKeys } }
    });

    await prisma.$transaction(async (tx) => {
      // Clear existing permissions
      await tx.rolePermission.deleteMany({ where: { roleId: id } });

      // Assign new permissions
      if (dbPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dbPermissions.map((p) => ({
            roleId: id,
            permissionId: p.id
          }))
        });
      }

      // Update role attributes (name and/or description)
      const updateData: any = {};
      if (name !== undefined && name.trim()) {
        updateData.name = name.trim();
      }
      if (description !== undefined) {
        updateData.description = description ? description.trim() : '';
      }

      if (Object.keys(updateData).length > 0) {
        await tx.role.update({
          where: { id },
          data: updateData
        });
      }
    });

    try {
      if (req.user) {
        const userExists = await prisma.user.findUnique({ where: { id: req.user.id } });
        await prisma.auditLog.create({
          data: {
            userId: userExists ? req.user.id : null,
            userName: req.user.name || 'مستخدم',
            userRole: req.user.role || 'مدير النظام',
            action: 'تعديل إعدادات',
            entity: 'Role',
            entityId: id,
            details: `تحديث مصفوفة صلاحيات الدور: ${name || role.name}`,
            ipAddress: req.ip || req.socket.remoteAddress
          }
        });
      }
    } catch (auditErr) {
      console.warn('⚠️ Audit log notice:', auditErr);
    }

    // Fetch updated role with fresh permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: {
        users: { select: { id: true } },
        rolePermissions: {
          include: { permission: true }
        }
      }
    });

    return sendSuccess(res, formatRoleObject(updatedRole), 'تم تحديث صلاحيات الدور بنجاح');
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissions, extraPermissions } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('اسم الدور مطلوب', 400, 'ROLE_NAME_REQUIRED');
    }

    const trimmedName = name.trim();

    const existing = await prisma.role.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } }
    });

    if (existing) {
      throw new AppError(`الدور (${trimmedName}) موجود بالفعل`, 400, 'ROLE_ALREADY_EXISTS');
    }

    // Collect requested permissions
    const requestedKeys: string[] = [];

    if (Array.isArray(permissions)) {
      permissions.forEach((p: any) => {
        const prefix = getModulePrefix(p.module);

        if (p.view) requestedKeys.push(`${prefix}.view`);
        if (p.create) requestedKeys.push(`${prefix}.create`);
        if (p.edit) requestedKeys.push(`${prefix}.update`);
        if (p.delete) requestedKeys.push(`${prefix}.delete`);
      });
    }

    if (extraPermissions) {
      if (extraPermissions.changeStatus) requestedKeys.push('requests.change_status');
      if (extraPermissions.uploadAttachments) requestedKeys.push('requests.attachments');
      if (extraPermissions.exportExcel) requestedKeys.push('reports.export');
      if (extraPermissions.sendNotifications) requestedKeys.push('notifications.view', 'whatsapp.send');
      if (extraPermissions.manageWhatsapp) requestedKeys.push('whatsapp.manage', 'whatsapp.view');
      if (extraPermissions.viewAuditLogs) requestedKeys.push('audit_logs.view');
    }

    // Ensure all requested permissions exist in the DB
    for (const key of requestedKeys) {
      const existing = await prisma.permission.findUnique({ where: { key } });
      if (!existing) {
        const foundDefinition = ALL_SYSTEM_PERMISSIONS.find((p) => p.key === key);
        await prisma.permission.create({
          data: {
            key,
            module: foundDefinition?.module || 'عام',
            description: foundDefinition?.description || key
          }
        });
      }
    }

    const dbPermissions = await prisma.permission.findMany({
      where: { key: { in: requestedKeys } }
    });

    const newRole = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: trimmedName,
          description: description?.trim() || ''
        }
      });

      if (dbPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dbPermissions.map((p) => ({
            roleId: created.id,
            permissionId: p.id
          }))
        });
      }

      return created;
    });

    try {
      if (req.user) {
        const userExists = await prisma.user.findUnique({ where: { id: req.user.id } });
        await prisma.auditLog.create({
          data: {
            userId: userExists ? req.user.id : null,
            userName: req.user.name || 'مستخدم',
            userRole: req.user.role || 'مدير النظام',
            action: 'إضافة جديد',
            entity: 'Role',
            entityId: newRole.id,
            details: `إنشاء دور جديد: ${trimmedName}`,
            ipAddress: req.ip || req.socket.remoteAddress
          }
        });
      }
    } catch (auditErr) {
      console.warn('⚠️ Audit log notice:', auditErr);
    }

    // Fetch full role with relations
    const fullCreated = await prisma.role.findUnique({
      where: { id: newRole.id },
      include: {
        users: { select: { id: true } },
        rolePermissions: {
          include: { permission: true }
        }
      }
    });

    return sendSuccess(res, formatRoleObject(fullCreated), 'تم إنشاء الدور بنجاح', 201);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: { users: { select: { id: true } } }
    });

    if (!role) {
      throw new AppError('الدور غير موجود', 404, 'ROLE_NOT_FOUND');
    }

    if (role.users.length > 0) {
      throw new AppError(
        `لا يمكن حذف هذا الدور لوجود (${role.users.length}) مستخدمين معينين به حالياً`,
        400,
        'ROLE_IN_USE'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });

    try {
      if (req.user) {
        const userExists = await prisma.user.findUnique({ where: { id: req.user.id } });
        await prisma.auditLog.create({
          data: {
            userId: userExists ? req.user.id : null,
            userName: req.user.name || 'مستخدم',
            userRole: req.user.role || 'مدير النظام',
            action: 'حذف',
            entity: 'Role',
            entityId: id,
            details: `حذف الدور: ${role.name}`,
            ipAddress: req.ip || req.socket.remoteAddress
          }
        });
      }
    } catch (auditErr) {
      console.warn('⚠️ Audit log notice:', auditErr);
    }

    return sendSuccess(res, null, 'تم حذف الدور بنجاح');
  } catch (error) {
    next(error);
  }
};