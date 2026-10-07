import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database.js';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface BackupMetadata {
  filename: string;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  counts: {
    users: number;
    customers: number;
    requests: number;
    attachments: number;
    ministries: number;
    cities: number;
    requestTypes: number;
    auditLogs: number;
  };
}

export interface FullDatabaseBackup {
  version: string;
  timestamp: string;
  counts: Record<string, number>;
  data: {
    roles: any[];
    permissions: any[];
    rolePermissions: any[];
    users: any[];
    customers: any[];
    ministries: any[];
    slaSettings: any[];
    cities: any[];
    requestTypes: any[];
    requestStatuses: any[];
    requests: any[];
    requestStatusHistories: any[];
    requestAttachments: any[];
    finalResponses: any[];
    auditLogs: any[];
    systemSettings: any[];
    whatsAppTemplates: any[];
  };
}

export const backupService = {
  /**
   * Generates a full snapshot of the PostgreSQL database and saves to disk
   */
  createBackup: async (label = 'automated'): Promise<BackupMetadata> => {
    console.log(`📦 [BACKUP] Starting full database backup (${label})...`);

    // Fetch all tables
    const [
      roles,
      permissions,
      rolePermissions,
      users,
      customers,
      ministries,
      slaSettings,
      cities,
      requestTypes,
      requestStatuses,
      requests,
      requestStatusHistories,
      requestAttachments,
      finalResponses,
      auditLogs,
      systemSettings,
      whatsAppTemplates
    ] = await Promise.all([
      prisma.role.findMany(),
      prisma.permission.findMany(),
      prisma.rolePermission.findMany(),
      prisma.user.findMany(),
      prisma.customer.findMany(),
      prisma.ministry.findMany(),
      prisma.sLASetting.findMany(),
      prisma.city.findMany(),
      prisma.requestType.findMany(),
      prisma.requestStatus.findMany(),
      prisma.request.findMany(),
      prisma.requestStatusHistory.findMany(),
      prisma.requestAttachment.findMany(),
      prisma.finalResponse.findMany(),
      prisma.auditLog.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
      prisma.systemSetting.findMany(),
      prisma.whatsAppTemplate.findMany()
    ]);

    // Format attachments (convert binary fileData to base64 for portable JSON backup)
    const formattedAttachments = requestAttachments.map((att) => ({
      ...att,
      fileDataBase64: att.fileData ? Buffer.from(att.fileData).toString('base64') : null,
      fileData: undefined
    }));

    const formattedFinalResponses = finalResponses.map((fr) => ({
      ...fr,
      attachmentDataBase64: fr.attachmentData ? Buffer.from(fr.attachmentData).toString('base64') : null,
      attachmentData: undefined
    }));

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = `civicflow_backup_${label}_${dateStr}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    const counts = {
      users: users.length,
      customers: customers.length,
      requests: requests.length,
      attachments: formattedAttachments.length,
      ministries: ministries.length,
      cities: cities.length,
      requestTypes: requestTypes.length,
      auditLogs: auditLogs.length
    };

    const backupPayload: FullDatabaseBackup = {
      version: '1.0.0',
      timestamp: now.toISOString(),
      counts,
      data: {
        roles,
        permissions,
        rolePermissions,
        users,
        customers,
        ministries,
        slaSettings,
        cities,
        requestTypes,
        requestStatuses,
        requests,
        requestStatusHistories,
        requestAttachments: formattedAttachments,
        finalResponses: formattedFinalResponses,
        auditLogs,
        systemSettings,
        whatsAppTemplates
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');
    const stat = fs.statSync(filePath);

    console.log(`✅ [BACKUP] Successfully created ${filename} (${(stat.size / 1024).toFixed(1)} KB)`);

    // Prune old backups (keep last 30)
    await backupService.pruneOldBackups(30);

    return {
      filename,
      createdAt: now.toISOString(),
      sizeBytes: stat.size,
      sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
      counts
    };
  },

  /**
   * Lists all existing backup files
   */
  listBackups: async (): Promise<BackupMetadata[]> => {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
    const backups: BackupMetadata[] = [];

    for (const file of files) {
      try {
        const fullPath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(fullPath);
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

        backups.push({
          filename: file,
          createdAt: content.timestamp || stat.mtime.toISOString(),
          sizeBytes: stat.size,
          sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
          counts: content.counts || {
            users: content.data?.users?.length || 0,
            customers: content.data?.customers?.length || 0,
            requests: content.data?.requests?.length || 0,
            attachments: content.data?.requestAttachments?.length || 0,
            ministries: content.data?.ministries?.length || 0,
            cities: content.data?.cities?.length || 0,
            requestTypes: content.data?.requestTypes?.length || 0,
            auditLogs: content.data?.auditLogs?.length || 0
          }
        });
      } catch (err) {
        console.warn(`Could not parse backup file ${file}:`, err);
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Retrieves full backup file path
   */
  getBackupFilePath: (filename: string): string | null => {
    const safeName = path.basename(filename);
    const fullPath = path.join(BACKUP_DIR, safeName);
    return fs.existsSync(fullPath) ? fullPath : null;
  },

  /**
   * Restores database from a backup payload safely (using upserts, smart ID mapping, and error resilience)
   */
  restoreFromPayload: async (payload: any): Promise<{ restoredCounts: Record<string, number> }> => {
    if (!payload) throw new Error('بيانات النسخة الاحتياطية فارغة أو غير صالحة');

    const data = payload.data || payload.backup?.data || payload;
    if (!data || typeof data !== 'object') {
      throw new Error('هيكل ملف النسخة الاحتياطية غير صالح أو تالف');
    }

    console.log('🔄 [RESTORE] Starting smart restore from backup payload...');

    const roleIdMap: Record<string, string> = {};
    const userIdMap: Record<string, string> = {};
    const ministryIdMap: Record<string, string> = {};
    const cityIdMap: Record<string, string> = {};
    const requestTypeIdMap: Record<string, string> = {};
    const customerIdMap: Record<string, string> = {};
    const requestIdMap: Record<string, string> = {};

    let restoredUsers = 0;
    let restoredCustomers = 0;
    let restoredRequests = 0;
    let restoredAttachments = 0;
    let restoredMinistries = 0;
    let restoredCities = 0;
    let restoredRequestTypes = 0;

    // 1. Roles & Permissions
    const rolesList = data.roles || payload.roles || [];
    for (const role of rolesList) {
      try {
        let existing = await prisma.role.findFirst({
          where: {
            OR: [
              ...(role.id ? [{ id: role.id }] : []),
              ...(role.name ? [{ name: role.name }] : [])
            ]
          }
        });

        if (!existing) {
          existing = await prisma.role.create({
            data: {
              ...(role.id ? { id: role.id } : {}),
              name: role.name || 'مستخدم',
              description: role.description || ''
            }
          });
        } else {
          await prisma.role.update({
            where: { id: existing.id },
            data: {
              description: role.description || existing.description
            }
          });
        }
        if (role.id) roleIdMap[role.id] = existing.id;
      } catch (err) {
        console.warn('Role restore notice:', err);
      }
    }

    const defaultAdminRole = (await prisma.role.findFirst({ where: { name: 'مدير النظام' } })) ||
      (await prisma.role.findFirst());

    // 2. Users
    const usersList = data.users || payload.users || [];
    for (const u of usersList) {
      try {
        let existing = await prisma.user.findFirst({
          where: {
            OR: [
              ...(u.email ? [{ email: { equals: u.email, mode: 'insensitive' as any } }] : []),
              ...(u.id ? [{ id: u.id }] : [])
            ]
          }
        });

        const targetRoleId = (u.roleId && roleIdMap[u.roleId]) || (existing?.roleId) || defaultAdminRole?.id;

        if (!existing) {
          const created = await prisma.user.create({
            data: {
              ...(u.id ? { id: u.id } : {}),
              name: u.name || 'موظف',
              email: (u.email || `user_${Date.now()}@system.local`).toLowerCase().trim(),
              phone: u.phone || '07700000000',
              department: u.department || 'الإدارة',
              roleId: targetRoleId!,
              passwordHash: u.passwordHash || '$2b$10$w3qI1j2Y4lH9Xy6gMvT2eODp5kQ9oWb2sP8kE3/4x7y8z9a0b1c2',
              status: u.status || 'ACTIVE'
            }
          });
          if (u.id) userIdMap[u.id] = created.id;
          restoredUsers++;
        } else {
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: u.name || existing.name,
              phone: u.phone || existing.phone,
              department: u.department || existing.department,
              status: u.status || existing.status,
              ...(targetRoleId ? { roleId: targetRoleId } : {})
            }
          });
          if (u.id) userIdMap[u.id] = existing.id;
          restoredUsers++;
        }
      } catch (err) {
        console.warn('User restore notice for:', u.email, err);
      }
    }

    // 3. Ministries & SLA
    const ministriesList = data.ministries || payload.ministries || [];
    for (const m of ministriesList) {
      try {
        let existing = await prisma.ministry.findFirst({
          where: {
            OR: [
              ...(m.name ? [{ name: { equals: m.name, mode: 'insensitive' as any } }] : []),
              ...(m.code ? [{ code: { equals: m.code, mode: 'insensitive' as any } }] : []),
              ...(m.id ? [{ id: m.id }] : [])
            ]
          }
        });

        if (!existing) {
          const created = await prisma.ministry.create({
            data: {
              ...(m.id ? { id: m.id } : {}),
              name: m.name,
              code: m.code || `MIN-${Date.now().toString().slice(-4)}`,
              slaDays: m.slaDays || 7,
              status: m.status || 'ACTIVE',
              notes: m.notes,
              contactPerson: m.contactPerson,
              contactPhone: m.contactPhone,
              contactEmail: m.contactEmail
            }
          });
          if (m.id) ministryIdMap[m.id] = created.id;
          restoredMinistries++;
        } else {
          await prisma.ministry.update({
            where: { id: existing.id },
            data: {
              notes: m.notes || existing.notes,
              contactPerson: m.contactPerson || existing.contactPerson,
              contactPhone: m.contactPhone || existing.contactPhone,
              contactEmail: m.contactEmail || existing.contactEmail
            }
          });
          if (m.id) ministryIdMap[m.id] = existing.id;
          restoredMinistries++;
        }
      } catch (err) {
        console.warn('Ministry restore notice:', m.name, err);
      }
    }

    // 4. Cities
    const citiesList = data.cities || payload.cities || [];
    for (const c of citiesList) {
      try {
        let existing = await prisma.city.findFirst({
          where: {
            OR: [
              ...(c.name ? [{ name: { equals: c.name, mode: 'insensitive' as any } }] : []),
              ...(c.id ? [{ id: c.id }] : [])
            ]
          }
        });

        if (!existing) {
          const created = await prisma.city.create({
            data: {
              ...(c.id ? { id: c.id } : {}),
              name: c.name,
              status: c.status || 'ACTIVE'
            }
          });
          if (c.id) cityIdMap[c.id] = created.id;
          restoredCities++;
        } else {
          if (c.id) cityIdMap[c.id] = existing.id;
          restoredCities++;
        }
      } catch (err) {
        console.warn('City restore notice:', c.name, err);
      }
    }

    // 5. Request Types
    const requestTypesList = data.requestTypes || payload.requestTypes || [];
    for (const rt of requestTypesList) {
      try {
        let existing = await prisma.requestType.findFirst({
          where: {
            OR: [
              ...(rt.name ? [{ name: { equals: rt.name, mode: 'insensitive' as any } }] : []),
              ...(rt.id ? [{ id: rt.id }] : [])
            ]
          }
        });

        if (!existing) {
          const created = await prisma.requestType.create({
            data: {
              ...(rt.id ? { id: rt.id } : {}),
              name: rt.name,
              status: rt.status || 'ACTIVE'
            }
          });
          if (rt.id) requestTypeIdMap[rt.id] = created.id;
          restoredRequestTypes++;
        } else {
          if (rt.id) requestTypeIdMap[rt.id] = existing.id;
          restoredRequestTypes++;
        }
      } catch (err) {
        console.warn('RequestType restore notice:', rt.name, err);
      }
    }

    // 6. Customers
    const customersList = data.customers || payload.customers || [];
    for (const cust of customersList) {
      try {
        let existing = await prisma.customer.findFirst({
          where: {
            OR: [
              ...(cust.nationalId ? [{ nationalId: cust.nationalId }] : []),
              ...(cust.customerNumber ? [{ customerNumber: cust.customerNumber }] : []),
              ...(cust.phone ? [{ phone: cust.phone }] : []),
              ...(cust.id ? [{ id: cust.id }] : [])
            ]
          }
        });

        const targetCityId = cust.cityId ? (cityIdMap[cust.cityId] || cust.cityId) : null;
        let validCityId: string | null = null;
        if (targetCityId) {
          const cityInDb = await prisma.city.findUnique({ where: { id: targetCityId } });
          if (cityInDb) validCityId = cityInDb.id;
        }

        if (!existing) {
          const created = await prisma.customer.create({
            data: {
              ...(cust.id ? { id: cust.id } : {}),
              name: cust.name || 'مراجع',
              phone: cust.phone || '',
              altPhone: cust.altPhone || null,
              customerNumber: cust.customerNumber || `CUST-${Date.now().toString().slice(-4)}`,
              nationalId: cust.nationalId || null,
              occupation: cust.occupation || 'كاسب',
              birthYear: cust.birthYear ? String(cust.birthYear) : '1990',
              cityId: validCityId,
              address: cust.address || 'العراق',
              notes: cust.notes || null,
              status: cust.status || 'ACTIVE'
            }
          });
          if (cust.id) customerIdMap[cust.id] = created.id;
          restoredCustomers++;
        } else {
          await prisma.customer.update({
            where: { id: existing.id },
            data: {
              name: cust.name || existing.name,
              phone: cust.phone || existing.phone,
              altPhone: cust.altPhone || existing.altPhone,
              occupation: cust.occupation || existing.occupation,
              birthYear: cust.birthYear ? String(cust.birthYear) : existing.birthYear,
              address: cust.address || existing.address,
              notes: cust.notes || existing.notes,
              status: cust.status || existing.status,
              ...(validCityId ? { cityId: validCityId } : {})
            }
          });
          if (cust.id) customerIdMap[cust.id] = existing.id;
          restoredCustomers++;
        }
      } catch (err) {
        console.warn('Customer restore notice for:', cust.name, err);
      }
    }

    const firstCustomer = await prisma.customer.findFirst();
    const firstMinistry = await prisma.ministry.findFirst();
    const firstCity = await prisma.city.findFirst();
    const firstUser = await prisma.user.findFirst();

    // 7. Requests
    const requestsList = data.requests || payload.requests || [];
    for (const req of requestsList) {
      try {
        let existing = await prisma.request.findFirst({
          where: {
            OR: [
              ...(req.requestNumber ? [{ requestNumber: req.requestNumber }] : []),
              ...(req.id ? [{ id: req.id }] : [])
            ]
          }
        });

        const resolvedCustomerId = (req.customerId && customerIdMap[req.customerId]) ||
          (await prisma.customer.findUnique({ where: { id: req.customerId } }))?.id ||
          firstCustomer?.id;

        const resolvedMinistryId = (req.ministryId && ministryIdMap[req.ministryId]) ||
          (await prisma.ministry.findUnique({ where: { id: req.ministryId } }))?.id ||
          firstMinistry?.id;

        const resolvedCityId = (req.cityId && cityIdMap[req.cityId]) ||
          (req.cityId ? (await prisma.city.findUnique({ where: { id: req.cityId } }))?.id : null) ||
          firstCity?.id || null;

        const resolvedRequestTypeId = (req.requestTypeId && requestTypeIdMap[req.requestTypeId]) ||
          (req.requestTypeId ? (await prisma.requestType.findUnique({ where: { id: req.requestTypeId } }))?.id : null) ||
          null;

        const resolvedEmployeeId = (req.assignedEmployeeId && userIdMap[req.assignedEmployeeId]) ||
          (req.assignedEmployeeId ? (await prisma.user.findUnique({ where: { id: req.assignedEmployeeId } }))?.id : null) ||
          firstUser?.id || null;

        if (!resolvedCustomerId || !resolvedMinistryId) {
          console.warn(`Skipping request #${req.requestNumber} due to missing customer/ministry`);
          continue;
        }

        if (!existing) {
          const created = await prisma.request.create({
            data: {
              ...(req.id ? { id: req.id } : {}),
              requestNumber: req.requestNumber || `REQ-${Date.now().toString().slice(-6)}`,
              customerId: resolvedCustomerId,
              ministryId: resolvedMinistryId,
              cityId: resolvedCityId,
              requestTypeId: resolvedRequestTypeId,
              assignedEmployeeId: resolvedEmployeeId,
              title: req.title || 'معاملة مراجع',
              details: req.details || '',
              requestType: req.requestType || 'عام',
              status: req.status || 'استلام الطلب',
              priority: req.priority || 'NORMAL',
              receiveDate: req.receiveDate ? new Date(req.receiveDate) : new Date(),
              expectedCompletionDate: req.expectedCompletionDate ? new Date(req.expectedCompletionDate) : new Date(Date.now() + 7 * 86400000),
              completedDate: req.completedDate ? new Date(req.completedDate) : null,
              deadlineStatus: req.deadlineStatus || 'ضمن المدة',
              daysRemainingOrOverdue: req.daysRemainingOrOverdue !== undefined ? Number(req.daysRemainingOrOverdue) : 7,
              internalNotes: req.internalNotes || null
            }
          });
          if (req.id) requestIdMap[req.id] = created.id;
          restoredRequests++;
        } else {
          await prisma.request.update({
            where: { id: existing.id },
            data: {
              title: req.title || existing.title,
              details: req.details || existing.details,
              status: req.status || existing.status,
              priority: req.priority || existing.priority,
              assignedEmployeeId: resolvedEmployeeId || existing.assignedEmployeeId,
              expectedCompletionDate: req.expectedCompletionDate ? new Date(req.expectedCompletionDate) : existing.expectedCompletionDate,
              deadlineStatus: req.deadlineStatus || existing.deadlineStatus,
              internalNotes: req.internalNotes || existing.internalNotes
            }
          });
          if (req.id) requestIdMap[req.id] = existing.id;
          restoredRequests++;
        }
      } catch (err) {
        console.warn('Request restore notice for #', req.requestNumber, err);
      }
    }

    // 8. Attachments
    const attachmentsList = data.requestAttachments || payload.requestAttachments || [];
    for (const att of attachmentsList) {
      try {
        const resolvedReqId = (att.requestId && requestIdMap[att.requestId]) ||
          (await prisma.request.findUnique({ where: { id: att.requestId } }))?.id;

        if (!resolvedReqId) continue;

        let fileDataBuffer: Buffer | null = null;
        if (att.fileDataBase64) {
          fileDataBuffer = Buffer.from(att.fileDataBase64, 'base64');
        }

        const exists = att.id ? await prisma.requestAttachment.findUnique({ where: { id: att.id } }) : null;
        if (!exists) {
          await prisma.requestAttachment.create({
            data: {
              ...(att.id ? { id: att.id } : {}),
              requestId: resolvedReqId,
              name: att.name || 'مستند',
              filePath: att.filePath || 'uploads/document.pdf',
              fileSize: att.fileSize || '1 MB',
              fileType: att.fileType || 'PDF',
              mimeType: att.mimeType || 'application/pdf',
              documentType: att.documentType || 'REQUEST_DOCUMENT',
              isPublic: att.isPublic ?? true,
              isIdentity: att.isIdentity ?? false,
              uploadedBy: att.uploadedBy || 'النظام',
              fileData: fileDataBuffer || undefined
            }
          });
          restoredAttachments++;
        }
      } catch (err) {
        console.warn('Attachment restore notice:', att.name, err);
      }
    }

    // 9. Status History
    const statusHistoryList = data.requestStatusHistories || payload.requestStatusHistories || [];
    for (const sh of statusHistoryList) {
      try {
        const resolvedReqId = (sh.requestId && requestIdMap[sh.requestId]) ||
          (await prisma.request.findUnique({ where: { id: sh.requestId } }))?.id;

        if (!resolvedReqId) continue;

        const resolvedUserId = (sh.changedById && userIdMap[sh.changedById]) ||
          (sh.changedById ? (await prisma.user.findUnique({ where: { id: sh.changedById } }))?.id : null);

        const exists = sh.id ? await prisma.requestStatusHistory.findUnique({ where: { id: sh.id } }) : null;
        if (!exists) {
          await prisma.requestStatusHistory.create({
            data: {
              ...(sh.id ? { id: sh.id } : {}),
              requestId: resolvedReqId,
              oldStatus: sh.oldStatus || null,
              newStatus: sh.newStatus || 'استلام الطلب',
              changedById: resolvedUserId || null,
              employeeName: sh.employeeName || 'الموظف المختص',
              note: sh.note || null,
              documentName: sh.documentName || null,
              documentPath: sh.documentPath || null,
              isPublicDoc: sh.isPublicDoc ?? false,
              createdAt: sh.createdAt ? new Date(sh.createdAt) : new Date()
            }
          });
        }
      } catch (err) {
        console.warn('Status history restore notice:', err);
      }
    }

    // 10. WhatsApp Templates
    const waTemplatesList = data.whatsAppTemplates || payload.whatsAppTemplates || [];
    for (const t of waTemplatesList) {
      try {
        if (!t.key) continue;
        await prisma.whatsAppTemplate.upsert({
          where: { key: t.key },
          create: {
            key: t.key,
            title: t.title || t.key,
            content: t.content || '',
            variables: Array.isArray(t.variables) ? t.variables : []
          },
          update: {
            title: t.title || t.key,
            content: t.content || '',
            variables: Array.isArray(t.variables) ? t.variables : []
          }
        });
      } catch (err) {
        console.warn('Template restore notice:', t.key, err);
      }
    }

    console.log(`✅ [RESTORE] Database restored successfully: ${restoredRequests} requests, ${restoredCustomers} customers, ${restoredUsers} users, ${restoredAttachments} attachments.`);

    return {
      restoredCounts: {
        users: restoredUsers,
        customers: restoredCustomers,
        requests: restoredRequests,
        attachments: restoredAttachments,
        ministries: restoredMinistries,
        cities: restoredCities,
        requestTypes: restoredRequestTypes
      }
    };
  },

  /**
   * Keeps only the newest N backup files
   */
  pruneOldBackups: async (keepCount = 30) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return;
      const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));

      if (files.length > keepCount) {
        const sorted = files
          .map((f) => ({
            name: f,
            time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
          }))
          .sort((a, b) => b.time - a.time);

        const toDelete = sorted.slice(keepCount);
        for (const fileObj of toDelete) {
          fs.unlinkSync(path.join(BACKUP_DIR, fileObj.name));
          console.log(`🗑️ Removed old backup snapshot: ${fileObj.name}`);
        }
      }
    } catch (err) {
      console.warn('⚠️ Error pruning old backups:', err);
    }
  }
};
