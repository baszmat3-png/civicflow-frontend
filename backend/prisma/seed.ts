import { PrismaClient, PriorityLevel, UserStatus, CustomerStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CivicFlow database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.finalResponse.deleteMany();
  await prisma.requestAttachment.deleteMany();
  await prisma.requestStatusHistory.deleteMany();
  await prisma.request.deleteMany();
  await prisma.sLASetting.deleteMany();
  await prisma.ministry.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.requestStatus.deleteMany();
  await prisma.whatsAppMessageLog.deleteMany();
  await prisma.whatsAppTemplate.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  // 2. Seed Permissions
  const permissionsData = [
    // Requests
    { key: 'requests.view', module: 'الطلبات', description: 'عرض قائمة وتفاصيل الطلبات والمعاملات' },
    { key: 'requests.create', module: 'الطلبات', description: 'تسجيل معاملة جديدة في النظام' },
    { key: 'requests.update', module: 'الطلبات', description: 'تعديل بيانات المعاملات' },
    { key: 'requests.delete', module: 'الطلبات', description: 'حذف المعاملات من النظام' },
    { key: 'requests.change_status', module: 'الطلبات', description: 'تغيير وتحديث حالة المعاملة' },
    { key: 'requests.attachments', module: 'الطلبات', description: 'إرفاق وتحميل المستندات والملفات' },
    { key: 'requests.final_response', module: 'الطلبات', description: 'اعتماد وتسجيل الإجابة والقرار النهائي' },
    // Customers
    { key: 'customers.view', module: 'المراجعون', description: 'عرض قائمة وسجلات المراجعين' },
    { key: 'customers.create', module: 'المراجعون', description: 'إضافة مراجع جديد' },
    { key: 'customers.update', module: 'المراجعون', description: 'تعديل بيانات مراجع' },
    { key: 'customers.delete', module: 'المراجعون', description: 'حذف مراجع' },
    // Ministries
    { key: 'ministries.view', module: 'الوزارات', description: 'عرض الوزارات والجهات الحكومية' },
    { key: 'ministries.create', module: 'الوزارات', description: 'إضافة وزارة أو جهة جديدة' },
    { key: 'ministries.update', module: 'الوزارات', description: 'تعديل بيانات ومدد إنجاز الوزارات' },
    { key: 'ministries.delete', module: 'الوزارات', description: 'حذف جهة أو وزارة' },
    // Users
    { key: 'users.view', module: 'الموظفون', description: 'عرض قائمة الموظفين والمستخدمين' },
    { key: 'users.create', module: 'الموظفون', description: 'إضافة موظف جديد' },
    { key: 'users.update', module: 'الموظفون', description: 'تعديل بيانات وصلاحيات الموظف' },
    { key: 'users.delete', module: 'الموظفون', description: 'تعطيل أو حذف حساب موظف' },
    // Reports
    { key: 'reports.view', module: 'التقارير', description: 'عرض لوحة مؤشرات الأداء والتقارير' },
    { key: 'reports.export', module: 'التقارير', description: 'تصدير التقارير إلى Excel' },
    // Notifications
    { key: 'notifications.view', module: 'الإشعارات', description: 'استقبال وعرض إشعارات النظام' },
    // WhatsApp
    { key: 'whatsapp.view', module: 'واتساب', description: 'عرض قوالب وسجلات رسائل WhatsApp' },
    { key: 'whatsapp.manage', module: 'واتساب', description: 'إدارة إعدادات وتكامل WhatsApp' },
    { key: 'whatsapp.send', module: 'واتساب', description: 'إرسال إشعارات عبر WhatsApp' },
    // Settings & Audit
    { key: 'settings.manage', module: 'الإعدادات', description: 'تعديل إعدادات النظام العامة والمدد والحالات' },
    { key: 'audit_logs.view', module: 'سجل العمليات', description: 'عرض سجل تدقيق العمليات الأمنية والإدارية' }
  ];

  const createdPermissions: Record<string, string> = {};
  for (const perm of permissionsData) {
    const p = await prisma.permission.create({ data: perm });
    createdPermissions[perm.key] = p.id;
  }
  console.log(`✅ Seeded ${permissionsData.length} permissions.`);

  // 3. Seed Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'مدير النظام',
      description: 'صلاحيات كاملة وغير محدودة لإدارة كافة المعاملات والمستخدمين والإعدادات والتقارير.'
    }
  });

  const supervisorRole = await prisma.role.create({
    data: {
      name: 'مشرف',
      description: 'متابعة سير العمل واعتماد الإجابات النهائية والتواصل مع ممثلي الوزارات والجهات.'
    }
  });

  const followUpRole = await prisma.role.create({
    data: {
      name: 'موظف متابعة',
      description: 'تحديث حالات الطلبات، وإرفاق الوثائق، ومتابعة مدد الإنجاز (SLA) والتنبيه بالمتأخرات.'
    }
  });

  const receptionistRole = await prisma.role.create({
    data: {
      name: 'موظف استقبال',
      description: 'استلام المعاملات من المراجعين، وتسجيل بياناتهم، وفتح طلبات جديدة وإصدار إيصالات الاستلام.'
    }
  });

  // Assign permissions to roles
  // Admin -> All permissions
  for (const permId of Object.values(createdPermissions)) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: permId }
    });
  }

  // Supervisor permissions
  const supervisorPermKeys = [
    'requests.view', 'requests.create', 'requests.update', 'requests.change_status', 'requests.attachments', 'requests.final_response',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view', 'ministries.create', 'ministries.update',
    'users.view',
    'reports.view', 'reports.export',
    'notifications.view',
    'whatsapp.view', 'whatsapp.send',
    'audit_logs.view'
  ];
  for (const key of supervisorPermKeys) {
    if (createdPermissions[key]) {
      await prisma.rolePermission.create({
        data: { roleId: supervisorRole.id, permissionId: createdPermissions[key] }
      });
    }
  }

  // Follow-up permissions
  const followUpPermKeys = [
    'requests.view', 'requests.create', 'requests.update', 'requests.change_status', 'requests.attachments',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view',
    'reports.view', 'reports.export',
    'notifications.view'
  ];
  for (const key of followUpPermKeys) {
    if (createdPermissions[key]) {
      await prisma.rolePermission.create({
        data: { roleId: followUpRole.id, permissionId: createdPermissions[key] }
      });
    }
  }

  // Receptionist permissions
  const receptionistPermKeys = [
    'requests.view', 'requests.create',
    'customers.view', 'customers.create', 'customers.update',
    'ministries.view',
    'notifications.view'
  ];
  for (const key of receptionistPermKeys) {
    if (createdPermissions[key]) {
      await prisma.rolePermission.create({
        data: { roleId: receptionistRole.id, permissionId: createdPermissions[key] }
      });
    }
  }
  console.log('✅ Seeded 4 Roles with RBAC permissions.');

  // 4. Seed Users (Bcrypt hashed password)
  const saltRounds = 10;
  const defaultPasswordHash = await bcrypt.hash('CivicFlow@Secure2026', saltRounds);

  const adminUser = await prisma.user.create({
    data: {
      name: 'أحمد (مدير النظام)',
      email: 'alzmat66@gmail.com',
      phone: '07700000001',
      passwordHash: defaultPasswordHash,
      roleId: adminRole.id,
      department: 'الإدارة العامة والمتابعة',
      status: UserStatus.ACTIVE,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastLogin: new Date()
    }
  });

  const assistantAdminUser = await prisma.user.create({
    data: {
      name: 'مدير النظام المساعد',
      email: 'alzmat99@gmail.com',
      phone: '07700000002',
      passwordHash: defaultPasswordHash,
      roleId: adminRole.id,
      department: 'الإدارة العامة والمتابعة',
      status: UserStatus.ACTIVE,
      lastLogin: new Date()
    }
  });

  const supervisorUser = await prisma.user.create({
    data: {
      name: 'مشرف النظام',
      email: 'baszmat3@gmail.com',
      phone: '07700000003',
      passwordHash: defaultPasswordHash,
      roleId: supervisorRole.id,
      department: 'قسم الاتصال والتنسيق الحكومي',
      status: UserStatus.ACTIVE,
      lastLogin: new Date()
    }
  });

  const followUpSupervisorUser = await prisma.user.create({
    data: {
      name: 'مشرف المتابعة',
      email: 'mbas89077@gmail.com',
      phone: '07700000004',
      passwordHash: defaultPasswordHash,
      roleId: supervisorRole.id,
      department: 'إدارة متابعة المعاملات والسجلات',
      status: UserStatus.ACTIVE,
      lastLogin: new Date()
    }
  });
  console.log('✅ Seeded 4 authorized accounts with secure passwords.');

  // 5. Seed Request Statuses
  const statusesData = [
    { name: 'استلام الطلب', color: 'blue', order: 1, isInitial: true, isActive: true },
    { name: 'قيد المراجعة', color: 'amber', order: 2, isActive: true },
    { name: 'تم إرسال الطلب للجهة', color: 'indigo', order: 3, isActive: true },
    { name: 'قيد المعالجة', color: 'purple', order: 4, isActive: true },
    { name: 'مطلوب مستندات', color: 'rose', order: 5, requiresNotes: true, isActive: true },
    { name: 'موافقة', color: 'emerald', order: 6, isActive: true },
    { name: 'مرفوض', color: 'rose', order: 7, requiresNotes: true, isTerminal: true, isActive: true },
    { name: 'الإجابة جاهزة', color: 'cyan', order: 8, isActive: true },
    { name: 'تم إشعار المراجع', color: 'teal', order: 9, isActive: true },
    { name: 'تم التسليم', color: 'emerald', order: 10, isTerminal: true, isActive: true },
    { name: 'مغلق', color: 'slate', order: 11, isTerminal: true, isActive: true }
  ];

  for (const s of statusesData) {
    await prisma.requestStatus.create({ data: s });
  }
  console.log(`✅ Seeded ${statusesData.length} request statuses.`);

  // 6. Seed Ministries & SLA
  const ministriesData = [
    {
      name: 'وزارة الصحة',
      code: 'MOH',
      slaDays: 7,
      status: UserStatus.ACTIVE,
      notes: 'معاملات التراخيص الطبية، التقارير والشهادات الصحية، والعلاج على نفقة الدولة.',
      contactPerson: 'د. عبد العزيز الشمري',
      contactPhone: '+966 11 212 5555',
      contactEmail: 'contact@moh.gov.sa',
      sla: { defaultDays: 7, urgentDays: 3, importantDays: 5, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة الداخلية',
      code: 'MOI',
      slaDays: 5,
      status: UserStatus.ACTIVE,
      notes: 'معاملات الأحوال المدنية، تصاريح الإقامة، التأشيرات والوثائق الأمنية.',
      contactPerson: 'العقيد فيصل القحطاني',
      contactPhone: '+966 11 401 1111',
      contactEmail: 'support@moi.gov.sa',
      sla: { defaultDays: 5, urgentDays: 2, importantDays: 3, autoAlertBeforeDays: 1 }
    },
    {
      name: 'وزارة العدل',
      code: 'MOJ',
      slaDays: 10,
      status: UserStatus.ACTIVE,
      notes: 'حجج الاستحكام، الوكالات الشرعية، تصديق العقود وتوثيق المعاملات.',
      contactPerson: 'الشيخ إبراهيم الدوسري',
      contactPhone: '+966 11 405 7777',
      contactEmail: 'info@moj.gov.sa',
      sla: { defaultDays: 10, urgentDays: 4, importantDays: 7, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة الخارجية',
      code: 'MOFA',
      slaDays: 8,
      status: UserStatus.ACTIVE,
      notes: 'تصديق الوثائق الدولية، التأشيرات الدبلوماسية، ومعاملات الجاليات.',
      contactPerson: 'أ. طارق الماجد',
      contactPhone: '+966 11 406 7777',
      contactEmail: 'consular@mofa.gov.sa',
      sla: { defaultDays: 8, urgentDays: 3, importantDays: 5, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة التعليم',
      code: 'MOE',
      slaDays: 6,
      status: UserStatus.ACTIVE,
      notes: 'معادلة الشهادات الأكاديمية، تراخيص المدارس الأهلية، والابتعاث الخارجي.',
      contactPerson: 'د. منيرة العتيبي',
      contactPhone: '+966 11 475 3000',
      contactEmail: 'relations@moe.gov.sa',
      sla: { defaultDays: 6, urgentDays: 2, importantDays: 4, autoAlertBeforeDays: 2 }
    },
    {
      name: 'وزارة التضامن الاجتماعي',
      code: 'MOSD',
      slaDays: 12,
      status: UserStatus.ACTIVE,
      notes: 'الإعانات الاجتماعية، دعم الأسر المنتجة، وتراخيص الجمعيات الخيرية.',
      contactPerson: 'أ. سامي الجبير',
      contactPhone: '+966 11 477 8888',
      contactEmail: 'social@mosd.gov.sa',
      sla: { defaultDays: 12, urgentDays: 5, importantDays: 8, autoAlertBeforeDays: 3 }
    }
  ];

  for (const m of ministriesData) {
    const { sla, ...minDetails } = m;
    const min = await prisma.ministry.create({ data: minDetails });
    await prisma.sLASetting.create({
      data: {
        ministryId: min.id,
        ...sla
      }
    });
  }
  console.log(`✅ Seeded ${ministriesData.length} ministries with SLA configurations.`);

  // 7. Seed WhatsApp Templates
  const waTemplates = [
    {
      key: 'receive_request',
      title: 'استلام الطلب',
      content: 'عزيزي المراجع {{customer_name}}، تم استلام طلبك رقم {{request_number}} بنجاح لدى {{ministry}}. الموعد المتوقع للإنجاز: {{expected_date}}. يمكنك متابعة الطلب عبر الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'expected_date', 'tracking_link']
    },
    {
      key: 'status_changed',
      title: 'تغيير الحالة',
      content: 'مرحباً {{customer_name}}، نود إحاطتك بأن حالة طلبك رقم {{request_number}} أصبحت الآن: ({{status}}) لدى {{ministry}}. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'status', 'ministry', 'tracking_link']
    },
    {
      key: 'docs_required',
      title: 'طلب مستندات',
      content: 'عزيزي المراجع {{customer_name}}، يلزم استكمال بعض المستندات للطلب {{request_number}} لدى {{ministry}}. يرجى مراجعة المنصة أو زيارة الفرع في أقرب وقت. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'tracking_link']
    },
    {
      key: 'approved',
      title: 'الموافقة',
      content: 'بشرى سارة {{customer_name}}، تمت الموافقة على طلبك رقم {{request_number}} من قبل {{ministry}}. جاري إعداد الوثائق النهائية. الرابط: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'ministry', 'tracking_link']
    },
    {
      key: 'ready_for_pickup',
      title: 'الإجابة جاهزة',
      content: 'عزيزي المراجع {{customer_name}}، الإجابة والوثائق الرسمية للطلب رقم {{request_number}} جاهزة للاستلام. يمكنك مراجعتنا أو تحميلها مباشرة عبر: {{tracking_link}}',
      variables: ['customer_name', 'request_number', 'tracking_link']
    }
  ];

  for (const t of waTemplates) {
    await prisma.whatsAppTemplate.create({ data: t });
  }
  console.log(`✅ Seeded ${waTemplates.length} WhatsApp templates.`);

  // 8. Seed System Settings
  await prisma.systemSetting.create({
    data: {
      key: 'general',
      value: {
        systemName: 'CivicFlow',
        systemSubName: 'منظومة إدارة وتتبع معاملات المراجعين الحكومية',
        officePhone: '+966 11 800 2000',
        officeAddress: 'المملكة العربية السعودية - الرياض - طريق الملك فهد',
        officeEmail: 'support@civicflow.gov.sa',
        taxNumber: '300998877660003',
        workingDays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
        workingHours: '08:00 ص - 04:00 م'
      }
    }
  });

  await prisma.systemSetting.create({
    data: {
      key: 'notificationPreferences',
      value: {
        enableInApp: true,
        enableOverdueAlerts: true,
        enableStatusAlerts: true,
        enableWhatsApp: true,
        autoNotifyCustomerOnStatusChange: true
      }
    }
  });

  await prisma.systemSetting.create({
    data: {
      key: 'whatsapp',
      value: {
        isConnected: true,
        phoneNumber: '+966 50 123 9988',
        instanceName: 'CivicFlow-Gov-Gateway-01',
        lastSync: '2026-09-03 20:00',
        triggers: [
          { id: 'trg-1', event: 'on_created', title: 'عند استلام الطلب', enabled: true, templateId: 'tpl-1' },
          { id: 'trg-2', event: 'on_status_change', title: 'عند تغيير الحالة', enabled: true, templateId: 'tpl-2' },
          { id: 'trg-3', event: 'on_docs_needed', title: 'عند طلب مستندات إضافية', enabled: true, templateId: 'tpl-3' },
          { id: 'trg-4', event: 'on_approved', title: 'عند الموافقة', enabled: true, templateId: 'tpl-4' },
          { id: 'trg-5', event: 'on_ready', title: 'عند جاهزية الإجابة', enabled: true, templateId: 'tpl-6' }
        ]
      }
    }
  });

  console.log('🎉 Database cleanly reset and initialized with 4 secure accounts!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
