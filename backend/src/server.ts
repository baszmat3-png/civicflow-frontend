import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { startSlaBackgroundJob } from './jobs/slaChecker.job.js';
import { startBackupBackgroundJob } from './jobs/backup.job.js';
import { startAppointmentReminderJob } from './jobs/appointmentReminder.job.js';
import { seedDatabase } from './seed.js';
import { verifySmtpConnection } from './services/email.service.js';
import { ensureSystemPermissions } from './controllers/role.controller.js';

import { IRAQI_MINISTRIES, DEFAULT_REQUEST_TYPES } from './constants/iraqMinistries.js';

export const IRAQI_GOVERNORATES = [
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

async function ensureIraqiGovernorates() {
  try {
    // 1. Deactivate non-Iraqi cities
    await prisma.city.updateMany({
      where: {
        name: {
          notIn: IRAQI_GOVERNORATES
        }
      },
      data: { status: 'INACTIVE' }
    });

    // 2. Ensure all 19 Iraqi Governorates exist and are ACTIVE
    for (const name of IRAQI_GOVERNORATES) {
      const existing = await prisma.city.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });
      if (!existing) {
        await prisma.city.create({
          data: { name, status: 'ACTIVE' }
        });
      } else if (existing.status !== 'ACTIVE') {
        await prisma.city.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE' }
        });
      }
    }
    console.log('✅ Ensured all 19 Iraqi Governorates are registered and active in the database.');
  } catch (err) {
    console.warn('⚠️ Governorates sync notice:', err);
  }
}

async function ensureIraqiMinistries() {
  try {
    const { UserStatus } = await import('@prisma/client');
    const iraqiMinistryNames = IRAQI_MINISTRIES.map((m) => m.name);

    // 1. Deactivate non-standard ministries
    await prisma.ministry.updateMany({
      where: {
        name: {
          notIn: iraqiMinistryNames
        }
      },
      data: { status: UserStatus.INACTIVE }
    });

    // 2. Ensure all 23 Iraqi Ministries exist, are ACTIVE, and have SLA records
    for (const item of IRAQI_MINISTRIES) {
      const existing = await prisma.ministry.findFirst({
        where: {
          OR: [
            { name: { equals: item.name, mode: 'insensitive' } },
            { code: { equals: item.code, mode: 'insensitive' } }
          ]
        }
      });

      let ministryId = '';
      if (!existing) {
        const created = await prisma.ministry.create({
          data: {
            name: item.name,
            code: item.code,
            slaDays: item.slaDays,
            notes: item.notes,
            contactPerson: item.contactPerson,
            status: UserStatus.ACTIVE
          }
        });
        ministryId = created.id;
      } else {
        ministryId = existing.id;
        await prisma.ministry.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            code: item.code,
            notes: item.notes,
            contactPerson: item.contactPerson,
            status: UserStatus.ACTIVE
          }
        });
      }

      // Ensure SLA setting exists
      const existingSla = await prisma.sLASetting.findUnique({
        where: { ministryId }
      });
      if (!existingSla) {
        await prisma.sLASetting.create({
          data: {
            ministryId,
            defaultDays: item.slaDays || 7,
            urgentDays: Math.max(1, Math.floor((item.slaDays || 7) / 2)),
            importantDays: Math.max(2, (item.slaDays || 7) - 2),
            autoAlertBeforeDays: 2
          }
        });
      }
    }
    console.log(`✅ Ensured all ${IRAQI_MINISTRIES.length} Iraqi Ministries are registered and active in the database.`);
  } catch (err) {
    console.warn('⚠️ Ministries sync notice:', err);
  }
}

async function ensureDefaultRequestTypes() {
  try {
    const { UserStatus } = await import('@prisma/client');
    for (const name of DEFAULT_REQUEST_TYPES) {
      const existing = await prisma.requestType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });
      if (!existing) {
        await prisma.requestType.create({
          data: { name, status: UserStatus.ACTIVE }
        });
      } else if (existing.status !== UserStatus.ACTIVE) {
        await prisma.requestType.update({
          where: { id: existing.id },
          data: { status: UserStatus.ACTIVE }
        });
      }
    }
    console.log(`✅ Ensured all default request types are registered and active in the database.`);
  } catch (err) {
    console.warn('⚠️ Request types sync notice:', err);
  }
}

async function ensureRealAccounts() {
  try {
    const { hashPassword } = await import('./utils/password.js');
    const { UserStatus } = await import('@prisma/client');

    let adminRole = await prisma.role.findFirst({
      where: { name: 'مدير النظام' }
    });
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'مدير النظام',
          description: 'صلاحيات كاملة وشاملة'
        }
      });
    }

    let supervisorRole = await prisma.role.findFirst({
      where: { name: 'مشرف' }
    });
    if (!supervisorRole) {
      supervisorRole = await prisma.role.create({
        data: {
          name: 'مشرف',
          description: 'صلاحيات إشرافية ومتابعة'
        }
      });
    }

    const defaultPasswordHash = await hashPassword('CivicFlow@2026!');

    const accountsToEnsure = [
      {
        email: 'alzmat66@gmail.com',
        name: 'أحمد (مدير النظام)',
        phone: '07700000001',
        roleId: adminRole.id,
        department: 'الإدارة العامة والمتابعة'
      },
      {
        email: 'alzmat99@gmail.com',
        name: 'مدير النظام المساعد',
        phone: '07700000002',
        roleId: adminRole.id,
        department: 'الإدارة العامة والمتابعة'
      },
      {
        email: 'baszmat3@gmail.com',
        name: 'مشرف النظام',
        phone: '07700000003',
        roleId: supervisorRole.id,
        department: 'قسم الاتصال والتنسيق الحكومي'
      },
      {
        email: 'mbas89077@gmail.com',
        name: 'مشرف المتابعة',
        phone: '07700000004',
        roleId: supervisorRole.id,
        department: 'إدارة متابعة المعاملات والسجلات'
      }
    ];

    for (const acc of accountsToEnsure) {
      const existing = await prisma.user.findFirst({
        where: { email: { equals: acc.email, mode: 'insensitive' } }
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            email: acc.email.toLowerCase().trim(),
            name: acc.name,
            phone: acc.phone,
            roleId: acc.roleId,
            department: acc.department,
            status: UserStatus.ACTIVE,
            passwordHash: defaultPasswordHash
          }
        });
        console.log(`✅ Automatically registered user account: ${acc.email}`);
      } else {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            roleId: acc.roleId,
            status: UserStatus.ACTIVE
          }
        });
      }
    }

    // Purge old mock demo users if they have no linked requests
    try {
      const oldDemoEmails = [
        'admin@civicflow.gov',
        'm.hassan@civicflow.gov',
        'sara.m@civicflow.gov',
        'khaled.i@civicflow.gov',
        'ahmed.ali@civicflow.gov'
      ];
      await prisma.user.deleteMany({
        where: {
          email: { in: oldDemoEmails },
          assignedRequests: { none: {} }
        }
      });
    } catch {
      // ignore
    }

    console.log('✅ Real user accounts synchronized successfully in PostgreSQL database.');
  } catch (err) {
    console.warn('⚠️ Accounts sync notice:', err);
  }
}

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully via Prisma');

    // Automatically seed if database is empty
    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        console.log('🌱 Database is empty. Running automatic initial seed...');
        await seedDatabase();
        console.log('✅ Automatic seeding completed successfully!');
      }
    } catch (seedErr) {
      console.warn('⚠️ Seeding check notice:', seedErr);
    }

    // Ensure real accounts, Iraqi governorates, Iraqi ministries, request types, and RBAC permissions exist
    await ensureRealAccounts();
    await ensureIraqiGovernorates();
    await ensureIraqiMinistries();
    await ensureDefaultRequestTypes();
    await ensureSystemPermissions();

    // Start background jobs (SLA checker + Automated daily database backups + Appointment 30-min WhatsApp reminders)
    startSlaBackgroundJob();
    startBackupBackgroundJob();
    startAppointmentReminderJob();

    // Safely verify SMTP configuration in the background
    verifySmtpConnection().catch((smtpErr) => {
      console.warn('⚠️ SMTP startup verification notice:', smtpErr?.message || smtpErr);
    });

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 CivicFlow Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`👉 Health check: http://localhost:${env.PORT}/api/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, closing server and disconnecting database...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('👋 Database disconnected. Server shut down cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start backend server:', error);
    process.exit(1);
  }
}

startServer();