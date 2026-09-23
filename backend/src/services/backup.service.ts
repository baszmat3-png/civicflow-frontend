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
   * Restores database from a backup payload safely (using upserts to protect existing data)
   */
  restoreFromPayload: async (payload: FullDatabaseBackup): Promise<{ restoredCounts: Record<string, number> }> => {
    const data = payload.data;
    if (!data) throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف');

    console.log('🔄 [RESTORE] Restoring database from backup payload...');

    // 1. Roles & Permissions
    for (const role of data.roles || []) {
      await prisma.role.upsert({
        where: { id: role.id },
        create: role,
        update: { name: role.name, description: role.description }
      });
    }

    for (const perm of data.permissions || []) {
      await prisma.permission.upsert({
        where: { id: perm.id },
        create: perm,
        update: { description: perm.description, module: perm.module }
      });
    }

    for (const rp of data.rolePermissions || []) {
      const exists = await prisma.rolePermission.findFirst({
        where: { roleId: rp.roleId, permissionId: rp.permissionId }
      });
      if (!exists) {
        await prisma.rolePermission.create({ data: rp });
      }
    }

    // 2. Users
    for (const u of data.users || []) {
      await prisma.user.upsert({
        where: { id: u.id },
        create: u,
        update: {
          name: u.name,
          phone: u.phone,
          department: u.department,
          status: u.status,
          roleId: u.roleId
        }
      });
    }

    // 3. Ministries & SLA
    for (const m of data.ministries || []) {
      await prisma.ministry.upsert({
        where: { id: m.id },
        create: m,
        update: {
          name: m.name,
          code: m.code,
          slaDays: m.slaDays,
          status: m.status,
          notes: m.notes,
          contactPerson: m.contactPerson,
          contactPhone: m.contactPhone,
          contactEmail: m.contactEmail
        }
      });
    }

    for (const sla of data.slaSettings || []) {
      await prisma.sLASetting.upsert({
        where: { id: sla.id },
        create: sla,
        update: sla
      });
    }

    // 4. Cities & Request Types
    for (const c of data.cities || []) {
      await prisma.city.upsert({
        where: { id: c.id },
        create: c,
        update: { name: c.name, status: c.status }
      });
    }

    for (const rt of data.requestTypes || []) {
      await prisma.requestType.upsert({
        where: { id: rt.id },
        create: rt,
        update: { name: rt.name, status: rt.status }
      });
    }

    // 5. Customers
    for (const cust of data.customers || []) {
      await prisma.customer.upsert({
        where: { id: cust.id },
        create: cust,
        update: {
          name: cust.name,
          phone: cust.phone,
          altPhone: cust.altPhone,
          nationalId: cust.nationalId,
          occupation: cust.occupation,
          birthYear: cust.birthYear,
          cityId: cust.cityId,
          address: cust.address,
          status: cust.status
        }
      });
    }

    // 6. Requests
    for (const req of data.requests || []) {
      await prisma.request.upsert({
        where: { id: req.id },
        create: req,
        update: {
          title: req.title,
          details: req.details,
          status: req.status,
          priority: req.priority,
          assignedEmployeeId: req.assignedEmployeeId,
          expectedCompletionDate: req.expectedCompletionDate,
          deadlineStatus: req.deadlineStatus
        }
      });
    }

    // 7. Status History
    for (const sh of data.requestStatusHistories || []) {
      const exists = await prisma.requestStatusHistory.findUnique({ where: { id: sh.id } });
      if (!exists) {
        await prisma.requestStatusHistory.create({ data: sh });
      }
    }

    // 8. Attachments
    for (const att of data.requestAttachments || []) {
      let fileDataBuffer: Buffer | null = null;
      if (att.fileDataBase64) {
        fileDataBuffer = Buffer.from(att.fileDataBase64, 'base64');
      }

      const { fileDataBase64, ...attFields } = att;
      await prisma.requestAttachment.upsert({
        where: { id: att.id },
        create: {
          ...attFields,
          fileData: fileDataBuffer || undefined
        },
        update: {
          name: att.name,
          filePath: att.filePath,
          fileSize: att.fileSize,
          isPublic: att.isPublic,
          ...(fileDataBuffer ? { fileData: fileDataBuffer } : {})
        }
      });
    }

    // 9. Final Responses
    for (const fr of data.finalResponses || []) {
      let frBuffer: Buffer | null = null;
      if (fr.attachmentDataBase64) {
        frBuffer = Buffer.from(fr.attachmentDataBase64, 'base64');
      }

      const { attachmentDataBase64, ...frFields } = fr;
      await prisma.finalResponse.upsert({
        where: { requestId: fr.requestId },
        create: {
          ...frFields,
          attachmentData: frBuffer || undefined
        },
        update: {
          decision: fr.decision,
          summary: fr.summary,
          documentNumber: fr.documentNumber,
          deliveredToCustomer: fr.deliveredToCustomer,
          ...(frBuffer ? { attachmentData: frBuffer } : {})
        }
      });
    }

    console.log('✅ [RESTORE] Database successfully restored from backup.');
    return {
      restoredCounts: payload.counts || {}
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
